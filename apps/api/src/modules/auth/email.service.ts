import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;
  private connectionVerified = false;

  async sendVerificationCode(email: string, code: string) {
    const host = process.env.GMAIL_SMTP_HOST?.trim();
    const port = Number(process.env.GMAIL_SMTP_PORT ?? "465");
    const secure = process.env.GMAIL_SMTP_SECURE === "true";
    const user = process.env.GMAIL_SMTP_USER?.trim();
    const password = process.env.GMAIL_SMTP_PASSWORD?.trim();
    const fromName = process.env.GMAIL_FROM_NAME?.trim() || "GVP";

    const configured = Boolean(host && user && password && Number.isInteger(port));
    this.logger.log(`Gmail SMTP configured: ${configured}`);
    if (!configured) {
      throw new ServiceUnavailableException("Gmail SMTP email verification is not configured");
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass: password }
      });
    }

    try {
      if (!this.connectionVerified) {
        await this.transporter.verify();
        this.connectionVerified = true;
        this.logger.log("Gmail SMTP connection: successful");
      }

      await this.transporter.sendMail({
        from: `${fromName} <${user}>`,
        to: email,
        subject: "Your GVP email verification code",
        text: `Your GVP email verification code is ${code}. It expires in 10 minutes.`,
        html: `<p><strong>GVP</strong></p><p>Verify your email address</p><p>Your GVP email verification code is:</p><p style="font-size: 28px; font-weight: 700; letter-spacing: 8px">${code}</p><p>This code expires in 10 minutes.</p><p>If you did not request this code, you can safely ignore this email.</p><p>Do not share this code with anyone.</p>`
      });
    } catch (error) {
      this.connectionVerified = false;
      const smtpError = error as { code?: string; command?: string };
      this.logger.error(`Gmail SMTP delivery failed: ${smtpError.code ?? "unknown"}${smtpError.command ? ` (${smtpError.command})` : ""}`);
      throw new ServiceUnavailableException("We couldn't send the verification email right now. Please try again in a moment.");
    }
  }
}
