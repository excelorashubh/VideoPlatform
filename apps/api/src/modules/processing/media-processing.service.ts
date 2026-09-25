import { Injectable } from "@nestjs/common";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import { PrismaService } from "../../database/prisma.service.js";
import { ObjectStorageService } from "../../storage/object-storage.service.js";

type ProcessingInput = {
  id: string;
  videoId: string;
  storageKey: string;
};

const renditions = [
  { name: "360p", height: 360, bandwidth: 900000 },
  { name: "480p", height: 480, bandwidth: 1600000 },
  { name: "720p", height: 720, bandwidth: 2800000 }
] as const;

@Injectable()
export class MediaProcessingService {
  private readonly ffmpegPath = process.env.FFMPEG_PATH || ffmpegStatic;
  private readonly segmentSeconds = Number(process.env.MEDIA_HLS_SEGMENT_SECONDS ?? 6);

  constructor(
    private readonly prisma: PrismaService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  async process(input: ProcessingInput) {
    if (!this.ffmpegPath) throw new Error("FFmpeg binary is not available");

    const workDir = await mkdtemp(path.join(tmpdir(), "gvp-processing-"));
    const sourcePath = path.join(workDir, "source");
    const thumbnailPath = path.join(workDir, "thumbnail.jpg");
    const masterPath = path.join(workDir, "master.m3u8");

    try {
      await this.objectStorage.downloadToFile(input.storageKey, sourcePath);
      for (const rendition of renditions) {
        const outputDir = path.join(workDir, "hls", rendition.name);
        await mkdir(outputDir, { recursive: true });
        await this.runFfmpeg([
          "-y", "-i", sourcePath,
          "-map", "0:v:0", "-map", "0:a:0?",
          "-vf", `scale=-2:${rendition.height}`, "-c:v", "libx264", "-preset", "veryfast",
          "-b:v", `${Math.round(rendition.bandwidth * 0.85 / 1000)}k`, "-c:a", "aac", "-b:a", "96k",
          "-f", "hls", "-hls_time", String(this.segmentSeconds), "-hls_playlist_type", "vod",
          "-hls_segment_filename", path.join(outputDir, "segment-%03d.ts"),
          path.join(outputDir, "index.m3u8")
        ]);
      }
      await this.runFfmpeg(["-y", "-ss", "00:00:01", "-i", sourcePath, "-frames:v", "1", "-q:v", "2", thumbnailPath]);
      const masterPlaylist = ["#EXTM3U", "#EXT-X-VERSION:3", ...renditions.flatMap((rendition) => [
        `#EXT-X-STREAM-INF:BANDWIDTH=${rendition.bandwidth},RESOLUTION=${rendition.height === 360 ? "640x360" : rendition.height === 480 ? "854x480" : "1280x720"}`,
        `${rendition.name}/index.m3u8`
      ]), ""].join("\n");
      await writeFile(masterPath, masterPlaylist);

      await this.uploadDirectory(path.join(workDir, "hls"), `media/hls/${input.videoId}`);
      await this.objectStorage.uploadFile(`media/thumbnails/${input.videoId}/default.jpg`, thumbnailPath, "image/jpeg");
      await this.objectStorage.uploadFile(`media/hls/${input.videoId}/master.m3u8`, masterPath, "application/vnd.apple.mpegurl");

      await this.prisma.$transaction(async (transaction) => {
        for (const rendition of renditions) {
          await transaction.videoTranscode.upsert({
            where: { videoId_rendition: { videoId: input.videoId, rendition: rendition.name } },
            update: { manifestKey: `media/hls/${input.videoId}/${rendition.name}/index.m3u8`, status: "READY" },
            create: { videoId: input.videoId, rendition: rendition.name, manifestKey: `media/hls/${input.videoId}/${rendition.name}/index.m3u8`, status: "READY" }
          });
        }
        await transaction.thumbnail.deleteMany({ where: { videoId: input.videoId, isDefault: true } });
        await transaction.thumbnail.create({
          data: { videoId: input.videoId, storageKey: `media/thumbnails/${input.videoId}/default.jpg`, isDefault: true }
        });
        await transaction.video.update({ where: { id: input.videoId }, data: { status: "READY" } });
      });
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private async uploadDirectory(directory: string, prefix: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const sourcePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await this.uploadDirectory(sourcePath, `${prefix}/${entry.name}`);
        continue;
      }

      const contentType = entry.name.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/mp2t";
      await this.objectStorage.uploadFile(`${prefix}/${entry.name}`, sourcePath, contentType);
    }
  }

  private runFfmpeg(args: string[]) {
    return new Promise<void>((resolve, reject) => {
      const process = spawn(this.ffmpegPath as string, args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      process.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
      process.once("error", reject);
      process.once("close", (code) => {
        if (code === 0) return resolve();
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-2000)}`));
      });
    });
  }
}