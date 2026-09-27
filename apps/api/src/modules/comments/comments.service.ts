import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import type { CreateCommentDto } from "./comment.dto.js";

export type Comment = CreateCommentDto & {
  id: string;
  createdAt: string;
  deletedAt?: string;
};

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, input: CreateCommentDto) {
    const body = input.body?.trim();
    if (!input.videoId || !body || body.length > 2000) throw new BadRequestException("A comment between 1 and 2000 characters is required");
    const video = await this.prisma.video.findFirst({ where: { id: input.videoId, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null }, select: { id: true } });
    if (!video) throw new NotFoundException("Video not found");
    if (input.parentId) {
      const parent = await this.prisma.comment.findFirst({ where: { id: input.parentId, videoId: input.videoId, deletedAt: null }, select: { id: true } });
      if (!parent) throw new ConflictException("Reply parent must belong to the same video");
    }
    return this.prisma.comment.create({ data: { authorId, videoId: input.videoId, parentId: input.parentId, body }, include: { author: { select: { id: true, displayName: true } } } });
  }

  list(videoId: string) {
    return this.prisma.comment.findMany({ where: { videoId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 50, include: { author: { select: { id: true, displayName: true } } } });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { authorId: true } });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorId !== userId) throw new ConflictException("Only the comment author can delete this comment");
    return this.prisma.comment.update({ where: { id }, data: { deletedAt: new Date(), body: "" } });
  }
}