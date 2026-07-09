// apps/offer-service/test/mocks/outbox.mock.ts
// OS-31: Mock OutboxService for unit tests.
// Our OutboxService uses write(), not create().
import { OutboxService } from '../../src/outbox/outbox.service';

export function createMockOutboxService(): jest.Mocked<Pick<OutboxService, 'write'>> {
  return {
    write: jest.fn().mockResolvedValue(undefined),
  };
}