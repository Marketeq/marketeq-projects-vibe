import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityCondition } from '../utils/types/entity-condition.type';
import { IPaginationOptions } from '../utils/types/pagination-options';
import { NullableType } from '../utils/types/nullable.type';
import { ProjectRepository } from './infrastructure/persistence/project.repository';
import { Project } from './interface/project';
import { FilterProjectDto, SortProjectDto } from './dto/query-project.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaRepository } from './infrastructure/persistence/media.repository';
import { Media } from './interface/media';
import { PhaseRepository } from './infrastructure/persistence/phase.repository';
import { Phase } from './interface/phase';
import { CreateProjectPhaseDto } from './dto/create-phase.dto';
import { TaskRepository } from './infrastructure/persistence/task.repository';
import { CreateProjectTaskDto } from './dto/create-task.dto';
import { Task } from './interface/task';
import { UpdatePhaseDto } from './dto/update-phase.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ModerationInvalidResponseError,
  ModerationUnavailableError,
  ProjectModerationInput,
  ProjectModerationResult,
  ProjectModerationService,
} from './project-moderation.service';
import { CloudflareStorageService } from './cloudflare-storage.service';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mediaRepository: MediaRepository,
    private readonly phaseRepository: PhaseRepository,
    private readonly taskRepository: TaskRepository,
    private readonly projectModerationService: ProjectModerationService,
    private readonly cloudflareStorageService: CloudflareStorageService,
  ) {}

  private throwIfHttpException(error: unknown): void {
    if (error instanceof HttpException) {
      throw error;
    }
  }

  private async ensureProjectOwnership(
    projectId: string,
    userId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({ id: projectId });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  private async ensurePhaseOwnership(
    phaseId: string,
    userId: string,
  ): Promise<Phase> {
    const phase = await this.phaseRepository.findOne({ id: phaseId });

    if (!phase) {
      throw new NotFoundException('Phase not found');
    }

    await this.ensureProjectOwnership(phase.projectId, userId);
    return phase;
  }

  private async ensureTaskOwnership(
    taskId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({ id: taskId });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.ensurePhaseOwnership(task.phaseId, userId);
    return task;
  }

  private toModerationInput(input: {
    title: string;
    shortDescription?: string | null;
    fullDescription?: string | null;
    categories?: string[] | null;
    subCategories?: string[] | null;
    tags?: string[] | null;
    imageUrl?: string | null;
  }): ProjectModerationInput {
    return {
      title: input.title,
      shortDescription: input.shortDescription,
      fullDescription: input.fullDescription,
      categories: input.categories ?? [],
      subCategories: input.subCategories ?? [],
      tags: input.tags ?? [],
      imageUrl: input.imageUrl ?? undefined,
    };
  }

  private async markPublishBlocked(projectId?: string): Promise<void> {
    if (!projectId) return;

    try {
      await this.projectRepository.update(projectId, {
        status: 'publish_blocked',
        projectDatePublished: null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to mark project ${projectId} as publish_blocked.`,
      );
    }
  }

  private async applyModerationDecision(
    projectId: string,
    moderationResult: ProjectModerationResult,
  ): Promise<Project> {
    let status: 'published' | 'rejected' | 'pending_review' = 'pending_review';
    let projectDatePublished: Date | null = null;

    if (moderationResult.status === 'approved') {
      status = 'published';
      projectDatePublished = new Date();
    } else if (moderationResult.status === 'rejected') {
      status = 'rejected';
    }

    const moderatedProject = await this.projectRepository.update(projectId, {
      status,
      projectDatePublished,
    });

    if (status === 'rejected') {
      const moderationReason = moderationResult.reason ?? '';
      const isImageViolation =
        /media|image|animation|blur|policy violation|ai moderation/i.test(
          moderationReason,
        );
      throw new BadRequestException(
        isImageViolation
          ? `Project rejected: image violated moderation policy. ${moderationReason}`.trim()
          : moderationResult.reason
            ? `Project rejected by moderation: ${moderationResult.reason}`
            : 'Project rejected by moderation',
      );
    }

    if (status === 'pending_review') {
      this.logger.warn(
        `Project ${projectId} is pending review. Moderation reason: ${
          moderationResult.reason ?? 'none'
        }`,
      );
    }

    if (!moderatedProject) {
      throw new InternalServerErrorException(
        'Project moderation update failed',
      );
    }

    return moderatedProject;
  }

  private handleModerationError(error: unknown, projectId?: string): void {
    if (error instanceof ModerationUnavailableError) {
      throw new ServiceUnavailableException({
        message:
          'Content moderation is currently unavailable. Project was saved but not published.',
        projectId,
        status: 'publish_blocked',
      });
    }

    if (error instanceof ModerationInvalidResponseError) {
      throw new BadGatewayException({
        message:
          'Content moderation returned an invalid response. Please retry publishing.',
        projectId,
        status: 'publish_blocked',
      });
    }
  }

  async createNewProject(
    userId: string,
    dto: CreateProjectDto,
  ): Promise<Project> {
    try {
      const payload = {
        ...dto,
        userId,
        industries: dto.industries ?? dto.industry ?? [],
        tags: dto.tags ?? [],
        skills: dto.skills ?? [],
        status: 'draft',
        projectDatePublished: null,
      };

      const project = await this.projectRepository.create(payload);

      // Optional inline scope support: persist phases/tasks if provided.
      if (project?.id && dto.scope?.length) {
        for (const phaseDto of dto.scope) {
          const phase = await this.phaseRepository.create({
            name: phaseDto.name,
            stageName: phaseDto.stageName,
            startDay: phaseDto.startDay,
            endDay: phaseDto.endDay,
            order: phaseDto.order,
            projectId: project.id,
          });

          for (const taskDto of phaseDto.tasks ?? []) {
            await this.taskRepository.create({
              taskName: taskDto.taskName,
              role: taskDto.role,
              location: taskDto.location,
              experience: taskDto.experience,
              experienceLevel: taskDto.experienceLevel,
              duration: taskDto.duration,
              estimatedHours: taskDto.estimatedHours,
              phaseId: phase.id,
            });
          }
        }
      }

      return project;
    } catch (error) {
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  async publishExistingProject(
    userId: string,
    projectId: string,
  ): Promise<Project> {
    const project = await this.ensureProjectOwnership(projectId, userId);

    if (project.status === 'published') {
      return project;
    }

    try {
      const media = await this.mediaRepository.find({ projectId: project.id });
      if (!media?.featuredImage) {
        throw new BadRequestException(
          'Featured image is required before publishing.',
        );
      }

      const moderationInput = this.toModerationInput({
        title: project.title,
        shortDescription: project.shortDescription,
        fullDescription: project.fullDescription,
        categories: project.categories,
        subCategories: project.subCategories,
        tags: project.tags,
      });

      const moderationResult = await this.projectModerationService.moderateProject(
        project.id!,
        moderationInput,
      );

      return await this.applyModerationDecision(project.id!, moderationResult);
    } catch (error) {
      if (
        error instanceof ModerationUnavailableError ||
        error instanceof ModerationInvalidResponseError
      ) {
        await this.markPublishBlocked(project.id);
      }

      this.handleModerationError(error, project.id);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to publish project');
    }
  }

  async createProjectOfPhase(
    userId: string,
    dto: CreateProjectPhaseDto,
  ): Promise<Phase> {
    try {
      await this.ensureProjectOwnership(dto.projectId, userId);

      const phase = await this.phaseRepository.create({
        name: dto.name,
        stageName: dto.stageName,
        startDay: dto.startDay,
        endDay: dto.endDay,
        order: dto.order,
        projectId: dto.projectId,
      });

      if (dto.tasks?.length) {
        for (const task of dto.tasks) {
          await this.taskRepository.create({
            taskName: task.taskName,
            role: task.role,
            location: task.location,
            experience: task.experience,
            experienceLevel: task.experienceLevel,
            duration: task.duration,
            estimatedHours: task.estimatedHours,
            phaseId: phase.id,
          });
        }
      }

      const phaseWithTasks = await this.phaseRepository.findOneWithTasks(
        phase.id,
      );
      return phaseWithTasks ?? phase;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create phase');
    }
  }

  async updateProjectOfPhase(
    userId: string,
    phaseId: string,
    dto: UpdatePhaseDto,
  ): Promise<Phase> {
    try {
      await this.ensurePhaseOwnership(phaseId, userId);
      const data = await this.phaseRepository.update(phaseId, dto);
      return data!;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to update phase');
    }
  }

  async duplicatePhaseWithTasks(userId: string, id: string): Promise<Phase> {
    try {
      await this.ensurePhaseOwnership(id, userId);
      const existingPhase = await this.phaseRepository.findOneWithTasks(id);

      if (!existingPhase) {
        throw new NotFoundException('Phase not found');
      }

      const newPhase = await this.phaseRepository.create({
        name: existingPhase.name,
        stageName: existingPhase.stageName,
        startDay: existingPhase.startDay,
        endDay: existingPhase.endDay,
        order: existingPhase.order,
        projectId: existingPhase.projectId,
      });

      for (const task of existingPhase.task ?? []) {
        await this.taskRepository.create({
          taskName: task.taskName,
          role: task.role,
          location: task.location,
          experience: task.experience,
          experienceLevel: task.experienceLevel,
          duration: task.duration,
          estimatedHours: task.estimatedHours,
          phaseId: newPhase.id,
        });
      }

      const phaseWithTasks = await this.phaseRepository.findOneWithTasks(
        newPhase.id,
      );
      return phaseWithTasks ?? newPhase;
    } catch (error) {
      console.error('Error duplicating phase with tasks:', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to duplicate phase');
    }
  }

  async deleteProjectOfPhase(userId: string, phaseId: string): Promise<void> {
    try {
      await this.ensurePhaseOwnership(phaseId, userId);
      const data = await this.phaseRepository.softDelete(phaseId);
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to delete phase');
    }
  }

  async createPhaseOfTask(
    userId: string,
    dto: CreateProjectTaskDto,
  ): Promise<Task> {
    try {
      await this.ensurePhaseOwnership(dto.phaseId, userId);
      const data = await this.taskRepository.create(dto);
      return data;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async updatePhaseOfTask(
    userId: string,
    phaseId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    try {
      await this.ensureTaskOwnership(phaseId, userId);
      const data = await this.taskRepository.update(phaseId, dto);
      return data!;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async createProjectOfMedia(
    userId: string,
    files: {
      featuredImage: Express.Multer.File;
      additionalImages?: Express.Multer.File[];
      featuredVideo?: Express.Multer.File;
    },
    dto: CreateMediaDto,
  ): Promise<Media> {
    try {
      await this.ensureProjectOwnership(dto.projectId, userId);

      if (files.additionalImages && files.additionalImages.length > 8) {
        throw new BadRequestException('You can upload a maximum of 8 images.');
      }

      const featuredImageModeration =
        await this.projectModerationService.moderateUploadedImage(
          dto.projectId,
          files.featuredImage,
        );

      if (featuredImageModeration.status !== 'approved') {
        const reason =
          featuredImageModeration.reason ??
          'Featured image failed moderation.';

        if (featuredImageModeration.status === 'pending_review') {
          throw new BadRequestException(
            `Featured image is pending moderation review and cannot be uploaded yet. ${reason}`.trim(),
          );
        }

        throw new BadRequestException(
          `Featured image rejected by moderation. ${reason}`.trim(),
        );
      }

      const resolvedVideoUrl = (
        dto.videoUrl ??
        ((dto as CreateMediaDto & { featuredVideo?: string }).featuredVideo ??
          '')
      )
        .trim()
        .replace(/^(https?:\/\/)+/i, 'https://');

      const uploadedFeaturedVideo = files.featuredVideo;
      let persistedVideoUrl: string | null = null;

      if (uploadedFeaturedVideo) {
        const videoModeration =
          await this.projectModerationService.moderateUploadedVideo(
            dto.projectId,
            uploadedFeaturedVideo,
          );

        if (videoModeration.status !== 'approved') {
          const reason = videoModeration.reason ?? 'Featured video failed moderation.';
          if (videoModeration.status === 'pending_review') {
            throw new BadRequestException(
              `Featured video is pending moderation review and cannot be uploaded yet. ${reason}`.trim(),
            );
          }
          throw new BadRequestException(
            `Featured video rejected by moderation. ${reason}`.trim(),
          );
        }

        const featuredVideoUpload =
          await this.cloudflareStorageService.uploadProjectMedia(
            dto.projectId,
            uploadedFeaturedVideo,
          );
        persistedVideoUrl = featuredVideoUpload.url;
      } else if (resolvedVideoUrl) {
        const videoModeration =
          await this.projectModerationService.moderateVideoUrl(
            dto.projectId,
            resolvedVideoUrl,
          );

        if (videoModeration.status !== 'approved') {
          const reason = videoModeration.reason ?? 'Featured video failed moderation.';
          if (videoModeration.status === 'pending_review') {
            throw new BadRequestException(
              `Featured video is pending moderation review and cannot be uploaded yet. ${reason}`.trim(),
            );
          }
          throw new BadRequestException(
            `Featured video rejected by moderation. ${reason}`.trim(),
          );
        }

        persistedVideoUrl = resolvedVideoUrl;
      }

      const featuredImageUpload =
        await this.cloudflareStorageService.uploadProjectMedia(
          dto.projectId,
          files.featuredImage,
        );
      const additionalImageUploads = await Promise.all(
        (files.additionalImages ?? []).map((file) =>
          this.cloudflareStorageService.uploadProjectMedia(dto.projectId, file),
        ),
      );

      const media = await this.mediaRepository.create({
        featuredImage: featuredImageUpload.url,
        additionalImages: additionalImageUploads.map((image) => image.url),
        featuredVideo: persistedVideoUrl ?? undefined,
        projectId: dto.projectId,
      });

      return media;
    } catch (error) {
      console.log('err', error);
      this.throwIfHttpException(error);
      if (error instanceof ModerationUnavailableError) {
        throw new ServiceUnavailableException({
          message:
            'Video moderation is currently unavailable. Please retry media upload.',
          projectId: dto.projectId,
          status: 'publish_blocked',
        });
      }
      if (error instanceof ModerationInvalidResponseError) {
        throw new BadGatewayException({
          message:
            'Video moderation returned an invalid response. Please retry media upload.',
          projectId: dto.projectId,
          status: 'publish_blocked',
        });
      }
      if (error instanceof Error && error.message) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException('Failed to upload media');
    }
  }

  findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
    sortOptions?: SortProjectDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<Project[]> {
    return this.projectRepository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });
  }

  findAll({
    filterOptions,
  }: {
    filterOptions?: FilterProjectDto | null;
  }): Promise<Project[]> {
    return this.projectRepository.findAll({ filterOptions });
  }

  findOne(fields: EntityCondition<Project>): Promise<NullableType<Project>> {
    return this.projectRepository.findOne(fields);
  }

  find(fields: EntityCondition<Project>): Promise<NullableType<Project>> {
    return this.projectRepository.find(fields);
  }

  // async update(
  //   id: Project['id'],
  //   payload: DeepPartial<Project>,
  // ): Promise<Project | null> {
  //   const clonedPayload = { ...payload };

  //   // if (
  //   //   clonedPayload.password &&
  //   //   clonedPayload.previousPassword !== clonedPayload.password
  //   // ) {
  //   //   const salt = await bcrypt.genSalt();
  //   //   clonedPayload.password = await bcrypt.hash(clonedPayload.password, salt);
  //   // }

  //   // if (clonedPayload.email) {
  //   //   const userObject = await this.projectRepository.findOne({
  //   //     email: clonedPayload.email,
  //   //   });

  //   //   if (userObject?.id !== id) {
  //   //     throw new HttpException(
  //   //       {
  //   //         status: HttpStatus.UNPROCESSABLE_ENTITY,
  //   //         errors: {
  //   //           email: 'emailAlreadyExists',
  //   //         },
  //   //       },
  //   //       HttpStatus.UNPROCESSABLE_ENTITY,
  //   //     );
  //   //   }
  //   // }

  //   // return this.projectRepository.update(id, clonedPayload);
  // }

  async softDelete(id: Project['id']): Promise<void> {
    await this.projectRepository.softDelete(id);
  }

  async me(id: Project['id']) {
    const user = await this.findOne({
      id: id,
    });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          errors: {
            message: 'Unauthorized',
          },
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return { user };
  }
}

