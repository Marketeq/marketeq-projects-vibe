import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from './certifications.entity';
import { CertificationsService } from './certifications.service';
import { CertificationsController } from './certifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Certification])],
  providers: [CertificationsService],
  controllers: [CertificationsController],
})
export class CertificationsModule {}
