import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SubmitCreatorApplicationDto } from "./creator.dto.js";
import { CreatorService } from "./creator.service.js";

@Controller("creator")
export class CreatorController {
  constructor(private readonly creatorService: CreatorService) {}

  @Get("application")
  getApplication(@CurrentUser() user: { id: string }) {
    return this.creatorService.getApplication(user.id);
  }

  @Get("dashboard")
  getDashboard(@CurrentUser() user: { id: string }) {
    return this.creatorService.getDashboard(user.id);
  }

  @Post("application")
  submitApplication(@CurrentUser() user: { id: string }, @Body() input: SubmitCreatorApplicationDto) {
    return this.creatorService.submitApplication(user.id, input);
  }

  @Post("application/draft")
  saveDraft(@CurrentUser() user: { id: string }, @Body() input: SubmitCreatorApplicationDto) {
    return this.creatorService.saveDraft(user.id, input);
  }

  @Get("handles/availability")
  checkHandle(@CurrentUser() user: { id: string }, @Query("handle") handle = "") {
    return this.creatorService.checkHandle(handle, user.id);
  }

  @Post("profile-image/upload")
  createProfileImageUpload(@CurrentUser() user: { id: string }, @Body() input: { contentType: string; fileSize: number }) {
    return this.creatorService.createProfileImageUpload(user.id, input.contentType, input.fileSize);
  }

  @Post("profile-image/complete")
  finalizeProfileImage(@CurrentUser() user: { id: string }, @Body() input: { key: string }) {
    return this.creatorService.finalizeProfileImage(user.id, input.key);
  }
}