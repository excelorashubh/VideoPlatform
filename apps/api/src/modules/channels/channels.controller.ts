import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateChannelDto } from "./channel.dto.js";
import { ChannelsService } from "./channels.service.js";

@Controller("channels")
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@Body() input: CreateChannelDto) {
    return this.channelsService.create(input);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.channelsService.get(id);
  }
}