import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class SendInteractiveMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly to!: string;

  @IsOptional()
  @IsString()
  readonly recipientType?: 'individual' | 'group';

  @IsObject()
  readonly interactive!: Record<string, unknown>;
}
