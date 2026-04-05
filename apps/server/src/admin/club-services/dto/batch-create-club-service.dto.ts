import { Type } from 'class-transformer';
import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { CreateClubServiceDto } from './create-club-service.dto';

export class BatchCreateClubServiceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateClubServiceDto)
  services: CreateClubServiceDto[];
}
