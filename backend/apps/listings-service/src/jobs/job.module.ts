import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ujobsController } from './job.controller';
import { ujobsService } from './job.service';
import { ujob } from './entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ujob])],
  controllers: [ujobsController],
  providers: [ujobsService],
  exports: [ujobsService],
})
export class ujobsModule {}
