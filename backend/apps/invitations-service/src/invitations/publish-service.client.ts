import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

// Drives project_members.status from a project-scoped invitation. Best-effort:
// a listings-service hiccup must not block the invitation action itself.
@Injectable()
export class PublishServiceClient {
  private readonly logger = new Logger(PublishServiceClient.name);

  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return (process.env.LISTINGS_SERVICE_URL || 'http://localhost:3004').replace(/\/+$/, '');
  }

  private get headers() {
    return { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' };
  }

  async addPendingMember(projectId: string, userId: string): Promise<void> {
    const url = `${this.baseUrl}/internal/projects/${projectId}/members/${userId}/pending`;
    try {
      await lastValueFrom(this.http.post(url, {}, { headers: this.headers }));
    } catch (error: any) {
      this.logger.warn(
        `Failed to mark project member pending (${projectId}/${userId}): ${error?.response?.data?.message || error?.message}`,
      );
    }
  }

  async activateMember(projectId: string, userId: string): Promise<void> {
    const url = `${this.baseUrl}/internal/projects/${projectId}/members/${userId}/activate`;
    try {
      await lastValueFrom(this.http.post(url, {}, { headers: this.headers }));
    } catch (error: any) {
      this.logger.warn(
        `Failed to activate project member (${projectId}/${userId}): ${error?.response?.data?.message || error?.message}`,
      );
    }
  }

  async declineMember(projectId: string, userId: string): Promise<void> {
    const url = `${this.baseUrl}/internal/projects/${projectId}/members/${userId}/decline`;
    try {
      await lastValueFrom(this.http.post(url, {}, { headers: this.headers }));
    } catch (error: any) {
      this.logger.warn(
        `Failed to decline project member (${projectId}/${userId}): ${error?.response?.data?.message || error?.message}`,
      );
    }
  }
}
