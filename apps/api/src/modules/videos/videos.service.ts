import { BadRequestException, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  async listPublic() {
    const videos = await this.prisma.video.findMany({
      where: { visibility: "PUBLIC", status: "READY", deletedAt: null },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        publishedAt: true,
        channel: { select: { id: true, ownerId: true, displayName: true, handle: true, avatarKey: true } },
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } },
        transcodes: { where: { rendition: "master" }, take: 1, select: { manifestKey: true } },
        _count: { select: { history: true } }
      }
    });

    return {
      items: await Promise.all(videos.map(async (video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null,
        videoUrl: video.transcodes[0]?.manifestKey ? await this.objectStorage.createPresignedDownloadUrl(video.transcodes[0].manifestKey, 300) : null,
        creator: {
          id: video.channel.ownerId,
          channelId: video.channel.id,
          name: video.channel.displayName,
          handle: video.channel.handle,
          avatarUrl: video.channel.avatarKey ? await this.objectStorage.createPresignedDownloadUrl(video.channel.avatarKey, 300) : null
        },
        views: video._count.history,
        publishedAt: (video.publishedAt ?? video.createdAt).toISOString()
      }))),
      total: videos.length
    };
  }

  async getPublic(id: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null },
      select: {
        id: true, title: true, description: true, createdAt: true, publishedAt: true,
        channel: { select: { id: true, ownerId: true, displayName: true, handle: true, avatarKey: true } },
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } },
        transcodes: { where: { rendition: "master" }, take: 1, select: { manifestKey: true } },
        _count: { select: { history: true } }
      }
    });
    if (!video) throw new NotFoundException("Video not found");

    return {
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null,
      videoUrl: video.transcodes[0]?.manifestKey ? await this.objectStorage.createPresignedDownloadUrl(video.transcodes[0].manifestKey, 300) : null,
      creator: {
        id: video.channel.ownerId,
        channelId: video.channel.id,
        name: video.channel.displayName,
        handle: video.channel.handle,
        avatarUrl: video.channel.avatarKey ? await this.objectStorage.createPresignedDownloadUrl(video.channel.avatarKey, 300) : null
      },
      views: video._count.history,
      publishedAt: (video.publishedAt ?? video.createdAt).toISOString()
    };
  }

  async getPublicMedia(id: string, relativePathInput: string | string[]) {
    const relativePath = Array.isArray(relativePathInput) ? relativePathInput.join("/") : relativePathInput;
    const video = await this.prisma.video.findFirst({
      where: { id, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null },
      select: { creatorId: true }
    });
    if (!video) throw new NotFoundException("Video not found");
    if (!relativePath || relativePath.includes("..") || relativePath.startsWith("/") || !/^[a-zA-Z0-9_./-]+$/.test(relativePath)) {
      throw new NotFoundException("Media not found");
    }

    const key = this.objectStorage.buildUserVideoKey(video.creatorId, id, "hls", relativePath);
    if (relativePath.endsWith(".m3u8")) {
      const playlist = await this.objectStorage.getObjectText(key).catch(() => { throw new NotFoundException("Media not found"); });
      const baseUrl = `${process.env.API_PUBLIC_URL ?? "http://localhost:4000/api"}/videos/${encodeURIComponent(id)}/stream`;
      const rewritten = playlist.split(/\r?\n/).map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        const childPath = `${relativePath.slice(0, relativePath.lastIndexOf("/") + 1)}${trimmed}`;
        return `${baseUrl}/${childPath.split("/").map(encodeURIComponent).join("/")}`;
      }).join("\n");
      return { kind: "playlist" as const, body: rewritten };
    }

    return { kind: "segment" as const, url: await this.objectStorage.createPresignedDownloadUrl(key, 300) };
  }

  async getEngagement(id: string, userId: string | null) {
    const video = await this.prisma.video.findFirst({ where: { id, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null }, select: { id: true, channelId: true } });
    if (!video) throw new NotFoundException("Video not found");
    const [likes, dislikes, comments, subscribers, reaction, subscription] = await Promise.all([
      this.prisma.videoReaction.count({ where: { videoId: id, type: "LIKE" } }),
      this.prisma.videoReaction.count({ where: { videoId: id, type: "DISLIKE" } }),
      this.prisma.comment.count({ where: { videoId: id, deletedAt: null } }),
      this.prisma.subscription.count({ where: { channelId: video.channelId } }),
      userId ? this.prisma.videoReaction.findUnique({ where: { userId_videoId: { userId, videoId: id } }, select: { type: true } }) : null,
      userId ? this.prisma.subscription.findUnique({ where: { userId_channelId: { userId, channelId: video.channelId } }, select: { id: true } }) : null
    ]);
    return { likeCount: likes, dislikeCount: dislikes, commentCount: comments, subscriberCount: subscribers, viewerReaction: reaction?.type ?? null, viewerSubscribed: Boolean(subscription) };
  }

  async registerView(id: string, userId: string) {
    const video = await this.prisma.video.findFirst({ where: { id, visibility: { in: ["PUBLIC", "UNLISTED"] }, status: "READY", deletedAt: null }, select: { id: true } });
    if (!video) throw new NotFoundException("Video not found");
    await this.prisma.watchHistory.upsert({ where: { userId_videoId: { userId, videoId: id } }, update: { watchedAt: new Date() }, create: { userId, videoId: id } });
    return { registered: true };
  }

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