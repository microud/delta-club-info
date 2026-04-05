import { IsString, IsOptional, IsEnum } from 'class-validator';
import { RuleSentiment } from '@delta-club/shared';

export class UpdateClubRuleDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(RuleSentiment)
  sentiment?: RuleSentiment;
}
