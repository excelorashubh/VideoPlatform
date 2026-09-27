import { Body, Controller, Get, Param, Post, Delete } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SubscriptionDto } from "./subscription.dto.js";
import { SubscriptionsService } from "./subscriptions.service.js";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  subscribe(@CurrentUser() user: { id: string }, @Body() input: SubscriptionDto) {
    return this.subscriptionsService.subscribe(user.id, input);
  }

  @Delete()
  unsubscribe(@CurrentUser() user: { id: string }, @Body() input: SubscriptionDto) {
    return this.subscriptionsService.unsubscribe(user.id, input.channelId);
  }

  @Get("channel/:channelId")
  state(@CurrentUser() user: { id: string }, @Param("channelId") channelId: string) {
    return this.subscriptionsService.state(user.id, channelId);
  }
}