import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RoleRateService } from './role-rate.service';

@Module({
  imports: [HttpModule],
  providers: [RoleRateService],
  exports: [RoleRateService],
})
export class RoleRateModule {}
