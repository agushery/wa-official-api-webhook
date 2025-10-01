import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

const MEDIA_TYPE_VALUES = ['image', 'video', 'audio', 'document', 'sticker'] as const;

type MediaType = (typeof MEDIA_TYPE_VALUES)[number];

export class SendMediaMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly to!: string;

  @IsString()
  @IsIn(MEDIA_TYPE_VALUES)
  readonly type!: MediaType;

  @ValidateIf((o: SendMediaMessageDto) => !o.id)
  @IsOptional()
  @IsString()
  readonly link?: string;

  @ValidateIf((o: SendMediaMessageDto) => !o.link)
  @IsOptional()
  @IsString()
  readonly id?: string;

  @IsOptional()
  @IsString()
  readonly caption?: string;
}
