import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import type { LoginUserDto, RegisterUserDto } from "./auth.dto.js";
import { Public } from "./public.decorator.js";
import { CurrentUser } from "./current-user.decorator.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Public()
  register(@Body() input: RegisterUserDto) {
    return this.authService.register(input);
  }

  @Post("login")
  @Public()
  login(@Body() input: LoginUserDto) {
    return this.authService.login(input);
  }

  @Get("me")
  me(@CurrentUser() user: { id: string }) {
    return this.authService.me(user.id);
  }

  @Get("verification/status")
  verificationStatus(@CurrentUser() user: { id: string }) {
    return this.authService.verificationStatus(user.id);
  }

  @Post("email-verification/send")
  sendEmailVerification(@CurrentUser() user: { id: string }) {
    return this.authService.sendVerification(user.id, "email");
  }

  @Post("email-verification/verify")
  verifyEmail(@CurrentUser() user: { id: string }, @Body() input: { code: string }) {
    return this.authService.verifyCode(user.id, "email", input.code);
  }

  @Post("phone-verification/send")
  sendPhoneVerification(@CurrentUser() user: { id: string }, @Body() input: { phoneNumber?: string }) {
    return this.authService.sendVerification(user.id, "phone", input.phoneNumber);
  }

  @Post("phone-verification/verify")
  verifyPhone(@CurrentUser() user: { id: string }, @Body() input: { code: string }) {
    return this.authService.verifyCode(user.id, "phone", input.code);
  }

  @Post("logout")
  logout(@Headers("authorization") authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");
    return this.authService.logout(token);
  }
}
