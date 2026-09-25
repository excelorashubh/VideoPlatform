import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { createHash, randomInt } from "node:crypto";
import { sanitizeUser, UsersService, verifyPassword } from "../users/users.service.js";
import { SessionsService } from "../sessions/sessions.service.js";
import type { LoginUserDto, RegisterUserDto } from "./auth.dto.js";
import { EmailService } from "./email.service.js";
import { SmsService } from "./sms.service.js";

function isDatabaseUnavailableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaCode = "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message = error.message.toLowerCase();

  return (
    error.name === "PrismaClientInitializationError" ||
    prismaCode === "P1001" ||
    prismaCode === "P1002" ||
    prismaCode === "P1008" ||
    prismaCode === "P1017" ||
    message.includes("database") &&
      (message.includes("connection") ||
        message.includes("connect") ||
        message.includes("authentication") ||
        message.includes("environment variable not found"))
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService
  ) {}

  async register(input: RegisterUserDto) {
    try {
      const user = await this.usersService.create({
        ...input,
        role: "VIEWER"
      });
      const session = await this.sessionsService.createForUser(user.id);

      return {
        user,
        session
      };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new InternalServerErrorException(
          "The database is unavailable right now. Please try again in a moment."
        );
      }

      throw error;
    }
  }

  async login(input: LoginUserDto) {
    try {
      let user;

      try {
        user = await this.usersService.findByEmail(input.email);
      } catch (error) {
        if (isDatabaseUnavailableError(error)) {
          throw error;
        }
        throw new UnauthorizedException("Invalid email or password");
      }

      if (user.deletedAt || user.suspendedAt) {
        throw new UnauthorizedException("This account is unavailable");
      }

      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new UnauthorizedException("Invalid email or password");
      }

      const session = await this.sessionsService.createForUser(user.id);

      return {
        user: sanitizeUser(user),
        session
      };
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new InternalServerErrorException(
          "The database is unavailable right now. Please try again in a moment."
        );
      }

      throw error;
    }
  }

  async me(userId: string) {
    try {
      return this.usersService.findById(userId);
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        throw new InternalServerErrorException(
          "The database is unavailable right now. Please try again in a moment."
        );
      }

      throw error;
    }
  }

  async logout(token: string | undefined) {
    return this.sessionsService.revoke(token ?? "");
  }

  async verificationStatus(userId: string) {
    const user = await this.usersService.findByIdWithVerification(userId);
    return {
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneNumber: user.phoneNumber,
      phoneVerified: Boolean(user.phoneVerifiedAt)
    };
  }

  async sendVerification(userId: string, channel: "email" | "phone", phoneNumber?: string) {
    const user = await this.usersService.findByIdWithVerification(userId);

    if (channel === "email" && user.emailVerifiedAt) throw new ConflictException("Email is already verified");
    if (channel === "phone" && user.phoneVerifiedAt) throw new ConflictException("Phone is already verified");

    const latest = await this.usersService.findLatestChallenge(userId, channel);
    if (latest && Date.now() - latest.sentAt.getTime() < 60_000) {
      throw new HttpException("Please wait before requesting another code", HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = String(randomInt(100000, 1000000));
    if (channel === "phone") {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber ?? user.phoneNumber ?? "");
      if (!normalizedPhone) {
        throw new ConflictException("Enter a valid Indian mobile number with +91 country code");
      }

      const challenge = await this.usersService.createChallenge(userId, channel, this.hashCode(code), normalizedPhone);
      try {
        const delivery = await this.smsService.sendVerificationCode(normalizedPhone, code);
        return { sent: true, delivery, expiresInSeconds: 600 };
      } catch (error) {
        await this.usersService.invalidateChallenge(challenge.id);
        throw error;
      }
    }

    if (channel === "email") {
      const challenge = await this.usersService.createChallenge(userId, channel, this.hashCode(code));
      try {
        await this.emailService.sendVerificationCode(user.email, code);
      } catch (error) {
        await this.usersService.invalidateChallenge(challenge.id);
        throw error;
      }
      return { sent: true, delivery: "gmail-smtp", expiresInSeconds: 600 };
    }

    return { sent: false, delivery: "sms-not-configured", expiresInSeconds: 600 };
  }

  private normalizePhoneNumber(phoneNumber: string) {
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    if (!digitsOnly) return "";

    if (digitsOnly.startsWith("91") && digitsOnly.length === 12 && /^[6-9]\d{9}$/.test(digitsOnly.slice(2))) {
      return `+${digitsOnly}`;
    }

    if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
      return `+91${digitsOnly}`;
    }

    return "";
  }

  async verifyCode(userId: string, channel: "email" | "phone", code: string) {
    if (!/^\d{6}$/.test(code)) throw new ConflictException("Enter the 6-digit verification code");
    const challenge = await this.usersService.findLatestChallenge(userId, channel);
    if (!challenge || challenge.consumedAt || challenge.expiresAt < new Date()) throw new ConflictException("This verification code has expired");
    if (challenge.attempts >= 5) throw new HttpException("Too many verification attempts. Request a new code", HttpStatus.TOO_MANY_REQUESTS);
    if (challenge.codeHash !== this.hashCode(code)) {
      await this.usersService.incrementChallengeAttempts(challenge.id);
      throw new ConflictException("Invalid verification code");
    }
    await this.usersService.consumeChallenge(userId, challenge.id, channel);
    return this.verificationStatus(userId);
  }

  private hashCode(code: string) { return createHash("sha256").update(code).digest("hex"); }

}
