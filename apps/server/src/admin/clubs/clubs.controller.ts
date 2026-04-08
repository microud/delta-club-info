import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { type ClubsService } from './clubs.service';
import { type CreateClubDto } from './dto/create-club.dto';
import { type UpdateClubDto } from './dto/update-club.dto';

@Controller('admin/clubs')
@UseGuards(AdminGuard)
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('search') search?: string,
  ) {
    return this.clubsService.findAll(page, pageSize, search);
  }

  @Post('fetch-wechat-avatar')
  async fetchWechatAvatar(@Body() body: { wechatOfficialAccount: string }) {
    try {
      const logoUrl = await this.clubsService.fetchWechatAvatar(body.wechatOfficialAccount);
      return { logoUrl };
    } catch {
      throw new BadRequestException('获取失败，请手动上传');
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clubsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClubDto) {
    return this.clubsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClubDto) {
    return this.clubsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clubsService.remove(id);
  }
}
