import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Education } from './education.entity';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Education, User])],
  providers: [EducationService],
  controllers: [EducationController],
})
export class EducationModule {}