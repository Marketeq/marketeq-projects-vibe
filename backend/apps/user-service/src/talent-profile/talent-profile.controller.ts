import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TalentProfile } from './entities/talent-profile.entity';
import { Public } from '../decorators/public.decorator';

@Controller('public/talent')
export class TalentProfileController {
  constructor(
    @InjectRepository(TalentProfile)
    private readonly repo: Repository<TalentProfile>,
  ) {}

  @Public()
  @Get(':username')
  async getByUsername(
    @Param('username') username: string,
  ): Promise<TalentProfile> {
    const profile = await this.repo.findOne({
      where: { username, status: 'active' },
    });
    if (!profile) {
      throw new NotFoundException(
        `Talent profile "${username}" not found`,
      );
    }
    return profile;
  }

  @Public()
  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const take = Math.min(limit, 100);
    const [profiles, total] = await this.repo.findAndCount({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data: profiles, total, page, limit: take };
  }
}
