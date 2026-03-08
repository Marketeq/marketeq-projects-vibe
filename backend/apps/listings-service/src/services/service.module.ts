import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './service.controller';
import { ServicesService } from './service.service';
import { Service } from './entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
