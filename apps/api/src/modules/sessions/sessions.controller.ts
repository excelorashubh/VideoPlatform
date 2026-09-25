import { Body, Controller, Delete, Get, Param } from "@nestjs/common";
import { SessionsService } from "./sessions.service.js";

@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get(":token")
  async verify(@Param("token") token: string) {
    return this.sessionsService.verify(token);
  }

  @Delete(":token")
  async revoke(@Param("token") token: string) {
    return this.sessionsService.revoke(token);
  }

  @Delete()
  async revokeBody(@Body("token") token: string) {
    return this.sessionsService.revoke(token);
  }
}
