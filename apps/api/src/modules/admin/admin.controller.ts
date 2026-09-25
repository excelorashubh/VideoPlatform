import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { AdminGuard } from "./admin.guard.js";
import { RequireAdmin } from "./admin.decorator.js";
import { AdminService } from "./admin.service.js";

@Controller("admin")
@UseGuards(AdminGuard)
@RequireAdmin()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  overview() { return this.adminService.overview(); }

  @Get("health")
  health() { return this.adminService.health(); }

  @Get("users")
  users(@Query("search") search?: string, @Query("role") role?: string, @Query("status") status?: string) {
    return this.adminService.users(search, role, status);
  }

  @Post("users")
  createUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Body() input: { email: string; displayName: string; password: string; role?: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" }) {
    return this.adminService.createUser(user.id, user.role, input);
  }

  @Patch("users/:userId")
  updateUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string, @Body() input: { email?: string; displayName?: string; password?: string; role?: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" }) {
    return this.adminService.updateUser(user.id, user.role, userId, input);
  }

  @Delete("users/:userId")
  deleteUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.deleteUser(user.id, user.role, userId);
  }

  @Patch("users/:userId/suspend")
  suspendUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.suspendUser(user.id, user.role, userId);
  }

  @Patch("users/:userId/unsuspend")
  unsuspendUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.restoreSuspendedUser(user.id, user.role, userId);
  }

  @Patch("users/:userId/restore")
  restoreUser(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.restoreUser(user.id, user.role, userId);
  }

  @Get("creators")
  creators(@Query("search") search?: string, @Query("status") status?: string) { return this.adminService.creators(search, status); }

  @Patch("creators/:userId/approve")
  approveCreator(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.approveCreator(user.id, user.role, userId);
  }

  @Patch("creators/:userId/reject")
  rejectCreator(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Param("userId") userId: string) {
    return this.adminService.rejectCreator(user.id, user.role, userId);
  }

  @Get("content")
  content(@Query("search") search?: string, @Query("status") status?: string, @Query("visibility") visibility?: string) { return this.adminService.content(search, status, visibility); }

  @Get("moderation")
  moderation() { return this.adminService.moderation(); }

  @Get("reports")
  reports(@Query("search") search?: string, @Query("status") status?: string) { return this.adminService.reports(search, status); }

  @Get("uploads")
  uploads() { return this.adminService.uploads(); }

  @Get("processing")
  processing() { return this.adminService.processing(); }

  @Get("analytics")
  analytics(@Query("range") range?: string) { return this.adminService.analytics(range); }

  @Get("subscriptions")
  subscriptions(@Query("status") status?: string) { return this.adminService.subscriptions(status); }

  @Get("monetization")
  monetization() { return this.adminService.monetization(); }

  @Get("storage")
  storage() { return this.adminService.storage(); }

  @Get("settings")
  settings() { return this.adminService.settings(); }

  @Get("audit-logs")
  auditLogs(@Query("search") search?: string, @Query("action") action?: string) { return this.adminService.auditLogs(search, action); }

  @Patch("users/role")
  updateUserRole(@CurrentUser() user: { id: string; role: "ADMIN" | "SUPER_ADMIN" }, @Body() input: { userId: string; role: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN" }) {
    return this.adminService.updateUserRole(user.id, user.role, input.userId, input.role);
  }

  @Patch("settings")
  updateSettings(@CurrentUser() user: { id: string }, @Body() input: Record<string, unknown>) {
    return this.adminService.updateSettings(user.id, input);
  }
}