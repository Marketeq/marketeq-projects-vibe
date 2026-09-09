import { VpnProxyDetectionResult } from '../../entities/enums/identity-verification.enums';

export interface DetectVpnProxyInput {
  ipAddress: string;
}

export interface VpnProxyDetectionProvider {
  detect(input: DetectVpnProxyInput): Promise<VpnProxyDetectionResult>;
}

export const VPN_PROXY_DETECTION_PROVIDER = Symbol('VPN_PROXY_DETECTION_PROVIDER');
