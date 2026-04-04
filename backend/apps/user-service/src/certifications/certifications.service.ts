import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from './certifications.entity';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';

@Injectable()
export class CertificationsService {
  constructor(
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
  ) {}

  async create(userId: string, dto: CreateCertificationDto) {
    const certification = this.certificationRepository.create({
      ...dto,
      issueDate: new Date(dto.issueDate),
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
    });
    certification.userId = userId;
    return this.certificationRepository.save(certification);
  }

  async findAll(userId: string) {
    return this.certificationRepository.find({
      where: { userId },
      order: { issueDate: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateCertificationDto) {
    const certification = await this.certificationRepository.findOne({
      where: { id, userId },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    Object.assign(certification, {
      ...dto,
      issueDate: dto.issueDate ? new Date(dto.issueDate) : certification.issueDate,
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : certification.expirationDate,
    });

    return this.certificationRepository.save(certification);
  }

  async remove(userId: string, id: string) {
    const certification = await this.certificationRepository.findOne({
      where: { id, userId },
    });

    if (!certification) {
      throw new NotFoundException('Certification not found');
    }

    await this.certificationRepository.remove(certification);
    return { message: 'Certification deleted' };
  }
}
