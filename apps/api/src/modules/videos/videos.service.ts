import { BadRequestException, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import type { CreateVideoDto } from "./video.dto.js";

export type Video = CreateVideoDto & {
  id: string;
  status: "draft" | "processing" | "ready" | "published";
  createdAt: string;
  publishedAt?: string;
};

@Injectable()
export class VideosService {
  private readonly videos = new Map<string, Video>();

  create(input: CreateVideoDto): Video {
    if (!input.creatorId || !input.channelId || !input.title) {
      throw new BadRequestException("creatorId, channelId, and title are required");
    }
    const video: Video = { ...input, id: crypto.randomUUID(), status: "draft", createdAt: new Date().toISOString() };
    this.videos.set(video.id, video);
    return video;
  }

  get(id: string): Video {
    const video = this.videos.get(id);
    if (!video) throw new NotFoundException("Video not found");
    return video;
  }

  markReady(id: string): Video {
    const video = this.get(id);
    if (video.status === "published") throw new ConflictException("Published videos cannot return to ready state");
    const ready = { ...video, status: "ready" as const };
    this.videos.set(id, ready);
    return ready;
  }

  publish(id: string): Video {
    const video = this.get(id);
    if (video.status !== "ready") throw new ConflictException("Video must be ready before it can be published");
    const published = { ...video, status: "published" as const, publishedAt: new Date().toISOString() };
    this.videos.set(id, published);
    return published;
  }
}