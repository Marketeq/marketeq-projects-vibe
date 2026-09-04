import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AllowedIp } from './entities/allowed-ip.entity';
import {
  CreateAllowedIpDto,
  UpdateAllowedIpDto,
} from './dto/create-allowed-ip.dto';

/** Postgres unique-violation. */
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AllowedIpsService {
  constructor(
    @InjectRepository(AllowedIp)
    private readonly repo: Repository<AllowedIp>,
  ) {}

  /** Newest first, matching the order the screen adds entries in. */
  list(userId: string): Promise<AllowedIp[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateAllowedIpDto): Promise<AllowedIp> {
    const address = dto.address.trim();
    try {
      return await this.repo.save(
        this.repo.create({
          userId,
          address,
          description: dto.description?.trim() || null,
        }),
      );
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(`${address} is already on your list`);
      }
      throw err;
    }
  }

  /**
   * CSV import. Addresses already on the list are reported rather than
   * rejected: an import of 200 rows that fails because one was already there
   * would make the user diff the file by hand.
   */
  async createMany(
    userId: string,
    entries: CreateAllowedIpDto[],
  ): Promise<{ created: AllowedIp[]; skipped: string[] }> {
    const seen = new Set<string>();
    const deduped: CreateAllowedIpDto[] = [];
    for (const entry of entries) {
      const address = entry.address.trim();
      if (seen.has(address)) continue;
      seen.add(address);
      deduped.push({ ...entry, address });
    }

    const existing = await this.repo.find({
      where: { userId, address: In([...seen]) },
      select: { address: true },
    });
    const existingAddresses = new Set(existing.map((e) => e.address));

    const toCreate = deduped.filter((e) => !existingAddresses.has(e.address));
    const created = toCreate.length
      ? await this.repo.save(
          toCreate.map((entry) =>
            this.repo.create({
              userId,
              address: entry.address,
              description: entry.description?.trim() || null,
            }),
          ),
        )
      : [];

    return { created, skipped: [...existingAddresses] };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAllowedIpDto,
  ): Promise<AllowedIp> {
    const entry = await this.repo.findOne({ where: { id, userId } });
    if (!entry) throw new NotFoundException('Allowed IP not found');

    if (dto.address !== undefined) entry.address = dto.address.trim();
    if (dto.description !== undefined) {
      entry.description = dto.description.trim() || null;
    }

    try {
      return await this.repo.save(entry);
    } catch (err: any) {
      if (err?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          `${entry.address} is already on your list`,
        );
      }
      throw err;
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.repo.delete({ id, userId });
    if (!result.affected) throw new NotFoundException('Allowed IP not found');
  }
}
