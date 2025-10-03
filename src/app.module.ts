import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { MessagesModule } from './messages/messages.module';
import { WebhookModule } from './webhook/webhook.module';

@Module({
  imports: [ConfigModule, AuthModule, HealthModule, WebhookModule, MessagesModule],
})
export class AppModule {}
