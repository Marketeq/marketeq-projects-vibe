import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CaseStudyService } from '../services/case-study.service';
import {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  ReorderBlocksDto,
  ListCaseStudiesQueryDto,
  ListPublicCaseStudiesQueryDto,
  PublishCaseStudyDto,
  SetVisibilityDto,
} from '../dto/case-study.dto';

@Controller('case-studies')
export class CaseStudyController {
  constructor(private readonly svc: CaseStudyService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCaseStudyDto, @Req() req: any) {
    return this.svc.create(dto, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  list(@Query() query: ListCaseStudiesQueryDto, @Req() req: any) {
    return this.svc.listByOwner(req.user.userId, query);
  }

  // Public routes. All must be declared before ':id' — otherwise "public"
  // would be matched as an :id value. None of them take a JWT, and every one
  // returns published case studies only, so a draft or hidden case study is
  // never reachable by anyone but its owner.
  @Get('public')
  listPublic(@Query() query: ListPublicCaseStudiesQueryDto) {
    return this.svc.listPublishedByOwner(query.ownerUserId, query);
  }

  @Get('public/id/:id')
  getPublicById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.svc.getPublicById(id);
  }

  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string, @Req() req: any) {
    return this.svc.getById(id, req.user.userId);
  }

  // Both like routes are declared before the bare ':id' PATCH/DELETE handlers
  // for the same reason 'public/:slug' is — Nest matches in declaration order.
  @UseGuards(AuthGuard('jwt'))
  @Get(':id/like')
  getLikeState(@Param('id') id: string, @Req() req: any) {
    return this.svc.getLikeState(id, req.user.userId);
  }

  // Deliberately a toggle on one route rather than POST/DELETE: the heart is
  // one control, and a toggle can't get stuck out of sync with it.
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  toggleLike(@Param('id') id: string, @Req() req: any) {
    return this.svc.toggleLike(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCaseStudyDto, @Req() req: any) {
    return this.svc.updateDraft(id, req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/blocks/reorder')
  reorder(@Param('id') id: string, @Body() dto: ReorderBlocksDto, @Req() req: any) {
    return this.svc.reorderBlocks(id, req.user.userId, dto.blockOrder);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/publish')
  publish(@Param('id') id: string, @Body() dto: PublishCaseStudyDto, @Req() req: any) {
    return this.svc.publishCaseStudy(id, req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/visibility')
  setVisibility(@Param('id') id: string, @Body() dto: SetVisibilityDto, @Req() req: any) {
    return this.svc.setVisibility(id, req.user.userId, dto.status);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.delete(id, req.user.userId);
  }
}
