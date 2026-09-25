import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ADMIN_REQUIRED } from "./admin.decorator.js";

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<boolean>(ADMIN_REQUIRED, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    if (request.user?.role !== "ADMIN" && request.user?.role !== "SUPER_ADMIN") {
      throw new ForbiddenException("Administrator access required");
    }
    return true;
  }
}