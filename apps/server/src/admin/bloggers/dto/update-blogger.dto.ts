import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateBloggerDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() avatar?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}
