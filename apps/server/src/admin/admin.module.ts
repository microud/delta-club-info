import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { ClubsController } from './clubs/clubs.controller';
import { ClubsService } from './clubs/clubs.service';
import { ClubServicesController } from './club-services/club-services.controller';
import { ClubServicesService } from './club-services/club-services.service';
import { ClubRulesController } from './club-rules/club-rules.controller';
import { ClubRulesService } from './club-rules/club-rules.service';
import { PromotionsController } from './promotions/promotions.controller';
import { PromotionsService } from './promotions/promotions.service';
import { SystemConfigsController } from './system-configs/system-configs.controller';
import { SystemConfigsService } from './system-configs/system-configs.service';
import { BloggersController } from './bloggers/bloggers.controller';
import { BloggersService } from './bloggers/bloggers.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [
    AuthController,
    ClubsController,
    ClubServicesController,
    ClubRulesController,
    PromotionsController,
    SystemConfigsController,
    BloggersController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    ClubsService,
    ClubServicesService,
    ClubRulesService,
    PromotionsService,
    SystemConfigsService,
    BloggersService,
  ],
})
export class AdminModule {}
