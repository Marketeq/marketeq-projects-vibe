import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Education } from './education.entity';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

@Injectable()
export class EducationService {
  constructor(
    @InjectRepository(Education)
    private readonly educationRepository: Repository<Education>,
  ) {}

  async create(userId: string, dto: CreateEducationDto): Promise<Education> {
    const education = this.educationRepository.create(dto);
    education.userId = userId;
    return this.educationRepository.save(education);
  }

  async findAll(userId: string): Promise<Education[]> {
    return this.educationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateEducationDto) {
    const education = await this.educationRepository.findOne({
      where: { id, userId },
    });

    if (!education) throw new NotFoundException('Education not found');

    Object.assign(education, dto);
    return this.educationRepository.save(education);
  }

  async remove(userId: string, id: string) {
    const education = await this.educationRepository.findOne({
      where: { id, userId },
    });
    if (!education) throw new NotFoundException('Education not found');

    await this.educationRepository.remove(education);
    return { message: 'Education deleted' };
  }
}
