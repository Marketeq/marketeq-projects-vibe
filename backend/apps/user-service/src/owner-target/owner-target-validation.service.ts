import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from '../teams/teams.entity';
import { User } from '../user/entities/user.entity';

/** Matches favorites-service `OwnerTargetValidationRequest` (gRPC payload). */
export interface OwnerTargetPayload {
  targetType: string;
  targetId: string;
}

@Injectable()
export class OwnerTargetValidationService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async validateTarget(payload: OwnerTargetPayload): Promise<{
    exists: boolean;
    displayName?: string;
    status?: string;
  }> {
    const { targetType, targetId } = payload;
    if (!targetId?.trim()) {
      return { exists: false };
    }

    switch (targetType) {
      case 'team':
        return this.validateTeam(targetId);
      case 'talent':
        return this.validateTalent(targetId);
      default:
        return { exists: false };
    }
  }

  private async validateTeam(teamId: string): Promise<{
    exists: boolean;
    displayName?: string;
    status?: string;
  }> {
    const member = await this.teamMemberRepository.findOne({
      where: { teamId },
      order: { createdAt: 'ASC' },
    });
    if (!member) {
      return { exists: false };
    }
    const user = await this.userRepository.findOne({
      where: { id: member.userId },
    });
    const label =
      user &&
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const displayName =
      label || user?.username
        ? `${label || user?.username}'s team`
        : `Team ${teamId.slice(0, 8)}`;
    return { exists: true, displayName };
  }

  private async validateTalent(userId: string): Promise<{
    exists: boolean;
    displayName?: string;
    status?: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { exists: false };
    }
    const label = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const displayName = label || user.username || user.email;
    return { exists: true, displayName };
  }

  async getTargetMetadata(payload: OwnerTargetPayload): Promise<{
    title: string;
    skills: string[];
  }> {
    const v = await this.validateTarget(payload);
    if (!v.exists) {
      return { title: '', skills: [] };
    }
    return {
      title: v.displayName || payload.targetId,
      skills: [],
    };
  }
}
