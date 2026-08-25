import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMember } from './teams.entity';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Throws ForbiddenException unless `userId` is already a member of the
   * team. Used as a light-weight authorization check for mutations until
   * a proper team owner/role model is ported in.
   */
  async assertIsMember(teamId: string, userId: string): Promise<TeamMember> {
    const membership = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }
    return membership;
  }

  async addMember(teamId: string, dto: AddTeamMemberDto) {
    // Check if member already exists
    const existing = await this.teamMemberRepository.findOne({
      where: { teamId, userId: dto.userId },
    });

    if (existing) {
      return existing;
    }

    const member = this.teamMemberRepository.create({
      teamId,
      userId: dto.userId,
      role: dto.role || 'member',
    });

    return this.teamMemberRepository.save(member);
  }

  /**
   * A user's team is keyed by their own userId (owner convention, matching
   * the invitations service). Returns the roster the caller can assign from:
   * the owner plus everyone who accepted an invite into their team.
   */
  async getMyTeam(userId: string) {
    // Resolve the team the caller belongs to: if they're a member of a team
    // (invited + accepted), use that team; otherwise they own a team keyed by
    // their own userId. This lets both the owner and members see the same
    // roster.
    const membership = await this.teamMemberRepository.findOne({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const teamId = membership?.teamId ?? userId;

    const members = await this.getTeamMembers(teamId);

    const owner = await this.userRepository.findOne({ where: { id: teamId } });
    const ownerEntry = owner
      ? {
          teamId,
          userId: owner.id,
          role: 'owner',
          username: owner.username,
          firstName: owner.firstName,
          lastName: owner.lastName,
          avatarUrl: owner.avatarUrl,
          email: owner.email,
          recentJobTitle: owner.recentJobTitle,
          jobTitles: owner.jobTitles,
          location: owner.location,
        }
      : null;

    const roster = ownerEntry
      ? [ownerEntry, ...members.filter((m) => m.userId !== teamId)]
      : members;

    return { id: teamId, ownerId: teamId, members: roster };
  }

  async getTeamMembers(teamId: string) {
    const members = await this.teamMemberRepository.find({
      where: { teamId },
      order: { createdAt: 'ASC' },
    });

    const userIds = Array.from(new Set(members.map((m) => m.userId)));
    const users = userIds.length
      ? await this.userRepository.find({ where: userIds.map((id) => ({ id })) })
      : [];

    const byId = new Map(users.map((u) => [u.id, u]));

    return members.map((member) => {
      const u = byId.get(member.userId);
      return {
        ...member,
        username: u?.username,
        firstName: u?.firstName,
        lastName: u?.lastName,
        avatarUrl: u?.avatarUrl,
        email: u?.email,
        recentJobTitle: u?.recentJobTitle,
        jobTitles: u?.jobTitles,
        location: u?.location,
      };
    });
  }

  async removeMember(teamId: string, userId: string) {
    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
    });

    if (member) {
      await this.teamMemberRepository.remove(member);
    }

    return { message: 'Team member removed' };
  }
}
