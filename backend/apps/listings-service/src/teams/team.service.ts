import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Team } from './entities/team.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly repo: Repository<Team>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
  ) {}

  findAll(status = ListingStatus.Published) {
    return this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Team not found');
    return item;
  }

  async create(dto: Partial<Team>, userId: string) {
    const item = this.repo.create({ ...dto, createdBy: userId, slug: slugify(dto.title!) });
    const saved = await this.repo.save(item);
    this.emitUpsert('team.created', saved);
    return saved;
  }

  async update(id: string, dto: Partial<Team>) {
    await this.repo.update(id, dto);
    const updated = await this.findOne(id);
    this.emitUpsert('team.updated', updated);
    return updated;
  }

  async publish(id: string) {
    await this.repo.update(id, { status: ListingStatus.Published });
    const published = await this.findOne(id);
    this.emitUpsert('team.updated', published);
    return published;
  }

  async remove(id: string) {
    await this.repo.delete(id);
    this.algoliaClient.emit<void>('team.deleted', { id }).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit team.deleted for ${id}: ${err.message}`),
    });
  }

  private emitUpsert(event: string, team: Team): void {
    const payload = this.buildPayload(team);
    this.algoliaClient.emit<void>(event, payload).subscribe({
      error: (err: Error) =>
        this.logger.warn(`Failed to emit ${event} for team ${team.id}: ${err.message}`),
    });
  }

  private buildPayload(team: Team) {
    return {
      id: team.id,
      createdAt: team.createdAt?.toISOString() ?? null,
      teamName: team.title,
      username: team.slug ?? null,
      category: team.category ?? null,
      services: [],
      skills: team.skills ?? [],
      location: null,
      tags: team.tags ?? [],
      industries: team.industry ?? [],
      hourlyRate: null,
      teamSizeRange: this.toSizeRange(team.teamSize),
      rating: team.rating ? Number(team.rating) : null,
      projectsCompleted: team.completedProjects ?? null,
      clientSuccessRate: null,
      availability: null,
      languages: [],
      description: team.description ?? null,
      specialties: team.specializations ?? [],
      stack: [],
      featuredProjects: null,
      memberAvatars: [],
      memberCount: team.teamSize ?? null,
    };
  }

  private toSizeRange(size: number | null | undefined): string | null {
    if (size == null) return null;
    if (size <= 2) return '1-2 members';
    if (size <= 5) return '2-5 members';
    if (size <= 10) return '5-10 members';
    if (size <= 15) return '10-15 members';
    if (size <= 20) return '15-20 members';
    return '20+ members';
  }
}
