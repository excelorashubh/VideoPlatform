import { Global, Module } from "@nestjs/common";
import { RedisQueueService } from "./redis-queue.service.js";

@Global()
@Module({ providers: [RedisQueueService], exports: [RedisQueueService] })
export class QueueModule {}