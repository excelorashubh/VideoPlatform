import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CompleteUploadDto, CreateUploadDto } from "./upload.dto.js";
import { UploadsService } from "./uploads.service.js";

@Controller("uploads")
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post("sessions")
  async createSession(@Body() input: CreateUploadDto, @CurrentUser() user: { id: string }) {
    return this.uploadsService.createSession(input, user.id);
  }

  @Post("sessions/:uploadId/complete")
  async completeSession(@Param("uploadId") uploadId: string, @Body() input: CompleteUploadDto, @CurrentUser() user: { id: string }) {
    return this.uploadsService.completeSession(uploadId, input, user.id);
  }

  @Get("sessions/:uploadId")
  async getSession(@Param("uploadId") uploadId: string, @CurrentUser() user: { id: string }) {
    return this.uploadsService.getSession(uploadId, user.id);
  }
}