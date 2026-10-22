import { IdentityGateModule } from '../identity-gate/identity-gate.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreakEvent } from '../entities/break-event.entity';
import { BreaksController } from './breaks.controller';
import { BreaksService } from './breaks.service';

@Module({
  imports: [IdentityGateModule, TypeOrmModule.forFeature([BreakEvent])],
  controllers: [BreaksController],
  providers: [BreaksService],
  exports: [BreaksService],
})
export class BreaksModule {}