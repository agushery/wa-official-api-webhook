import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class ListMessageTemplatesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly limit?: number;

  @IsOptional()
  @IsString()
  readonly after?: string;
}
