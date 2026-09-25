import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";
import type { CompleteUploadDto, CreateUploadDto } from "./upload.dto.js";
import { ProcessingService } from "../processing/processing.service.js";

type UploadSession = {
  uploadId: string;
  videoId: string;
  creatorId: string;
  fileSize: number;
  contentType: string;
  storageKey: string;
  uploadStatus: "created" | "completed";
  createdAt: string;
  completedAt?: string;
  processingJobId?: string;
};

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService,
    private readonly processingService: ProcessingService
  ) {}

  async createSession(input: CreateUploadDto, userId: string): Promise<UploadSession & { uploadUrl: string }> {
    if (!input.creatorId || !input.videoId || !input.contentType || input.fileSize <= 0) {
      throw new BadRequestException("creatorId, videoId, contentType, and a positive fileSize are required");
    }

    const video = await this.prisma.video.findFirst({
      where: { id: input.videoId, creatorId: userId, deletedAt: null }
    });
    if (!video) throw new NotFoundException("Video not found");

    const uploadId = crypto.randomUUID();
    const storageKey = `media/originals/${input.creatorId}/${input.videoId}/source`;
    const upload = await this.prisma.upload.create({
      data: {
        id: uploadId,
        videoId: input.videoId,
        creatorId: input.creatorId,
        fileSize: BigInt(input.fileSize),
        contentType: input.contentType,
        storageKey
      }
    });

    return {
      uploadId: upload.id,
      videoId: upload.videoId,
      creatorId: upload.creatorId,
      fileSize: Number(upload.fileSize),
      contentType: upload.contentType,
      storageKey: upload.storageKey,
      uploadStatus: "created",
      createdAt: upload.createdAt.toISOString(),
      uploadUrl: await this.objectStorage.createUploadUrl(upload.storageKey, upload.contentType)
    };
  }

  async completeSession(uploadId: string, input: CompleteUploadDto, userId: string): Promise<UploadSession> {
    const upload = await this.prisma.upload.findFirst({ where: { id: uploadId, creatorId: userId } });
    if (!upload) throw new NotFoundException("Upload session not found");
    if (!input.checksum) throw new BadRequestException("checksum is required");
    if (!(await this.objectStorage.objectExists(upload.storageKey))) {
      throw new BadRequestException("Uploaded object was not found");
    }

    const completed = await this.prisma.upload.update({
      where: { id: uploadId },
      data: {
        checksum: input.checksum,
        status: "COMPLETED",
        completedAt: new Date()
      }
    });
    const processingJob = await this.processingService.enqueue(completed.videoId, completed.id);

    return {
      uploadId: completed.id,
      videoId: completed.videoId,
      creatorId: completed.creatorId,
      fileSize: Number(completed.fileSize),
      contentType: completed.contentType,
      storageKey: completed.storageKey,
      uploadStatus: "completed",
      createdAt: completed.createdAt.toISOString(),
      completedAt: completed.completedAt?.toISOString(),
      processingJobId: processingJob.id
    };
  }

  async getSession(uploadId: string, userId: string): Promise<UploadSession> {
    const upload = await this.prisma.upload.findFirst({ where: { id: uploadId, creatorId: userId } });
    if (!upload) throw new NotFoundException("Upload session not found");

    return {
      uploadId: upload.id,
      videoId: upload.videoId,
      creatorId: upload.creatorId,
      fileSize: Number(upload.fileSize),
      contentType: upload.contentType,
      storageKey: upload.storageKey,
      uploadStatus: upload.status === "COMPLETED" ? "completed" : "created",
      createdAt: upload.createdAt.toISOString(),
      completedAt: upload.completedAt?.toISOString()
    };
  }
}