import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
import type { AddPlaylistVideoDto, CreatePlaylistDto, UpdatePlaylistDto } from "./playlist.dto.js";

@Injectable()
export class PlaylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  async list(userId: string) {
    await this.requireCreator(userId);
    const playlists = await this.prisma.playlist.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true } },
        items: { orderBy: { position: "asc" }, take: 1, select: { video: { select: { thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } } } } } }
      }
    });

    return Promise.all(playlists.map(async (playlist) => ({
      id: playlist.id,
      title: playlist.title,
      isPublic: playlist.isPublic,
      videoCount: playlist._count.items,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
      thumbnailUrl: playlist.items[0]?.video.thumbnails[0]
        ? await this.objectStorage.createPresignedDownloadUrl(playlist.items[0].video.thumbnails[0].storageKey, 300)
        : null
    })));
  }

  async listCreatorVideos(userId: string) {
    await this.requireCreator(userId);
    const videos = await this.prisma.video.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        status: true,
        visibility: true,
        createdAt: true,
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } }
      }
    });
    return Promise.all(videos.map(async (video) => ({
      id: video.id,
      title: video.title,
      status: video.status,
      visibility: video.visibility,
      createdAt: video.createdAt.toISOString(),
      thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null
    })));
  }

  async create(userId: string, input: CreatePlaylistDto) {
    await this.requireCreator(userId);
    const title = input.title?.trim();
    if (!title || title.length > 150) throw new BadRequestException("A playlist title between 1 and 150 characters is required");
    if (input.isPublic !== undefined && typeof input.isPublic !== "boolean") throw new BadRequestException("Playlist visibility must be public or private");
    const playlist = await this.prisma.playlist.create({ data: { ownerId: userId, title, isPublic: input.isPublic ?? false } });
    return { id: playlist.id, title: playlist.title, isPublic: playlist.isPublic, createdAt: playlist.createdAt.toISOString(), updatedAt: playlist.updatedAt.toISOString(), videoCount: 0 };
  }

  async get(userId: string, playlistId: string) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    const items = await this.prisma.playlistItem.findMany({
      where: { playlistId: playlist.id },
      orderBy: { position: "asc" },
      select: {
        position: true,
        video: { select: { id: true, title: true, status: true, visibility: true, createdAt: true, thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } } } }
      }
    });
    const videos = await Promise.all(items.map(async (item) => ({
      id: item.video.id,
      title: item.video.title,
      status: item.video.status,
      visibility: item.video.visibility,
      createdAt: item.video.createdAt.toISOString(),
      position: item.position,
      thumbnailUrl: item.video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(item.video.thumbnails[0].storageKey, 300) : null
    })));
    return { id: playlist.id, title: playlist.title, isPublic: playlist.isPublic, createdAt: playlist.createdAt.toISOString(), updatedAt: playlist.updatedAt.toISOString(), videoCount: videos.length, videos };
  }

  async update(userId: string, playlistId: string, input: UpdatePlaylistDto) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    const title = input.title?.trim();
    if (input.title !== undefined && (!title || title.length > 150)) throw new BadRequestException("A playlist title between 1 and 150 characters is required");
    if (input.isPublic !== undefined && typeof input.isPublic !== "boolean") throw new BadRequestException("Playlist visibility must be public or private");
    const updated = await this.prisma.playlist.update({
      where: { id: playlist.id },
      data: { ...(title === undefined ? {} : { title }), ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }) }
    });
    return { id: updated.id, title: updated.title, isPublic: updated.isPublic, updatedAt: updated.updatedAt.toISOString() };
  }

  async remove(userId: string, playlistId: string) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    await this.prisma.playlist.delete({ where: { id: playlist.id } });
    return { id: playlist.id, deleted: true };
  }

  async addVideo(userId: string, playlistId: string, videoId: string) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    if (!videoId) throw new BadRequestException("videoId is required");
    const video = await this.prisma.video.findFirst({ where: { id: videoId, creatorId: userId, deletedAt: null }, select: { id: true } });
    if (!video) throw new NotFoundException("Creator video not found");
    const existing = await this.prisma.playlistItem.findUnique({ where: { playlistId_videoId: { playlistId, videoId } }, select: { id: true } });
    if (existing) throw new ConflictException("Video is already in this playlist");
    const lastItem = await this.prisma.playlistItem.aggregate({ where: { playlistId }, _max: { position: true } });
    await this.prisma.playlistItem.create({ data: { playlistId: playlist.id, videoId: video.id, position: (lastItem._max.position ?? -1) + 1 } });
    return this.get(userId, playlist.id);
  }

  async removeVideo(userId: string, playlistId: string, videoId: string) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    const removed = await this.prisma.playlistItem.deleteMany({ where: { playlistId: playlist.id, videoId } });
    if (!removed.count) throw new NotFoundException("Playlist video not found");
    return this.get(userId, playlist.id);
  }

  async reorder(userId: string, playlistId: string, videoIds: string[]) {
    await this.requireCreator(userId);
    const playlist = await this.findOwned(userId, playlistId);
    if (!Array.isArray(videoIds) || new Set(videoIds).size !== videoIds.length) throw new BadRequestException("Provide each playlist video exactly once");
    const items = await this.prisma.playlistItem.findMany({ where: { playlistId: playlist.id }, orderBy: { position: "asc" }, select: { videoId: true, position: true } });
    if (items.length !== videoIds.length || items.some((item) => !videoIds.includes(item.videoId))) throw new BadRequestException("The order must include every playlist video exactly once");

    const offset = Math.max(0, ...items.map((item) => item.position)) + items.length + 1;
    await this.prisma.$transaction(async (transaction) => {
      for (const [index, videoId] of videoIds.entries()) {
        await transaction.playlistItem.update({ where: { playlistId_videoId: { playlistId: playlist.id, videoId } }, data: { position: offset + index } });
      }
      for (const [position, videoId] of videoIds.entries()) {
        await transaction.playlistItem.update({ where: { playlistId_videoId: { playlistId: playlist.id, videoId } }, data: { position } });
      }
    });
    return this.get(userId, playlist.id);
  }

  private async findOwned(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findFirst({ where: { id: playlistId, ownerId: userId } });
    if (!playlist) throw new NotFoundException("Playlist not found");
    return playlist;
  }

  private async requireCreator(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, creatorApplication: { select: { status: true } } } });
    if (!user || (user.role !== "CREATOR" && user.role !== "ADMIN" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ForbiddenException("Active creator access required");
    }
  }
}