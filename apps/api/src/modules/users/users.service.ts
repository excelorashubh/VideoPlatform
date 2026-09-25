import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { PrismaService } from "../../database/prisma.service.js";
import type { CreateUserDto } from "./user.dto.js";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(key, "hex");
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function sanitizeUser<T extends { passwordHash?: string | null }>(user: T) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserDto) {
    const email = input.email?.trim().toLowerCase();
    const displayName = input.displayName?.trim();

    if (!email || !displayName || !input.password) {
      throw new ConflictException("email, displayName, and password are required");
    }
    if (!email.includes("@") || input.password.length < 8) {
      throw new ConflictException("Use a valid email and a password of at least 8 characters");
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    const createdUser = await this.prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash: await hashPassword(input.password),
        role: input.role ?? "VIEWER"
      }
    });

    return sanitizeUser(createdUser);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return sanitizeUser(user);
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findByIdWithVerification(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, emailVerifiedAt: true, phoneNumber: true, phoneVerifiedAt: true }
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  findLatestChallenge(userId: string, channel: string) {
    return this.prisma.verificationChallenge.findFirst({
      where: { userId, channel, consumedAt: null },
      orderBy: { sentAt: "desc" }
    });
  }

  async createChallenge(userId: string, channel: string, codeHash: string, phoneNumber?: string | null) {
    if (phoneNumber) {
      await this.prisma.user.update({ where: { id: userId }, data: { phoneNumber, phoneVerifiedAt: null } });
    }
    await this.prisma.verificationChallenge.updateMany({ where: { userId, channel, consumedAt: null }, data: { consumedAt: new Date() } });
    return this.prisma.verificationChallenge.create({
      data: { userId, channel, codeHash, expiresAt: new Date(Date.now() + 10 * 60_000) }
    });
  }

  incrementChallengeAttempts(id: string) {
    return this.prisma.verificationChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
  }

  invalidateChallenge(id: string) {
    return this.prisma.verificationChallenge.update({ where: { id }, data: { consumedAt: new Date() } });
  }

  async consumeChallenge(userId: string, challengeId: string, channel: "email" | "phone") {
    await this.prisma.verificationChallenge.update({ where: { id: challengeId }, data: { consumedAt: new Date() } });
    return this.prisma.user.update({
      where: { id: userId },
      data: channel === "email" ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() }
    });
  }
}
