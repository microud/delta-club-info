import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
} from 'class-validator';

export class UpdateClubServiceDto {
  @IsOptional()
  @IsNumber()
  priceYuan?: number;

  @IsOptional()
  @IsNumber()
  priceHafuCoin?: number;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsNumber()
  pricePerHour?: number;

  @IsOptional()
  @IsString()
  gameName?: string;

  @IsOptional()
  @IsBoolean()
  hasGuarantee?: boolean;

  @IsOptional()
  @IsNumber()
  guaranteeHafuCoin?: number;

  @IsOptional()
  @IsString()
  rules?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
