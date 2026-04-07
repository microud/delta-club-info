import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateBloggerAccountDto {
  @IsEnum(['BILIBILI', 'DOUYIN', 'XIAOHONGSHU', 'WECHAT_CHANNELS'])
  platform: string;

  @IsString() platformUserId: string;
  @IsString() @IsOptional() platformUsername?: string;

  @IsArray()
  @IsEnum(['REVIEW', 'SENTIMENT'], { each: true })
  crawlCategories: string[];
}
