import { BadRequestException, Injectable } from "@nestjs/common";
import type { LikeDto } from "./like.dto.js";

export type LikeState = LikeDto & {
  liked: boolean;
  updatedAt: string;
};

@Injectable()
export class LikesService {
  private readonly likes = new Map<string, LikeState>();

  like(input: LikeDto): LikeState {
    this.validate(input);
    const state = { ...input, liked: true, updatedAt: new Date().toISOString() };
    this.likes.set(this.key(input.viewerId, input.videoId), state);
    return state;
  }

  unlike(input: LikeDto): LikeState {
    this.validate(input);
    this.likes.delete(this.key(input.viewerId, input.videoId));
    return { ...input, liked: false, updatedAt: new Date().toISOString() };
  }

  getState(input: LikeDto): LikeState {
    this.validate(input);
    return this.likes.get(this.key(input.viewerId, input.videoId)) ?? { ...input, liked: false, updatedAt: new Date().toISOString() };
  }

  private validate(input: LikeDto) {
    if (!input.viewerId || !input.videoId) throw new BadRequestException("viewerId and videoId are required");
  }

  private key(viewerId: string, videoId: string) {
    return `${viewerId}:${videoId}`;
  }
}