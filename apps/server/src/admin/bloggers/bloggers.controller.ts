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
import { type BloggersService } from './bloggers.service';
import { type CreateBloggerDto } from './dto/create-blogger.dto';
import { type UpdateBloggerDto } from './dto/update-blogger.dto';
import { type CreateBloggerAccountDto } from './dto/create-blogger-account.dto';
import { type UpdateBloggerAccountDto } from './dto/update-blogger-account.dto';

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

  @Post(':id/accounts')
  addAccount(
    @Param('id') bloggerId: string,
    @Body() dto: CreateBloggerAccountDto,
  ) {
    return this.bloggersService.addAccount(bloggerId, dto);
  }

  @Patch('accounts/:accountId')
  updateAccount(
    @Param('accountId') accountId: string,
    @Body() dto: UpdateBloggerAccountDto,
  ) {
    return this.bloggersService.updateAccount(accountId, dto);
  }

  @Delete('accounts/:accountId')
  removeAccount(@Param('accountId') accountId: string) {
    return this.bloggersService.removeAccount(accountId);
  }
}
