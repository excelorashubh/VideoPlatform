import { Module } from "@nestjs/common";
import { ProcessingModule } from "../processing/processing.module.js";
import { UploadsController } from "./uploads.controller.js";
import { UploadsService } from "./uploads.service.js";

@Module({ imports: [ProcessingModule], controllers: [UploadsController], providers: [UploadsService] })
export class UploadsModule {}
