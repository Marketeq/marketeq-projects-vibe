import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { ReportProjectDto } from './dto/report-project.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { ViewerDependent, ViewerId } from '../identity-gate/viewer.decorator';

@Controller('v1/projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('recommended')
  getRecommended(
    @Query('skills') skills: string,
    @Query('limit') limit?: string,
  ) {
    const skillList = skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return this.service.getRecommendedBySkills(skillList, limit ? parseInt(limit, 10) : 10);
  }

  @ViewerDependent()
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string, @ViewerId() viewerId: string | null) {
    return this.service.findBySlug(slug, viewerId);
  }

  @Get(':id/related-searches')
  getRelatedSearches(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getRelatedSearches(id, limit ? parseInt(limit, 10) : 60);
  }

  @Get(':id/related-terms')
  getRelatedTerms(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getRelatedTerms(id);
  }

  @Get(':id/similar')
  getSimilarById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSimilarById(id);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportProjectDto,
    @Req() req: any,
  ) {
    return this.service.reportProject(
      id,
      dto,
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );
  }

  @Get(':id/questions')
  getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getQuestions(id);
  }

  @Get(':id/suggested-questions')
  getSuggestedQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getSuggestedQuestions(id);
  }

  @Post(':id/questions')
  @UseGuards(JwtAuthGuard)
  addQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('question') question: string,
    @Req() req: any,
  ) {
    return this.service.addQuestion(id, question, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id/questions/:index/answer')
  @UseGuards(JwtAuthGuard)
  answerQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('index') index: string,
    @Body('answer') answer: string,
    @Req() req: any,
  ) {
    return this.service.answerQuestion(
      id,
      parseInt(index, 10),
      answer,
      req.user?.sub ?? req.user?.id ?? req.user?.userId,
    );
  }

  @ViewerDependent()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @ViewerId() viewerId: string | null) {
    return this.service.findOnePublished(id, viewerId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: Partial<Project>, @Req() req: any) {
    return this.service.create(dto, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<Project>, @Req() req: any) {
    return this.service.update(id, dto, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  claim(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.claim(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.publish(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.remove(id, req.user?.sub ?? req.user?.id ?? req.user?.userId);
  }

  @MessagePattern('project.findById')
  handleFindById(@Payload() data: { id: string }) {
    return this.service.findOne(data.id);
  }
}
