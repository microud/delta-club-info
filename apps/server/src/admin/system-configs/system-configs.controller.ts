import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { type SystemConfigsService } from './system-configs.service';
import { type UpdateConfigDto } from './dto/update-config.dto';

@Controller('admin/system-configs')
@UseGuards(AdminGuard)
export class SystemConfigsController {
  constructor(private readonly systemConfigsService: SystemConfigsService) {}

  @Get()
  findAll() {
    return this.systemConfigsService.findAll();
  }

  @Put(':key')
  update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.systemConfigsService.upsert(key, dto.value);
  }
}
