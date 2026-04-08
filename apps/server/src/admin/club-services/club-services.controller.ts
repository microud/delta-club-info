import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ClubServicesService } from './club-services.service';
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
  @UseInterceptors(FilesInterceptor('files', 20))
  aiImport(
    @Param('clubId') _clubId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { textContent?: string },
  ) {
    return this.clubServicesService.aiImport(files ?? [], body.textContent);
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
