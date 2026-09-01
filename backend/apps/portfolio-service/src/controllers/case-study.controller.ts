import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CaseStudyService } from '../services/case-study.service';
import {
  CreateCaseStudyDto,
  UpdateCaseStudyDto,
  ReorderBlocksDto,
  ListCaseStudiesQueryDto,
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

  // Must be declared before ':id' — otherwise "public" would be matched as an :id value.
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getById(@Param('id') id: string, @Req() req: any) {
    return this.svc.getById(id, req.user.userId);
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
