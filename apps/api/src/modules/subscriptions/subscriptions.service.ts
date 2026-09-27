import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import type { SubscriptionDto } from "./subscription.dto.js";

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, input: SubscriptionDto) {
    this.validate(input);
    await this.ensureChannel(input.channelId);
    await this.prisma.subscription.upsert({ where: { userId_channelId: { userId, channelId: input.channelId } }, update: {}, create: { userId, channelId: input.channelId } });
    return this.state(userId, input.channelId);
  }

  async unsubscribe(userId: string, channelId: string) {
    await this.prisma.subscription.deleteMany({ where: { userId, channelId } });
    return this.state(userId, channelId);
  }

  async state(userId: string, channelId: string) {
    const [subscription, subscriberCount] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { userId_channelId: { userId, channelId } }, select: { createdAt: true } }),
      this.prisma.subscription.count({ where: { channelId } })
    ]);
    return { subscribed: Boolean(subscription), subscribedAt: subscription?.createdAt ?? null, subscriberCount };
  }

  private validate(input: SubscriptionDto) {
    if (!input.channelId) throw new BadRequestException("channelId is required");
  }

  private async ensureChannel(channelId: string) {
    if (!(await this.prisma.channel.findUnique({ where: { id: channelId }, select: { id: true } }))) throw new NotFoundException("Channel not found");
  }
}