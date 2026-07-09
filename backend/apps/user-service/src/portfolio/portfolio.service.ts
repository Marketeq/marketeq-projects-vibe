import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Portfolio } from './portfolio.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
  ) {}

  async create(userId: string, dto: CreatePortfolioDto) {
    const item = this.portfolioRepository.create(dto);
    item.userId = userId;
    return this.portfolioRepository.save(item);
  }

  async findAll(userId: string) {
    return this.portfolioRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdatePortfolioDto) {
    const item = await this.portfolioRepository.findOne({
      where: { id, userId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    Object.assign(item, dto);
    return this.portfolioRepository.save(item);
  }

  async remove(userId: string, id: string) {
    const item = await this.portfolioRepository.findOne({
      where: { id, userId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    await this.portfolioRepository.remove(item);
    return { message: 'Portfolio item deleted' };
  }
}
