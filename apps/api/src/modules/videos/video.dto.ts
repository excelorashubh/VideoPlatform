export class CreateVideoDto {
  creatorId!: string;
  channelId!: string;
  title!: string;
  description?: string;
}