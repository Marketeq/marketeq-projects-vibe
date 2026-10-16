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
    update: jest.fn(),
    find: jest.fn(),
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
    moderateImageUrl: jest.fn(),
    moderateVideoUrl: jest.fn(),
  } as unknown as ProjectModerationService;

  const cloudflareStorageService = {
    uploadProjectMedia: jest.fn(),
  };

  const httpService = {};
  const configService = { get: jest.fn() };
  const deliverablesAdapter = {};
  const faqAdapter = {};
  const userProfileClient = { hydrateTeam: jest.fn().mockResolvedValue([]) };

  let service: PublishService;

  const createDto: CreateProjectDto = {
    title: 'Build API gateway',
    shortDescription: 'API work',
    fullDescription: 'Create integrations and auth flow',
  } as CreateProjectDto;

  beforeEach(() => {
    jest.clearAllMocks();

    // Images and video default to approved so text moderation is reached
    // unless a test overrides them.
    (moderationService.moderateImageUrl as jest.Mock).mockResolvedValue({
      status: 'approved',
    });
    (moderationService.moderateVideoUrl as jest.Mock).mockResolvedValue({
      status: 'approved',
    });

    service = new PublishService(
      projectRepository as any,
      mediaRepository as any,
      phaseRepository as any,
      taskRepository as any,
      moderationService,
      cloudflareStorageService as any,
      httpService as any,
      configService as any,
      deliverablesAdapter as any,
      faqAdapter as any,
      userProfileClient as any,
    );
  });

  it('returns 503 and marks project as publish_blocked when moderation is unavailable', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      title: createDto.title,
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-1',
      status: 'publish_blocked',
    });
    (moderationService.moderateProject as jest.Mock).mockRejectedValue(
      new ModerationUnavailableError(),
    );

    await expect(
      service.publishExistingProject('user-1', 'project-1'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(projectRepository.update).toHaveBeenCalledWith('project-1', {
      status: 'publish_blocked',
      projectDatePublished: null,
    });

    try {
      await service.publishExistingProject('user-1', 'project-1');
    } catch (error) {
      const response = (error as ServiceUnavailableException).getResponse() as {
        projectId?: string;
        status?: string;
      };
      expect(response.projectId).toBe('project-1');
      expect(response.status).toBe('publish_blocked');
    }
  });

  it('re-moderates edited media and recomputes the live gallery when re-publishing a published project', async () => {
    // Editing a published listing stages media in the media table but leaves
    // project.mediaUrls (the live gallery source) frozen. Re-publishing
    // re-moderates the staged media and recomputes mediaUrls from it, so the
    // edits go live only after passing moderation again.
    projectRepository.findOne.mockResolvedValue({
      id: 'project-2',
      userId: 'user-2',
      title: 'Already live',
      status: 'published',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/new-featured.jpg',
      additionalImages: ['https://cdn.example.com/new-2.jpg'],
    });
    (moderationService.moderateProject as jest.Mock).mockResolvedValue({
      status: 'approved',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-2',
      status: 'published',
    });

    const result = await service.publishExistingProject('user-2', 'project-2');

    expect(result.status).toBe('published');
    expect(moderationService.moderateImageUrl).toHaveBeenCalled();
    expect(moderationService.moderateProject).toHaveBeenCalled();
    expect(projectRepository.update).toHaveBeenCalledWith(
      'project-2',
      expect.objectContaining({
        status: 'published',
        mediaUrls: [
          'https://cdn.example.com/new-featured.jpg',
          'https://cdn.example.com/new-2.jpg',
        ],
      }),
    );
  });

  it('returns 502 and marks project as publish_blocked when moderation response is invalid', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-5',
      userId: 'user-5',
      title: createDto.title,
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-5',
      status: 'publish_blocked',
    });
    (moderationService.moderateProject as jest.Mock).mockRejectedValue(
      new ModerationInvalidResponseError(),
    );

    await expect(
      service.publishExistingProject('user-5', 'project-5'),
    ).rejects.toBeInstanceOf(BadGatewayException);
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
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
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
    expect(projectRepository.update).toHaveBeenCalledWith(
      'project-3',
      expect.objectContaining({
        status: 'published',
        projectDatePublished: expect.any(Date),
      }),
    );
  });

  it('keeps rejected moderation behavior unchanged for retry publish', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-4',
      userId: 'user-4',
      title: 'Rejected project',
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
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

  it('rejects publish when a gallery image fails moderation', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-8',
      userId: 'user-8',
      title: 'Image reject',
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
      additionalImages: ['https://cdn.example.com/bad.jpg'],
    });
    (moderationService.moderateImageUrl as jest.Mock)
      .mockResolvedValueOnce({ status: 'approved' })
      .mockResolvedValueOnce({
        status: 'rejected',
        reason: 'Image violates policy',
      });
    projectRepository.update.mockResolvedValue({
      id: 'project-8',
      status: 'rejected',
    });

    await expect(
      service.publishExistingProject('user-8', 'project-8'),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Text moderation must not run once an image is rejected.
    expect(moderationService.moderateProject).not.toHaveBeenCalled();
  });

  it('moderates the featured video at publish and blocks on rejection', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-9',
      userId: 'user-9',
      title: 'Video reject',
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue({
      featuredImage: 'https://cdn.example.com/featured.jpg',
      featuredVideo: 'https://cdn.example.com/clip.mp4',
    });
    (moderationService.moderateVideoUrl as jest.Mock).mockResolvedValue({
      status: 'rejected',
      reason: 'Video violates policy',
    });
    projectRepository.update.mockResolvedValue({
      id: 'project-9',
      status: 'rejected',
    });

    await expect(
      service.publishExistingProject('user-9', 'project-9'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(moderationService.moderateVideoUrl).toHaveBeenCalledWith(
      'project-9',
      'https://cdn.example.com/clip.mp4',
    );
    // Video is checked after images and before text moderation.
    expect(moderationService.moderateProject).not.toHaveBeenCalled();
  });

  it('does not moderate media at upload time', async () => {
    projectRepository.findOne.mockResolvedValue({
      id: 'project-6',
      userId: 'user-6',
      status: 'draft',
    });
    mediaRepository.find.mockResolvedValue(undefined);
    cloudflareStorageService.uploadProjectMedia.mockResolvedValueOnce({
      url: 'https://cdn.example.com/featured-image.jpg',
    });
    mediaRepository.create.mockResolvedValue({
      id: 'media-1',
      projectId: 'project-6',
      featuredImage: 'https://cdn.example.com/featured-image.jpg',
      additionalImages: [],
      featuredVideo: null,
    });

    await service.createProjectOfMedia(
      'user-6',
      {
        featuredImage: { originalname: 'cover.jpg' } as Express.Multer.File,
        additionalImages: [],
      },
      {
        projectId: 'project-6',
        videoUrl: 'undefined',
      } as any,
    );

    // Moderation is deferred to publish — upload only stages media.
    expect(moderationService.moderateImageUrl).not.toHaveBeenCalled();
    expect(moderationService.moderateVideoUrl).not.toHaveBeenCalled();
    expect(moderationService.moderateProject).not.toHaveBeenCalled();
  });
});

