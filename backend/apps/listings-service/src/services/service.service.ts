import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectRepository(Service)
    private readonly repo: Repository<Service>,
  ) {}

  findAll(status = ListingStatus.Published) {
    return this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Service with id ${id} not found`);
    return item;
  }

  async create(dto: CreateServiceDto, userId: string) {
    const item = this.repo.create({
      ...dto,
      createdBy: userId,
      slug: slugify(dto.title),
    });
    const saved = await this.repo.save(item);
    this.logger.log(`Created service ${saved.id} by user ${userId}`);
    return saved;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async publish(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Published });
    this.logger.log(`Published service ${id}`);
    return this.findOne(id);
  }

  async archive(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Archived });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    this.logger.log(`Deleted service ${id}`);
  }
}
