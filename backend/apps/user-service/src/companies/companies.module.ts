import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompaniesInternalController } from './companies-internal.controller';
import { Company } from './entities/company.entity';
import { CompanyUser } from './entities/company-user.entity';
import { User } from '../user/entities/user.entity';
import { R2Service } from '../storage/r2.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company, CompanyUser, User]), AuditModule],
  controllers: [CompaniesController, CompaniesInternalController],
  providers: [CompaniesService, R2Service],
  exports: [CompaniesService],
})
export class CompaniesModule {}
