import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AiConfigsService } from './ai-configs.service';
import { CreateAiConfigDto } from './dto/create-ai-config.dto';
import { UpdateAiConfigDto } from './dto/update-ai-config.dto';

@Controller('admin/ai-configs')
@UseGuards(AdminGuard)
export class AiConfigsController {
  constructor(private readonly aiConfigsService: AiConfigsService) {}

  @Get()
  findAll() {
    return this.aiConfigsService.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiConfigsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateAiConfigDto) {
    return this.aiConfigsService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiConfigDto,
  ) {
    return this.aiConfigsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiConfigsService.delete(id);
  }
}
