import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
import type { SubmitCreatorApplicationDto } from "./creator.dto.js";
import { isCreatorVerificationComplete } from "./verification-policy.js";

@Injectable()
export class CreatorService {
  private readonly reservedHandles = new Set(["admin", "api", "help", "support", "youtube", "gvp", "global-video-platform"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  async getApplication(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, emailVerifiedAt: true, phoneNumber: true, phoneVerifiedAt: true, creatorApplication: true }
    });
    if (!user) throw new ConflictException("Unable to load creator application");

    return {
      isCreator: user.role === "CREATOR" || user.role === "ADMIN",
      application: user.creatorApplication,
      verification: {
        email: user.email,
        emailVerified: Boolean(user.emailVerifiedAt),
        phoneNumber: user.phoneNumber,
        phoneVerified: Boolean(user.phoneVerifiedAt)
      }
    };
  }

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        displayName: true,
        creatorApplication: true,
        channels: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true, handle: true, displayName: true, description: true, avatarKey: true, _count: { select: { subscriptions: true } } } }
      }
    });
    if (!user || (user.role !== "CREATOR" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ConflictException("Active creator access required");
    }

    const channel = user.channels[0] ?? null;
    const videos = await this.prisma.video.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, status: true, createdAt: true, publishedAt: true,
        _count: { select: { likes: true, comments: true, history: true } },
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } }
      }
    });
    const [videoCount, views, comments] = await Promise.all([
      this.prisma.video.count({ where: { creatorId: userId, deletedAt: null } }),
      this.prisma.watchHistory.count({ where: { video: { creatorId: userId, deletedAt: null } } }),
      this.prisma.comment.count({ where: { video: { creatorId: userId, deletedAt: null }, deletedAt: null } })
    ]);

    return {
      creator: {
        name: user.creatorApplication?.creatorName ?? channel?.displayName ?? user.displayName,
        handle: user.creatorApplication?.handle ?? channel?.handle ?? null,
        bio: user.creatorApplication?.bio ?? channel?.description ?? null,
        profileImageKey: user.creatorApplication?.profileImageKey ?? channel?.avatarKey ?? null
      },
      channel: channel ? { ...channel, subscribers: channel._count.subscriptions } : null,
      stats: { subscribers: channel?._count.subscriptions ?? 0, videos: videoCount, views, comments },
      videos
    };
  }

  async checkHandle(handleInput: string, userId: string) {
    const handle = this.normalizeHandle(handleInput);
    if (handle.length < 3 || handle.length > 30 || this.reservedHandles.has(handle)) {
      return { handle, available: false };
    }
    const [channel, application] = await Promise.all([
      this.prisma.channel.findUnique({ where: { handle } }),
      this.prisma.creatorApplication.findFirst({ where: { handle, userId: { not: userId } } })
    ]);
    return { handle, available: !channel && !application };
  }

  async saveDraft(userId: string, input: SubmitCreatorApplicationDto) {
    return this.persistApplication(userId, input, "DRAFT");
  }

  async submitApplication(userId: string, input: SubmitCreatorApplicationDto) {
    return this.persistApplication(userId, input, "SUBMITTED");
  }

  async createProfileImageUpload(userId: string, contentType: string, fileSize: number) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(contentType) || !Number.isInteger(fileSize) || fileSize <= 0 || fileSize > 5 * 1024 * 1024) {
      throw new ConflictException("Use a JPEG, PNG, or WebP image up to 5 MB");
    }
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const key = `creator-profiles/${userId}/${randomUUID()}.${extension}`;
    return { key, uploadUrl: await this.objectStorage.createUploadUrl(key, contentType) };
  }

  async finalizeProfileImage(userId: string, key: string) {
    const prefix = `creator-profiles/${userId}/`;
    if (!key.startsWith(prefix) || key.includes("..")) throw new ConflictException("Invalid profile image key");
    const head = await this.objectStorage.headObject(key);
    const contentType = head.ContentType ?? "";
    const size = Number(head.ContentLength ?? 0);
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType) || size > 5 * 1024 * 1024) {
      throw new ConflictException("Uploaded profile image is invalid");
    }
    await this.prisma.creatorApplication.upsert({
      where: { userId },
      update: { profileImageKey: key },
      create: { userId, profileImageKey: key }
    });
    return { key, imageUrl: await this.objectStorage.createDownloadUrl(key) };
  }

  private async persistApplication(userId: string, input: SubmitCreatorApplicationDto, status: "DRAFT" | "SUBMITTED") {
    const creatorName = input.creatorName?.trim() || null;
    const handle = input.handle ? this.normalizeHandle(input.handle) : null;
    const category = input.category?.trim() || null;
    const bio = input.bio?.trim() || null;

    if (status === "SUBMITTED" && (!creatorName || !handle || !category || !bio)) {
      throw new ConflictException("Creator name, handle, category, and bio are required");
    }
    if (creatorName && (creatorName.length < 2 || creatorName.length > 50 || /[\u0000-\u001f]/.test(creatorName))) {
      throw new ConflictException("Creator name must be between 2 and 50 characters");
    }
    if (bio && (bio.length < 20 || bio.length > 500)) throw new ConflictException("About your channel must be between 20 and 500 characters");
    if (handle && (handle.length < 3 || handle.length > 30 || this.reservedHandles.has(handle))) throw new ConflictException("Choose a different channel handle");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerifiedAt: true, phoneVerifiedAt: true, creatorApplication: true }
    });
    if (!user) throw new ConflictException("Unable to submit creator application");
    if (user.role === "CREATOR" || user.role === "ADMIN") {
      throw new ConflictException("This account is already a creator");
    }
    if (status === "SUBMITTED" && user.creatorApplication?.status === "SUBMITTED") {
      throw new ConflictException("Your creator application is already under review");
    }
    if (status === "SUBMITTED" && !isCreatorVerificationComplete(Boolean(user.emailVerifiedAt), Boolean(user.phoneVerifiedAt))) {
      throw new ConflictException("Verify your email or phone before submitting your creator application");
    }
    if (status === "SUBMITTED" && !input.termsAccepted) throw new ConflictException("Accept the Creator Terms and Policies before submitting");

    if (handle) {
      const availability = await this.checkHandle(handle, userId);
      if (!availability.available) throw new ConflictException("This channel handle is already taken");
    }

    return this.prisma.creatorApplication.upsert({
      where: { userId },
      update: {
        creatorName,
        handle,
        category,
        bio,
        status,
        submittedAt: status === "SUBMITTED" ? new Date() : user.creatorApplication?.submittedAt,
        reviewedAt: null
        ,termsAcceptedAt: input.termsAccepted ? new Date() : user.creatorApplication?.termsAcceptedAt
      },
      create: {
        userId,
        creatorName,
        handle,
        category,
        bio,
        status,
        submittedAt: status === "SUBMITTED" ? new Date() : null
        ,termsAcceptedAt: input.termsAccepted ? new Date() : null
      }
    });
  }

  private normalizeHandle(value: string) {
    return value.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  }
}