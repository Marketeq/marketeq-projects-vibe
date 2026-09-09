import { Injectable } from '@nestjs/common';
import { VpnProxyDetectionResult } from '../../entities/enums/identity-verification.enums';
import {
  DetectVpnProxyInput,
  VpnProxyDetectionProvider,
} from './vpn-proxy-detection-provider.interface';

@Injectable()
export class UnimplementedVpnProxyDetectionProvider implements VpnProxyDetectionProvider {
  async detect(_input: DetectVpnProxyInput): Promise<VpnProxyDetectionResult> {
    return VpnProxyDetectionResult.NONE;
  }
}
