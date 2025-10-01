import { Module } from '@nestjs/common';
import { MessagesModule } from '../messages/messages.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [MessagesModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
