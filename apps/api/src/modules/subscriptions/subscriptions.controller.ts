import { Body, Controller, Get, Post, Delete } from "@nestjs/common";
import { SubscriptionDto } from "./subscription.dto.js";
import { SubscriptionsService } from "./subscriptions.service.js";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  subscribe(@Body() input: SubscriptionDto) {
    return this.subscriptionsService.subscribe(input);
  }

  @Delete()
  unsubscribe(@Body() input: SubscriptionDto) {
    return this.subscriptionsService.unsubscribe(input);
  }

  @Get("state")
  state(@Body() input: SubscriptionDto) {
    return this.subscriptionsService.getState(input);
  }
}