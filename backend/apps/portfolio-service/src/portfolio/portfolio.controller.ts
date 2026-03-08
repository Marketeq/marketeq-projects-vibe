import { Controller, Get, Post, Put, Delete, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioItem } from '../entities/portfolio-item.entity';

@Controller('v1/portfolio')
export class PortfolioController {
  constructor(@InjectRepository(PortfolioItem) private readonly repo: Repository<PortfolioItem>) {}

  @Get('user/:userId')
  list(@Param('userId') userId: string) { return this.repo.find({ where: { userId }, order: { sortOrder: 'ASC' } }); }

  @Post()
  create(@Body() dto: Partial<PortfolioItem>, @Req() req: any) { return this.repo.save(this.repo.create({ ...dto, userId: req.user?.id || dto.userId })); }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<PortfolioItem>) { return this.repo.update(id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.repo.delete(id); }

  @Get('health')
  health() { return { status: 'ok', service: 'portfolio-service' }; }
}
