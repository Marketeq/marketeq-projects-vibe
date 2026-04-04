import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import {
  ModerationInvalidResponseError,
  ModerationUnavailableError,
  ProjectModerationService,
} from './project-moderation.service';

describe('ProjectModerationService', () => {
  let service: ProjectModerationService;

  const post = jest.fn();
  const httpService = {
    axiosRef: {
      post,
    },
  } as unknown as HttpService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CONTENT_MODERATION_SERVICE_URL = 'http://localhost:3007';
    service = new ProjectModerationService(httpService);
  });

  afterEach(() => {
    delete process.env.CONTENT_MODERATION_SERVICE_URL;
    delete process.env.CONTENT_MODERATION_TIMEOUT_MS;
  });

  it('returns approved moderation result when moderation succeeds', async () => {
    post.mockResolvedValue({
      data: { status: 'approved', reason: 'Content passes validation' },
    });

    const result = await service.moderateProject('project-1', {
      title: 'Backend API project',
      shortDescription: 'Need APIs',
      categories: ['Development'],
      subCategories: ['Backend'],
      tags: ['nodejs'],
    });

    expect(result).toEqual({
      status: 'approved',
      reason: 'Content passes validation',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe(
      'http://localhost:3007/api/moderate/content',
    );
  });

  it('throws ModerationUnavailableError when moderation dependency is unreachable', async () => {
    post.mockRejectedValue(new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED'));

    await expect(
      service.moderateProject('project-2', {
        title: 'Platform migration',
        fullDescription: 'Migrate services',
      }),
    ).rejects.toBeInstanceOf(ModerationUnavailableError);
  });

  it('throws ModerationInvalidResponseError when moderation returns unknown status', async () => {
    post.mockResolvedValue({
      data: { status: 'in_review' },
    });

    await expect(
      service.moderateProject('project-3', {
        title: 'Design sprint',
        shortDescription: 'UX exploration',
      }),
    ).rejects.toBeInstanceOf(ModerationInvalidResponseError);
  });
});
