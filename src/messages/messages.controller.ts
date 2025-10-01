import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ListMessageTemplatesDto } from './dto/list-message-templates.dto';
import { MarkMessageReadDto } from './dto/mark-message-read.dto';
import { SendCustomMessageDto } from './dto/send-custom-message.dto';
import { SendInteractiveMessageDto } from './dto/send-interactive-message.dto';
import { SendMediaMessageDto } from './dto/send-media-message.dto';
import { SendTemplateMessageDto } from './dto/send-template-message.dto';
import { SendTextMessageDto } from './dto/send-text-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post('text')
  sendText(@Body() dto: SendTextMessageDto) {
    return this.messagesService.sendTextMessage(dto);
  }

  @Post('template')
  sendTemplate(@Body() dto: SendTemplateMessageDto) {
    return this.messagesService.sendTemplateMessage(dto);
  }

  @Post('media')
  sendMedia(@Body() dto: SendMediaMessageDto) {
    return this.messagesService.sendMediaMessage(dto);
  }

  @Post('interactive')
  sendInteractive(@Body() dto: SendInteractiveMessageDto) {
    return this.messagesService.sendInteractiveMessage(dto);
  }

  @Post('custom')
  sendCustom(@Body() dto: SendCustomMessageDto) {
    return this.messagesService.sendCustomMessage(dto);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markRead(@Body() dto: MarkMessageReadDto): Promise<void> {
    await this.messagesService.markMessageAsRead(dto.messageId);
  }

  @Get('profile')
  getProfile() {
    return this.messagesService.getBusinessProfile();
  }

  @Get('templates')
  listTemplates(@Query() query: ListMessageTemplatesDto) {
    return this.messagesService.listMessageTemplates(query);
  }
}
