import { IsNotEmpty, IsObject } from 'class-validator';

export class SendCustomMessageDto {
  @IsObject()
  @IsNotEmpty()
  readonly payload!: Record<string, unknown>;
}
