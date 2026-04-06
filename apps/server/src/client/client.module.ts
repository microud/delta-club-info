import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { ClientAuthController } from './auth/client-auth.controller';
import { ClientAuthService } from './auth/client-auth.service';
import { ClientJwtStrategy } from './auth/client-jwt.strategy';

import { HomeController } from './home/home.controller';
import { HomeService } from './home/home.service';

import { ClientClubsController } from './clubs/client-clubs.controller';
import { ClientClubsService } from './clubs/client-clubs.service';

import { ClientVideosController } from './videos/client-videos.controller';
import { ClientVideosService } from './videos/client-videos.service';

import { ClientAnnouncementsController } from './announcements/client-announcements.controller';
import { ClientAnnouncementsService } from './announcements/client-announcements.service';

import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [
    ClientAuthController,
    HomeController,
    ClientClubsController,
    ClientVideosController,
    ClientAnnouncementsController,
    UserController,
  ],
  providers: [
    ClientAuthService,
    ClientJwtStrategy,
    HomeService,
    ClientClubsService,
    ClientVideosService,
    ClientAnnouncementsService,
    UserService,
  ],
})
export class ClientModule {}
