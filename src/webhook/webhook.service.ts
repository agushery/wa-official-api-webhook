import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '../config/config.service';
import { MessagesService } from '../messages/messages.service';
import type { WebhookVerificationDto } from './dto/webhook-verification.dto';

export interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: WhatsAppChange[];
  }>;
}

interface WhatsAppChange {
  field?: string;
  value?: WhatsAppChangeValue;
}

interface WhatsAppChangeValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: { name?: string };
    wa_id?: string;
  }>;
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  message_template_id?: string;
  event?: string;
  reason?: string;
  failures?: Array<{
    code?: number;
    title?: string;
    message?: string;
  }>;
}

interface WhatsAppMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; mime_type?: string; sha256?: string; id?: string };
  audio?: { mime_type?: string; sha256?: string; id?: string };
  video?: { caption?: string; mime_type?: string; sha256?: string; id?: string };
  interactive?: Record<string, unknown>;
  button?: { payload?: string; text?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  contacts?: unknown;
  context?: { from?: string; id?: string };
}

interface WhatsAppStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: {
    id?: string;
    expiration_timestamp?: string;
    origin?: {
      type?: string;
    };
  };
  pricing?: {
    billable?: boolean;
    pricing_model?: string;
    category?: string;
  };
  errors?: Array<{
    code?: number;
    title?: string;
    message?: string;
  }>;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
  ) {}

  verifyWebhook(query: WebhookVerificationDto): string {
    if (query.verifyToken !== this.configService.webhookVerifyToken) {
      throw new ForbiddenException('Invalid verify token');
    }

    this.logger.log('Webhook verified successfully');
    return query.challenge;
  }

  async handleWebhook(
    payload: WhatsAppWebhookPayload,
    rawBody: string,
    signatureHeader?: string,
  ): Promise<void> {
    this.assertValidSignature(rawBody, signatureHeader);

    if (!payload?.entry?.length) {
      this.logger.warn('Received webhook with no entries');
      return;
    }

    for (const entry of payload.entry) {
      if (!entry?.changes?.length) {
        continue;
      }

      for (const change of entry.changes) {
        const field = change.field ?? 'unknown';
        switch (field) {
          case 'messages':
            await this.processMessagesChange(change.value);
            break;
          case 'message_template_status_update':
          case 'message_template_category_update':
            this.processTemplateUpdate(change.value, field);
            break;
          case 'statuses':
            this.processStatusesChange(change.value);
            break;
          default:
            this.logger.warn(`Unhandled webhook field: ${field}`);
            break;
        }
      }
    }
  }

  private async processMessagesChange(value?: WhatsAppChangeValue): Promise<void> {
    if (!value?.messages?.length) {
      this.logger.warn('messages change received with empty payload');
      return;
    }

    for (const message of value.messages) {
      const from = message.from ?? 'unknown';
      const type = message.type ?? 'unknown';
      this.logger.log(`Received ${type} message from ${from}`);

      if (message.context?.id) {
        this.logger.debug(`Message is a reply to ${message.context.id}`);
      }

      await this.messagesService.markMessageAsRead(message.id);

      if (message.type === 'text' && message.text?.body) {
        this.logger.debug(`Message body: ${message.text.body}`);
      }
    }
  }

  private processStatusesChange(value?: WhatsAppChangeValue): void {
    if (!value?.statuses?.length) {
      this.logger.warn('statuses change received with empty payload');
      return;
    }

    for (const status of value.statuses) {
      this.logger.log(`Message ${status.id ?? 'unknown'} status: ${status.status}`);

      if (status.errors?.length) {
        status.errors.forEach((error) =>
          this.logger.error(
            `Delivery error (${error.code ?? 'n/a'}): ${error.title ?? ''} ${error.message ?? ''}`.trim(),
          ),
        );
      }
    }
  }

  private processTemplateUpdate(value: WhatsAppChangeValue | undefined, field: string): void {
    if (!value?.message_template_id && !value?.event) {
      this.logger.warn(`${field} received without template details`);
      return;
    }

    this.logger.log(
      `Template ${value.message_template_id ?? 'unknown'} event ${value.event ?? 'unknown'}`,
    );

    if (value.reason) {
      this.logger.warn(`Template update reason: ${value.reason}`);
    }

    value.failures?.forEach((failure) =>
      this.logger.error(
        `Template failure (${failure.code ?? 'n/a'}): ${failure.title ?? ''} ${
          failure.message ?? ''
        }`.trim(),
      ),
    );
  }

  private assertValidSignature(rawBody: string, signatureHeader?: string): void {
    const appSecret = this.configService.appSecret;
    if (!appSecret) {
      return;
    }

    if (!signatureHeader) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256 header');
    }

    const expected = this.computeSignature(rawBody, appSecret);
    const provided = signatureHeader.replace('sha256=', '');
    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');

    if (expectedBuffer.length !== providedBuffer.length) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  private computeSignature(rawBody: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  }
}
