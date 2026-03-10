import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Education } from '../education/entities/education.entity';
import { Experience } from '../experience/entities/experience.entity';
import { Skill } from '../skills/entities/skill.entity';
import { Language } from '../languages/entities/language.entity';
import { Certification } from '../certifications/entities/certification.entity';
import { Industry } from '../industries/entities/industry.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Education) private readonly educationRepo: Repository<Education>,
    @InjectRepository(Experience) private readonly experienceRepo: Repository<Experience>,
    @InjectRepository(Skill) private readonly skillRepo: Repository<Skill>,
    @InjectRepository(Language) private readonly languageRepo: Repository<Language>,
    @InjectRepository(Certification) private readonly certRepo: Repository<Certification>,
    @InjectRepository(Industry) private readonly industryRepo: Repository<Industry>,
  ) {}

  async create(dto: Partial<User>): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('User already exists');
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  async findAll(limit = 50, offset = 0): Promise<User[]> {
    return this.userRepo.find({
      relations: ['skills', 'languages', 'certifications', 'industries'],
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['education', 'experience', 'skills', 'languages', 'certifications', 'industries'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ['education', 'experience', 'skills', 'languages', 'certifications', 'industries'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async checkUsername(username: string): Promise<{ available: boolean }> {
    const existing = await this.userRepo.findOne({ where: { username } });
    return { available: !existing };
  }

  async update(id: string, dto: Partial<User>): Promise<User> {
    await this.userRepo.update(id, dto);
    return this.findById(id);
  }

  async dismissOnboarding(id: string): Promise<void> {
    await this.userRepo.update(id, {
      onboardingDismissed: true,
      onboardingStatus: 'completed',
      onboardedAt: new Date(),
    });
  }

  async remove(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }

  // Education
  async addEducation(userId: string, dto: Partial<Education>): Promise<Education> {
    const entry = this.educationRepo.create({ ...dto, userId });
    return this.educationRepo.save(entry);
  }
  async updateEducation(id: string, dto: Partial<Education>): Promise<Education> {
    await this.educationRepo.update(id, dto);
    const found = await this.educationRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Education entry not found');
    return found;
  }
  async removeEducation(id: string): Promise<void> {
    await this.educationRepo.delete(id);
  }

  // Experience
  async addExperience(userId: string, dto: Partial<Experience>): Promise<Experience> {
    const entry = this.experienceRepo.create({ ...dto, userId });
    return this.experienceRepo.save(entry);
  }
  async updateExperience(id: string, dto: Partial<Experience>): Promise<Experience> {
    await this.experienceRepo.update(id, dto);
    const found = await this.experienceRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Experience entry not found');
    return found;
  }
  async removeExperience(id: string): Promise<void> {
    await this.experienceRepo.delete(id);
  }

  // Skills
  async addSkill(userId: string, dto: Partial<Skill>): Promise<Skill> {
    const entry = this.skillRepo.create({ ...dto, userId });
    return this.skillRepo.save(entry);
  }
  async updateSkill(id: string, dto: Partial<Skill>): Promise<Skill> {
    await this.skillRepo.update(id, dto);
    const found = await this.skillRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Skill not found');
    return found;
  }
  async removeSkill(id: string): Promise<void> {
    await this.skillRepo.delete(id);
  }

  // Languages
  async addLanguage(userId: string, dto: Partial<Language>): Promise<Language> {
    const entry = this.languageRepo.create({ ...dto, userId });
    return this.languageRepo.save(entry);
  }
  async updateLanguage(id: string, dto: Partial<Language>): Promise<Language> {
    await this.languageRepo.update(id, dto);
    const found = await this.languageRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Language not found');
    return found;
  }
  async removeLanguage(id: string): Promise<void> {
    await this.languageRepo.delete(id);
  }

  // Certifications
  async addCertification(userId: string, dto: Partial<Certification>): Promise<Certification> {
    const entry = this.certRepo.create({ ...dto, userId });
    return this.certRepo.save(entry);
  }
  async updateCertification(id: string, dto: Partial<Certification>): Promise<Certification> {
    await this.certRepo.update(id, dto);
    const found = await this.certRepo.findOne({ where: { id } });
    if (!found) throw new NotFoundException('Certification not found');
    return found;
  }
  async removeCertification(id: string): Promise<void> {
    await this.certRepo.delete(id);
  }

  // Industries
  async addIndustry(userId: string, dto: Partial<Industry>): Promise<Industry> {
    const entry = this.industryRepo.create({ ...dto, userId });
    return this.industryRepo.save(entry);
  }
  async removeIndustry(id: string): Promise<void> {
    await this.industryRepo.delete(id);
  }
}
