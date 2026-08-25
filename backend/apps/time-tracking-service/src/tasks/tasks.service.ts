import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContractTask } from '../entities/contract-task.entity';
import { CreateContractTaskDto } from './dto/create-task.dto';
import { UpdateContractTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(ContractTask)
    private readonly taskRepo: Repository<ContractTask>,
  ) {}

  async getTasksByContract(contractId: string): Promise<ContractTask[]> {
    return this.taskRepo.find({
      where: { contractId, archived: false },
      order: { name: 'ASC' },
    });
  }

  async createTask(dto: CreateContractTaskDto): Promise<ContractTask> {
    // id is a real uuid column with a gen_random_uuid() default — let
    // Postgres/TypeORM generate it rather than building a fake text id.
    const task = this.taskRepo.create({
      contractId: dto.contractId,
      name: dto.name,
      createdBy: dto.createdBy,
    });
    return this.taskRepo.save(task);
  }

  async updateTask(
    id: string,
    dto: UpdateContractTaskDto,
  ): Promise<ContractTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (dto.name !== undefined) task.name = dto.name;
    if (dto.archived !== undefined) task.archived = dto.archived;
    return this.taskRepo.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    task.archived = true;
    await this.taskRepo.save(task);
  }
}
