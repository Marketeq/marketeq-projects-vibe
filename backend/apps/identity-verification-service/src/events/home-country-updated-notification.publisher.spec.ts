import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Observable, of, throwError } from 'rxjs';
import {
  HOME_COUNTRY_UPDATED_NOTIFICATION_BODY,
  HOME_COUNTRY_UPDATED_NOTIFICATION_EVENT,
  HOME_COUNTRY_UPDATED_NOTIFICATION_LINK,
  HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE,
  HomeCountryUpdatedNotificationPublisher,
  NOTIFICATION_SEND_PATTERN,
  NOTIFICATION_SERVICE_QUEUE,
  homeCountryUpdatedIdempotencyKey,
} from './home-country-updated-notification.publisher';

// PMCM-650: the in-app notification handed to notification-service once an approved
// home-country change has been promoted. It rides the existing `notification.send`
// contract on notification-service's own queue, so its retries, backoff and
// dead-letter queue apply unchanged.
describe('HomeCountryUpdatedNotificationPublisher', () => {
  const USER = 'user-1';
  const SESSION_ROW = '7d9f6f1e-3c1d-4d46-9b5e-0b1b2c3d4e5f';

  const build = (emit: jest.Mock) => {
    const publisher = new HomeCountryUpdatedNotificationPublisher({ emit } as any);
    const warn = jest.spyOn((publisher as any).logger, 'warn').mockImplementation(() => undefined);
    return { publisher, warn };
  };

  afterEach(() => jest.useRealTimers());

  describe('the message', () => {
    it('is a notification.send for the right user, in-app only, with the approved copy and a deterministic key', async () => {
      const emit = jest.fn().mockReturnValue(of(undefined));
      const { publisher } = build(emit);

      await expect(publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW })).resolves.toBe(true);

      expect(emit).toHaveBeenCalledTimes(1);
      const [pattern, payload] = emit.mock.calls[0];
      expect(pattern).toBe(NOTIFICATION_SEND_PATTERN);
      expect(pattern).toBe('notification.send');
      expect(payload).toEqual({
        recipientId: USER,
        category: 'account',
        event: 'identity.home_country_updated',
        title: 'Your home country was updated.',
        body: 'You can continue using the platform while away from your home country.',
        link: '/talent-dashboard',
        metadata: { hostedKycSessionId: SESSION_ROW },
        delivery: { inApp: true, email: false, sms: false },
        origin: 'identity-verification-service',
        idempotencyKey: `identity.home_country_updated:${SESSION_ROW}`,
      });
    });

    it('the copy is exactly the Figma notification (13101-47577)', () => {
      expect(HOME_COUNTRY_UPDATED_NOTIFICATION_TITLE).toBe('Your home country was updated.');
      expect(HOME_COUNTRY_UPDATED_NOTIFICATION_BODY).toBe('You can continue using the platform while away from your home country.');
      expect(HOME_COUNTRY_UPDATED_NOTIFICATION_LINK).toBe('/talent-dashboard');
      expect(HOME_COUNTRY_UPDATED_NOTIFICATION_EVENT).toBe('identity.home_country_updated');
    });

    it('email and SMS are explicitly disabled, and in-app is explicitly enabled', async () => {
      const emit = jest.fn().mockReturnValue(of(undefined));
      await build(emit).publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      expect(emit.mock.calls[0][1].delivery).toEqual({ inApp: true, email: false, sms: false });
      expect(emit.mock.calls[0][1]).not.toHaveProperty('recipientEmail');
    });

    it('carries no country, no profile id and no document or vendor data', async () => {
      const emit = jest.fn().mockReturnValue(of(undefined));
      await build(emit).publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      const serialized = JSON.stringify(emit.mock.calls[0][1]);
      expect(serialized).not.toMatch(/country":"|profileId|vendor|didit|document/i);
      expect(Object.keys(emit.mock.calls[0][1].metadata)).toEqual(['hostedKycSessionId']);
    });
  });

  describe('the idempotency key', () => {
    it('is deterministic for a session row, and different for another', () => {
      expect(homeCountryUpdatedIdempotencyKey(SESSION_ROW)).toBe(homeCountryUpdatedIdempotencyKey(SESSION_ROW));
      expect(homeCountryUpdatedIdempotencyKey(SESSION_ROW)).not.toBe(homeCountryUpdatedIdempotencyKey('another-row'));
      expect(homeCountryUpdatedIdempotencyKey(SESSION_ROW)).toBe(`identity.home_country_updated:${SESSION_ROW}`);
    });

    it('sending the same promotion twice produces the identical key (so notification-service drops the repeat)', async () => {
      const emit = jest.fn().mockReturnValue(of(undefined));
      const { publisher } = build(emit);
      await publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      await publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      expect(emit.mock.calls[0][1].idempotencyKey).toBe(emit.mock.calls[1][1].idempotencyKey);
    });
  });

  describe('a delivery problem never throws', () => {
    it('a broker error resolves false and logs fixed text only', async () => {
      const emit = jest.fn().mockReturnValue(throwError(() => new Error(`amqp down for ${USER} ${SESSION_ROW}`)));
      const { publisher, warn } = build(emit);

      await expect(publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW })).resolves.toBe(false);

      expect(warn).toHaveBeenCalledTimes(1);
      const logged = String(warn.mock.calls[0][0]);
      expect(logged).not.toContain(USER);
      expect(logged).not.toContain(SESSION_ROW);
      expect(logged).not.toContain('amqp down');
    });

    it('a synchronous failure while emitting also resolves false', async () => {
      const emit = jest.fn().mockImplementation(() => {
        throw new Error('no channel');
      });
      await expect(build(emit).publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW })).resolves.toBe(false);
    });

    it('a broker that never answers gives up after 5 seconds and resolves false', async () => {
      jest.useFakeTimers();
      const emit = jest.fn().mockReturnValue(new Observable(() => undefined));
      const { publisher } = build(emit);

      const result = publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      jest.advanceTimersByTime(4999);
      let settled = false;
      void result.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      jest.advanceTimersByTime(1);
      await expect(result).resolves.toBe(false);
    });
  });

  describe('the contract with notification-service (read from its source)', () => {
    const root = join(__dirname, '..', '..', '..');
    const notificationService = readFileSync(join(root, 'notification-service', 'src', 'services', 'notification.service.ts'), 'utf8');
    const constants = readFileSync(join(root, 'notification-service', 'src', 'delivery', 'delivery.constants.ts'), 'utf8');

    it('publishes to the queue notification-service consumes, with the pattern it handles', () => {
      expect(constants).toContain(`export const NOTIFICATION_QUEUE = '${NOTIFICATION_SERVICE_QUEUE}';`);
      expect(constants).toContain(`export const SEND_PATTERN = '${NOTIFICATION_SEND_PATTERN}';`);
    });

    it('every field it sends is a field of notification-service\'s NotificationPayload', async () => {
      const start = notificationService.indexOf('export interface NotificationPayload {');
      const block = notificationService.slice(start, notificationService.indexOf('\n}\n', start));
      const declared = new Set([...block.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1]));
      const emit = jest.fn().mockReturnValue(of(undefined));
      await build(emit).publisher.homeCountryUpdated({ userId: USER, hostedKycSessionId: SESSION_ROW });
      for (const key of Object.keys(emit.mock.calls[0][1])) {
        expect(declared.has(key)).toBe(true);
      }
      // and the fields it must supply are declared there
      for (const required of ['recipientId', 'category', 'event', 'title', 'body']) {
        expect(declared.has(required)).toBe(true);
      }
    });

    it('"account" is a category alias the catalog resolves (so recipient category preferences apply)', () => {
      const catalog = readFileSync(join(root, 'notification-service', 'src', 'constants', 'notification-catalog.ts'), 'utf8');
      expect(catalog).toMatch(/account:\s*'general'/);
    });
  });
});
