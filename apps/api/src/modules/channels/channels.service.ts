import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";
import type { CreateChannelDto } from "./channel.dto.js";

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateChannelDto) {
    if (!input.ownerId || !input.handle || !input.displayName) {
      throw new BadRequestException("ownerId, handle, and displayName are required");
    }

    const userExists = await this.prisma.user.findUnique({ where: { id: input.ownerId } });
    if (!userExists) {
      throw new NotFoundException("User not found for channel creation");
    }

    const normalizedHandle = input.handle.trim();
    const existingChannel = await this.prisma.channel.findUnique({ where: { handle: normalizedHandle } });
    if (existingChannel) {
      throw new BadRequestException("A channel with this handle already exists");
    }

    return this.prisma.channel.create({
      data: {
        ownerId: input.ownerId,
        handle: normalizedHandle,
        displayName: input.displayName,
        description: input.description ?? null
      }
    });
  }

  async get(id: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException("Channel not found");
    return channel;
  }
}