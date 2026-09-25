import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import twilio, { type Twilio } from "twilio";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: Twilio | null = null;

  constructor() {
    const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    this.logger.log(`SMS configuration: provider=${provider ?? "missing"}, providerIsTwilio=${provider === "twilio"}, accountSid=${Boolean(process.env.TWILIO_ACCOUNT_SID?.trim())}, authToken=${Boolean(authToken && authToken !== "YOUR_NEW_TWILIO_AUTH_TOKEN")}, authTokenLength=${authToken?.length ?? 0}, fromNumber=${Boolean(process.env.TWILIO_FROM_NUMBER?.trim())}, template=${Boolean(process.env.SMS_MESSAGE_TEMPLATE?.trim())}`);
  }

  async sendVerificationCode(phoneNumber: string, code: string) {
    const provider = process.env.SMS_PROVIDER?.trim().toLowerCase();

    if (!provider || provider === "disabled") {
      this.logger.error("SMS_PROVIDER is missing or disabled");
      throw new ServiceUnavailableException("SMS verification is not configured");
    }

    if (provider === "mock") {
      this.logger.log("Mock SMS provider selected");
      return "mock-provider";
    }

    if (provider === "twilio") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
      const messageTemplate = process.env.SMS_MESSAGE_TEMPLATE?.trim() || "Your GVP verification code is {{code}}. It expires in 10 minutes.";
      const hasRealAuthToken = Boolean(authToken && authToken !== "YOUR_NEW_TWILIO_AUTH_TOKEN");

      this.logger.log(`Twilio configuration: provider=${provider}, accountSid=${Boolean(accountSid)}, authToken=${hasRealAuthToken}, authTokenLength=${authToken?.length ?? 0}, fromNumber=${Boolean(fromNumber)}, template=${Boolean(messageTemplate)}`);

      if (!accountSid || !hasRealAuthToken || !fromNumber) {
        throw new ServiceUnavailableException("Twilio SMS verification is not configured");
      }

      try {
        this.client ??= twilio(accountSid, authToken);
        await this.client.messages.create({
          to: phoneNumber,
          from: fromNumber,
          body: messageTemplate.replace("{{code}}", code)
        });
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        const providerError = error as { code?: unknown; status?: unknown; message?: unknown; moreInfo?: unknown; details?: { sid?: unknown; from?: unknown; to?: unknown } };
        const code = typeof providerError.code === "string" || typeof providerError.code === "number" ? String(providerError.code) : "unknown";
        const status = typeof providerError.status === "number" ? providerError.status : 502;
        const safeMessage = typeof providerError.message === "string" ? providerError.message.replace(/\b\d{6}\b/g, "[redacted]") : "unknown";
        const messageSid = typeof providerError.details?.sid === "string" ? providerError.details.sid : "unknown";
        this.logger.error(`Twilio SMS delivery failed: code=${code}, status=${status}, messageSid=${messageSid}, message=${safeMessage}`);
        throw new BadGatewayException({
          message: `Twilio rejected the SMS request: ${safeMessage}`,
          twilioCode: code,
          upstreamStatus: status
        });
      }

      return "twilio";
    }

    throw new ServiceUnavailableException("Unsupported SMS provider configured");
  }
}
