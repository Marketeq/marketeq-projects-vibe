import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Team } from './entities/team.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';
import { RosterGateService } from '../identity-gate/roster-gate.service';
import { MemberAddGate, MemberAddResult } from '../identity-gate/member-add-gate';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUIDLike = (v: string) => UUID_RE.test(v);
import { isSameAccount } from '../identity-gate/viewer.decorator';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly repo: Repository<Team>,
    @Inject('ALGOLIA_CLIENT')
    private readonly algoliaClient: ClientProxy,
    private readonly rosterGate: RosterGateService,
    private readonly memberGate: MemberAddGate,
  ) {}

  /**
   * G5 - the PUBLIC team list (marketplace and homepage tiles). A team whose
   * owner has no known open gate is withheld, and members without a known open
   * gate are left out of `memberIds` (and the member count derived from it).
   * Display only: nothing stored is changed. The user's own management view
   * (findMine) is deliberately not filtered.
   */
  async findAll(status = ListingStatus.Published) {
    const teams = await this.repo.find({ where: { status }, order: { createdAt: 'DESC' } });
    const open = await this.rosterGate.visibleUserIds(
      teams.flatMap((t) => [t.createdBy ?? null, ...(t.memberIds ?? [])]),
    );
    return teams
      .filter((t) => !t.createdBy || !isUUIDLike(t.createdBy) || open.has(t.createdBy))
      .map((t) => this.withVisibleMembers(t, open));
  }

  private withVisibleMembers(team: Team, open: Set<string>) {
    return { ...team, memberIds: (team.memberIds ?? []).filter((id) => open.has(id)) };
  }

  /** GET /v1/teams/:id for a public or client viewer; the team's owner sees everyone. */
  async findOneForViewer(id: string, viewerId: string | null) {
    const team = await this.findOne(id);
    if (isSameAccount(team.createdBy, viewerId)) return team;
    const open = await this.rosterGate.visibleUserIds([team.createdBy ?? null, ...(team.memberIds ?? [])]);
    return this.withVisibleMembers(team, open);
  }

  /**
   * Teams the user owns or belongs to, split so the caller can present them
   * separately -- owning a team and being a member of one are different
   * relationships and are managed differently.
   *
   * No status filter: this is the user's own management view, so their drafts
   * belong here even though findAll() (the public list) shows Published only.
   *
   * memberIds is a text[] column, so membership uses the array containment
   * operator rather than a LIKE on a serialised list.
   */
  async findMine(userId: string): Promise<{ owned: Team[]; member: Team[] }> {
    const owned = await this.repo.find({
      where: { createdBy: userId },
      order: { createdAt: 'DESC' },
    });

    const member = await this.repo
      .createQueryBuilder('team')
      .where(':userId = ANY(team."memberIds")', { userId })
      .andWhere('(team."createdBy" IS NULL OR team."createdBy" != :userId)', {
        userId,
      })
      .orderBy('team."createdAt"', 'DESC')
      .getMany();

    return { owned, member };
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Team not found');
    return item;
  }

  /**
   * G7: people added through `memberIds` must pass the verification gate, the same
   * as accepting an invitation. One batch gate request evaluates everyone new; the
   * eligible are added, the rest are left out and reported per entry (input order),
   * and a blocked person never fails the request. The creator's own membership of
   * their new team is bootstrap and is not gated. If the gate cannot be evaluated the
   * request fails (503) before anything is written.
   */
  private async gateMembers(
    requested: unknown,
    existing: string[],
    exempt: string[] = [],
  ): Promise<{ memberIds?: string[]; results?: MemberAddResult[] }> {
    if (!Array.isArray(requested)) return {};
    const outcome = await this.memberGate.evaluate(requested, existing, exempt);
    return {
      memberIds: requested.filter((_, i) => outcome.keep[i]).map(String),
      results: outcome.results,
    };
  }

  async create(dto: Partial<Team>, userId: string) {
    const gated = await this.gateMembers(dto.memberIds, [], [userId]);
    const item = this.repo.create({
      ...dto,
      ...(gated.memberIds ? { memberIds: gated.memberIds } : {}),
      createdBy: userId,
      slug: slugify(dto.title!),
    });
    const saved = await this.repo.save(item);
    this.emitUpsert('team.created', saved);
    return gated.results ? { ...saved, memberResults: gated.results } : saved;
  }

  async update(id: string, dto: Partial<Team>) {
    let gated: { memberIds?: string[]; results?: MemberAddResult[] } = {};
    let write = dto;
    if (Array.isArray(dto.memberIds)) {
      const current = await this.findOne(id); // 404 for an unknown team, as before
      gated = await this.gateMembers(dto.memberIds, current.memberIds ?? []);
      write = { ...dto, memberIds: gated.memberIds };
    }
    await this.repo.update(id, write);
    const updated = await this.findOne(id);
    this.emitUpsert('team.updated', updated);
    return gated.results ? { ...updated, memberResults: gated.results } : updated;
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
    void this.emitUpsertWithOwnerGate(event, team);
  }

  // The owner's last known gate rides along (looked up locally, never from
  // identity) so the index copy of the team is hidden while its owner has no known
  // open gate; a later gate change updates it. Only a real user id is an owner.
  private async emitUpsertWithOwnerGate(event: string, team: Team): Promise<void> {
    const owner = team.createdBy && isUUIDLike(team.createdBy) ? team.createdBy : null;
    const open = owner ? await this.rosterGate.visibleUserIds([owner]) : new Set<string>();
    const payload = {
      ...this.buildPayload(team),
      ...(owner ? { ownerId: owner, ownerGateOpen: open.has(owner) } : {}),
    };
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
