export class CreateUploadDto {
  filename!: string;
  fileSize!: number;
  contentType!: string;
  videoId!: string;
}

export class CompleteUploadDto {
  checksum!: string;
}