describe('PublishService scope replacement', () => {
  const projectRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    updatePublishedSnapshot: jest.fn(),
  };
  const phaseRepository = { replaceForProject: jest.fn() };
  const deliverablesAdapter = { deriveDeliverables: jest.fn() };
  const configService = { get: jest.fn() };
  const userProfileClient = { hydrateTeam: jest.fn() };

  let service: PublishService;

  const scopeDto = (name: string) =>
    ({
      scope: [
        {
          name,
          stageName: 'Discovery',
          startDay: 1,
          endDay: 5,
          order: 0,
          tasks: [
            {
              taskName: `${name} task`,
              role: 'Developer',
              location: [],
              experience: [],
              experienceLevel: 'Senior',
              duration: '2 days',
            },
          ],
        },
      ],
    }) as any;

  const deferred = <T>() => {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(() => {
    jest.clearAllMocks();
    projectRepository.findOne.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      teamMemberIds: [],
      categories: [],
    });
    deliverablesAdapter.deriveDeliverables.mockResolvedValue([]);
    userProfileClient.hydrateTeam.mockResolvedValue([]);

    service = new PublishService(
      projectRepository as any,
      {} as any,
      phaseRepository as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      configService as any,
      deliverablesAdapter as any,
      {} as any,
      userProfileClient as any,
    );
  });

  it('maps the scope onto a single replaceForProject call', async () => {
    phaseRepository.replaceForProject.mockResolvedValue([]);

    await service.replaceProjectScope('user-1', 'project-1', scopeDto('A'));

    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(1);
    expect(phaseRepository.replaceForProject).toHaveBeenCalledWith(
      'project-1',
      [
        expect.objectContaining({
          name: 'A',
          phaseType: null,
          recurrenceSchedule: null,
          recurrenceCount: null,
          tasks: [
            expect.objectContaining({
              taskName: 'A task',
              assigneeUserId: null,
            }),
          ],
        }),
      ],
    );
    expect(projectRepository.updatePublishedSnapshot).toHaveBeenCalledTimes(1);
  });

  it('coalesces requests that arrive mid-write into one run of the latest payload', async () => {
    const firstWrite = deferred<any[]>();
    phaseRepository.replaceForProject
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValue([]);

    const a = service.replaceProjectScope('user-1', 'project-1', scopeDto('A'));
    await flush();
    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(1);

    const b = service.replaceProjectScope('user-1', 'project-1', scopeDto('B'));
    const c = service.replaceProjectScope('user-1', 'project-1', scopeDto('C'));
    await flush();
    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(1);

    firstWrite.resolve([]);
    const [, resultB, resultC] = await Promise.all([a, b, c]);

    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(2);
    expect(phaseRepository.replaceForProject.mock.calls[1][1][0].name).toBe(
      'C',
    );
    expect(resultB).toBe(resultC);
  });

  it('runs different projects independently', async () => {
    const firstWrite = deferred<any[]>();
    phaseRepository.replaceForProject
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValue([]);

    const a = service.replaceProjectScope('user-1', 'project-1', scopeDto('A'));
    await flush();
    await service.replaceProjectScope('user-1', 'project-2', scopeDto('B'));

    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(2);
    firstWrite.resolve([]);
    await a;
  });

  it('rejects every waiter of a failed run and still serves the next request', async () => {
    const firstWrite = deferred<any[]>();
    const secondWrite = deferred<any[]>();
    phaseRepository.replaceForProject
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise)
      .mockResolvedValue([]);

    const a = service.replaceProjectScope('user-1', 'project-1', scopeDto('A'));
    await flush();
    const b = service.replaceProjectScope('user-1', 'project-1', scopeDto('B'));
    const c = service.replaceProjectScope('user-1', 'project-1', scopeDto('C'));
    await flush();

    firstWrite.resolve([]);
    await a;
    await flush();
    secondWrite.reject(new Error('db down'));

    await expect(b).rejects.toThrow('db down');
    await expect(c).rejects.toThrow('db down');

    await expect(
      service.replaceProjectScope('user-1', 'project-1', scopeDto('D')),
    ).resolves.toEqual(expect.objectContaining({ scope: [] }));
    expect(phaseRepository.replaceForProject).toHaveBeenCalledTimes(3);
  });

  it('refuses a caller without access before queueing anything', async () => {
    await expect(
      service.replaceProjectScope('someone-else', 'project-1', scopeDto('A')),
    ).rejects.toThrow('You do not have access to this project');
    expect(phaseRepository.replaceForProject).not.toHaveBeenCalled();
  });
});
