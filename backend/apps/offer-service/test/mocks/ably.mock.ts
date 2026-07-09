// apps/offer-service/test/mocks/ably.mock.ts
// OS-31: Mock AblyService for unit tests.
import { AblyService } from '../../src/realtime/ably.service';

export function createMockAblyService(): jest.Mocked<Pick<AblyService, 'publish' | 'createToken' | 'isReady' | 'isEnabled'>> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    createToken: jest.fn().mockResolvedValue({
      token: 'mock-token',
      expires: Date.now() + 3600000,
      issued: Date.now(),
      capability: '{}',
    }),
    isReady: jest.fn().mockResolvedValue(true),
    isEnabled: jest.fn().mockReturnValue(false),
  };
}