import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ClientGuard } from '../../common/guards/client.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/client/user')
@UseGuards(ClientGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.userService.getProfile(user.id);
  }

  @Get('favorites')
  getFavorites(
    @CurrentUser() user: { id: string },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.userService.getFavorites(user.id, page, pageSize);
  }

  @Post('favorites/:clubId')
  addFavorite(
    @CurrentUser() user: { id: string },
    @Param('clubId') clubId: string,
  ) {
    return this.userService.addFavorite(user.id, clubId);
  }

  @Delete('favorites/:clubId')
  removeFavorite(
    @CurrentUser() user: { id: string },
    @Param('clubId') clubId: string,
  ) {
    return this.userService.removeFavorite(user.id, clubId);
  }
}
