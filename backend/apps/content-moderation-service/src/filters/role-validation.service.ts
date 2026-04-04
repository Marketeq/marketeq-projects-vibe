import { Injectable } from '@nestjs/common';

@Injectable()
export class RoleValidationService {
  private validRoles = ['developer', 'designer', 'project manager', 'qa', 'analyst'];

  async check(role: string): Promise<boolean> {
    return this.validRoles.includes(role.toLowerCase());
  }
}
