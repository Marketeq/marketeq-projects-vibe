import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
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
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Task name is required.');

    // Names are unique per contract, ignoring case (US-TT-012).
    const duplicate = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.contractId = :contractId', { contractId: dto.contractId })
      .andWhere('t.archived = false')
      .andWhere('LOWER(t.name) = LOWER(:name)', { name })
      .getOne();
    if (duplicate) {
      throw new ConflictException(
        'A task with this name already exists. Please choose a different name.',
      );
    }

    // Defense-in-depth alongside migrations/1790150400000-ReconcileContractTasksWithEntity.ts,
    // which conditionally adds a gen_random_uuid() default to this column
    // where it's missing. Supplying the id here directly means task
    // creation still works even on a database where that migration hasn't
    // run yet (a not-null violation was observed here in exactly that
    // situation) — same app-generated-id pattern already used for
    // `sessions.id` in this service.
    const task = this.taskRepo.create({
      id: randomUUID(),
      contractId: dto.contractId,
      name,
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
