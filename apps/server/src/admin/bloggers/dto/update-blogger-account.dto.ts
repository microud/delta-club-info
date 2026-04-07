import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';

export class UpdateBloggerAccountDto {
  @IsString() @IsOptional() platformUsername?: string;

  @IsArray()
  @IsEnum(['REVIEW', 'SENTIMENT'], { each: true })
  @IsOptional()
  crawlCategories?: string[];
}
