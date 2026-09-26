import { Injectable, Logger } from "@nestjs/common";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
  type HeadObjectCommandOutput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket = process.env.OBJECT_STORAGE_BUCKET?.trim() || "gvp-media";
  private readonly uploadTtl = Number(process.env.OBJECT_STORAGE_UPLOAD_URL_TTL_SECONDS ?? 900);
  private readonly downloadTtl = Number(process.env.OBJECT_STORAGE_DOWNLOAD_URL_TTL_SECONDS ?? 900);
  private readonly publicBaseUrl = process.env.OBJECT_STORAGE_PUBLIC_BASE_URL?.trim();
  private readonly credentials = this.resolveCredentials();
  private readonly client = new S3Client({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT?.trim() || undefined,
    region: process.env.OBJECT_STORAGE_REGION?.trim() || "us-east-1",
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
    credentials: this.credentials
  });

  private resolveCredentials() {
    const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY?.trim();
    const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY?.trim();
    if (accessKeyId && secretAccessKey) return { accessKeyId, secretAccessKey };
    if (process.env.NODE_ENV !== "production") {
      return { accessKeyId: "gvp-local", secretAccessKey: "gvp-local-secret" };
    }
    throw new Error("Object storage credentials are required in production");
  }

  buildUserVideoKey(userId: string, videoId: string, folder: "original" | "hls" | "thumbnails" | "metadata", filename?: string) {
    const segments = ["users", userId, "videos", videoId, folder];
    if (filename) segments.push(filename);
    return segments.join("/");
  }

  buildChannelAssetKey(userId: string, kind: "avatar" | "banner", filename: string) {
    return ["users", userId, kind, filename].join("/");
  }

  async ensureBucketExists() {
    const bucketName = this.bucket;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (status === 404 || status === 403 || (error as { name?: string }).name === "NotFound") {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: bucketName }));
          this.logger.log(`Created object storage bucket: ${bucketName}`);
          return true;
        } catch (createError) {
          this.logger.warn(`Unable to auto-create object storage bucket ${bucketName}: ${String(createError)}`);
          return false;
        }
      }
      this.logger.warn(`Object storage bucket validation failed for ${bucketName}: ${String(error)}`);
      return false;
    }
  }

  async createPresignedUploadUrl(key: string, contentType: string, expiresIn = this.uploadTtl) {
    await this.ensureBucketExists();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async createUploadUrl(key: string, contentType: string, expiresIn = this.uploadTtl) {
    return this.createPresignedUploadUrl(key, contentType, expiresIn);
  }

  async createPresignedDownloadUrl(key: string, expiresIn = this.downloadTtl) {
    await this.ensureBucketExists();
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn });
  }

  async createDownloadUrl(key: string, expiresIn = this.downloadTtl) {
    return this.createPresignedDownloadUrl(key, expiresIn);
  }

  async headObject(key: string): Promise<HeadObjectCommandOutput> {
    return this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async objectExists(key: string) {
    try {
      await this.headObject(key);
      return true;
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404 || (error as { name?: string }).name === "NotFound") return false;
      throw error;
    }
  }

  async getObjectMetadata(key: string) {
    const head = await this.headObject(key);
    return {
      key,
      bucket: this.bucket,
      contentLength: Number(head.ContentLength ?? 0),
      contentType: head.ContentType ?? "application/octet-stream",
      etag: head.ETag ?? null,
      lastModified: head.LastModified ?? null
    };
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return { key, deleted: true };
  }

  async deleteObjects(keys: string[]) {
    if (!keys.length) return [];
    const result = await this.client.send(new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: { Objects: keys.map((key) => ({ Key: key })) }
    }));
    return result.Deleted ?? [];
  }

  async copyObject(sourceKey: string, destinationKey: string) {
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey
    }));
    return { sourceKey, destinationKey, copied: true };
  }

  async downloadToFile(key: string, filePath: string) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!response.Body) throw new Error(`Object ${key} has no readable body`);
    await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(filePath));
  }

  async uploadFile(key: string, filePath: string, contentType: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType
    }));
  }

  async healthCheck() {
    try {
      await this.ensureBucketExists();
      const bucketList = await this.client.send(new ListBucketsCommand({}));
      const bucketExists = bucketList.Buckets?.some((bucket) => bucket.Name === this.bucket) ?? false;
      return { ok: bucketExists, bucket: this.bucket, provider: "s3-compatible", publicBaseUrl: this.publicBaseUrl ?? null };
    } catch (error) {
      return { ok: false, bucket: this.bucket, provider: "s3-compatible", error: String(error) };
    }
  }

  getPublicUrl(key: string) {
    if (!this.publicBaseUrl) return null;
    return new URL(key.replace(/^\/+/, ""), this.publicBaseUrl.endsWith("/") ? this.publicBaseUrl : `${this.publicBaseUrl}/`).toString();
  }
}