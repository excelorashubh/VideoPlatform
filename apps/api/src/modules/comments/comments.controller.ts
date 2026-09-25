import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { CreateCommentDto, DeleteCommentDto } from "./comment.dto.js";
import { CommentsService } from "./comments.service.js";

@Controller("comments")
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  create(@Body() input: CreateCommentDto) {
    return this.commentsService.create(input);
  }

  @Get("video/:videoId")
  list(@Param("videoId") videoId: string) {
    return this.commentsService.list(videoId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Body() input: DeleteCommentDto) {
    return this.commentsService.remove(id, input);
  }
}