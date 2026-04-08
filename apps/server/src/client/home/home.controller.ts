import { Controller, Get, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { type HomeService } from './home.service';

@Controller('api/client/home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get('banners')
  getBanners() {
    return this.homeService.getBanners();
  }

  @Get('feed')
  getFeed(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('category') category?: string,
  ) {
    return this.homeService.getFeed(page, pageSize, category);
  }
}
