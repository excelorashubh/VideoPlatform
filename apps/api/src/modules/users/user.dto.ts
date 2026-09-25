export class CreateUserDto {
  email!: string;
  displayName!: string;
  password!: string;
  role?: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
}

export class UserResponseDto {
  id!: string;
  email!: string;
  displayName!: string;
  role!: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
  createdAt!: Date;
  updatedAt!: Date;
}
