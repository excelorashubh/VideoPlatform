import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
import { RedisQueueService } from "../../queue/redis-queue.service.js";
import type { ChannelAssetKind, CreateCreatorDraftVideoDto, SubmitCreatorApplicationDto, UpdateChannelCustomizationDto, UpdateCreatorVideoDto } from "./creator.dto.js";
import { isCreatorVerificationComplete } from "./verification-policy.js";

type CreatorAnalyticsRange = "7d" | "28d" | "90d" | "365d" | "lifetime";
type CreatorAnalyticsSort = "views" | "likes" | "comments";
type CreatorAnalyticsBucket = { date: string; views: number; likes: number; comments: number; subscriptions: number };
type CreatorAnalyticsVideoRow = {
  id: string;
  title: string;
  thumbnails: Array<{ storageKey: string }>;
  createdAt?: Date;
  publishedAt?: Date | null;
  status?: string;
  visibility?: string;
};

function groupCount(count: true | { _all?: number } | undefined) {
  return count && typeof count === "object" ? count._all ?? 0 : 0;
}

@Injectable()
export class CreatorService {
  private readonly reservedHandles = new Set(["admin", "api", "help", "support", "youtube", "gvp", "global-video-platform"]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
    private readonly queue: RedisQueueService
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
    const videoRows = await this.prisma.video.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, title: true, visibility: true, status: true, createdAt: true, publishedAt: true,
        _count: { select: { likes: true, comments: true, history: true } },
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true, isCustom: true } },
        processingJobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, attempts: true, lastError: true, updatedAt: true } }
      }
    });
    const videos = await Promise.all(videoRows.map(async (video) => ({
      ...video,
      creatorStatus: video.processingJobs[0] && ["QUEUED", "PROCESSING"].includes(video.processingJobs[0].status) ? "PROCESSING" : video.status,
      thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null
    })));
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

  async getContent(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, creatorApplication: { select: { status: true } } } });
    if (!user || (user.role !== "CREATOR" && user.role !== "ADMIN" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ConflictException("Active creator access required");
    }

    const videos = await this.prisma.video.findMany({
      where: { creatorId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
        channel: { select: { displayName: true, handle: true, avatarKey: true } },
        _count: { select: { likes: true, comments: true, history: true } },
        thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true, isCustom: true } },
        uploads: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
        processingJobs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, attempts: true, lastError: true, updatedAt: true } }
      }
    });

    const items = await Promise.all(videos.map(async (video) => {
      const jobStatus = video.processingJobs[0]?.status;
      const uploadStatus = video.uploads[0]?.status;
      const status = jobStatus === "FAILED" ? "FAILED"
        : jobStatus === "QUEUED" || jobStatus === "PROCESSING" ? "PROCESSING"
          : video.status === "READY" ? "READY"
            : uploadStatus === "COMPLETED" ? "UPLOADED"
              : uploadStatus === "CREATED" ? "UPLOADING"
                : video.status;

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        visibility: video.visibility,
        status,
        createdAt: video.createdAt.toISOString(),
        updatedAt: video.updatedAt.toISOString(),
        publishedAt: video.publishedAt?.toISOString() ?? null,
        channel: video.channel,
        thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null,
        views: video._count.history,
        likes: video._count.likes,
        comments: video._count.comments,
        processing: video.processingJobs[0] ? { attempts: video.processingJobs[0].attempts, error: video.processingJobs[0].lastError, updatedAt: video.processingJobs[0].updatedAt.toISOString() } : null
      };
    }));

    return { items, total: items.length };
  }

  async getComments(userId: string, pageInput = "1", searchInput = "", videoId?: string) {
    await this.requireActiveCreator(userId);
    const page = Number(pageInput);
    if (!Number.isInteger(page) || page < 1) throw new BadRequestException("Page must be a positive integer");
    const search = searchInput.trim();
    if (search.length > 100) throw new BadRequestException("Comment search is limited to 100 characters");
    const where = {
      deletedAt: null,
      ...(videoId ? { videoId } : {}),
      ...(search ? { body: { contains: search, mode: "insensitive" as const } } : {}),
      video: { creatorId: userId, deletedAt: null }
    };
    const pageSize = 25;
    const [rows, total, videos] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          body: true,
          videoId: true,
          parentId: true,
          createdAt: true,
          author: { select: { id: true, displayName: true } },
          video: { select: { id: true, title: true } },
          _count: { select: { replies: { where: { deletedAt: null } } } }
        }
      }),
      this.prisma.comment.count({ where }),
      this.prisma.video.findMany({
        where: { creatorId: userId, deletedAt: null, comments: { some: { deletedAt: null } } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, title: true }
      })
    ]);
    return {
      items: rows.map((comment) => ({
        id: comment.id,
        body: comment.body,
        videoId: comment.videoId,
        parentId: comment.parentId,
        createdAt: comment.createdAt.toISOString(),
        replyCount: comment._count.replies,
        author: comment.author,
        video: comment.video
      })),
      videos,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total
    };
  }

  async deleteCreatorComment(userId: string, commentId: string) {
    await this.requireActiveCreator(userId);
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, deletedAt: null, video: { creatorId: userId, deletedAt: null } },
      select: { id: true, videoId: true }
    });
    if (!comment) throw new NotFoundException("Comment not found");
    await this.prisma.$transaction([
      this.prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date(), body: "" } }),
      this.prisma.auditLog.create({ data: { actorId: userId, action: "CREATOR_COMMENT_REMOVED", entityType: "Comment", entityId: comment.id, metadata: { videoId: comment.videoId } } })
    ]);
    return { id: comment.id, deleted: true };
  }

  async getCustomization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        deletedAt: true,
        displayName: true,
        creatorApplication: { select: { status: true, creatorName: true, handle: true, bio: true, profileImageKey: true } },
        channels: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true, handle: true, displayName: true, description: true, avatarKey: true, bannerKey: true } }
      }
    });
    if (!user || user.deletedAt || (user.role !== "CREATOR" && user.role !== "ADMIN" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ForbiddenException("Active creator access required");
    }
    const channel = user.channels[0] ?? null;
    const avatarKey = channel?.avatarKey ?? user.creatorApplication?.profileImageKey ?? null;
    return {
      creator: { name: user.creatorApplication?.creatorName ?? channel?.displayName ?? user.displayName, handle: user.creatorApplication?.handle ?? channel?.handle ?? null },
      channel: channel ? {
        id: channel.id,
        displayName: channel.displayName,
        handle: channel.handle,
        description: channel.description,
        avatarKey,
        bannerKey: channel.bannerKey,
        avatarUrl: avatarKey ? await this.objectStorage.createPresignedDownloadUrl(avatarKey, 300) : null,
        bannerUrl: channel.bannerKey ? await this.objectStorage.createPresignedDownloadUrl(channel.bannerKey, 300) : null
      } : null
    };
  }

  async updateCustomization(userId: string, input: UpdateChannelCustomizationDto) {
    await this.requireActiveCreator(userId);
    const channel = await this.prisma.channel.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
    if (!channel) throw new NotFoundException("Creator channel not found");
    const displayName = input.displayName?.trim();
    const handle = input.handle === undefined ? undefined : this.normalizeHandle(input.handle);
    const description = input.description?.trim();
    if (input.displayName !== undefined && (!displayName || displayName.length < 2 || displayName.length > 50)) throw new BadRequestException("Channel name must be between 2 and 50 characters");
    if (handle !== undefined && (handle.length < 3 || handle.length > 30 || this.reservedHandles.has(handle))) throw new BadRequestException("Choose a valid channel handle");
    if (input.description !== undefined && (description?.length ?? 0) > 500) throw new BadRequestException("Channel description must be 500 characters or fewer");
    if (handle && handle !== channel.handle) {
      const [existingChannel, existingApplication] = await Promise.all([
        this.prisma.channel.findUnique({ where: { handle }, select: { id: true } }),
        this.prisma.creatorApplication.findFirst({ where: { handle, userId: { not: userId } }, select: { id: true } })
      ]);
      if (existingChannel || existingApplication) throw new ConflictException("This channel handle is already taken");
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const savedChannel = await transaction.channel.update({
        where: { id: channel.id },
        data: {
          ...(displayName === undefined ? {} : { displayName }),
          ...(handle === undefined ? {} : { handle }),
          ...(input.description === undefined ? {} : { description: description || null })
        }
      });
      const application = await transaction.creatorApplication.findUnique({ where: { userId }, select: { id: true } });
      if (application) await transaction.creatorApplication.update({
        where: { userId },
        data: {
          ...(displayName === undefined ? {} : { creatorName: displayName }),
          ...(handle === undefined ? {} : { handle }),
          ...(input.description === undefined ? {} : { bio: description || null })
        }
      });
      await transaction.auditLog.create({
        data: { actorId: userId, action: "CHANNEL_CUSTOMIZATION_UPDATED", entityType: "Channel", entityId: channel.id, metadata: { fields: Object.keys(input) } }
      });
      return savedChannel;
    });
    return { id: updated.id, displayName: updated.displayName, handle: updated.handle, description: updated.description };
  }

  async createChannelAssetUpload(userId: string, kind: ChannelAssetKind, contentType: string, fileSize: number) {
    await this.requireChannel(userId);
    if (kind !== "avatar" && kind !== "banner") throw new BadRequestException("Unsupported channel asset");
    const maxSize = kind === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType) || !Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maxSize) {
      throw new BadRequestException(`Use a JPEG, PNG, or WebP ${kind} up to ${maxSize / (1024 * 1024)} MB`);
    }
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const key = this.objectStorage.buildChannelAssetKey(userId, kind, `${randomUUID()}.${extension}`);
    return { key, uploadUrl: await this.objectStorage.createPresignedUploadUrl(key, contentType) };
  }

  async completeChannelAssetUpload(userId: string, kind: ChannelAssetKind, key: string) {
    const channel = await this.requireChannel(userId);
    if (kind !== "avatar" && kind !== "banner") throw new BadRequestException("Unsupported channel asset");
    const prefix = this.objectStorage.buildChannelAssetKey(userId, kind, "");
    const maxSize = kind === "avatar" ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!key.startsWith(prefix) || key.includes("..")) throw new BadRequestException("Invalid channel asset key");
    const metadata = await this.objectStorage.getObjectMetadata(key);
    if (!["image/jpeg", "image/png", "image/webp"].includes(metadata.contentType) || metadata.contentLength <= 0 || metadata.contentLength > maxSize) {
      throw new BadRequestException("Uploaded channel image is invalid");
    }
    const bytes = await this.objectStorage.getObjectPrefix(key, 12);
    const signatureType = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? "image/jpeg"
      : bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ? "image/png"
        : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
          ? "image/webp"
          : null;
    if (signatureType !== metadata.contentType) {
      await this.objectStorage.deleteObject(key);
      throw new BadRequestException("Uploaded image content does not match its type");
    }
    await this.prisma.channel.update({ where: { id: channel.id }, data: kind === "avatar" ? { avatarKey: key } : { bannerKey: key } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: "CHANNEL_ASSET_UPDATED", entityType: "Channel", entityId: channel.id, metadata: { kind, key } } });
    return { channelId: channel.id, kind, key, updated: true };
  }

  async getAnalytics(userId: string, rangeInput = "28d", sortInput = "views") {
    const ranges = new Set<CreatorAnalyticsRange>(["7d", "28d", "90d", "365d", "lifetime"]);
    const sorts = new Set<CreatorAnalyticsSort>(["views", "likes", "comments"]);
    if (!ranges.has(rangeInput as CreatorAnalyticsRange)) throw new BadRequestException("Unsupported analytics range");
    if (!sorts.has(sortInput as CreatorAnalyticsSort)) throw new BadRequestException("Unsupported analytics sort");

    const range = rangeInput as CreatorAnalyticsRange;
    const sortBy = sortInput as CreatorAnalyticsSort;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        deletedAt: true,
        displayName: true,
        creatorApplication: { select: { status: true, creatorName: true, handle: true } },
        channels: { orderBy: { createdAt: "asc" }, take: 1, select: { displayName: true, handle: true } }
      }
    });
    if (!user || user.deletedAt || (user.role !== "CREATOR" && user.role !== "ADMIN" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ForbiddenException("Active creator access required");
    }

    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const rangeDays: Record<Exclude<CreatorAnalyticsRange, "lifetime">, number> = { "7d": 7, "28d": 28, "90d": 90, "365d": 365 };
    const days = range === "lifetime" ? null : rangeDays[range];
    const periodStart = days === null ? new Date(0) : new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = days === null ? null : new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);
    const granularity = range === "lifetime" ? "month" : "day";
    const dateFormat = range === "lifetime" ? "YYYY-MM" : "YYYY-MM-DD";

    const aggregatePeriod = (start: Date, end: Date) => this.prisma.$queryRaw<CreatorAnalyticsBucket[]>`
      WITH analytics_events AS (
        SELECT date_trunc(${granularity}, history."watchedAt") AS bucket,
          count(*)::int AS views, 0::int AS likes, 0::int AS comments, 0::int AS subscriptions
        FROM "WatchHistory" history
        INNER JOIN "Video" video ON video.id = history."videoId"
        WHERE video."creatorId" = ${userId}::uuid
          AND video."deletedAt" IS NULL
          AND video."status" = 'READY'
          AND video."visibility" IN ('PUBLIC', 'UNLISTED')
          AND history."watchedAt" >= ${start}
          AND history."watchedAt" < ${end}
        GROUP BY 1
        UNION ALL
        SELECT date_trunc(${granularity}, reaction."createdAt") AS bucket,
          0::int AS views, count(*)::int AS likes, 0::int AS comments, 0::int AS subscriptions
        FROM "VideoReaction" reaction
        INNER JOIN "Video" video ON video.id = reaction."videoId"
        WHERE video."creatorId" = ${userId}::uuid
          AND video."deletedAt" IS NULL
          AND video."status" = 'READY'
          AND video."visibility" IN ('PUBLIC', 'UNLISTED')
          AND reaction."type" = 'LIKE'
          AND reaction."createdAt" >= ${start}
          AND reaction."createdAt" < ${end}
        GROUP BY 1
        UNION ALL
        SELECT date_trunc(${granularity}, comment."createdAt") AS bucket,
          0::int AS views, 0::int AS likes, count(*)::int AS comments, 0::int AS subscriptions
        FROM "Comment" comment
        INNER JOIN "Video" video ON video.id = comment."videoId"
        WHERE video."creatorId" = ${userId}::uuid
          AND video."deletedAt" IS NULL
          AND video."status" = 'READY'
          AND video."visibility" IN ('PUBLIC', 'UNLISTED')
          AND comment."deletedAt" IS NULL
          AND comment."createdAt" >= ${start}
          AND comment."createdAt" < ${end}
        GROUP BY 1
        UNION ALL
        SELECT date_trunc(${granularity}, subscription."createdAt") AS bucket,
          0::int AS views, 0::int AS likes, 0::int AS comments, count(*)::int AS subscriptions
        FROM "Subscription" subscription
        INNER JOIN "Channel" channel ON channel.id = subscription."channelId"
        WHERE channel."ownerId" = ${userId}::uuid
          AND subscription."createdAt" >= ${start}
          AND subscription."createdAt" < ${end}
        GROUP BY 1
      )
      SELECT to_char(bucket, ${dateFormat}) AS date,
        sum(views)::int AS views,
        sum(likes)::int AS likes,
        sum(comments)::int AS comments,
        sum(subscriptions)::int AS subscriptions
      FROM analytics_events
      GROUP BY bucket
      ORDER BY bucket
    `;

    const eligibleVideoFilter = {
      creatorId: userId,
      deletedAt: null,
      status: "READY" as const,
      visibility: { in: ["PUBLIC", "UNLISTED"] as ("PUBLIC" | "UNLISTED")[] }
    };
    const periodFilter = { gte: periodStart, lt: periodEnd };
    const [seriesRows, previousRows, subscribers, firstVideo, uniqueViewers, viewsByVideo, likesByVideo, commentsByVideo, recentRows] = await Promise.all([
      aggregatePeriod(periodStart, periodEnd),
      previousStart ? aggregatePeriod(previousStart, periodStart) : Promise.resolve(null),
      this.prisma.subscription.count({ where: { channel: { ownerId: userId } } }),
      this.prisma.video.findFirst({ where: { creatorId: userId, deletedAt: null }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT count(DISTINCT history."userId")::int AS count
        FROM "WatchHistory" history
        INNER JOIN "Video" video ON video.id = history."videoId"
        WHERE video."creatorId" = ${userId}::uuid
          AND video."deletedAt" IS NULL
          AND video."status" = 'READY'
          AND video."visibility" IN ('PUBLIC', 'UNLISTED')
          AND history."watchedAt" >= ${periodStart}
          AND history."watchedAt" < ${periodEnd}
      `,
      this.prisma.watchHistory.groupBy({
        by: ["videoId"],
        where: { watchedAt: periodFilter, video: eligibleVideoFilter },
        _count: { _all: true }
      }),
      this.prisma.videoReaction.groupBy({
        by: ["videoId"],
        where: { createdAt: periodFilter, type: "LIKE", video: eligibleVideoFilter },
        _count: { _all: true }
      }),
      this.prisma.comment.groupBy({
        by: ["videoId"],
        where: { createdAt: periodFilter, deletedAt: null, video: eligibleVideoFilter },
        _count: { _all: true }
      }),
      this.prisma.video.findMany({
        where: { creatorId: userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          visibility: true,
          createdAt: true,
          publishedAt: true,
          thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } }
        }
      })
    ]);

    const metrics = (rows: CreatorAnalyticsBucket[] | null) => (rows ?? []).reduce((total, row) => ({
      views: total.views + row.views,
      likes: total.likes + row.likes,
      comments: total.comments + row.comments,
      subscriptions: total.subscriptions + row.subscriptions
    }), { views: 0, likes: 0, comments: 0, subscriptions: 0 });
    const overview = { ...metrics(seriesRows), subscribers };
    const previousPeriod = previousRows ? metrics(previousRows) : null;
    const seriesStart = range === "lifetime"
      ? firstVideo?.createdAt ?? new Date(periodEnd.getTime() - 28 * 24 * 60 * 60 * 1000)
      : periodStart;
    const cursor = new Date(seriesStart);
    if (granularity === "month") cursor.setUTCDate(1);
    else cursor.setUTCHours(0, 0, 0, 0);
    const rowByDate = new Map(seriesRows.map((row) => [row.date, row]));
    const series: CreatorAnalyticsBucket[] = [];
    while (cursor < periodEnd) {
      const date = granularity === "month"
        ? `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`
        : cursor.toISOString().slice(0, 10);
      series.push(rowByDate.get(date) ?? { date, views: 0, likes: 0, comments: 0, subscriptions: 0 });
      if (granularity === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const viewCounts = new Map(viewsByVideo.map((row) => [row.videoId, groupCount(row._count)]));
    const likeCounts = new Map(likesByVideo.map((row) => [row.videoId, groupCount(row._count)]));
    const commentCounts = new Map(commentsByVideo.map((row) => [row.videoId, groupCount(row._count)]));
    const videoIds = new Set([...viewCounts.keys(), ...likeCounts.keys(), ...commentCounts.keys()]);
    const valueFor = (id: string) => sortBy === "views" ? viewCounts.get(id) ?? 0 : sortBy === "likes" ? likeCounts.get(id) ?? 0 : commentCounts.get(id) ?? 0;
    const topIds = [...videoIds].sort((left, right) => valueFor(right) - valueFor(left)).slice(0, 8);
    const [topRows, uniqueViewerRows] = await Promise.all([
      topIds.length ? this.prisma.video.findMany({
        where: { id: { in: topIds }, creatorId: userId, deletedAt: null },
        select: {
          id: true,
          title: true,
          thumbnails: { where: { isDefault: true }, take: 1, select: { storageKey: true } }
        }
      }) : Promise.resolve([]),
      uniqueViewers
    ]);
    const topById = new Map(topRows.map((video) => [video.id, video]));
    const presentVideos = async (rows: CreatorAnalyticsVideoRow[], includePublication: boolean) => Promise.all(rows.map(async (video) => ({
      id: video.id,
      title: video.title,
      thumbnailUrl: video.thumbnails[0] ? await this.objectStorage.createPresignedDownloadUrl(video.thumbnails[0].storageKey, 300) : null,
      ...(includePublication && video.createdAt ? {
        createdAt: video.createdAt.toISOString(),
        publishedAt: video.publishedAt?.toISOString() ?? null,
        status: video.status ?? "DRAFT",
        visibility: video.visibility ?? "PRIVATE"
      } : {}),
      views: viewCounts.get(video.id) ?? 0,
      likes: likeCounts.get(video.id) ?? 0,
      comments: commentCounts.get(video.id) ?? 0
    })));

    const [topVideos, recentVideos] = await Promise.all([
      presentVideos(topIds.flatMap((id) => topById.has(id) ? [topById.get(id)!] : []), false),
      presentVideos(recentRows, true)
    ]);

    return {
      range,
      sortBy,
      creator: {
        name: user.creatorApplication?.creatorName ?? user.channels[0]?.displayName ?? user.displayName,
        handle: user.creatorApplication?.handle ?? user.channels[0]?.handle ?? null
      },
      overview,
      previousPeriod,
      series,
      audience: { uniqueViewers: uniqueViewerRows[0]?.count ?? 0 },
      topVideos,
      recentVideos,
      hasActivity: overview.views > 0 || overview.likes > 0 || overview.comments > 0 || overview.subscribers > 0
    };
  }

  async createDraftVideo(userId: string, input: CreateCreatorDraftVideoDto) {
    const title = input.title?.trim();
    if (!title || title.length > 100) throw new BadRequestException("A video title between 1 and 100 characters is required");
    if (input.visibility !== undefined && !["PUBLIC", "UNLISTED", "PRIVATE"].includes(input.visibility)) throw new BadRequestException("Invalid video visibility");

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, displayName: true, creatorApplication: { select: { handle: true } }, channels: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true } } }
    });
    if (!user || (user.role !== "CREATOR" && user.role !== "ADMIN")) throw new ConflictException("Active creator access required");

    if (input.videoId) {
      const existing = await this.prisma.video.findFirst({ where: { id: input.videoId, creatorId: userId, status: "DRAFT", deletedAt: null } });
      if (!existing) throw new NotFoundException("Draft video not found");
      return existing;
    }

    let channelId = user.channels[0]?.id;
    if (!channelId) {
      const baseHandle = (user.creatorApplication?.handle ?? user.displayName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "creator";
      let handle = baseHandle;
      let suffix = 2;
      while (await this.prisma.channel.findUnique({ where: { handle } })) handle = `${baseHandle}-${suffix++}`;
      const channel = await this.prisma.channel.create({ data: { ownerId: userId, handle, displayName: user.displayName } });
      channelId = channel.id;
    }

    return this.prisma.video.create({
      data: { creatorId: userId, channelId, title, description: input.description?.trim() || null, visibility: input.visibility ?? "PUBLIC", status: "DRAFT" }
    });
  }

  async updateVideo(userId: string, videoId: string, input: UpdateCreatorVideoDto) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.deletedAt) throw new NotFoundException("Video not found");
    if (video.creatorId !== userId) throw new ForbiddenException("You do not own this video");
    if (input.title !== undefined && (!input.title.trim() || input.title.trim().length > 100)) throw new BadRequestException("A video title between 1 and 100 characters is required");
    if (input.visibility !== undefined && !["PUBLIC", "UNLISTED", "PRIVATE"].includes(input.visibility)) throw new BadRequestException("Invalid video visibility");
    const updated = await this.prisma.video.update({ where: { id: video.id }, data: {
      ...(input.title === undefined ? {} : { title: input.title.trim() }),
      ...(input.description === undefined ? {} : { description: input.description.trim() || null }),
      ...(input.visibility === undefined ? {} : { visibility: input.visibility })
    } });
    await this.prisma.auditLog.create({
      data: { actorId: userId, action: input.visibility === undefined ? "VIDEO_UPDATED" : "VIDEO_VISIBILITY_CHANGED", entityType: "Video", entityId: video.id, metadata: { fields: Object.keys(input) } }
    });
    return updated;
  }

  async deleteVideo(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, creatorId: true, deletedAt: true }
    });
    if (!video || video.deletedAt) throw new NotFoundException("Video not found");
    if (video.creatorId !== userId) throw new ForbiddenException("You do not own this video");

    const prefix = this.objectStorage.buildUserVideoKey(userId, videoId, "original").replace(/\/original$/, "");
    await this.objectStorage.deletePrefix(`${prefix}/`);
    await this.prisma.processingJob.updateMany({ where: { videoId, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "FAILED", lastError: "Video deleted by creator" } });
    await this.prisma.video.delete({ where: { id: videoId } });
    await this.prisma.auditLog.create({ data: { actorId: userId, action: "VIDEO_DELETED", entityType: "Video", entityId: videoId } });
    return { id: videoId, deleted: true };
  }

  async retryProcessing(userId: string, videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId }, select: { id: true, creatorId: true, deletedAt: true } });
    if (!video || video.deletedAt) throw new NotFoundException("Video not found");
    if (video.creatorId !== userId) throw new ForbiddenException("You do not own this video");
    const job = await this.prisma.processingJob.findFirst({ where: { videoId, status: "FAILED" }, orderBy: { createdAt: "desc" } });
    if (!job) throw new ConflictException("This video has no failed processing job to retry");
    const retried = await this.prisma.processingJob.update({ where: { id: job.id }, data: { status: "QUEUED", availableAt: new Date(), lastError: null } });
    await this.prisma.video.update({ where: { id: videoId }, data: { status: "DRAFT" } });
    await this.queue.enqueue(retried.id);
    return { id: retried.id, status: retried.status };
  }

  async createThumbnailUpload(userId: string, videoId: string, contentType: string, fileSize: number) {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(contentType) || !Number.isInteger(fileSize) || fileSize <= 0 || fileSize > 10 * 1024 * 1024) throw new BadRequestException("Use a JPEG, PNG, or WebP thumbnail up to 10 MB");
    const video = await this.prisma.video.findFirst({ where: { id: videoId, creatorId: userId, deletedAt: null } });
    if (!video) throw new NotFoundException("Video not found");
    const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
    const key = this.objectStorage.buildUserVideoKey(userId, videoId, "thumbnails", `${randomUUID()}.${extension}`);
    return { key, uploadUrl: await this.objectStorage.createPresignedUploadUrl(key, contentType) };
  }

  async completeThumbnailUpload(userId: string, videoId: string, key: string) {
    const video = await this.prisma.video.findFirst({ where: { id: videoId, creatorId: userId, deletedAt: null } });
    if (!video) throw new NotFoundException("Video not found");
    const prefix = `${this.objectStorage.buildUserVideoKey(userId, videoId, "thumbnails")}/`;
    if (!key.startsWith(prefix) || key.includes("..")) throw new BadRequestException("Invalid thumbnail key");
    const metadata = await this.objectStorage.getObjectMetadata(key);
    if (!["image/jpeg", "image/png", "image/webp"].includes(metadata.contentType) || metadata.contentLength <= 0 || metadata.contentLength > 10 * 1024 * 1024) {
      await this.objectStorage.deleteObject(key);
      throw new BadRequestException("Uploaded thumbnail is invalid");
    }
    const extension = key.split(".").pop()?.toLowerCase();
    const bytes = await this.objectStorage.getObjectPrefix(key, 12);
    const signatureType = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      ? "image/jpeg"
      : bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        ? "image/png"
        : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP"
          ? "image/webp"
          : null;
    const expectedExtension = signatureType === "image/jpeg" ? "jpg" : signatureType?.split("/")[1];
    if (!signatureType || signatureType !== metadata.contentType || extension !== expectedExtension) {
      await this.objectStorage.deleteObject(key);
      throw new BadRequestException("Uploaded thumbnail content does not match its image type");
    }
    const previous = await this.prisma.thumbnail.findFirst({ where: { videoId, isCustom: true } });
    await this.prisma.$transaction(async (transaction) => {
      await transaction.thumbnail.updateMany({ where: { videoId, isDefault: true }, data: { isDefault: false } });
      await transaction.thumbnail.deleteMany({ where: { videoId, isCustom: true } });
      await transaction.thumbnail.create({ data: { videoId, storageKey: key, isDefault: true, isCustom: true } });
    });
    if (previous && previous.storageKey !== key) await this.objectStorage.deleteObject(previous.storageKey);
    return { videoId, key, contentType: metadata.contentType, fileSize: metadata.contentLength };
  }

  async removeThumbnail(userId: string, videoId: string, key: string) {
    const video = await this.prisma.video.findFirst({ where: { id: videoId, creatorId: userId, deletedAt: null } });
    if (!video) throw new NotFoundException("Video not found");
    const prefix = `${this.objectStorage.buildUserVideoKey(userId, videoId, "thumbnails")}/`;
    if (!key.startsWith(prefix) || key.includes("..")) throw new BadRequestException("Invalid thumbnail key");
    const thumbnail = await this.prisma.thumbnail.findFirst({ where: { videoId, storageKey: key, isCustom: true } });
    if (!thumbnail) throw new NotFoundException("Custom thumbnail not found");
    await this.prisma.thumbnail.delete({ where: { id: thumbnail.id } });
    await this.objectStorage.deleteObject(key);
    return { videoId, key, removed: true };
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

  private async requireActiveCreator(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, deletedAt: true, creatorApplication: { select: { status: true } } } });
    if (!user || user.deletedAt || (user.role !== "CREATOR" && user.role !== "ADMIN" && user.creatorApplication?.status !== "APPROVED")) {
      throw new ForbiddenException("Active creator access required");
    }
  }

  private async requireChannel(userId: string) {
    await this.requireActiveCreator(userId);
    const channel = await this.prisma.channel.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
    if (!channel) throw new NotFoundException("Creator channel not found");
    return channel;
  }
}