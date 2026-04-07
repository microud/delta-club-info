import { IsString, IsOptional } from 'class-validator';

export class CreateBloggerDto {
  @IsString() name: string;
  @IsString() @IsOptional() avatar?: string;
}
