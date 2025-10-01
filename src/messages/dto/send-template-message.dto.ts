import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const COMPONENT_TYPE_VALUES = ['header', 'body', 'button', 'footer'] as const;
const PARAMETER_TYPE_VALUES = [
  'text',
  'currency',
  'date_time',
  'image',
  'document',
  'video',
  'payload',
  'button',
] as const;

export class TemplateComponentParameterDto {
  @IsString()
  @IsIn(PARAMETER_TYPE_VALUES)
  readonly type!: (typeof PARAMETER_TYPE_VALUES)[number];

  @IsOptional()
  @IsString()
  readonly sub_type?: string;

  @IsOptional()
  readonly text?: string;

  @IsOptional()
  readonly currency?: Record<string, unknown>;

  @IsOptional()
  readonly date_time?: Record<string, unknown>;

  @IsOptional()
  readonly image?: Record<string, unknown>;

  @IsOptional()
  readonly document?: Record<string, unknown>;

  @IsOptional()
  readonly video?: Record<string, unknown>;

  @IsOptional()
  readonly payload?: string;
}

export class TemplateComponentDto {
  @IsString()
  @IsIn(COMPONENT_TYPE_VALUES)
  readonly type!: (typeof COMPONENT_TYPE_VALUES)[number];

  @IsOptional()
  @IsString()
  readonly sub_type?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentParameterDto)
  readonly parameters?: TemplateComponentParameterDto[];
}

export class SendTemplateMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly to!: string;

  @IsString()
  @IsNotEmpty()
  readonly templateName!: string;

  @IsString()
  @IsNotEmpty()
  readonly language!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  readonly components?: TemplateComponentDto[];
}
