export class SubmitCreatorApplicationDto {
  creatorName?: string;
  handle?: string;
  category?: string;
  bio?: string;
  profileImageKey?: string;
  termsAccepted?: boolean;
}

export class CreateCreatorDraftVideoDto {
  title!: string;
  description?: string;
  videoId?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
}

export class UpdateCreatorVideoDto {
  title?: string;
  description?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
}

export class UpdateChannelCustomizationDto {
  displayName?: string;
  handle?: string;
  description?: string;
}

export type ChannelAssetKind = "avatar" | "banner";