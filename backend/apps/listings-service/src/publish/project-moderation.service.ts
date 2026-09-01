import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type ModerationStatus = 'approved' | 'rejected' | 'pending_review';

export type ProjectModerationResult = {
  status: ModerationStatus;
  reason?: string;
  field?: string;
};

export type ProjectModerationInput = {
  title: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  categories?: string[] | null;
  subCategories?: string[] | null;
  categorySelections?: { category: string; subCategories: string[] }[] | null;
  tags?: string[] | null;
  faqs?: { question: string; answer: string }[] | null;
  imageUrl?: string | null; // Add imageUrl for moderation
};

export class ModerationUnavailableError extends Error {
  constructor(message = 'Moderation service unavailable') {
    super(message);
    this.name = 'ModerationUnavailableError';
  }
}

export class ModerationInvalidResponseError extends Error {
  constructor(message = 'Invalid moderation response') {
    super(message);
    this.name = 'ModerationInvalidResponseError';
  }
}

@Injectable()
export class ProjectModerationService {
  private readonly logger = new Logger(ProjectModerationService.name);

  constructor(private readonly httpService: HttpService) {}

  private get moderationBaseUrl(): string {
    return (
      process.env.CONTENT_MODERATION_SERVICE_URL?.trim() ||
      'http://localhost:3014'
    ).replace(/\/$/, '');
  }

