import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import type { LikeDto } from "./like.dto.js";

@Injectable()
export class LikesService {
  constructor(private readonly prisma: PrismaService) {}

  async react(userId: string, input: LikeDto) {
    this.validate(input);
    await this.ensureViewable(input.videoId);
    const reaction = input.type ?? "LIKE";
    await this.prisma.videoReaction.upsert({ where: { userId_videoId: { userId, videoId: input.videoId } }, update: { type: reaction }, create: { userId, videoId: input.videoId, type: reaction } });
    return this.state(userId, input.videoId);
  }

  async unreact(userId: string, videoId: string) {
    await this.prisma.videoReaction.deleteMany({ where: { userId, videoId } });
    return this.state(userId, videoId);
  }

  async state(userId: string | null, videoId: string) {
    const [likes, dislikes, reaction] = await Promise.all([
      this.prisma.videoReaction.count({ where: { videoId, type: "LIKE" } }),
      this.prisma.videoReaction.count({ where: { videoId, type: "DISLIKE" } }),
      userId ? this.prisma.videoReaction.findUnique({ where: { userId_videoId: { userId, videoId } }, select: { type: true } }) : null
    ]);
    return { likeCount: likes, dislikeCount: dislikes, viewerReaction: reaction?.type ?? null };
  }

  private validate(input: LikeDto) {
    if (!input.videoId || (input.type && !["LIKE", "DISLIKE"].includes(input.type))) throw new BadRequestException("videoId and a valid reaction type are required");
  }

  private async ensureViewable(videoId: string) {
    const video = await this.prisma.video.findFirst({ where: { id: videoId, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null }, select: { id: true } });
    if (!video) throw new NotFoundException("Video not found");
  }
}