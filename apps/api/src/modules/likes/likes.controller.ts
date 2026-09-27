import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { LikeDto } from "./like.dto.js";
import { LikesService } from "./likes.service.js";

@Controller("likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  like(@CurrentUser() user: { id: string }, @Body() input: LikeDto) {
    return this.likesService.react(user.id, input);
  }

  @Delete()
  unlike(@CurrentUser() user: { id: string }, @Body() input: LikeDto) {
    return this.likesService.unreact(user.id, input.videoId);
  }

  @Get("video/:videoId")
  state(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string) {
    return this.likesService.state(user.id, videoId);
  }
}