import { Injectable } from '@nestjs/common';

@Injectable()
export class SkillValidationService {
  private validSkills = ['javascript', 'python', 'java', 'design', 'marketing'];

  async check(skill: string): Promise<boolean> {
    return this.validSkills.includes(skill.toLowerCase());
  }
}
