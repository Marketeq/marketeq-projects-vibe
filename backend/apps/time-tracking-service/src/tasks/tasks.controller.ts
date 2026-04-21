import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateContractTaskDto } from './dto/create-task.dto';
import { UpdateContractTaskDto } from './dto/update-task.dto';

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /** List all active tasks for a contract */
  @Get('contract/:contractId')
  async getByContract(@Param('contractId') contractId: string) {
    return this.tasksService.getTasksByContract(contractId);
  }

  /** Create a new task under a contract */
  @Post()
  async create(@Body() dto: CreateContractTaskDto) {
    return this.tasksService.createTask(dto);
  }

  /** Update a task's name or archived status */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContractTaskDto,
  ) {
    return this.tasksService.updateTask(id, dto);
  }

  /** Soft-delete (archive) a task */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
}
