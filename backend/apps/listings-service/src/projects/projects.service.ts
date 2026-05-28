import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { ListingStatus } from '../shared/enums/listing.enum';
import { slugify } from '../shared/utils/slugify';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly repo: Repository<Project>,
  ) {}

  async findAll(status = ListingStatus.Published) {
    const items = await this.repo.find({
      where: { status },
      order: { featured: 'DESC', createdAt: 'DESC' },
    });
    return items.map((item) => this.shapeProject(item));
  }

  async findOne(id: string) {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Project not found');
    return this.shapeProject(item);
  }

  async findOnePublished(id: string) {
    const item = await this.repo.findOne({
      where: { id, status: ListingStatus.Published },
    });
    if (!item) throw new NotFoundException('Project not found');
    return this.shapeProject(item);
  }

  async findBySlug(slug: string) {
    const item = await this.repo.findOne({
      where: { slug, status: ListingStatus.Published },
    });
    if (!item) throw new NotFoundException('Project not found');

    const [similarProjects, projectHistoryRatings] = await Promise.all([
      this.getSimilarProjects(item),
      this.getProjectHistoryRatings(item),
    ]);

    return {
      ...this.shapeProject(item),
      similarProjects,
      relatedCategories: this.getRelatedCategories(item),
      relatedSkills: this.getRelatedSkills(item),
      team: [],
      projectHistoryRatings,
    };
  }

  async create(dto: Partial<Project>, userId: string) {
    if (!userId) {
      throw new ForbiddenException('You do not have permission to create a project');
    }

    const writable = this.filterWritableProjectFields(dto);
    const title = this.normalizeRequiredText(writable.title, 'Project title is required');
    const description = this.normalizeRequiredText(
      writable.description,
      'Project description is required',
    );

    const item = this.repo.create({
      ...writable,
      title,
      description,
      status: ListingStatus.Draft,
      createdBy: userId,
      slug: await this.resolveUniqueSlug(title),
    });

    const saved = await this.repo.save(item);
    return this.shapeProject(saved);
  }

  async update(id: string, dto: Partial<Project>, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    const writable = this.filterWritableProjectFields(dto);

    if (Object.prototype.hasOwnProperty.call(writable, 'title')) {
      const title = this.normalizeRequiredText(writable.title, 'Project title cannot be empty');
      writable.title = title;
      writable.slug = await this.resolveUniqueSlug(title, id);
    }

    if (Object.prototype.hasOwnProperty.call(writable, 'description')) {
      writable.description = this.normalizeRequiredText(
        writable.description,
        'Project description cannot be empty',
      );
    }

    if (Object.keys(writable).length === 0) {
      return this.findOne(id);
    }

    await this.repo.update(id, writable);
    return this.findOne(id);
  }

  async publish(id: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    await this.repo.update(id, { status: ListingStatus.Published });
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Project not found');
    this.assertOwnership(existing, userId);
    await this.repo.delete(id);
  }

  private assertOwnership(project: Project, userId: string): void {
    if (!userId || project.createdBy !== userId) {
      throw new ForbiddenException('You do not have permission to modify this project');
    }
  }

  private normalizeRequiredText(value: unknown, message: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(message);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(message);
    }

    return normalized;
  }

  private filterWritableProjectFields(dto: Partial<Project>): Partial<Project> {
    const {
      id: _id,
      slug: _slug,
      status: _status,
      rating: _rating,
      reviewCount: _reviewCount,
      completionsCount: _completionsCount,
      views90d: _views90d,
      adminBoost: _adminBoost,
      featured: _featured,
      createdBy: _createdBy,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...writable
    } = dto as Project;

    return writable;
  }

  private async resolveUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(title) || 'project';
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.repo.findOne({
        where: excludeId ? { slug: candidate, id: Not(excludeId) } : { slug: candidate },
        select: ['id'],
      });

      if (!existing) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private deriveBadges(project: Project): string[] {
    const rating = project.rating != null ? Number(project.rating) : 0;
    const reviews = Number(project.reviewCount ?? 0);
    const completions = Number(project.completionsCount ?? 0);
    const badges: string[] = [];

    if (rating >= 4.0 && reviews >= 20) badges.push('top-rated');
    if (rating >= 4.8 && reviews >= 10) badges.push('highly-rated');
    if (completions >= 10) badges.push('proven');
    if (project.featured === true) badges.push('featured');

    return badges;
  }

  private shapeProject(project: Project) {
    const budget =
      project.budget != null && project.budget !== ('' as any)
        ? Number(project.budget)
        : null;
    const rating = project.rating != null ? Number(project.rating) : 0;
    const adminBoost = project.adminBoost != null ? Number(project.adminBoost) : 0;

    return {
      id: String(project.id),
      title: project.title,
      slug: project.slug,
      shortDescription: project.shortDescription ?? null,
      projectType: project.projectType ?? null,
      description: project.description,
      category: project.category ?? project.categories?.[0] ?? 'Software Development',
      categories: project.categories ?? [],
      subcategories: project.subcategories ?? [],
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      budget,
      priceMin: budget,
      estimatedHours: project.estimatedHours ?? null,
      duration: project.duration ?? null,
      mediaUrls: project.mediaUrls ?? [],
      videoUrl: project.videoUrl ?? null,
      skills: project.skills ?? [],
      tags: project.tags ?? [],
      programmingLanguages: project.programmingLanguages ?? [],
      developmentTech: project.developmentTech ?? [],
      deliverables: project.deliverables ?? [],
      faqs: project.faqs ?? [],
      scope: project.scope ?? [],
      industries: project.industry ?? [],
      relatedProjectIds: project.relatedProjectIds ?? [],
      isTopRated: rating >= 4.0 && Number(project.reviewCount ?? 0) >= 20,
      badges: this.deriveBadges(project),
      recentQuestions: project.recentQuestions ?? [],
      chatEnabled: project.chatEnabled ?? false,
      reportButtonEnabled: project.reportButtonEnabled ?? true,
      shareButtonEnabled: project.shareButtonEnabled ?? true,
      helpButtonEnabled: project.helpButtonEnabled ?? false,
      rating,
      reviewCount: project.reviewCount ?? 0,
      completionsCount: project.completionsCount ?? 0,
      views90d: project.views90d ?? 0,
      adminBoost,
      featured: project.featured ?? false,
    };
  }

  private getSkillsAndTools(project: Project): string[] {
    return Array.from(
      new Set([
        ...(project.skills ?? []),
        ...(project.programmingLanguages ?? []),
        ...(project.developmentTech ?? []),
      ]),
    );
  }

  private getRelatedCategories(project: Project): string[] {
    return Array.from(
      new Set([
        ...(project.categories ?? []),
        ...(project.subcategories ?? []),
      ]),
    ).filter((value) => value !== project.category);
  }

  private getRelatedSkills(project: Project): string[] {
    return this.getSkillsAndTools(project).slice(0, 12);
  }

  private async getSimilarProjects(project: Project) {
    const published = await this.repo.find({
      where: { status: ListingStatus.Published },
      order: { featured: 'DESC', createdAt: 'DESC' },
      take: 25,
    });

    const sourceSkills = new Set(project.skills ?? []);
    const sourceTags = new Set(project.tags ?? []);
    const sourceSubcategories = new Set(project.subcategories ?? []);

    return published
      .filter((candidate) => candidate.id !== project.id)
      .map((candidate) => {
        const score =
          this.overlapRatio(sourceSkills, candidate.skills) * 0.5 +
          this.overlapRatio(sourceTags, candidate.tags) * 0.3 +
          this.overlapRatio(sourceSubcategories, candidate.subcategories) * 0.2;

        return {
          id: String(candidate.id),
          slug: candidate.slug,
          title: candidate.title,
          thumbnail: candidate.mediaUrls?.[0] ?? null,
          score: Number(score.toFixed(3)),
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }

  private async getProjectHistoryRatings(project: Project) {
    if (!project.createdBy || project.createdBy === 'cms-sync') return null;

    const history = await this.repo.find({
      where: {
        createdBy: project.createdBy,
        status: ListingStatus.Published,
      },
    });

    const eligible = history.filter(
      (candidate) => candidate.id !== project.id && Number(candidate.reviewCount ?? 0) > 0,
    );

    const totalReviews = eligible.reduce(
      (sum, candidate) => sum + Number(candidate.reviewCount ?? 0),
      0,
    );

    if (totalReviews === 0) return null;

    const weightedRating = eligible.reduce(
      (sum, candidate) =>
        sum + Number(candidate.rating ?? 0) * Number(candidate.reviewCount ?? 0),
      0,
    );

    return {
      average: Number((weightedRating / totalReviews).toFixed(2)),
      reviewCount: totalReviews,
      projectCount: eligible.length,
    };
  }

  async addQuestion(projectId: string, question: string, userId: string) {
    if (!userId) {
      throw new ForbiddenException('You must be logged in to ask a question');
    }

    const trimmed = question?.trim();
    if (!trimmed) {
      throw new BadRequestException('Question cannot be empty');
    }

    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const questions = project.recentQuestions ?? [];
    questions.push({ question: trimmed, answer: null });
    await this.repo.update(projectId, { recentQuestions: questions });

    return { question: trimmed, answer: null };
  }

  async answerQuestion(projectId: string, questionIndex: number, answer: string, userId: string) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    this.assertOwnership(project, userId);

    const trimmed = answer?.trim();
    if (!trimmed) {
      throw new BadRequestException('Answer cannot be empty');
    }

    const questions = project.recentQuestions ?? [];
    if (questionIndex < 0 || questionIndex >= questions.length) {
      throw new BadRequestException('Invalid question index');
    }

    questions[questionIndex].answer = trimmed;
    await this.repo.update(projectId, { recentQuestions: questions });

    return questions[questionIndex];
  }

  async getQuestions(projectId: string) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return project.recentQuestions ?? [];
  }

  async getRelatedSearches(projectId: string, limit = 60) {
    const project = await this.repo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    // Gather seed terms from this project's metadata
    const seedTerms = new Set<string>([
      ...(project.skills ?? []),
      ...(project.tags ?? []),
      ...(project.programmingLanguages ?? []),
      ...(project.developmentTech ?? []),
      ...(project.subcategories ?? []),
    ]);

    // Fetch related published projects to expand the term pool
    const related = await this.repo.find({
      where: { status: ListingStatus.Published },
      select: ['skills', 'tags', 'programmingLanguages', 'developmentTech', 'subcategories'],
      take: 50,
    });

    for (const r of related) {
      for (const arr of [r.skills, r.tags, r.programmingLanguages, r.developmentTech, r.subcategories]) {
        if (!arr) continue;
        for (const term of arr) {
          seedTerms.add(term);
        }
      }
    }

    // Return unique, non-empty terms up to the limit
    return Array.from(seedTerms)
      .filter((t) => t && t.trim().length > 0)
      .slice(0, limit);
  }

  private overlapRatio(source: Set<string>, candidate: string[] | null | undefined): number {
    if (source.size === 0) return 0;
    const candidateSet = new Set(candidate ?? []);
    let overlap = 0;

    for (const value of source) {
      if (candidateSet.has(value)) overlap += 1;
    }

    return overlap / source.size;
  }
}
