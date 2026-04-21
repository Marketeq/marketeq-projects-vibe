import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import axios from 'axios';
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

  async findBySlug(slug: string) {
    const item = await this.repo.findOne({ where: { slug } });
    if (!item) throw new NotFoundException('Service not found');
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

    // CMS sync logic
    try {
      await axios.post(
        process.env.CMS_SYNC_URL || 'http://localhost:3001/api/categories/push',
        { service: saved },
        {
          headers: {
            'Authorization': `API-Key ${process.env.CMS_API_KEY}`
          }
        }
      );
      this.logger.log(`Pushed service ${saved.id} to CMS`);
    } catch (err) {
      this.logger.error(`Failed to push service ${saved.id} to CMS: ${err.message}`);
    }

    return saved;
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    const updated = await this.findOne(id);
    // CMS sync logic
    try {
      await axios.post(
        process.env.CMS_SYNC_URL || 'http://localhost:3001/api/categories/push',
        { service: updated },
        {
          headers: {
            'Authorization': `API-Key ${process.env.CMS_API_KEY}`
          }
        }
      );
      this.logger.log(`Pushed updated service ${updated.id} to CMS`);
    } catch (err) {
      this.logger.error(`Failed to push updated service ${id} to CMS: ${err.message}`);
    }
    return updated;
  }

  async publish(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Published });
    this.logger.log(`Published service ${id}`);
    const published = await this.findOne(id);
    // CMS sync logic
    try {
      await axios.post(
        process.env.CMS_SYNC_URL || 'http://localhost:3001/api/categories/push',
        { service: published },
        {
          headers: {
            'Authorization': `API-Key ${process.env.CMS_API_KEY}`
          }
        }
      );
      this.logger.log(`Pushed published service ${published.id} to CMS`);
    } catch (err) {
      this.logger.error(`Failed to push published service ${id} to CMS: ${err.message}`);
    }
    return published;
  }

  async archive(id: string) {
    await this.findOne(id);
    await this.repo.update(id, { status: ListingStatus.Archived });
    const archived = await this.findOne(id);
    // CMS sync logic
    try {
      await axios.post(
        process.env.CMS_SYNC_URL || 'http://localhost:3001/api/categories/push',
        { service: archived },
        {
          headers: {
            'Authorization': `API-Key ${process.env.CMS_API_KEY}`
          }
        }
      );
      this.logger.log(`Pushed archived service ${archived.id} to CMS`);
    } catch (err) {
      this.logger.error(`Failed to push archived service ${id} to CMS: ${err.message}`);
    }
    return archived;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.delete(id);
    this.logger.log(`Deleted service ${id}`);
  }
}
