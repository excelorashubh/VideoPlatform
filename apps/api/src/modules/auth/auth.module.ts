import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { UsersModule } from "../users/users.module.js";
import { AuthController } from "./auth.controller.js";
import { EmailService } from "./email.service.js";
import { AuthService } from "./auth.service.js";
import { SmsService } from "./sms.service.js";

@Module({
  imports: [DatabaseModule, UsersModule, SessionsModule],
  controllers: [AuthController],
  providers: [AuthService, EmailService, SmsService],
  exports: [AuthService]
})
export class AuthModule {}
