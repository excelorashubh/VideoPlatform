import { Injectable, UnauthorizedException } from "@nestjs/common";
import { randomUUID, createHash } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt
      }
    });

    return {
      id: session.id,
      token,
      expiresAt: session.expiresAt
    };
  }

  async verify(token: string) {
    if (!token) {
      throw new UnauthorizedException("Session token is required");
    }

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true }
    });

    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.suspendedAt || session.user.deletedAt) {
      throw new UnauthorizedException("Session is invalid or expired");
    }

    return session;
  }

  async revoke(token: string) {
    const normalizedToken = token.trim();
    if (!normalizedToken) return { revoked: false };

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(normalizedToken) }
    });

    if (!session) {
      return { revoked: false };
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    return { revoked: true };
  }
}
