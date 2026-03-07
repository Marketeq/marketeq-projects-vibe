import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { uservicesController } from './service.controller';
import { uservicesService } from './service.service';
import { uservice } from './entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([uservice])],
  controllers: [uservicesController],
  providers: [uservicesService],
  exports: [uservicesService],
})
export class uservicesModule {}
