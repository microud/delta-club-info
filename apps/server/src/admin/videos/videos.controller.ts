import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminVideosService } from './videos.service';

@Controller('admin/videos')
@UseGuards(AdminGuard)
export class AdminVideosController {
  constructor(private readonly videosService: AdminVideosService) {}

  @Get()
  findAll(
    @Query('platform') platform?: string,
    @Query('category') category?: string,
  ) {
    return this.videosService.findAll({ platform, category });
  }
}
