import { IsString, IsEnum } from 'class-validator';

export class CreateBloggerDto {
  @IsEnum(['BILIBILI', 'DOUYIN'])
  platform: string;

  @IsString()
  externalId: string;

  @IsString()
  name: string;
}
