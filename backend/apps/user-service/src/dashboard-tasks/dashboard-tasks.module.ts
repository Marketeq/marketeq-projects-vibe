import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardTask } from './dashboard-task.entity';
import { DashboardTasksController } from './dashboard-tasks.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardTask]), UserModule],
  controllers: [DashboardTasksController],
})
export class DashboardTasksModule {}
