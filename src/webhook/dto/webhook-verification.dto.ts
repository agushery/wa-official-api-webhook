import { Expose } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class WebhookVerificationDto {
  @Expose({ name: 'hub.mode' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['subscribe'])
  readonly mode: string;

  @Expose({ name: 'hub.challenge' })
  @IsString()
  @IsNotEmpty()
  readonly challenge: string;

  @Expose({ name: 'hub.verify_token' })
  @IsString()
  @IsNotEmpty()
  readonly verifyToken: string;
}
