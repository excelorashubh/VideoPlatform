export class CreateChannelDto {
  ownerId!: string;
  handle!: string;
  displayName!: string;
  description?: string;
}