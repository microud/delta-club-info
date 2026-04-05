import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['openai', 'anthropic', 'xai', 'deepseek'])
  provider?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
