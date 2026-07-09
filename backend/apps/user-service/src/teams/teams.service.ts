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
