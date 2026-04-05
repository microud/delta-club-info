import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClubServicesService } from './club-services.service';
import { AiImportDto } from './dto/ai-import.dto';
import { BatchCreateClubServiceDto } from './dto/batch-create-club-service.dto';
import { CreateClubServiceDto } from './dto/create-club-service.dto';
import { UpdateClubServiceDto } from './dto/update-club-service.dto';

@Controller('admin/clubs/:clubId/services')
@UseGuards(AdminGuard)
export class ClubServicesController {
  constructor(private readonly clubServicesService: ClubServicesService) {}

  @Get()
  findByClub(@Param('clubId') clubId: string) {
    return this.clubServicesService.findByClub(clubId);
  }

  @Post('ai-import')
  aiImport(
    @Param('clubId') clubId: string,
    @Body() dto: AiImportDto,
  ) {
    return this.clubServicesService.aiImport(dto.imageKeys ?? [], dto.textContent);
  }

  @Post('batch')
  batchCreate(
    @Param('clubId') clubId: string,
    @Body() dto: BatchCreateClubServiceDto,
  ) {
    return this.clubServicesService.batchCreate(clubId, dto.services);
  }

  @Post()
  create(
    @Param('clubId') clubId: string,
    @Body() dto: CreateClubServiceDto,
  ) {
    return this.clubServicesService.create(clubId, dto);
  }

  @Put(':id')
  update(
    @Param('clubId') clubId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClubServiceDto,
  ) {
    return this.clubServicesService.update(clubId, id, dto);
  }

  @Delete(':id')
  remove(@Param('clubId') clubId: string, @Param('id') id: string) {
    return this.clubServicesService.remove(clubId, id);
  }
}
