import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ClubStatus } from '@delta-club/shared';

export class CreateClubDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  wechatOfficialAccount?: string;

  @IsOptional()
  @IsString()
  wechatMiniProgram?: string;

  @IsOptional()
  @IsString()
  contactInfo?: string;

  @IsOptional()
  @IsEnum(ClubStatus)
  status?: ClubStatus;

  @IsOptional()
  @IsDateString()
  establishedAt?: string;

  @IsOptional()
  @IsString()
  predecessorId?: string;
}
