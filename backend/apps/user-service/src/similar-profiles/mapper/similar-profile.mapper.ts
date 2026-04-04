import { User } from '../../user/entities/user.entity';
import { SimilarProfilesDto } from '../dtos/similar-profiles.dto';
import { Experience } from '../../experience/experience.entity';

export class SimilarProfileMapper {
  private static calculateExperience(experiences: Experience[]): number {
    if (!experiences || experiences.length === 0) return 0;

    return experiences.reduce((total, exp) => {
      if (!exp.startDate) return total;

      const startDate = new Date(exp.startDate).getTime();
      const endDate = exp.endDate
        ? new Date(exp.endDate).getTime()
        : Date.now();
      const durationMs = endDate - startDate;
      const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365.25);

      return Math.round(total + durationYears);
    }, 0);
  }

  static fromUser(user: User): SimilarProfilesDto {
    return {
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      skills: user.skills?.map((s) => s.name) ?? [],
      role: user.role ?? '',
      hourlyRate: user.rate_max ?? 0,
      location: user.location ?? '',
      experience: SimilarProfileMapper.calculateExperience(user.experiences),
      timezone: user.timezone ?? '',
      rating: user.client_success_rating ?? 0,
    };
  }
}
