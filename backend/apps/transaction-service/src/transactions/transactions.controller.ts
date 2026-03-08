import { Controller, Get, Post, Param, Body, Req, Query } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

@Controller('v1/transactions')
export class TransactionsController {
  constructor(@InjectRepository(Transaction) private readonly repo: Repository<Transaction>) {}

  @Get()
  list(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    const userId = req.user?.id;
    return this.repo.find({ where: [{ fromUserId: userId }, { toUserId: userId }], order: { createdAt: 'DESC' }, skip: (page-1)*limit, take: limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.repo.findOne({ where: { id } }); }

  @MessagePattern('transaction.create')
  handleCreate(@Payload() dto: Partial<Transaction>) {
    return this.repo.save(this.repo.create(dto));
  }

  @Get('health')
  health() { return { status: 'ok', service: 'transaction-service' }; }
}
