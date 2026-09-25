import { Controller, Get } from "@nestjs/common";
import type { HealthStatus } from "@gvp/contracts";
import { Public } from "../modules/auth/public.decorator.js";

@Controller("health")
export class HealthController {
  @Get()
  @Public()
  getHealth(): HealthStatus {
    return { status: "ok", service: "api", timestamp: new Date().toISOString() };
  }
}
