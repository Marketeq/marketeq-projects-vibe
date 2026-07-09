import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from './industries.entity';
import { IndustriesService } from './industries.service';
import { IndustriesController } from './industries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Industry])],
  providers: [IndustriesService],
  controllers: [IndustriesController],
})
export class IndustriesModule {}
