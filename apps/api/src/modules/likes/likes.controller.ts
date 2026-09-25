import { Body, Controller, Delete, Get, Post } from "@nestjs/common";
import { LikeDto } from "./like.dto.js";
import { LikesService } from "./likes.service.js";

@Controller("likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  like(@Body() input: LikeDto) {
    return this.likesService.like(input);
  }

  @Delete()
  unlike(@Body() input: LikeDto) {
    return this.likesService.unlike(input);
  }

  @Get("state")
  state(@Body() input: LikeDto) {
    return this.likesService.getState(input);
  }
}