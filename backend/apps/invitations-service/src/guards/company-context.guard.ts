import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserServiceClient } from '../invitations/user-service.client';

/**
 * Applied only to the new company-scoped routes (v1/companies/:companyId/invitations).
 * Legacy team-scoped routes keep GatewayAuthGuard alone so nothing already
 * working changes. Runs after GatewayAuthGuard has set req.user.
 */
@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(private readonly userService: UserServiceClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const companyId =
      (req.headers['x-company-id'] as string | undefined) ||
      (req.params?.companyId as string | undefined);
    if (!companyId) {
      throw new UnauthorizedException('Missing x-company-id header');
    }
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const isMember = await this.userService.checkCompanyMembership(companyId, userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this company');
    }

    req.companyId = companyId;
    return true;
  }
}
