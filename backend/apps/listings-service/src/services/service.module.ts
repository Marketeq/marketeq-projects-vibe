import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServicesInternalController } from './services-internal.controller';
import { ServicesController } from './service.controller';
import { ServicesService } from './service.service';
import { Service } from './entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service]), ConfigModule],
  controllers: [ServicesController, ServicesInternalController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
