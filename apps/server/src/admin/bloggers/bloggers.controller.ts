import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { BloggersService } from './bloggers.service';
import { CreateBloggerDto } from './dto/create-blogger.dto';
import { UpdateBloggerDto } from './dto/update-blogger.dto';

@Controller('admin/bloggers')
@UseGuards(AdminGuard)
export class BloggersController {
  constructor(private readonly bloggersService: BloggersService) {}

  @Get()
  findAll() {
    return this.bloggersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateBloggerDto) {
    return this.bloggersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBloggerDto) {
    return this.bloggersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bloggersService.remove(id);
  }
}
