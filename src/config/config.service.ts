import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly env = process.env;

  get port(): number {
    const raw = this.env.PORT ?? '3000';
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? 3000 : parsed;
  }

  get webhookVerifyToken(): string {
    return this.getRequired('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
  }

  get whatsappAccessToken(): string {
    return this.getRequired('WHATSAPP_ACCESS_TOKEN');
  }

  get whatsappPhoneNumberId(): string {
    return this.getRequired('WHATSAPP_PHONE_NUMBER_ID');
  }

  get webhookBaseUrl(): string {
    return this.env.WHATSAPP_WEBHOOK_BASE_URL ?? '';
  }

  get apiVersion(): string {
    return this.env.WHATSAPP_API_VERSION ?? 'v17.0';
  }

  get graphBaseUrl(): string {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  get businessAccountId(): string | undefined {
    return this.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  }

  get appSecret(): string | undefined {
    return this.env.WHATSAPP_APP_SECRET;
  }

  private getRequired(key: string): string {
    const value = this.env[key];
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return value;
  }
}
