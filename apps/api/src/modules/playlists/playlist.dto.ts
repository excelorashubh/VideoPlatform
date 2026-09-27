export class CreatePlaylistDto {
  title?: string;
  isPublic?: boolean;
}

export class UpdatePlaylistDto {
  title?: string;
  isPublic?: boolean;
}

export class AddPlaylistVideoDto {
  videoId?: string;
}

export class ReorderPlaylistDto {
  videoIds?: string[];
}