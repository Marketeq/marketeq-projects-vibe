import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobsInternalController } from './jobs-internal.controller';
import { JobsController } from './job.controller';
import { JobsService } from './job.service';
import { Job } from './entities/job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job]), ConfigModule],
  controllers: [JobsController, JobsInternalController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
