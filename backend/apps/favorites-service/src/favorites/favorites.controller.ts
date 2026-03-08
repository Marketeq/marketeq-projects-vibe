import { Controller, Get, Post, Delete, Param, Body, Req, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';

@Controller('v1/favorites')
export class FavoritesController {
  constructor(@InjectRepository(Favorite) private readonly repo: Repository<Favorite>) {}

  @Get()
  async list(@Req() req: any, @Query('itemType') itemType?: string) {
    const where: any = { userId: req.user?.id };
    if (itemType) where.itemType = itemType;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  @Post()
  async add(@Req() req: any, @Body() dto: { itemId: string; itemType: string }) {
    const fav = this.repo.create({ userId: req.user?.id, ...dto });
    return this.repo.save(fav).catch(() => ({ message: 'Already favorited' }));
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.repo.delete({ id, userId: req.user?.id });
    return { removed: true };
  }

  @Get('health')
  health() { return { status: 'ok', service: 'favorites-service' }; }
}
