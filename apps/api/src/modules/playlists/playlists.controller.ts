import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { AddPlaylistVideoDto, CreatePlaylistDto, ReorderPlaylistDto, UpdatePlaylistDto } from "./playlist.dto.js";
import { PlaylistsService } from "./playlists.service.js";

@Controller("creator/playlists")
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.playlistsService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() input: CreatePlaylistDto) {
    return this.playlistsService.create(user.id, input);
  }

  @Get("videos")
  listVideos(@CurrentUser() user: { id: string }) {
    return this.playlistsService.listCreatorVideos(user.id);
  }

  @Get(":playlistId")
  get(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string) {
    return this.playlistsService.get(user.id, playlistId);
  }

  @Patch(":playlistId")
  update(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string, @Body() input: UpdatePlaylistDto) {
    return this.playlistsService.update(user.id, playlistId, input);
  }

  @Delete(":playlistId")
  remove(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string) {
    return this.playlistsService.remove(user.id, playlistId);
  }

  @Post(":playlistId/videos")
  addVideo(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string, @Body() input: AddPlaylistVideoDto) {
    return this.playlistsService.addVideo(user.id, playlistId, input.videoId ?? "");
  }

  @Delete(":playlistId/videos/:videoId")
  removeVideo(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string, @Param("videoId") videoId: string) {
    return this.playlistsService.removeVideo(user.id, playlistId, videoId);
  }

  @Patch(":playlistId/videos/order")
  reorder(@CurrentUser() user: { id: string }, @Param("playlistId") playlistId: string, @Body() input: ReorderPlaylistDto) {
    return this.playlistsService.reorder(user.id, playlistId, input.videoIds ?? []);
  }
}