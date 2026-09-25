import { Injectable } from "@nestjs/common";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { HeadObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class ObjectStorageService {
  private readonly bucket = process.env.OBJECT_STORAGE_BUCKET ?? "gvp-media";
  private readonly credentials = this.resolveCredentials();
  private readonly client = new S3Client({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    region: process.env.OBJECT_STORAGE_REGION ?? "us-east-1",
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

  async createUploadUrl(key: string, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });

    return getSignedUrl(this.client, command, {
      expiresIn: Number(process.env.OBJECT_STORAGE_UPLOAD_URL_TTL_SECONDS ?? 900)
    });
  }

  async createDownloadUrl(key: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: Number(process.env.OBJECT_STORAGE_DOWNLOAD_URL_TTL_SECONDS ?? 900)
    });
  }

  async headObject(key: string) {
    return this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async objectExists(key: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (statusCode === 404 || (error as { name?: string }).name === "NotFound") return false;
      throw error;
    }
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
}