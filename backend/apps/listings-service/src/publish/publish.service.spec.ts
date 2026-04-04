import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  ModerationInvalidResponseError,
  ModerationUnavailableError,
  ProjectModerationService,
} from './project-moderation.service';
import { PublishService } from './publish.service';

describe('PublishService moderation flow', () => {
  const projectRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
  };

  const mediaRepository = {
    create: jest.fn(),
  };

  const phaseRepository = {
    findOne: jest.fn(),
    findOneWithTasks: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const taskRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const moderationService = {
    moderateProject: jest.fn(),
  } as unknown as ProjectModerationService;

  const cloudflareStorageService = {
    uploadProjectMedia: jest.fn(),
  };

  let service: PublishService;

  const createDto: CreateProjectDto = {
    title: 'Build API gateway',
    shortDescription: 'API work',
    fullDescription: 'Create integrations and auth flow',
  } as CreateProjectDto;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PublishService(
      projectRepository as any,
      mediaRepository as any,
      phaseRepository as any,
      taskRepository as any,
      moderationService,
      cloudflareStorageService as any,
    );
  });

  it('returns 503 and marks project as publish_blocked when moderation is unavailable', async () => {
    projectRepository.create.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      title: createDto.title,
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-1',
      status: 'publish_blocked',
    });
    (moderationService.moderateProject as jest.Mock).mockRejectedValue(
      new ModerationUnavailableError(),
    );

    await expect(service.createNewProject('user-1', createDto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    expect(projectRepository.update).toHaveBeenCalledWith('project-1', {
      status: 'publish_blocked',
      projectDatePublished: null,
    });

    try {
      await service.createNewProject('user-1', createDto);
    } catch (error) {
      const response = (error as ServiceUnavailableException).getResponse() as {
        projectId?: string;
        status?: string;
      };
      expect(response.projectId).toBe('project-1');
      expect(response.status).toBe('publish_blocked');
    }
  });

  it('returns existing project immediately when publish retry is called for published project', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-2',
      userId: 'user-2',
      title: 'Already live',
      status: 'published',
    });

    const result = await service.publishExistingProject('user-2', 'project-2');

    expect(result.status).toBe('published');
    expect(moderationService.moderateProject).not.toHaveBeenCalled();
  });

  it('returns 502 and marks project as publish_blocked when moderation response is invalid', async () => {
    projectRepository.create.mockResolvedValue({
      id: 'project-5',
      userId: 'user-5',
      title: createDto.title,
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-5',
      status: 'publish_blocked',
    });
    (moderationService.moderateProject as jest.Mock).mockRejectedValue(
      new ModerationInvalidResponseError(),
    );

    await expect(service.createNewProject('user-5', createDto)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(projectRepository.update).toHaveBeenCalledWith('project-5', {
      status: 'publish_blocked',
      projectDatePublished: null,
    });
  });

  it('publishes existing project on approved moderation result', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-3',
      userId: 'user-3',
      title: 'New platform',
      shortDescription: 'Rollout',
      fullDescription: 'Platform rollout details',
      categories: ['Development'],
      subCategories: ['Backend'],
      tags: ['api'],
      status: 'draft',
    });
    (moderationService.moderateProject as jest.Mock).mockResolvedValue({
      status: 'approved',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-3',
      status: 'published',
    });

    const result = await service.publishExistingProject('user-3', 'project-3');

    expect(result).toEqual({
      id: 'project-3',
      status: 'published',
    });
    expect(projectRepository.update).toHaveBeenCalledWith('project-3', {
      status: 'published',
      projectDatePublished: expect.any(Date),
    });
  });

  it('keeps rejected moderation behavior unchanged for retry publish', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-4',
      userId: 'user-4',
      title: 'Rejected project',
      status: 'draft',
    });
    (moderationService.moderateProject as jest.Mock).mockResolvedValue({
      status: 'rejected',
      reason: 'Banned keyword detected',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-4',
      status: 'rejected',
    });

    await expect(
      service.publishExistingProject('user-4', 'project-4'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
