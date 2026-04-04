import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getEmbeddings } from './lib/embedding';
import { cosineSimilarity } from './lib/similarity';
import { TalentProfile } from './interface/talent-profile';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user/enums/user-role.enum';
import { SimilarProfileMapper } from './mapper/similar-profile.mapper';

@Injectable()
export class SimilarProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserWithRelations(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['skills', 'experiences'],
    });
  }

  async getAllTalents(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.TALENT },
      relations: ['skills', 'experiences'],
    });
  }

  convertUserToTalentProfile(user: User): TalentProfile {
    return SimilarProfileMapper.fromUser(user);
  }

  convertUsersToTalentProfiles(users: User[]): TalentProfile[] {
    return users.map((user) => SimilarProfileMapper.fromUser(user));
  }

  async getSimilarProfiles(
    target: TalentProfile,
    candidates: TalentProfile[],
  ): Promise<Array<{ candidate: TalentProfile; score: number }>> {
    if (!candidates.length) {
      return [];
    }

    if (!target.skills?.length) {
      return [];
    }

    const [targetSkillVec] = await getEmbeddings([target.skills.join(', ')]);
    const candidateSkillVecs = await getEmbeddings(
      candidates.map((c) => c.skills.join(', ')),
    );

    const results = candidates.map((candidate, i) => {
      const skillScore =
        cosineSimilarity(targetSkillVec, candidateSkillVecs[i]) * 0.3;

      const roleScore = candidate.role === target.role ? 0.2 : 0;
      const rateScore =
        0.15 -
        Math.min(
          Math.abs(candidate.hourlyRate - target.hourlyRate) / 200,
          0.15,
        );
      const locationScore = candidate.location === target.location ? 0.15 : 0;
      const experienceScore =
        0.1 -
        Math.min(Math.abs(candidate.experience - target.experience) / 20, 0.1);
      const timezoneScore = candidate.timezone === target.timezone ? 0.05 : 0;
      const ratingScore = (candidate.rating / 5) * 0.05;

      const totalScore =
        skillScore +
        roleScore +
        rateScore +
        locationScore +
        experienceScore +
        timezoneScore +
        ratingScore;

      return {
        candidate,
        score: parseFloat(totalScore.toFixed(4)),
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }

  async getSimilarProfilesByUserId(userId: string): Promise<TalentProfile[]> {
    // Get the target user with relations
    const targetUser = await this.getUserWithRelations(userId);
    if (!targetUser) {
      return [];
    }

    // Convert target user to TalentProfile format
    const targetProfile = this.convertUserToTalentProfile(targetUser);

    // Get all talent candidates
    const candidateUsers = await this.getAllTalents();

    // Filter out the target user from candidates
    const filteredCandidates = candidateUsers.filter(
      (user) => user.id !== userId,
    );

    // Convert User[] to TalentProfile[] using the mapper
    const candidateProfiles =
      this.convertUsersToTalentProfiles(filteredCandidates);

    // Get similar profiles using the similarity service
    const similarProfilesWithScores = await this.getSimilarProfiles(
      targetProfile,
      candidateProfiles,
    );

    // Return only the candidate profiles
    return similarProfilesWithScores.map((item) => item.candidate);
  }
}
