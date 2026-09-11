import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";

export type InternalUserSummary = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  role: string;
  onboardingDismissed: boolean;
  hasCompletedOnboarding: boolean;
  isActive: boolean;
};

type SyncUserPayload = {
  id: string;
  email: string;
  hasPassword?: boolean;
};

export type InternalCompany = {
  id: string;
  name: string;
  domain?: string;
  logoUrl?: string;
  ownerUserId: string;
};

export type InternalCompanyMember = {
  companyId: string;
  userId: string;
  role: string;
  permissions: string[];
};

@Injectable()
export class UserServiceClient {
  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return (process.env.USER_SERVICE_URL || 'http://localhost:3002').replace(/\/+$/, '');
  }

  async syncUserProfile(payload: SyncUserPayload): Promise<void> {
    const url = `${this.baseUrl}/internal/users`;

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
    const url = `${this.baseUrl}/internal/teams/${params.teamId}/members`;
    
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
    const url = `${this.baseUrl}/internal/users/${userId}/summary`;

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
    const url = `${this.baseUrl}/internal/users/summary-by-email`;

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

  async getCompany(companyId: string): Promise<InternalCompany> {
    const url = `${this.baseUrl}/internal/companies/${companyId}`;
    const response = await lastValueFrom(
      this.http.get(url, {
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
      }),
    );
    return (response.data as { data: InternalCompany }).data;
  }

  /**
   * Idempotent upsert of a company_users row. Throws on failure, and callers
   * that mark an invitation accepted must not swallow this (see
   * InvitationsService.accept).
   */
  async addCompanyMember(params: {
    companyId: string;
    userId: string;
    role: string;
    permissions?: string[];
  }): Promise<InternalCompanyMember> {
    const url = `${this.baseUrl}/internal/companies/${params.companyId}/members`;
    const response = await lastValueFrom(
      this.http.post(
        url,
        { userId: params.userId, role: params.role, permissions: params.permissions },
        { headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' } },
      ),
    );
    return (response.data as { data: InternalCompanyMember }).data;
  }

  async getCompanyMemberByEmail(
    companyId: string,
    email: string,
  ): Promise<InternalCompanyMember | null> {
    const url = `${this.baseUrl}/internal/companies/member-by-email`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: { companyId, email },
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
      }),
    );
    return (response.data as { data: InternalCompanyMember | null }).data;
  }

  /** Roster size for the company card in the "invite accepted" email. */
  async getCompanyMemberCount(companyId: string): Promise<number> {
    const url = `${this.baseUrl}/internal/companies/${companyId}/member-count`;
    const response = await lastValueFrom(
      this.http.get(url, {
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
      }),
    );
    return (response.data as { count: number }).count;
  }

  async checkCompanyMembership(companyId: string, userId: string): Promise<boolean> {
    const url = `${this.baseUrl}/internal/companies/${companyId}/members/${userId}`;
    const response = await lastValueFrom(
      this.http.get(url, {
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
      }),
    );
    return (response.data as { isMember: boolean }).isMember;
  }

  async dismissOnboarding(userId: string): Promise<InternalUserSummary> {
    const url = `${this.baseUrl}/internal/users/${userId}/onboarding-dismissed`;

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
