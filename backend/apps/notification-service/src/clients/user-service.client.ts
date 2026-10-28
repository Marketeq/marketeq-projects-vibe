// apps/notification-service/src/clients/user-service.client.ts
// BTB-364/D4 follow-up (F2): notification-service has no existing user-data
// lookup anywhere (confirmed — zero HttpService/ClientProxy usage in this
// service outside Brevo's own external API client) because every OTHER
// notification gets its sender's display data because the PRODUCER already
// resolved it and put it straight on the event payload (e.g. invitations-
// service's own user-service.client.ts resolves `inviterName` before
// emitting `notification.email.team_invitation`). offer.created's payload
// only ever carries `clientId` — a bare id — so this is genuinely new, not
// something to "reuse." Modeled on that exact same precedent (contracts-
// service's and invitations-service's own `user-service.client.ts`, each a
// small, single-purpose file owned by its own service, not a shared lib):
// same `GET /internal/users/:id/summary` endpoint, same `x-internal-token`
// header, same `USER_SERVICE_URL` env var.
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface InternalUserSummary {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
}

@Injectable()
export class UserServiceClient {
  constructor(private readonly http: HttpService) {}

  private get baseUrl(): string {
    return (process.env.USER_SERVICE_URL || 'http://localhost:3002').replace(/\/+$/, '');
  }

  async getUserSummary(userId: string): Promise<InternalUserSummary> {
    const url = `${this.baseUrl}/internal/users/${userId}/summary`;
    const response = await lastValueFrom(
      this.http.get<InternalUserSummary>(url, {
        headers: { 'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || '' },
        timeout: 3000,
      }),
    );
    return response.data;
  }
}
