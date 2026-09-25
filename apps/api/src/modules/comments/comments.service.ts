import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateCommentDto, DeleteCommentDto } from "./comment.dto.js";

export type Comment = CreateCommentDto & {
  id: string;
  createdAt: string;
  deletedAt?: string;
};

@Injectable()
export class CommentsService {
  private readonly comments = new Map<string, Comment>();

  create(input: CreateCommentDto): Comment {
    if (!input.authorId || !input.videoId || !input.body?.trim()) {
      throw new BadRequestException("authorId, videoId, and a non-empty body are required");
    }
    if (input.parentId) {
      const parent = this.get(input.parentId);
      if (parent.videoId !== input.videoId) throw new ConflictException("Reply parent must belong to the same video");
    }
    const comment: Comment = { ...input, body: input.body.trim(), id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.comments.set(comment.id, comment);
    return comment;
  }

  list(videoId: string): Comment[] {
    return [...this.comments.values()].filter((comment) => comment.videoId === videoId && !comment.deletedAt);
  }

  remove(id: string, input: DeleteCommentDto): Comment {
    const comment = this.get(id);
    if (comment.authorId !== input.authorId) throw new ConflictException("Only the comment author can delete this comment");
    const deleted = { ...comment, body: "", deletedAt: new Date().toISOString() };
    this.comments.set(id, deleted);
    return deleted;
  }

  private get(id: string): Comment {
    const comment = this.comments.get(id);
    if (!comment) throw new NotFoundException("Comment not found");
    return comment;
  }
}