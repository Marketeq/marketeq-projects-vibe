import { Injectable } from '@nestjs/common';
import { ProjectRepository } from '../publish/infrastructure/persistence/project.repository';

export interface OwnerTargetPayload {
  targetType: string;
  targetId: string;
}

/**
 * Validates listing-backed favorites targets (e.g. project). Other target types
 * return not-exists until dedicated entities/handlers exist.
 */
@Injectable()
export class OwnerTargetListingsService {
  constructor(private readonly projects: ProjectRepository) {}

  async validateTarget(payload: OwnerTargetPayload): Promise<{
    exists: boolean;
    displayName?: string;
    status?: string;
  }> {
    const { targetType, targetId } = payload;
    if (!targetId?.trim()) {
      return { exists: false };
    }
    if (targetType !== 'project') {
      return { exists: false };
    }
    const p = await this.projects.findOne({ id: targetId });
    if (!p) {
      return { exists: false };
    }
    return {
      exists: true,
      displayName: p.title ?? '',
      status: p.status ?? '',
    };
  }

  async getTargetMetadata(payload: OwnerTargetPayload): Promise<{
    title: string;
    skills: string[];
  }> {
    const v = await this.validateTarget(payload);
    if (!v.exists) {
      return { title: '', skills: [] };
    }
    const p = await this.projects.findOne({ id: payload.targetId });
    const skills = p?.skills;
    return {
      title: p?.title ?? '',
      skills: Array.isArray(skills) ? skills.filter(Boolean) : [],
    };
  }
}
