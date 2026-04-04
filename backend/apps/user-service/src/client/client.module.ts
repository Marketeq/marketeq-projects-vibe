import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { ClientProfile } from './client.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ClientProfile, User])],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
