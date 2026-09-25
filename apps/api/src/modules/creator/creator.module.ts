import { Module } from "@nestjs/common";
import { CreatorController } from "./creator.controller.js";
import { CreatorService } from "./creator.service.js";

@Module({ controllers: [CreatorController], providers: [CreatorService] })
export class CreatorModule {}