import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certification } from './certifications.entity';
import { CertificationIssuer } from './certification-issuer.entity';
import { CertificationsService } from './certifications.service';
import { CertificationIssuersService } from './certification-issuers.service';
import { CertificationsController } from './certifications.controller';
import { CertificationIssuersController } from './certification-issuers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Certification, CertificationIssuer])],
  providers: [CertificationsService, CertificationIssuersService],
  controllers: [CertificationsController, CertificationIssuersController],
  exports: [CertificationIssuersService],
})
export class CertificationsModule {}
