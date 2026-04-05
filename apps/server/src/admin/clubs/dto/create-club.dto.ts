import { IsString, IsOptional, IsEnum, IsDateString, ValidateIf } from 'class-validator';
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
  @ValidateIf((o) => o.establishedAt !== null)
  @IsDateString()
  establishedAt?: string | null;

  @IsOptional()
  @IsString()
  predecessorId?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  creditCode?: string;

  @IsOptional()
  @IsString()
  legalPerson?: string;

  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @IsOptional()
  @IsString()
  businessScope?: string;

  @IsOptional()
  @IsString()
  registeredCapital?: string;

  @IsOptional()
  @ValidateIf((o) => o.companyEstablishedAt !== null)
  @IsDateString()
  companyEstablishedAt?: string | null;

  @IsOptional()
  @IsString()
  businessStatus?: string;
}
