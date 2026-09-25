import { BadRequestException, Injectable } from "@nestjs/common";
import type { SubscriptionDto } from "./subscription.dto.js";

export type SubscriptionState = SubscriptionDto & {
  subscribed: boolean;
  subscribedAt?: string;
};

@Injectable()
export class SubscriptionsService {
  private readonly subscriptions = new Map<string, SubscriptionState>();

  subscribe(input: SubscriptionDto): SubscriptionState {
    this.validate(input);
    const key = this.key(input.viewerId, input.channelId);
    const state: SubscriptionState = { ...input, subscribed: true, subscribedAt: new Date().toISOString() };
    this.subscriptions.set(key, state);
    return state;
  }

  unsubscribe(input: SubscriptionDto): SubscriptionState {
    this.validate(input);
    const key = this.key(input.viewerId, input.channelId);
    this.subscriptions.delete(key);
    return { ...input, subscribed: false };
  }

  getState(input: SubscriptionDto): SubscriptionState {
    this.validate(input);
    return this.subscriptions.get(this.key(input.viewerId, input.channelId)) ?? { ...input, subscribed: false };
  }

  private validate(input: SubscriptionDto) {
    if (!input.viewerId || !input.channelId) throw new BadRequestException("viewerId and channelId are required");
  }

  private key(viewerId: string, channelId: string) {
    return `${viewerId}:${channelId}`;
  }
}