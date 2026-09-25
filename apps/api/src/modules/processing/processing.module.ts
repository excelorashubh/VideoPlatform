import { Module } from "@nestjs/common";
import { ProcessingService } from "./processing.service.js";
import { ProcessingWorker } from "./processing.worker.js";
import { MediaProcessingService } from "./media-processing.service.js";

@Module({ providers: [ProcessingService, ProcessingWorker, MediaProcessingService], exports: [ProcessingService, ProcessingWorker] })
export class ProcessingModule {}
