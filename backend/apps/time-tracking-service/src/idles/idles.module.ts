import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdleEvent } from '../entities/idle-event.entity';
import { IdlesController } from './idles.controller';
import { IdlesService } from './idles.service';

@Module({
  imports: [TypeOrmModule.forFeature([IdleEvent])],
  controllers: [IdlesController],
  providers: [IdlesService],
  exports: [IdlesService],
})
export class IdlesModule {}
 