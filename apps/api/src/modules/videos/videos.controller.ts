import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateVideoDto } from "./video.dto.js";
import { VideosService } from "./videos.service.js";

@Controller("videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  create(@Body() input: CreateVideoDto) {
    return this.videosService.create(input);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.videosService.get(id);
  }

  @Post(":id/ready")
  markReady(@Param("id") id: string) {
    return this.videosService.markReady(id);
  }

  @Post(":id/publish")
  publish(@Param("id") id: string) {
    return this.videosService.publish(id);
  }
}