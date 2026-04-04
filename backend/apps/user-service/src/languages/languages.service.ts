import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './languages.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async create(userId: string, dto: CreateLanguageDto) {
    const language = this.languageRepository.create(dto);
    language.userId = userId;
    return this.languageRepository.save(language);
  }

  async findAll(userId: string) {
    return this.languageRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateLanguageDto) {
    const language = await this.languageRepository.findOne({
      where: { id, userId },
    });

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    Object.assign(language, dto);
    return this.languageRepository.save(language);
  }

  async remove(userId: string, id: string) {
    const language = await this.languageRepository.findOne({
      where: { id, userId },
    });

    if (!language) {
      throw new NotFoundException('Language not found');
    }

    await this.languageRepository.remove(language);
    return { message: 'Language deleted' };
  }
}
