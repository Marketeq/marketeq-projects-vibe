import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HireRequests } from './hire-requests.entity';
import { HireRequestsService } from './hire-requests.service';
import { HireRequestsController } from './hire-requests.controller';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HireRequests, User])],
  controllers: [HireRequestsController],
  providers: [HireRequestsService],
  exports: [HireRequestsService],
})
export class HireRequestsModule {}
