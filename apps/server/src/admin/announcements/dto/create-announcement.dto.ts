import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
