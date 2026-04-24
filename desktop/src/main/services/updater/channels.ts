// src/main/services/updater/channels.ts
// Release channel definitions per doc 30 §1.2.

export type ReleaseChannel = 'stable' | 'beta' | 'alpha';

export interface ChannelConfig {
  name: ReleaseChannel;
  label: string;
  description: string;
  allowPrerelease: boolean;
  autoDownload: boolean;
  checkIntervalMs: number;
  forceUpdateAfterDays: number | null;
}

export const RELEASE_CHANNELS: Record<ReleaseChannel, ChannelConfig> = {
  stable: {
    name: 'stable',
    label: 'Stable',
    description: 'Stable releases tested in beta',
    allowPrerelease: false,
    autoDownload: true,
    checkIntervalMs: 24 * 60 * 60 * 1000, // 24h
    forceUpdateAfterDays: 30,
  },
  beta: {
    name: 'beta',
    label: 'Beta',
    description: 'Beta releases with new features',
    allowPrerelease: true,
    autoDownload: true,
    checkIntervalMs: 6 * 60 * 60 * 1000, // 6h
    forceUpdateAfterDays: 14,
  },
  alpha: {
    name: 'alpha',
    label: 'Alpha (Development)',
    description: 'Bleeding-edge alpha builds',
    allowPrerelease: true,
    autoDownload: true,
    checkIntervalMs: 4 * 60 * 60 * 1000, // 4h
    forceUpdateAfterDays: 7,
  },
};

export function isValidChannel(value: unknown): value is ReleaseChannel {
  return value === 'stable' || value === 'beta' || value === 'alpha';
}

export function getChannelConfig(channel: ReleaseChannel): ChannelConfig {
  return RELEASE_CHANNELS[channel];
}
