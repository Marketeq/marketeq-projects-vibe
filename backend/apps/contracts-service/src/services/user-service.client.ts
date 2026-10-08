import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class UserServiceClient {
  private readonly logger = new Logger(UserServiceClient.name);

  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return (process.env.USER_SERVICE_URL || 'http://localhost:3002').replace(
      /\/+$/,
      '',
    );
  }

  // One batch request for any number of users. Avatars are decoration, so a
  // user-service failure returns {} and the caller shows no avatars rather
  // than failing the whole list.
  async getAvatarUrls(userIds: string[]): Promise<Record<string, string>> {
    const ids = Array.from(new Set(userIds));
    if (ids.length === 0) return {};

    const merged: Record<string, string> = {};
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const response = await lastValueFrom(
          this.http.get<Record<string, string>>(
            `${this.baseUrl}/internal/users/avatars`,
            {
              params: { ids: ids.slice(i, i + 100).join(',') },
              headers: {
                'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
              },
              timeout: 3000,
            },
          ),
        );
        Object.assign(merged, response.data);
      }
    } catch (error) {
      this.logger.warn(
        `Avatar lookup failed, returning no avatars: ${(error as Error).message}`,
      );
      return {};
    }
    return merged;
  }
}
