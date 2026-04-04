import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AffiliatedTeam } from './affiliated-teams.entity';
import { CreateAffiliatedTeamDto } from './dto/create-affiliated-teams.dto';
import { UpdateAffiliatedTeamDto } from './dto/update-affiliated-teams.dto';
import { GetAffiliatedTeamsDto } from './dto/get-affiliated-teams.dto';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class AffiliatedTeamService {
  constructor(
    @InjectRepository(AffiliatedTeam)
    private readonly affiliatedTeamRepository: Repository<AffiliatedTeam>,
  ) {}

  private toDto(team: AffiliatedTeam): GetAffiliatedTeamsDto {
    return {
      id: team.id,
      name: team.name,
      location: team.location,
      time: team.time,
    };
  }

  async create(userId: string, dto: CreateAffiliatedTeamDto) {
    const affiliatedTeam = this.affiliatedTeamRepository.create(dto);
    affiliatedTeam.userId = userId;
    return this.affiliatedTeamRepository.save(affiliatedTeam);
  }

  async findAll(userId: string): Promise<GetAffiliatedTeamsDto[]> {
    const teams = await this.affiliatedTeamRepository.find({
      where: { userId },
      order: { name: 'ASC' },
    });
    return teams.map((team) => this.toDto(team));
  }

  async findOne(userId: string, id: string): Promise<GetAffiliatedTeamsDto> {
    const affiliatedTeam = await this.affiliatedTeamRepository.findOne({
      where: { id, userId },
    });
    if (!affiliatedTeam) {
      throw new NotFoundException('Affiliated team not found');
    }
    return this.toDto(affiliatedTeam);
  }

  async update(userId: string, id: string, dto: UpdateAffiliatedTeamDto) {
    const affiliatedTeam = await this.affiliatedTeamRepository.findOne({
      where: { id, userId },
    });
    if (!affiliatedTeam) {
      throw new NotFoundException('Affiliated team not found');
    }
    Object.assign(affiliatedTeam, dto);
    return this.affiliatedTeamRepository.save(affiliatedTeam);
  }

  async remove(userId: string, id: string) {
    const affiliatedTeam = await this.affiliatedTeamRepository.findOne({
      where: { id, userId },
    });
    if (!affiliatedTeam) {
      throw new NotFoundException('Affiliated team not found');
    }
    await this.affiliatedTeamRepository.remove(affiliatedTeam);
    return { message: 'Affiliated team deleted' };
  }
}
