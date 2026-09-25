export class RegisterUserDto {
  email!: string;
  displayName!: string;
  password!: string;
  role?: "VIEWER";
}

export class LoginUserDto {
  email!: string;
  password!: string;
}
