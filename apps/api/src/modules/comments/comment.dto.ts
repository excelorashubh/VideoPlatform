export class CreateCommentDto {
  authorId!: string;
  videoId!: string;
  body!: string;
  parentId?: string;
}

export class DeleteCommentDto {
  authorId!: string;
}