import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBloggerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
