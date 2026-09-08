import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { DashboardTask } from './dashboard-task.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserService } from '../user/user.service';

class CreateDashboardTaskDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

class UpdateDashboardTaskDto {
  @IsString()
  @IsOptional()
  value?: string;

  @IsBoolean()
  @IsOptional()
  done?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

@Controller('dashboard-tasks')
export class DashboardTasksController {
  constructor(
    @InjectRepository(DashboardTask)
    private readonly repo: Repository<DashboardTask>,
    private readonly userService: UserService,
  ) {}

  @Get()
  async findAll(@CurrentUser() jwtUser: JwtUser) {
    const user = await this.userService.getUserByClaims(jwtUser);
    return this.repo.find({
      where: { userId: user.id },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  @Post()
  async create(
    @CurrentUser() jwtUser: JwtUser,
    @Body() dto: CreateDashboardTaskDto,
  ) {
    const user = await this.userService.getUserByClaims(jwtUser);
    const task = this.repo.create({
      userId: user.id,
      value: dto.value ?? '',
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(task);
  }

  @Patch(':id')
  async update(
    @CurrentUser() jwtUser: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardTaskDto,
  ) {
    const user = await this.userService.getUserByClaims(jwtUser);
    const task = await this.repo.findOne({ where: { id, userId: user.id } });
    if (!task) throw new NotFoundException('Task not found');
    if (dto.value !== undefined) task.value = dto.value;
    if (dto.done !== undefined) task.done = dto.done;
    if (dto.sortOrder !== undefined) task.sortOrder = dto.sortOrder;
    return this.repo.save(task);
  }

  @Delete(':id')
  async remove(@CurrentUser() jwtUser: JwtUser, @Param('id') id: string) {
    const user = await this.userService.getUserByClaims(jwtUser);
    const task = await this.repo.findOne({ where: { id, userId: user.id } });
    if (!task) throw new NotFoundException('Task not found');
    await this.repo.remove(task);
    return { deleted: true };
  }
}
