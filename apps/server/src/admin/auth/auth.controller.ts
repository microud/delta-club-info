import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { type AuthService } from './auth.service';
import { type LoginDto } from './dto/login.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@CurrentAdmin() admin: { id: string; username: string; role: string }) {
    return admin;
  }
}
