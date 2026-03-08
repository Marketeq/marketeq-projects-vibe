import {
  Controller, Post, Get, Delete, Body, Param, Query, Request,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PortfolioService } from '../services/portfolio.service';
import { UpsertDraftDto, PublishDto } from '../dto/portfolio.dto';
import { RolesGuard } from '../auth/roles.guard';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly svc: PortfolioService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('draft')
  @HttpCode(HttpStatus.OK)
  upsertDraft(@Body() dto: UpsertDraftDto) {
    return this.svc.upsertDraft(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('publish')
  publish(@Body() dto: PublishDto) {
    return this.svc.publish(dto.slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('archive')
  archive(@Body() dto: PublishDto) {
    return this.svc.archive(dto.slug);
  }

  // Owner extracted from JWT — users can only see their own portfolios; admins can pass ?owner=
  @UseGuards(AuthGuard('jwt'))
  @Get('list')
  list(@Request() req: any, @Query('owner') ownerParam?: string) {
    const isAdmin = req.user?.role === 'admin';
    const ownerUserId = isAdmin && ownerParam ? ownerParam : req.user.userId;
    return this.svc.listByOwner(ownerUserId);
  }

  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('preview/:slug')
  getPreview(@Param('slug') slug: string) {
    return this.svc.getPreviewBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('slug') slug: string, @Body('ownerUserId') ownerUserId: string) {
    return this.svc.delete(slug, ownerUserId);
  }

  // RabbitMQ
  @MessagePattern('portfolio.upsert-draft')
  handleUpsert(@Payload() dto: UpsertDraftDto) {
    return this.svc.upsertDraft(dto);
  }

  @MessagePattern('portfolio.publish')
  handlePublish(@Payload() dto: PublishDto) {
    return this.svc.publish(dto.slug);
  }
}
