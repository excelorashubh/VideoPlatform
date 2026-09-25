import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service.js";
import { isCreatorVerificationComplete } from "../creator/verification-policy.js";
import { hashPassword, sanitizeUser, UsersService } from "../users/users.service.js";

type HealthStatus = "Operational" | "Degraded" | "Unavailable";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly usersService: UsersService) {}

  private async resolveStorageHealth() {
    const hasEndpoint = Boolean(process.env.MINIO_ENDPOINT || process.env.AWS_S3_ENDPOINT);
    const totalObjects = await this.prisma.videoFile.count();
    const totalSize = await this.prisma.videoFile.aggregate({ _sum: { fileSize: true } });

    return {
      status: hasEndpoint ? "Operational" : "Degraded",
      bucket: process.env.MINIO_BUCKET ?? "media",
      totalObjects,
      totalSize: Number(totalSize._sum.fileSize ?? 0n)
    };
  }

  async overview() {
    const [users, creators, videos, reports, queuedJobs, storageUploads] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: "CREATOR", deletedAt: null } }),
      this.prisma.video.count({ where: { deletedAt: null } }),
      this.prisma.report.count(),
      this.prisma.processingJob.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
      this.prisma.upload.count()
    ]);
    return { users, creators, videos, reports, queuedJobs, storageUploads };
  }

  async health() {
    let databaseStatus: HealthStatus = "Operational";

    try {
      await this.prisma.$queryRaw`SELECT 1 as ok`;
    } catch {
      databaseStatus = "Unavailable";
    }

    const redisStatus: HealthStatus = process.env.REDIS_URL ? "Operational" : "Degraded";
    const storageStatus: HealthStatus = process.env.MINIO_ENDPOINT || process.env.AWS_S3_ENDPOINT ? "Operational" : "Degraded";
    const processingStatus: HealthStatus = process.env.REDIS_URL ? "Operational" : "Degraded";

    return {
      database: { label: "Database", status: databaseStatus },
      redis: { label: "Redis", status: redisStatus },
      storage: { label: "Object Storage", status: storageStatus },
      processing: { label: "Media Processing", status: processingStatus }
    };
  }

  async users(search?: string, role?: string, status?: string) {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } }
      ];
    }

    if (role && role !== "ALL") {
      where.role = role;
    }

    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        where.deletedAt = null;
        where.suspendedAt = null;
      }
      if (status === "SUSPENDED") {
        where.suspendedAt = { not: null };
      }
      if (status === "DELETED") {
        where.deletedAt = { not: null };
      }
    }

    return this.prisma.user.findMany({
      where,
      select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true, suspendedAt: true, deletedAt: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  private requireSuperAdmin(actorRole: "ADMIN" | "SUPER_ADMIN") {
    if (actorRole !== "SUPER_ADMIN") {
      throw new ConflictException("Only a super admin can manage users");
    }
  }

  async createUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", input: { email: string; displayName: string; password: string; role?: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" }) {
    this.requireSuperAdmin(actorRole);
    const user = await this.usersService.create(input);
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_CREATED", entityType: "User", entityId: user.id, metadata: { role: user.role } }
    });
    return user;
  }

  async updateUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string, input: { email?: string; displayName?: string; password?: string; role?: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" }) {
    this.requireSuperAdmin(actorRole);
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException("User not found");
    if (input.role === "SUPER_ADMIN" || existing.role === "SUPER_ADMIN") this.requireSuperAdmin(actorRole);

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
    if (input.displayName !== undefined) data.displayName = input.displayName.trim();
    if (input.role !== undefined) data.role = input.role;
    if (input.password) data.passwordHash = await hashPassword(input.password);

    const user = await this.prisma.user.update({ where: { id: userId }, data });
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_UPDATED", entityType: "User", entityId: userId, metadata: { fields: Object.keys(input).filter((field) => field !== "password") } }
    });
    return sanitizeUser(user);
  }

  async deleteUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    this.requireSuperAdmin(actorRole);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException("User not found");
    if (actorId === userId) throw new ConflictException("You cannot delete your own administrator account");
    if (user.role === "SUPER_ADMIN") throw new ConflictException("Super-admin accounts cannot be deleted");

    await this.prisma.$transaction(async (transaction) => {
      const channels = await transaction.channel.findMany({ where: { ownerId: userId }, select: { id: true } });
      const channelIds = channels.map((channel) => channel.id);

      await transaction.auditLog.create({
        data: { actorId, action: "USER_DELETED", entityType: "User", entityId: userId, metadata: { hardDelete: true } }
      });
      await transaction.moderationAction.deleteMany({ where: { moderatorId: userId } });
      await transaction.report.deleteMany({ where: { reporterId: userId } });
      await transaction.comment.deleteMany({ where: { authorId: userId } });

      await transaction.video.deleteMany({
        where: channelIds.length
          ? { OR: [{ creatorId: userId }, { channelId: { in: channelIds } }] }
          : { creatorId: userId }
      });

      if (channelIds.length) {
        await transaction.channel.deleteMany({ where: { id: { in: channelIds } } });
      }

      await transaction.user.delete({ where: { id: userId } });
    });

    return { id: userId, deleted: true };
  }

  async suspendUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    this.requireSuperAdmin(actorRole);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "SUPER_ADMIN") throw new ConflictException("Super-admin accounts cannot be suspended");
    const suspendedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: new Date() },
      select: { id: true, suspendedAt: true }
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_SUSPENDED", entityType: "User", entityId: userId }
    });
    return { id: suspendedUser.id, suspendedAt: suspendedUser.suspendedAt };
  }

  async restoreSuspendedUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    this.requireSuperAdmin(actorRole);
    const user = await this.prisma.user.update({ where: { id: userId }, data: { suspendedAt: null } });
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_UNSUSPENDED", entityType: "User", entityId: userId }
    });
    return sanitizeUser(user);
  }

  async restoreUser(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    this.requireSuperAdmin(actorRole);
    const user = await this.prisma.user.update({ where: { id: userId }, data: { deletedAt: null } });
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_RESTORED", entityType: "User", entityId: userId }
    });
    return sanitizeUser(user);
  }

  async creators(search?: string, status?: string) {
    const where: Record<string, unknown> = { creatorApplication: { isNot: null } };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } }
      ];
    }

    if (status && status !== "ALL") {
      if (status === "ACTIVE") {
        where.deletedAt = null;
        where.role = "CREATOR";
      }
      if (status === "SUSPENDED") {
        where.deletedAt = { not: null };
      }
      if (status === "PENDING") {
        where.creatorApplication = { status: "SUBMITTED" };
      }
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, displayName: true, email: true, role: true, createdAt: true, updatedAt: true, deletedAt: true, emailVerifiedAt: true, phoneVerifiedAt: true, channels: { select: { id: true, handle: true, displayName: true, description: true } }, creatorApplication: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return users.map((user) => ({
      id: user.id,
      name: user.displayName,
      email: user.email,
      handle: user.channels[0]?.handle ?? "pending",
      category: "General",
      status: user.deletedAt ? "SUSPENDED" : user.creatorApplication?.status === "SUBMITTED" ? "PENDING" : user.creatorApplication?.status === "APPROVED" || user.role === "CREATOR" ? "ACTIVE" : user.creatorApplication?.status ?? "DRAFT",
      applicationDate: user.createdAt,
      verificationStatus: isCreatorVerificationComplete(Boolean(user.emailVerifiedAt), Boolean(user.phoneVerifiedAt)) ? "Verified" : "Verification required",
      subscribers: 0,
      creator: user,
    }));
  }

  async approveCreator(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    if (actorRole !== "ADMIN" && actorRole !== "SUPER_ADMIN") throw new ConflictException("Administrator access required");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, emailVerifiedAt: true, phoneVerifiedAt: true, creatorApplication: true } });
    if (!user?.creatorApplication) throw new NotFoundException("Creator application not found");
    if (!isCreatorVerificationComplete(Boolean(user.emailVerifiedAt), Boolean(user.phoneVerifiedAt))) {
      throw new ConflictException("Verify your email or phone before approving this creator");
    }
    const updated = await this.prisma.$transaction([
      this.prisma.creatorApplication.update({ where: { userId }, data: { status: "APPROVED", reviewedAt: new Date() } }),
      this.prisma.user.update({ where: { id: userId }, data: { role: "CREATOR" } })
    ]);
    await this.prisma.auditLog.create({ data: { actorId, action: "CREATOR_APPROVED", entityType: "User", entityId: userId } });
    return { application: updated[0], user: { id: updated[1].id, role: updated[1].role } };
  }

  async rejectCreator(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string) {
    if (actorRole !== "ADMIN" && actorRole !== "SUPER_ADMIN") throw new ConflictException("Administrator access required");
    const application = await this.prisma.creatorApplication.findUnique({ where: { userId } });
    if (!application) throw new NotFoundException("Creator application not found");
    const updated = await this.prisma.creatorApplication.update({ where: { userId }, data: { status: "REJECTED", reviewedAt: new Date() } });
    await this.prisma.auditLog.create({ data: { actorId, action: "CREATOR_REJECTED", entityType: "User", entityId: userId } });
    return updated;
  }

  async content(search?: string, status?: string, visibility?: string) {
    const where: Record<string, unknown> = { deletedAt: null };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { creator: { displayName: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (visibility && visibility !== "ALL") {
      where.status = visibility;
    }

    return this.prisma.video.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        creator: { select: { displayName: true } },
        channel: { select: { handle: true } },
        files: { select: { storageKey: true } },
        _count: { select: { likes: true, comments: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async moderation() {
    const reports = await this.prisma.report.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        reporter: { select: { displayName: true } },
        targetType: true,
        targetId: true
      }
    });

    return reports.map((report) => ({
      id: report.id,
      kind: report.targetType,
      reason: report.reason,
      count: 1,
      status: "OPEN",
      createdAt: report.createdAt,
      reporter: report.reporter.displayName,
      assignedModerator: "Unassigned",
      targetId: report.targetId,
    }));
  }

  async reports(search?: string, status?: string) {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: "insensitive" } },
        { reporter: { displayName: { contains: search, mode: "insensitive" } } },
        { targetType: { contains: search, mode: "insensitive" } }
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    return this.prisma.report.findMany({
      where,
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        reporter: { select: { displayName: true } },
        targetType: true,
        targetId: true
      }
    });
  }

  async uploads() {
    return this.prisma.upload.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        fileSize: true,
        contentType: true,
        creator: { select: { displayName: true } },
        video: { select: { title: true } }
      }
    });
  }

  async processing() {
    return this.prisma.processingJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        status: true,
        type: true,
        attempts: true,
        availableAt: true,
        createdAt: true,
        updatedAt: true,
        lastError: true,
        video: { select: { title: true } }
      }
    });
  }

  async analytics(range?: string) {
    const [users, creators, videos, activeUsers, subscriptions, reports, uploads] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { role: "CREATOR", deletedAt: null } }),
      this.prisma.video.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { updatedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) }, deletedAt: null } }),
      this.prisma.subscription.count(),
      this.prisma.report.count(),
      this.prisma.upload.count()
    ]);

    const totalViews = await this.prisma.watchHistory.aggregate({ _sum: { progressSeconds: true } });

    return {
      range: range ?? "30d",
      metrics: {
        users,
        creators,
        videos,
        views: Number(totalViews._sum.progressSeconds ?? 0),
        watchTime: Number(totalViews._sum.progressSeconds ?? 0),
        uploads,
        activeUsers,
        subscriptions,
        reports,
      }
    };
  }

  async subscriptions(status?: string) {
    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    return this.prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        createdAt: true,
        user: { select: { displayName: true } },
        channel: { select: { handle: true, displayName: true } }
      }
    });
  }

  async monetization() {
    const creators = await this.prisma.user.findMany({
      where: { role: "CREATOR", deletedAt: null },
      select: {
        id: true,
        displayName: true,
        channels: { select: { handle: true } },
        videos: { select: { id: true } },
      },
      take: 100,
    });

    return {
      threshold: { subscribers: 1000, watchHours: 2000 },
      eligible: creators.slice(0, 10).map((creator) => ({
        id: creator.id,
        name: creator.displayName,
        handle: creator.channels[0]?.handle ?? "unknown",
        subscribers: 0,
        watchHours: 0,
        status: "PENDING"
      })),
      totalEligible: creators.length,
      paymentStatus: "Not Connected"
    };
  }

  async storage() {
    const storage = await this.resolveStorageHealth();
    const failedOperations = await this.prisma.upload.findMany({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, status: true, contentType: true, createdAt: true }
    });

    return {
      connectionStatus: storage.status,
      bucket: storage.bucket,
      totalObjects: storage.totalObjects,
      totalTrackedMedia: storage.totalObjects,
      totalStorageSize: storage.totalSize,
      failedStorageOperations: failedOperations,
      recentStorageActivity: failedOperations.slice(0, 10),
      endpoint: process.env.MINIO_ENDPOINT ?? process.env.AWS_S3_ENDPOINT ?? "Not configured",
    };
  }

  async settings() {
    return {
      platform: {
        name: "GVP",
        description: "Global Video Platform",
        maintenanceMode: false,
      },
      registration: {
        allowRegistration: true,
        emailVerificationRequired: false,
        phoneVerificationRequired: false,
      },
      creator: {
        onboardingEnabled: true,
        reviewRequired: true,
        monetizationThresholdSubscribers: 1000,
        monetizationThresholdWatchHours: 2000,
      },
      upload: {
        maxUploadSizeMb: 5000,
        allowedFileTypes: ["video/mp4", "video/quicktime", "image/jpeg"],
      },
      processing: {
        retryLimit: 3,
      },
      moderation: {
        reportingEnabled: true,
      },
      storage: {
        providerStatus: process.env.MINIO_ENDPOINT || process.env.AWS_S3_ENDPOINT ? "Configured" : "Not configured",
      }
    };
  }

  async updateSettings(actorId: string, input: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "SETTINGS_CHANGED",
        entityType: "Settings",
        entityId: null,
        metadata: input as Prisma.InputJsonValue,
      }
    });

    return { success: true, updated: Object.keys(input) };
  }

  async auditLogs(search?: string, action?: string) {
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entityType: { contains: search, mode: "insensitive" } },
        { actor: { displayName: { contains: search, mode: "insensitive" } } }
      ];
    }

    if (action) {
      where.action = action;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        metadata: true,
        actor: { select: { displayName: true, email: true } }
      }
    });
  }

  async updateUserRole(actorId: string, actorRole: "ADMIN" | "SUPER_ADMIN", userId: string, role: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN") {
    this.requireSuperAdmin(actorRole);
    if (actorId === userId && role !== "SUPER_ADMIN") throw new ConflictException("You cannot remove your own super-admin access");
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.prisma.auditLog.create({
      data: { actorId, action: "USER_ROLE_UPDATED", entityType: "User", entityId: userId, metadata: { role } }
    });
    return { id: user.id, role: user.role };
  }
}