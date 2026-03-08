import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationsClient {
  private readonly logger = new Logger(NotificationsClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('NOTIFICATIONS_URL') ?? '';
    this.apiKey = config.get<string>('NOTIFICATIONS_API_KEY') ?? '';
  }

  async sendInvitationEmail(payload: {
    to: string;
    teamName: string;
    role: string;
    acceptUrl: string;
    inviterEmail: string;
    note?: string;
  }): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/notifications/email`,
          { type: 'team_invitation', ...payload },
          { headers: { 'x-api-key': this.apiKey } },
        ),
      );
    } catch (err) {
      this.logger.error('Failed to send invitation email', err);
    }
  }
}
