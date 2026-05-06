import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImageValidator, mediaFileFilter } from '../utils/validation';
import { PublishService } from './publish.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { CreateProjectPhaseDto } from './dto/create-phase.dto';
import { CreateProjectTaskDto } from './dto/create-task.dto';
import { CreateModeratedSubcategoryDto } from './dto/create-moderated-subcategory.dto';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpsertProjectDraftDto } from './dto/upsert-project-draft.dto';
import { UpsertProjectScopeDto } from './dto/upsert-project-scope.dto';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user: { sub: string; id: string; email: string };
};

@ApiBearerAuth()
@ApiTags('Publish')
@UseGuards(JwtAuthGuard)
@Controller('publish')
export class PublishController {
  constructor(
    private publishService: PublishService,
    private readonly imageValidator: ImageValidator,
  ) {}

  @Post('project')
  async createNewProject(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    try {
      return await this.publishService.createNewProject(req.user.sub, dto);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Post('project/draft')
  async createProjectDraft(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertProjectDraftDto,
  ) {
    try {
      return await this.publishService.createProjectDraft(req.user.sub, dto);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Get('project/slug/:slug')
  async getProjectDraftBySlug(
    @Req() req: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    try {
      return await this.publishService.getProjectDraftBySlug(
        req.user.sub,
        slug,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Get('project/:projectId')
  async getProjectDraft(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    try {
      return await this.publishService.getProjectDraft(req.user.sub, projectId);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Put('project/:projectId')
  async updateProjectDraft(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectDraftDto,
  ) {
    try {
      return await this.publishService.updateProjectDraft(
        req.user.sub,
        projectId,
        dto,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Get('projects/mine')
  async getMyProjects(@Req() req: AuthenticatedRequest) {
    try {
      return await this.publishService.getMyProjects(req.user.sub);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Put('project/:projectId/scope')
  async replaceProjectScope(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectScopeDto,
  ) {
    try {
      return await this.publishService.replaceProjectScope(
        req.user.sub,
        projectId,
        dto,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Post('category/subcategory')
  async createModeratedSubcategory(
    @Body() dto: CreateModeratedSubcategoryDto,
  ) {
    return this.publishService.createModeratedSubcategory(dto);
  }

  @Post('project/:projectId/publish')
  async publishProject(
    @Req() req: AuthenticatedRequest,
    @Param('projectId') projectId: string,
  ) {
    try {
      return await this.publishService.publishExistingProject(
        req.user.sub,
        projectId,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Post('media')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'featuredImage', maxCount: 1 },
        { name: 'additionalImages', maxCount: 8 },
        { name: 'featuredVideo', maxCount: 1 },
        { name: 'videoUrl', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        fileFilter: mediaFileFilter,
      },
    ),
  )
  async uploadMedia(
    @Req() req: AuthenticatedRequest,
    @UploadedFiles()
    files: {
      featuredImage?: Express.Multer.File[];
      additionalImages?: Express.Multer.File[];
      featuredVideo?: Express.Multer.File[];
      videoUrl?: Express.Multer.File[];
    },
    @Body() dto: CreateMediaDto,
  ) {
    const featuredImageFile = files?.featuredImage?.[0];
    const additionalImageFiles = files?.additionalImages ?? [];
    const featuredVideoFile =
      files?.featuredVideo?.[0] ?? files?.videoUrl?.[0];

    if (!featuredImageFile) {
      throw new BadRequestException('Featured image is required.');
    }

    additionalImageFiles.forEach((file) => {
      if (!this.imageValidator.isValid(file)) {
        throw new BadRequestException(
          this.imageValidator.buildErrorMessage(file),
        );
      }
    });

    if (!this.imageValidator.isValid(featuredImageFile)) {
      throw new BadRequestException(
        this.imageValidator.buildErrorMessage(featuredImageFile),
      );
    }

    return this.publishService.createProjectOfMedia(
      req.user.sub,
      {
        featuredImage: featuredImageFile,
        additionalImages: additionalImageFiles,
        featuredVideo: featuredVideoFile,
      },
      dto,
    );
  }

  @Post('phase')
  async createProjectOfPhase(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectPhaseDto,
  ) {
    try {
      return await this.publishService.createProjectOfPhase(req.user.sub, dto);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Post('phase/:phaseId/duplicate')
  async duplicatePhase(
    @Req() req: AuthenticatedRequest,
    @Param('phaseId') phaseId: string,
  ) {
    try {
      return await this.publishService.duplicatePhaseWithTasks(
        req.user.sub,
        phaseId,
      );
    } catch (error) {
      console.error('Error duplicating phase:', error);
      throw error;
    }
  }

  @Put('phase/update/:phaseId')
  async updateProjectOfPhase(
    @Req() req: AuthenticatedRequest,
    @Param('phaseId') phaseId: string,
    @Body() dto: UpdatePhaseDto,
  ) {
    try {
      return await this.publishService.updateProjectOfPhase(
        req.user.sub,
        phaseId,
        dto,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Delete('phase/delete/:phaseId')
  @HttpCode(204)
  async deleteProjectOfPhase(
    @Req() req: AuthenticatedRequest,
    @Param('phaseId') phaseId: string,
  ) {
    try {
      await this.publishService.deleteProjectOfPhase(req.user.sub, phaseId);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Post('task')
  async createPhaseOfTask(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateProjectTaskDto,
  ) {
    try {
      return await this.publishService.createPhaseOfTask(req.user.sub, dto);
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }

  @Put('task/update/:id')
  async updatePhaseOfTask(
    @Req() req: AuthenticatedRequest,
    @Param('id') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    try {
      return await this.publishService.updatePhaseOfTask(
        req.user.sub,
        taskId,
        dto,
      );
    } catch (error) {
      console.log('err', error);
      throw error;
    }
  }
}
