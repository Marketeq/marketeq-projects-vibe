import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, In, Repository } from 'typeorm';
import { RecentlyViewed } from './recently-viewed.entity';
import { Project } from '../projects/entities/project.entity';
import { ListingStatus } from '../shared/enums/listing.enum';

@Injectable()
export class RecentlyViewedService {
  constructor(
    @InjectRepository(RecentlyViewed)
    private readonly repo: Repository<RecentlyViewed>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async trackView(userId: string, projectId: string): Promise<void> {
    await this.repo.upsert(
      { userId, projectId, viewedAt: new Date() },
      { conflictPaths: ['userId', 'projectId'] },
    );
  }

  async getRecentlyViewed(userId: string, limit = 9) {
    const views = await this.repo.find({
      where: { userId },
      order: { viewedAt: 'DESC' },
      take: limit,
    });

    if (views.length === 0) return [];

    const projectIds = views.map((v) => v.projectId);
    const projects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids: projectIds })
      .andWhere('p.status = :status', { status: ListingStatus.Published })
      .getMany();

    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return views
      .map((v) => {
        const p = projectMap.get(v.projectId);
        if (!p) return null;
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          shortDescription: p.shortDescription ?? p.description?.slice(0, 120) ?? null,
          thumbnail: p.mediaUrls?.[0] ?? null,
          budget: p.budget != null ? Number(p.budget) : null,
          duration: p.duration ?? null,
          viewedAt: v.viewedAt,
        };
      })
      .filter(Boolean);
  }

  async getRecommended(userId: string, limit = 8) {
    const views = userId
      ? await this.repo.find({
          where: { userId },
          order: { viewedAt: 'DESC' },
          take: 20,
        })
      : [];

    const viewedIds = views.map((v) => v.projectId);

    // If no history, return featured/popular projects
    if (viewedIds.length === 0) {
      const popular = await this.projectRepo.find({
        where: { status: ListingStatus.Published },
        order: { featured: 'DESC', rating: 'DESC' },
        take: limit,
      });
      const avatars = await this.resolveTeamAvatars(popular);
      return popular.map((p) =>
        this.shapeRecommendation(p, avatars.get(String(p.id)) ?? []),
      );
    }

    // Build interest profile from viewed projects
    const viewedProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...ids)', { ids: viewedIds })
      .getMany();

    const skillWeights = new Map<string, number>();
    for (const p of viewedProjects) {
      for (const arr of [p.skills, p.tags, p.programmingLanguages, p.developmentTech, p.subcategories]) {
        if (!arr) continue;
        for (const term of arr) {
          skillWeights.set(term, (skillWeights.get(term) ?? 0) + 1);
        }
      }
    }

    // Score all published projects the user hasn't viewed
    const candidates = await this.projectRepo.find({
      where: {
        status: ListingStatus.Published,
        id: Not(In(viewedIds)),
      },
      take: 100,
    });

    const scored = candidates.map((p) => {
      let score = 0;
      for (const arr of [p.skills, p.tags, p.programmingLanguages, p.developmentTech, p.subcategories]) {
        if (!arr) continue;
        for (const term of arr) {
          score += skillWeights.get(term) ?? 0;
        }
      }
      // Boost featured and high-rated
      if (p.featured) score += 3;
      score += Number(p.rating ?? 0);
      return { project: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, limit).map((s) => s.project);
    const avatars = await this.resolveTeamAvatars(top);
    return top.map((p) =>
      this.shapeRecommendation(p, avatars.get(String(p.id)) ?? []),
    );
  }

  private shapeRecommendation(p: Project, teamAvatars: string[] = []) {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      shortDescription: p.shortDescription ?? null,
      thumbnail: p.mediaUrls?.[0] ?? null,
      budget: p.budget != null ? Number(p.budget) : null,
      duration: p.duration ?? null,
      rating: p.rating != null ? Number(p.rating) : 0,
      reviewCount: p.reviewCount ?? 0,
      teamAvatars,
      featured: p.featured ?? false,
    };
  }

  private async resolveTeamAvatars(
    projects: Project[],
  ): Promise<Map<string, string[]>> {
    const idsByProject = new Map<string, string[]>();
    const allIds = new Set<string>();
    for (const p of projects) {
      const memberIds =
        Array.isArray(p.teamMemberIds) && p.teamMemberIds.length
          ? p.teamMemberIds
          : p.userId
            ? [String(p.userId)]
            : [];
      idsByProject.set(String(p.id), memberIds);
      memberIds.forEach((id) => allIds.add(id));
    }
    if (allIds.size === 0) return new Map();

    const rows: Array<{ id: string; avatarUrl: string | null }> =
      await this.projectRepo.manager.query(
        `SELECT id::text, "avatarUrl" FROM user_service.users WHERE id = ANY($1::uuid[])`,
        [Array.from(allIds)],
      );
    const avatarById = new Map(rows.map((r) => [r.id, r.avatarUrl]));

    const result = new Map<string, string[]>();
    for (const [projectId, memberIds] of idsByProject) {
      result.set(
        projectId,
        memberIds
          .map((id) => avatarById.get(id))
          .filter((url): url is string => Boolean(url))
          .slice(0, 4),
      );
    }
    return result;
  }
}
