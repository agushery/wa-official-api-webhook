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
  ) { }

  verifyWebhook(query: WebhookVerificationDto): string {
    if (query.verifyToken !== this.configService.webhookVerifyToken) {
      throw new ForbiddenException('Invalid verify token');
    }

    this.log('webhook', 'Webhook verified successfully');
    return query.challenge;
  }

  async handleWebhook(
    payload: WhatsAppWebhookPayload,
    rawBody: string,
    signatureHeader?: string,
  ): Promise<void> {
    this.debug('webhook', 'Received webhook payload', {
      object: payload?.object,
      entries: payload?.entry?.length ?? 0,
    });

    this.assertValidSignature(rawBody, signatureHeader);

    if (!payload?.entry?.length) {
      this.warn('webhook', 'Received webhook with no entries');
      return;
    }

    for (const entry of payload.entry) {
      this.debug('webhook', 'Processing entry', {
        entryId: entry?.id,
        changes: entry?.changes?.length ?? 0,
        rawEntry: entry,
      });

      if (!entry?.changes?.length) {
        this.warn('webhook', 'Entry had no changes array', {
          entryId: entry?.id,
        });
        continue;
      }

      for (const change of entry.changes) {
        const field = change.field ?? 'unknown';
        this.debug(field, 'Processing change', {
          entryId: entry?.id,
          field,
          hasValue: Boolean(change.value),
          topLevelKeys: change.value ? Object.keys(change.value) : [],
        });
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
            this.warn('webhook', 'Unhandled webhook field', { field });
            break;
        }
      }
    }
  }

  private async processMessagesChange(value?: WhatsAppChangeValue): Promise<void> {
    if (!value?.messages?.length) {
      this.warn('messages', 'Change payload contained no messages', {
        metadata: value?.metadata,
        contacts: value?.contacts,
      });
      return;
    }

    this.debug('messages', 'Processing messages change', {
      messageCount: value.messages.length,
      metadata: value.metadata,
    });

    for (const message of value.messages) {
      const from = message.from ?? 'unknown';
      const type = message.type ?? 'unknown';
      this.log('messages', 'Received incoming message', {
        from,
        type,
        messageId: message.id,
        timestamp: message.timestamp,
      });

      if (message.context?.id) {
        this.debug('messages', 'Message references previous context', {
          replyTo: message.context.id,
        });
      }

      const isFromBusiness = this.isMessageFromBusiness(from, value.metadata?.phone_number_id);
      this.debug('messages', 'Determined message source', {
        from,
        isFromBusiness,
        metadataPhoneNumberId: value.metadata?.phone_number_id,
      });

      if (!isFromBusiness) {
        this.debug('messages', 'Marking message as read', { messageId: message.id });
        await this.messagesService.markMessageAsRead(message.id);
        this.debug('messages', 'Marked message as read', { messageId: message.id });
      }

      if (message.type === 'text' && message.text?.body) {
        this.debug('messages', 'Message body captured', {
          snippet: message.text.body.slice(0, 160),
        });
      }

      if (from === 'unknown' || isFromBusiness) {
        if (from === 'unknown') {
          this.warn('messages', 'Skipping message with unknown sender', {
            messageId: message.id,
          });
        } else {
          this.debug('messages', 'Skipping business-originated message', {
            from,
          });
        }
        continue;
      }

      this.log('messages', 'Dispatching auto reply', { to: from });
      await this.sendAutoReply(from);
      this.log('messages', 'Auto reply dispatched', { to: from });
    }
  }

  private processStatusesChange(value?: WhatsAppChangeValue): void {
    if (!value?.statuses?.length) {
      this.warn('statuses', 'Change payload contained no statuses', {
        metadata: value?.metadata,
      });
      return;
    }

    for (const status of value.statuses) {
      this.log('statuses', 'Received status update', {
        messageId: status.id,
        status: status.status,
        recipientId: status.recipient_id,
      });

      if (status.errors?.length) {
        status.errors.forEach((error) =>
          this.error('statuses', 'Delivery error received', {
            code: error.code,
            title: error.title,
            description: error.message,
          }),
        );
      }
    }
  }

  private processTemplateUpdate(value: WhatsAppChangeValue | undefined, field: string): void {
    if (!value?.message_template_id && !value?.event) {
      this.warn('templates', 'Template update missing required details', { field });
      return;
    }

    this.log('templates', 'Received template event', {
      templateId: value.message_template_id,
      event: value.event,
    });

    if (value.reason) {
      this.warn('templates', 'Template update reason provided', {
        reason: value.reason,
      });
    }

    value.failures?.forEach((failure) =>
      this.error('templates', 'Template failure received', {
        code: failure.code,
        title: failure.title,
        description: failure.message,
      }),
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

  private async sendAutoReply(recipientWaId: string): Promise<void> {
    const messageBody = [
      'Halo,',
      'Untuk melakukan reservasi silahkan melalui Sobat Bunda dulu ya Bunda. Sobat Bunda bisa reservasi sejak H-7 sampai hari H!',
      '',
      '*Reservasi lebih mudah dan cepat? Lewat Sobat Bunda aja!*',
      '',
      'Android di Google Playstore: https://s.id/sobatbunda-android',
      '',
      'IOS di Apple Store:',
      'https://s.id/sobatbunda-ios',
      '',
      'Ada kendala? Chat kami di jam operasional WhatsApp pk 08.00-20.00 wita',
    ].join('\n');

    try {
      this.debug('messages', 'Sending auto reply payload', { recipientWaId });
      await this.messagesService.sendTextMessage({
        to: recipientWaId,
        body: messageBody,
        previewUrl: true,
      });
      this.debug('messages', 'Auto reply send request posted', {
        recipientWaId,
        length: messageBody.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.error('messages', 'Failed to send auto reply', {
        recipientWaId,
        error: message,
      });
    }
  }

  private isMessageFromBusiness(sender: string | undefined, metadataPhoneNumberId?: string): boolean {
    if (!sender || sender === 'unknown') {
      return false;
    }

    const businessPhoneNumberId = metadataPhoneNumberId ?? this.configService.whatsappPhoneNumberId;
    return sender === businessPhoneNumberId;
  }

  private log(type: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.log(this.formatLog(type, message, meta));
  }

  private debug(type: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(this.formatLog(type, message, meta));
  }

  private warn(type: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(this.formatLog(type, message, meta));
  }

  private error(type: string, message: string, meta?: Record<string, unknown>): void {
    this.logger.error(this.formatLog(type, message, meta));
  }

  private formatLog(type: string, message: string, meta?: Record<string, unknown>): string {
    const base = `[${type}] ${message}`;
    if (!meta || Object.keys(meta).length === 0) {
      return base;
    }

    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return base;
    }
  }
}
