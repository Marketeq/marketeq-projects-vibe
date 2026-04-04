import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from './industries.entity';
import { CreateIndustryDto } from './dto/create-industry.dto';
import { UpdateIndustryDto } from './dto/update-industry.dto';

@Injectable()
export class IndustriesService {
  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  async create(userId: string, dto: CreateIndustryDto) {
    const industry = this.industryRepository.create(dto);
    industry.userId = userId;
    return this.industryRepository.save(industry);
  }

  async findAll(userId: string) {
    return this.industryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, industryId: string, dto: UpdateIndustryDto) {
    const industry = await this.industryRepository.findOne({
      where: { id: industryId, userId },
    });

    if (!industry) {
      throw new NotFoundException('Industry expertise not found');
    }

    Object.assign(industry, dto);
    return this.industryRepository.save(industry);
  }

  async remove(userId: string, industryId: string) {
    const industry = await this.industryRepository.findOne({
      where: { id: industryId, userId },
    });

    if (!industry) {
      throw new NotFoundException('Industry expertise not found');
    }

    await this.industryRepository.remove(industry);
    return { message: 'Industry deleted' };
  }
}
