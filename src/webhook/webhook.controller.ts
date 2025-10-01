import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WebhookVerificationDto } from './dto/webhook-verification.dto';
import { WebhookService, type WhatsAppWebhookPayload } from './webhook.service';

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  verify(@Query() query: WebhookVerificationDto): string {
    return this.webhookService.verifyWebhook(query);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: WhatsAppWebhookPayload,
    @Req() req: RequestWithRawBody,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(payload);
    await this.webhookService.handleWebhook(payload, rawBody, signature);
    return { status: 'received' };
  }
}
