import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { UserMangementController } from './user-mangement.controller';
import { UserMangementService } from './user-mangement.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UserMangementController],
  providers: [UserMangementService],
})
export class UserMangementModule {}
