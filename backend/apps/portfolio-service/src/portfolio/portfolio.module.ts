import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController, HealthController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioItem } from './portfolio.entity';
import { MediaModule } from '../media/media.module';
import { JwtStrategy } from '../auth/jwt.strategy'      
import { OwnerOrAdminGuard } from '../auth/roles.guard';
import { PassportModule } from '@nestjs/passport';


@Module({
  imports: [MediaModule, TypeOrmModule.forFeature([PortfolioItem]), PassportModule],
  controllers: [PortfolioController, HealthController],
  providers: [PortfolioService, JwtStrategy, OwnerOrAdminGuard],
  exports: [PortfolioService],
})
export class PortfolioModule {}
