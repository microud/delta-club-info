import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAiConfigDto {
  @IsString()
  name: string;

  @IsIn(['openai', 'anthropic', 'xai', 'deepseek'])
  provider: string;

  @IsString()
  apiKey: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsString()
  model: string;
}
