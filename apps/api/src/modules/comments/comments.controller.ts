import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { Public } from "../auth/public.decorator.js";
import { CreateCommentDto } from "./comment.dto.js";
import { CommentsService } from "./comments.service.js";

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() input: CreateCommentDto) {
    return this.commentsService.create(user.id, input);
  }

  @Public()
  @Get("video/:videoId")
  list(@Param("videoId") videoId: string) {
    return this.commentsService.list(videoId);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { id: string }, @Param("id") id: string) {
    return this.commentsService.remove(id, user.id);
  }
}