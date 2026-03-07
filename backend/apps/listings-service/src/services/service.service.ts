import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { uservice } from './entities/service.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Injectable()
export class uservicesService {
  constructor(
    @InjectRepository(uservice)
    private readonly repo: Repository<uservice>,
  ) {}

  findAll(status = ListingStatus.Published) {
    return this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('uservice not found');
    return item;
  }

  async create(dto: Partial<uservice>, userId: string) {
    const item = this.repo.create({ ...dto, createdBy: userId, slug: slugify(dto.title) });
    return this.repo.save(item);
  }

  async update(id: string, dto: Partial<uservice>) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async publish(id: string) {
    await this.repo.update(id, { status: ListingStatus.Published });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}
