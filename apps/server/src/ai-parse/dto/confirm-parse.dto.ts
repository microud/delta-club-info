import { IsString, IsOptional, IsObject } from 'class-validator';

export class ConfirmParseDto {
  @IsString()
  clubId: string;

  @IsOptional()
  @IsObject()
  parsedResult?: Record<string, unknown>;
}
