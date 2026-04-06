import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom } from "rxjs";

@Injectable()
export class UserServiceClient {
  constructor(private readonly http: HttpService) {}

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
}
