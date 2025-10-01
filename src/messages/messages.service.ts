import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { ConfigService } from '../config/config.service';
import { SendCustomMessageDto } from './dto/send-custom-message.dto';
import { SendInteractiveMessageDto } from './dto/send-interactive-message.dto';
import { SendMediaMessageDto } from './dto/send-media-message.dto';
import { SendTemplateMessageDto } from './dto/send-template-message.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';

interface ListTemplatesParams {
  limit?: number;
  after?: string;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.http = axios.create({
      baseURL: `${this.configService.graphBaseUrl}/${this.configService.whatsappPhoneNumberId}`,
      headers: {
        Authorization: `Bearer ${this.configService.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendTextMessage(dto: SendTextMessageDto): Promise<Record<string, unknown>> {
    console.log(dto);
    const payload = {
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'text',
      text: {
        body: dto.body,
        preview_url: dto.previewUrl ?? false,
      },
    };

    return await this.sendMessage(payload);
  }

  async sendTemplateMessage(dto: SendTemplateMessageDto): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      to: dto.to,
      type: 'template',
      template: {
        name: dto.templateName,
        language: {
          code: dto.language,
        },
        components: dto.components,
      },
    };

    return this.sendMessage(payload);
  }

  async sendMediaMessage(dto: SendMediaMessageDto): Promise<Record<string, unknown>> {
    const mediaPayload: Record<string, unknown> = {};

    if (dto.link) {
      mediaPayload.link = dto.link;
    }

    if (dto.id) {
      mediaPayload.id = dto.id;
    }

    if (dto.caption) {
      mediaPayload.caption = dto.caption;
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: dto.to,
      type: dto.type,
      [dto.type]: mediaPayload,
    };

    return this.sendMessage(payload);
  }

  async sendInteractiveMessage(
    dto: SendInteractiveMessageDto,
  ): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: dto.recipientType ?? 'individual',
      to: dto.to,
      type: 'interactive',
      interactive: dto.interactive,
    };

    return this.sendMessage(payload);
  }

  async sendCustomMessage(dto: SendCustomMessageDto): Promise<Record<string, unknown>> {
    const payload = {
      messaging_product: 'whatsapp',
      ...dto.payload,
    };

    return this.sendMessage(payload);
  }

  async markMessageAsRead(messageId?: string): Promise<void> {
    if (!messageId) {
      return;
    }

    const payload = {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    };

    try {
      await this.sendMessage(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to mark message ${messageId} as read: ${message}`);
    }
  }

  async getBusinessProfile(): Promise<Record<string, unknown>> {
    const url = '/business_profile';
    return this.get(url);
  }

  async listMessageTemplates(
    params: ListTemplatesParams = {},
  ): Promise<Record<string, unknown>> {
    const businessAccountId = this.configService.businessAccountId;
    if (!businessAccountId) {
      throw new HttpException(
        'WHATSAPP_BUSINESS_ACCOUNT_ID is required to list message templates',
        HttpStatus.BAD_REQUEST,
      );
    }

    const { limit, after } = params;

    const url = `${this.configService.graphBaseUrl}/${businessAccountId}/message_templates`;
    const response = await axios.get<Record<string, unknown>>(url, {
      headers: {
        Authorization: `Bearer ${this.configService.whatsappAccessToken}`,
      },
      params: {
        limit,
        after,
      },
    });

    return response.data;
  }

  private async sendMessage(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    try {
      console.log('PAYLOAD BEFORE POST: ', payload);
      const { data } = await this.http.post<Record<string, unknown>>('/messages', payload);
      console.log(data);
      return data;
    } catch (error) {
      console.log(error);
      this.handleAxiosError(error);
    }
  }

  private async get(path: string): Promise<Record<string, unknown>> {
    try {
      const { data } = await this.http.get<Record<string, unknown>>(path);
      return data;
    } catch (error) {
      this.handleAxiosError(error);
    }
  }

  private handleAxiosError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: unknown }>;
      const status = axiosError.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      const details = axiosError.response?.data ?? axiosError.message;

      this.logger.error(`WhatsApp API error: ${JSON.stringify(details)}`);

      throw new HttpException(
        {
          message: 'WhatsApp API request failed',
          details,
        },
        status,
      );
    }

    throw new HttpException(
      {
        message: 'Unexpected error while calling WhatsApp API',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
