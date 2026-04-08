import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";

export type InternalUserSummary = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: string;
  onboardingDismissed: boolean;
  hasCompletedOnboarding: boolean;
  isActive: boolean;
};

type SyncUserPayload = {
  id: string;
  email: string;
};

@Injectable()
export class UserServiceClient {
  constructor(private readonly http: HttpService) {}

  async syncUserProfile(payload: SyncUserPayload): Promise<void> {
    const url = `${process.env.USER_SERVICE_URL}/internal/users`;

    await lastValueFrom(
      this.http.post(url, payload, {
        headers: {
          'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
        },
      }),
    );
  }

  async addTeamMember(params: {
    teamId: string;
    userId: string;
    role: string;
  }): Promise<boolean> {
    const url = `${process.env.USER_SERVICE_URL}/internal/teams/${params.teamId}/members`;
    
    try {
      const response = await lastValueFrom(this.http.post(url, {
        userId: params.userId,
        role: params.role
      }, {
        headers: {
          'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || ''
        }
      }));

      const success = (response?.data as { success?: boolean } | undefined)?.success;
      return success !== false;
    } catch (error) {
      console.error('Failed to add team member via user-service:', error.response?.data || error.message);
      throw error;
    }
  }

  async getUserSummary(userId: string): Promise<InternalUserSummary> {
    const url = `${process.env.USER_SERVICE_URL}/internal/users/${userId}/summary`;

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          headers: {
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }),
      );

      return response.data as InternalUserSummary;
    } catch (error) {
      console.error(
        'Failed to fetch user summary via user-service:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async getUserSummaryByEmail(email: string): Promise<InternalUserSummary> {
    const url = `${process.env.USER_SERVICE_URL}/internal/users/summary-by-email`;

    try {
      const response = await lastValueFrom(
        this.http.get(url, {
          params: { email },
          headers: {
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }),
      );

      return response.data as InternalUserSummary;
    } catch (error) {
      console.error(
        'Failed to fetch user summary by email via user-service:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async dismissOnboarding(userId: string): Promise<InternalUserSummary> {
    const url = `${process.env.USER_SERVICE_URL}/internal/users/${userId}/onboarding-dismissed`;

    try {
      const response = await lastValueFrom(
        this.http.patch(url, null, {
          headers: {
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
        }),
      );

      const data = response.data as {
        id: string;
        email: string;
        role: string;
        onboardingDismissed: boolean;
        isActive: boolean;
      };

      return {
        ...data,
        hasCompletedOnboarding: Boolean(data.onboardingDismissed),
      };
    } catch (error) {
      throw error;
    }
  }
}
