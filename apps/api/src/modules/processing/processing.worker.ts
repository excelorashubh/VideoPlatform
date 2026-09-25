import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisQueueService } from "../../queue/redis-queue.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
import { MediaProcessingService } from "./media-processing.service.js";

@Injectable()
export class ProcessingWorker {
  private readonly logger = new Logger(ProcessingWorker.name);
  private readonly maxAttempts = Number(process.env.PROCESSING_MAX_ATTEMPTS ?? 3);
  private readonly retryBaseDelaySeconds = Number(process.env.PROCESSING_RETRY_BASE_DELAY_SECONDS ?? 5);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: RedisQueueService,
    private readonly objectStorage: ObjectStorageService,
    private readonly mediaProcessing: MediaProcessingService
  ) {}

  async run() {
    await this.recoverStaleJobs();

    while (true) {
      await this.queue.enqueueDueRetries();
      await this.recoverQueuedJobs();
      const jobId = await this.queue.next();
      if (jobId) await this.process(jobId);
    }
  }

  private async recoverQueuedJobs() {
    const jobs = await this.prisma.processingJob.findMany({
      where: { status: "QUEUED", availableAt: { lte: new Date() } },
      select: { id: true },
      take: 100
    });

    for (const job of jobs) await this.queue.enqueue(job.id);
  }

  private async recoverStaleJobs() {
    const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
    await this.prisma.processingJob.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
      data: { status: "QUEUED", availableAt: new Date() }
    });
  }

  private async process(jobId: string) {
    if (!(await this.queue.acquireJobLock(jobId))) return;

    try {
      const job = await this.prisma.processingJob.findUnique({
        where: { id: jobId },
        include: { upload: true }
      });
      if (!job || job.status === "COMPLETED" || job.status === "FAILED") return;
      if (job.availableAt > new Date()) {
        await this.queue.scheduleRetry(job.id, job.availableAt);
        return;
      }

      const running = await this.prisma.processingJob.update({
        where: { id: job.id },
        data: { status: "PROCESSING", attempts: { increment: 1 } }
      });

      try {
        const expectedKey = `media/originals/${job.upload.creatorId}/${job.upload.videoId}/source`;
        if (job.upload.storageKey !== expectedKey) throw new Error("Upload storage key is invalid");
        if (!(await this.objectStorage.objectExists(job.upload.storageKey))) {
          throw new Error("Upload object was not found");
        }
        await this.mediaProcessing.process({
          id: job.id,
          videoId: job.videoId,
          storageKey: job.upload.storageKey
        });
        await this.prisma.processingJob.update({
          where: { id: job.id },
          data: { status: "COMPLETED", lastError: null }
        });
      } catch (error) {
        await this.handleFailure(running.id, running.attempts, error);
      }
    } finally {
      await this.queue.releaseJobLock(jobId);
    }
  }

  private async handleFailure(jobId: string, attempts: number, error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    if (attempts >= this.maxAttempts) {
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: { status: "FAILED", lastError: message }
      });
      this.logger.error(`Processing job ${jobId} failed permanently: ${message}`);
      return;
    }

    const delaySeconds = this.retryBaseDelaySeconds * 2 ** Math.max(0, attempts - 1);
    const availableAt = new Date(Date.now() + delaySeconds * 1000);
    await this.prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "QUEUED", availableAt, lastError: message }
    });
    await this.queue.scheduleRetry(jobId, availableAt);
    this.logger.warn(`Processing job ${jobId} scheduled for retry ${attempts}/${this.maxAttempts}`);
  }
}