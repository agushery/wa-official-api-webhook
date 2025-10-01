import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendTextMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly to!: string;

  @IsString()
  @IsNotEmpty()
  readonly body!: string;

  @IsOptional()
  @IsBoolean()
  readonly previewUrl?: boolean;
}
