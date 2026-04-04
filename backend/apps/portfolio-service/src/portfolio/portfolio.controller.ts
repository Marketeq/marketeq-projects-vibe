import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PortfolioService } from './portfolio.service';
import { OwnerOrAdminGuard } from '../auth/roles.guard';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, service: process.env.APP_NAME || 'portfolio-service' };
  }
}

@Controller()
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

 
  @Get('list')
  list(@Query('owner') ownerUserId: string) {
    return this.svc.list(ownerUserId);
  }

  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.svc.getPublic(slug);
  }

  // PROTECTED
  @UseGuards(AuthGuard('jwt'), OwnerOrAdminGuard)
  @Post('draft')
  upsertDraft(@Body() dto: any) {
    return this.svc.upsertDraft(dto);
  }

  // PROTECTED
  @UseGuards(AuthGuard('jwt'), OwnerOrAdminGuard)
  @Post('publish')
  publish(@Body() dto: { slug: string; ownerUserId: string }) {
    return this.svc.publish(dto.slug);
  }

  // PROTECTED
  @UseGuards(AuthGuard('jwt'), OwnerOrAdminGuard)
  @Patch('reorder')
  reorder(@Body() body: { order: string[]; ownerUserId: string }) {
    return this.svc.reorder(body.order);
  }

  // PROTECTED
  @UseGuards(AuthGuard('jwt'), OwnerOrAdminGuard)
  @Get('preview/:slug')
  getPreview(@Param('slug') slug: string, @Query('ownerUserId') ownerUserId: string) {
    return this.svc.getPreview(slug);
  }
}