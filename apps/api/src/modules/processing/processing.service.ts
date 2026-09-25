import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { RedisQueueService } from "../../queue/redis-queue.service.js";

export type ProcessingJob = {
  id: string;
  videoId: string;
  uploadId: string;
  status: "queued";
  createdAt: string;
};

@Injectable()
export class ProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: RedisQueueService
  ) {}

  async enqueue(videoId: string, uploadId: string): Promise<ProcessingJob> {
    const job = await this.prisma.processingJob.create({
      data: {
        type: "VIDEO_PROCESS",
        videoId,
        uploadId
      }
    });

    await this.queue.enqueue(job.id);

    return {
      id: job.id,
      videoId: job.videoId,
      uploadId: job.uploadId,
      status: "queued",
      createdAt: job.createdAt.toISOString()
    };
  }
}