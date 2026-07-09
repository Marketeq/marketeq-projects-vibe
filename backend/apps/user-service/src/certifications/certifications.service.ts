import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certification } from './certifications.entity';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';

const parseLocalDate = (s?: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

@Injectable()
export class CertificationsService {
  constructor(
    @InjectRepository(Certification)
    private readonly certificationRepository: Repository<Certification>,
  ) {}

  async create(userId: string, dto: CreateCertificationDto) {
    const certification = this.certificationRepository.create({
      ...dto,
      issueDate: parseLocalDate(dto.issueDate),
      expirationDate:
        dto.doesntExpire === true
          ? undefined
          : parseLocalDate(dto.expirationDate),
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
      issueDate: dto.issueDate ? parseLocalDate(dto.issueDate) : certification.issueDate,
      expirationDate:
        dto.doesntExpire === true
          ? null
          : dto.expirationDate
            ? parseLocalDate(dto.expirationDate)
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
