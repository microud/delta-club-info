import { IsString, IsNumber, IsDateString } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  clubId: string;

  @IsNumber()
  fee: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;
}
