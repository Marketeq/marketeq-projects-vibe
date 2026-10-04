import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowedIpsController } from './allowed-ips.controller';
import { AllowedIpsService } from './allowed-ips.service';
import { AllowedIp } from './entities/allowed-ip.entity';
import { User } from '../user/entities/user.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([AllowedIp, User]), AuditModule],
  controllers: [AllowedIpsController],
  providers: [AllowedIpsService],
  exports: [AllowedIpsService],
})
export class AllowedIpsModule {}