  private get moderationTimeoutMs(): number {
    const rawValue = Number(process.env.CONTENT_MODERATION_TIMEOUT_MS ?? 30000);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return 30000;
    }
    return rawValue;
  }

  private get videoModerationTimeoutMs(): number {
    const rawValue = Number(
      process.env.CONTENT_MODERATION_VIDEO_TIMEOUT_MS ?? 120000,
    );
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return 120000;
    }
    return rawValue;
  }

  private authConfig(authToken?: string, timeout?: number) {
    return {
      timeout: timeout ?? this.moderationTimeoutMs,
      headers: authToken ? { Authorization: authToken } : undefined,
    };
  }

  private async detectRejectedField(
    projectId: string,
    input: ProjectModerationInput,
    authToken?: string,
  ): Promise<string | undefined> {
    const faqText = (input.faqs ?? [])
      .map((f) => [f?.question, f?.answer].filter(Boolean).join(' '))
      .join('\n');
    const fields: { key: string; text?: string | null }[] = [
      { key: 'title', text: input.title },
      { key: 'shortDescription', text: input.shortDescription },
      { key: 'fullDescription', text: input.fullDescription },
      { key: 'faqs', text: faqText },
    ];

    const placeholderTitle = 'Sample project title';
    const placeholderContent = 'Sample project description for moderation checks';

    for (const field of fields) {
      const text = (field.text ?? '').trim();
      if (!text) continue;
      const title = field.key === 'title' ? text : placeholderTitle;
      const content = field.key === 'title' ? placeholderContent : text;
      try {
        const response = await this.httpService.axiosRef.post(
          `${this.moderationBaseUrl}/api/moderate/content`,
          {
            contentId: `${projectId}:${field.key}`,
            title,
            content,
            category: '',
            subcategory: '',
          },
          this.authConfig(authToken),
        );
        if (response?.data?.status === 'rejected') {
          return field.key;
        }
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  async moderateImageUrl(
    projectId: string,
    imageUrl: string,
    authToken?: string,
  ): Promise<ProjectModerationResult> {
    try {
      const imageResponse = await this.httpService.axiosRef.post(
        `${this.moderationBaseUrl}/api/moderate/media`,
        {
          contentId: projectId,
          mediaType: 'image',
          mediaUrl: imageUrl,
        },
        this.authConfig(authToken),
      );
      const imageStatus = imageResponse?.data?.status;
      if (imageStatus === 'rejected') {
        // Prefer 'reason' from the moderation service, fallback to 'message', then generic
        const reasonParts = [
          imageResponse?.data?.reason,
          imageResponse?.data?.debug?.rejectCode
            ? `code=${imageResponse.data.debug.rejectCode}`
            : undefined,
          imageResponse?.data?.debug?.step
            ? `step=${imageResponse.data.debug.step}`
            : undefined,
          imageResponse?.data?.message,
        ].filter(Boolean);
        const reason = reasonParts.join(' | ') || 'Image rejected by moderation';
        return { status: 'rejected', reason };
      }
      if (imageStatus === 'pending_review') {
        return {
          status: 'pending_review',
          reason:
            imageResponse?.data?.reason ||
            imageResponse?.data?.message ||
            'Image moderation is pending review',
        };
      }
      return { status: 'approved' };
    } catch (err) {
      this.logger.error(`Image moderation failed for project ${projectId}:`, err);
      throw new ModerationUnavailableError('Image moderation failed');
    }
  }

  async moderateProject(
    projectId: string,
    input: ProjectModerationInput,
    authToken?: string,
  ): Promise<ProjectModerationResult> {
    // 1. Moderate image if imageUrl is provided
    if (input.imageUrl) {
      const imageResult = await this.moderateImageUrl(
        projectId,
        input.imageUrl,
        authToken,
      );
      if (imageResult.status !== 'approved') {
        return imageResult;
      }
    }

    // 2. Moderate content as before
    const faqText = (input.faqs ?? [])
      .map((f) => [f?.question, f?.answer].filter(Boolean).join(' '))
      .filter((t) => t.trim().length > 0)
      .join('\n');
    const mergedContent = [
      input.shortDescription,
      input.fullDescription,
      faqText,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n');

    const payload = {
      contentId: projectId,
      title: input.title,
      content: mergedContent,
      category: input.categories?.[0] ?? 'Development',
      subcategory: input.subCategories?.[0] ?? 'Backend',
      categories: input.categories ?? [],
      tags: input.tags ?? [],
    };

    try {
      const response = await this.httpService.axiosRef.post(
        `${this.moderationBaseUrl}/api/moderate/content`,
        payload,
        this.authConfig(authToken),
      );

      const status = response?.data?.status;
      if (
        status !== 'approved' &&
        status !== 'rejected' &&
        status !== 'pending_review'
      ) {
        this.logger.warn(
          `Unexpected moderation status "${String(status)}" for project ${projectId}.`,
        );
        throw new ModerationInvalidResponseError(
          `Unexpected moderation status "${String(status)}"`,
        );
      }

      const reason =
        typeof response?.data?.reason === 'string'
          ? response.data.reason
          : undefined;

      const field =
        status === 'rejected'
          ? await this.detectRejectedField(projectId, input, authToken)
          : undefined;

      return { status, reason, field };
    } catch (error) {
      if (error instanceof ModerationInvalidResponseError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const isConnectivityError =
          !error.response ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EHOSTUNREACH' ||
          error.code === 'ETIMEDOUT';

        if (isConnectivityError || (statusCode != null && statusCode >= 500)) {
          this.logger.warn(
            `Moderation dependency unavailable for project ${projectId}. code=${error.code ?? 'n/a'} status=${statusCode ?? 'n/a'}`,
          );
          throw new ModerationUnavailableError();
        }

        this.logger.error(
          `Moderation request failed with non-retryable response for project ${projectId}. status=${statusCode ?? 'n/a'}`,
        );
        throw new ModerationInvalidResponseError(
          statusCode != null
            ? `Moderation request failed with status ${statusCode}`
            : 'Moderation request failed',
        );
      }

      this.logger.error(
        `Moderation request failed unexpectedly for project ${projectId}.`,
      );
      throw new ModerationInvalidResponseError(
        'Moderation request failed unexpectedly',
      );
    }
  }

  async moderateText(
    text: string,
    contentId: string,
    authToken?: string,
  ): Promise<'approved' | 'rejected' | 'pending_review'> {
    if (!text?.trim()) return 'approved';
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.moderationBaseUrl}/api/moderate/content`,
        {
          contentId,
          title: text.slice(0, 150),
          content: text,
          category: '',
          subcategory: '',
          categories: [],
          tags: [],
        },
        this.authConfig(authToken),
      );
      const status = response?.data?.status;
      return status === 'rejected' || status === 'pending_review'
        ? status
        : 'approved';
    } catch (error) {
      this.logger.warn(
        `Text moderation unavailable for ${contentId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
      return 'approved';
    }
  }

  async moderateVideoUrl(
    projectId: string,
    videoUrl: string,
  ): Promise<ProjectModerationResult> {
    try {
      const response = await this.httpService.axiosRef.post(
        `${this.moderationBaseUrl}/api/moderate/media`,
        {
          contentId: projectId,
          mediaType: 'video',
          mediaUrl: videoUrl,
        },
        { timeout: this.videoModerationTimeoutMs },
      );

      const status = response?.data?.status;
      if (
        status !== 'approved' &&
        status !== 'rejected' &&
        status !== 'pending_review'
      ) {
        throw new ModerationInvalidResponseError(
          `Unexpected video moderation status "${String(status)}"`,
        );
      }

      return {
        status,
        reason:
          typeof response?.data?.reason === 'string'
            ? response.data.reason
            : undefined,
      };
    } catch (error) {
      if (error instanceof ModerationInvalidResponseError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const isConnectivityError =
          !error.response ||
          error.code === 'ECONNABORTED' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EHOSTUNREACH' ||
          error.code === 'ETIMEDOUT';

        if (isConnectivityError || (statusCode != null && statusCode >= 500)) {
          throw new ModerationUnavailableError(
            'Video moderation unavailable',
          );
        }

        throw new ModerationInvalidResponseError(
          statusCode != null
            ? `Video moderation failed with status ${statusCode}`
            : 'Video moderation request failed',
        );
      }

      throw new ModerationInvalidResponseError(
        'Video moderation request failed unexpectedly',
      );
    }
  }
}


