import { IsNotEmpty, IsString } from 'class-validator';

export class MarkMessageReadDto {
  @IsString()
  @IsNotEmpty()
  readonly messageId!: string;
}
