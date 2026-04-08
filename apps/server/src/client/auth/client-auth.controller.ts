import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientGuard } from '../../common/guards/client.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('api/client/auth')
export class ClientAuthController {
  constructor(private readonly authService: ClientAuthService) {}

  @Post('login')
  login(@Body() body: { code: string }) {
    return this.authService.login(body.code);
  }

  @Post('profile')
  @UseGuards(ClientGuard)
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() body: { nickname: string; avatar: string },
  ) {
    return this.authService.updateProfile(user.id, body.nickname, body.avatar);
  }
}
