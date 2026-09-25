import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createClient } from "redis";

export const PROCESSING_QUEUE = "gvp:processing:ready";
export const PROCESSING_RETRY_QUEUE = "gvp:processing:retry";

@Injectable()
export class RedisQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisQueueService.name);
  private readonly client = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379",
    socket: {
      reconnectStrategy: (retries) => Math.min(250 * (retries + 1), 5000)
    }
  });

  async onModuleInit() {
    this.client.on("error", (error) => this.logger.warn(`Redis unavailable: ${String(error)}`));
    if (!this.client.isOpen && !this.client.isReady) {
      void this.client.connect().catch((error: unknown) => {
        this.logger.warn(`Redis connection failed: ${String(error)}`);
      });
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) await this.client.quit();
  }

  async enqueue(jobId: string) {
    const added = await this.client.sAdd(`${PROCESSING_QUEUE}:ids`, jobId);
    if (added) await this.client.rPush(PROCESSING_QUEUE, jobId);
  }

  async scheduleRetry(jobId: string, availableAt: Date) {
    await this.client.zAdd(PROCESSING_RETRY_QUEUE, {
      score: availableAt.getTime(),
      value: jobId
    });
  }

  async enqueueDueRetries(now = new Date()) {
    const jobIds = await this.client.zRangeByScore(
      PROCESSING_RETRY_QUEUE,
      0,
      now.getTime()
    );

    for (const jobId of jobIds) {
      const moved = await this.client.multi()
        .zRem(PROCESSING_RETRY_QUEUE, jobId)
        .sAdd(`${PROCESSING_QUEUE}:ids`, jobId)
        .rPush(PROCESSING_QUEUE, jobId)
        .exec();

      if (!moved) break;
    }

    return jobIds.length;
  }

  async next(timeoutSeconds = 5) {
    const result = await this.client.blPop(PROCESSING_QUEUE, timeoutSeconds);
    if (!result) return null;
    await this.client.sRem(`${PROCESSING_QUEUE}:ids`, result.element);
    return result.element;
  }

  async acquireJobLock(jobId: string, ttlSeconds = 300) {
    return (await this.client.set(`gvp:processing:lock:${jobId}`, "1", {
      NX: true,
      EX: ttlSeconds
    })) === "OK";
  }

  async releaseJobLock(jobId: string) {
    await this.client.del(`gvp:processing:lock:${jobId}`);
  }
}