import { Module } from "@nestjs/common";
import { VideosController } from "./videos.controller.js";
import { VideosService } from "./videos.service.js";

@Module({ controllers: [VideosController], providers: [VideosService], exports: [VideosService] })
export class VideosModule {}
