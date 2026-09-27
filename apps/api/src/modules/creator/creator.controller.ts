import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { CreateCreatorDraftVideoDto, SubmitCreatorApplicationDto, UpdateCreatorVideoDto } from "./creator.dto.js";
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

  @Get("content")
  getContent(@CurrentUser() user: { id: string }) {
    return this.creatorService.getContent(user.id);
  }

  @Post("videos/draft")
  createDraftVideo(@CurrentUser() user: { id: string }, @Body() input: CreateCreatorDraftVideoDto) {
    return this.creatorService.createDraftVideo(user.id, input);
  }

  @Patch("videos/:videoId")
  updateVideo(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string, @Body() input: UpdateCreatorVideoDto) {
    return this.creatorService.updateVideo(user.id, videoId, input);
  }

  @Delete("videos/:videoId")
  deleteVideo(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string) {
    return this.creatorService.deleteVideo(user.id, videoId);
  }

  @Post("videos/:videoId/retry-processing")
  retryProcessing(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string) {
    return this.creatorService.retryProcessing(user.id, videoId);
  }

  @Post("videos/:videoId/thumbnail/upload")
  createThumbnailUpload(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string, @Body() input: { contentType: string; fileSize: number }) {
    return this.creatorService.createThumbnailUpload(user.id, videoId, input.contentType, input.fileSize);
  }

  @Post("videos/:videoId/thumbnail/complete")
  completeThumbnailUpload(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string, @Body() input: { key: string }) {
    return this.creatorService.completeThumbnailUpload(user.id, videoId, input.key);
  }

  @Delete("videos/:videoId/thumbnail")
  removeThumbnail(@CurrentUser() user: { id: string }, @Param("videoId") videoId: string, @Body() input: { key: string }) {
    return this.creatorService.removeThumbnail(user.id, videoId, input.key);
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