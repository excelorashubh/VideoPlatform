import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/public.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { Request } from "express";
import { CreateVideoDto } from "./video.dto.js";
import { VideosService } from "./videos.service.js";

@Controller("videos")
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Public()
  @Get(":id/engagement")
  async engagement(@Param("id") id: string, @Req() request: Request & { user?: { id: string } }) {
    return this.videosService.getEngagement(id, request.user?.id ?? null);
  }

  @Post(":id/view")
  registerView(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.videosService.registerView(id, user.id);
  }

  @Public()
  @Get("public")
  listPublic() {
    return this.videosService.listPublic();
  }

  @Public()
  @Get(":id/stream/*path")
  async stream(@Param("id") id: string, @Param("path") path: string | string[], @Res() response: Response) {
    const media = await this.videosService.getPublicMedia(id, path);
    if (media.kind === "segment") return response.redirect(media.url);
    response.type("application/vnd.apple.mpegurl").send(media.body);
  }

  @Public()
  @Get(":id")
  getPublic(@Param("id") id: string) {
    return this.videosService.getPublic(id);
  }

  @Post()
  create(@Body() input: CreateVideoDto) {
    return this.videosService.create(input);
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