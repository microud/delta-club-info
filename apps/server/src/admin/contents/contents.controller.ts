import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminContentsService } from './contents.service';

@Controller('admin/contents')
@UseGuards(AdminGuard)
export class AdminContentsController {
  constructor(private readonly contentsService: AdminContentsService) {}

  @Get()
  findAll(
    @Query('platform') platform?: string,
    @Query('contentType') contentType?: string,
    @Query('category') category?: string,
    @Query('aiParsed') aiParsed?: string,
    @Query('hasClub') hasClub?: string,
    @Query('bloggerId') bloggerId?: string,
  ) {
    return this.contentsService.findAll({
      platform,
      contentType,
      category,
      aiParsed,
      hasClub,
      bloggerId,
    });
  }

  @Post(':id/link-club')
  linkClub(@Param('id') id: string, @Body() body: { clubId: string }) {
    return this.contentsService.linkClub(id, body.clubId);
  }

  @Post('merge')
  mergeGroup(@Body() body: { contentIds: string[]; primaryId: string }) {
    return this.contentsService.mergeGroup(body.contentIds, body.primaryId);
  }

  @Post(':id/split')
  splitFromGroup(@Param('id') id: string) {
    return this.contentsService.splitFromGroup(id);
  }
}
