import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { getEffectiveClientIp } from '../utils/effective-client-ip';
import {
  VPN_PROXY_DETECTION_PROVIDER,
  VpnProxyDetectionProvider,
} from '../../providers/vpn-proxy/vpn-proxy-detection-provider.interface';
import { VpnProxyDetectionResult } from '../../entities/enums/identity-verification.enums';
import {
  ConnectionCheckUnavailableException,
  VpnProxyDetectedException,
} from '../errors/domain-exceptions';

interface AuthenticatedRequest extends Request {
  userId: string;
}

// Enforces the settled connection-check policy at every route that can
// advance location or document verification — not just the frontend's
// early gate, so a direct API call cannot bypass it. Always runs a fresh
// provider check; nothing here is ever cached, and an explicit Retry from
// the frontend is just another request that reaches this same guard fresh.
//
// Runs before the route handler's body, which is what guarantees a
// blocked request never reaches any attempt-counting or status-changing
// code — no special-case bookkeeping is needed to keep those unchanged on
// a block, it's true by construction.
@Injectable()
export class VpnProxyCheckGuard implements CanActivate {
  private readonly logger = new Logger(VpnProxyCheckGuard.name);

  constructor(
    @Inject(VPN_PROXY_DETECTION_PROVIDER)
    private readonly provider: VpnProxyDetectionProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const ipAddress = getEffectiveClientIp(request);

    let result: VpnProxyDetectionResult;
    try {
      result = await this.provider.detect({ ipAddress: ipAddress ?? '' });
    } catch (err) {
      if (err instanceof ConnectionCheckUnavailableException) throw err;
      // Any other failure from the provider is still a failed check, never
      // a clean result — fail closed, don't let an unexpected error type
      // slip through as an implicit pass.
      this.logger.error(`Unexpected VPN/proxy check failure: ${(err as Error).message}`);
      throw new ConnectionCheckUnavailableException({ reason: 'unexpected_error' });
    }

    if (result !== VpnProxyDetectionResult.NONE) {
      throw new VpnProxyDetectedException({ vpnProxyResult: result });
    }

    return true;
  }
}
