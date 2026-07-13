import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface HydratedTeamMember {
  userId: string;
  firstName: string;
  username: string;
  avatarUrl: string | null;
  location: string | null;
  hourlyRate: number | null;
  languages: string[];
  skills: string[];
  isLead: boolean;
  isOnline: boolean;
}

@Injectable()
export class UserProfileClient {
  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return process.env.USER_SERVICE_URL || 'http://localhost:3002';
  }

  private async getById(id: string): Promise<Record<string, any> | null> {
    try {
      const res = await lastValueFrom(
        this.http.get(`${this.baseUrl}/internal/users/${id}`, {
          headers: {
            'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '',
          },
          timeout: 4000,
        }),
      );
      return (res.data as Record<string, any>) ?? null;
    } catch {
      return null;
    }
  }

  async hydrateTeam(
    ids: string[] | null | undefined,
  ): Promise<HydratedTeamMember[]> {
    const unique = Array.from(new Set((ids ?? []).filter(Boolean)));
    if (unique.length === 0) return [];

    const profiles = await Promise.all(unique.map((id) => this.getById(id)));
    return profiles
      .map((p, idx): HydratedTeamMember | null =>
        p
          ? {
              userId: p.id ?? '',
              firstName: p.firstName ?? '',
              username: p.username ?? '',
              avatarUrl: p.avatarUrl ?? null,
              location: p.location ?? null,
              hourlyRate:
                p.rate === null || p.rate === undefined ? null : Number(p.rate),
              languages: Array.isArray(p.languages) ? p.languages : [],
              skills: Array.isArray(p.skills) ? p.skills : [],
              isLead: idx === 0,
              isOnline: false,
            }
          : null,
      )
      .filter((m): m is HydratedTeamMember => m !== null);
  }
}
