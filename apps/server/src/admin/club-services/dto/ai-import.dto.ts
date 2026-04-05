import { IsArray, IsOptional, IsString } from 'class-validator';

export class AiImportDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageKeys?: string[];

  @IsOptional()
  @IsString()
  textContent?: string;
}
