export class CreateUploadDto {
  creatorId!: string;
  fileSize!: number;
  contentType!: string;
  videoId!: string;
}

export class CompleteUploadDto {
  checksum!: string;
}