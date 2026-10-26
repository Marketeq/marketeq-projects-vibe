import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { FreeKycService } from '../services/free-kyc.service';
import {
  HomeCountryUpdatedNotificationPublisher,
  NOTIFICATIONS_CLIENT,
  NOTIFICATION_SERVICE_QUEUE,
} from './home-country-updated-notification.publisher';

// PMCM-650: the notification is wired the way the repo's other publishers are: one more
// fire-and-forget client on notification-service's own durable queue, no new exchange,
// queue or binding, and an optional dependency so it can never break an approval.
describe('home-country-updated notification wiring', () => {
  const appModule = readFileSync(join(__dirname, '..', 'app.module.ts'), 'utf8');

  it('the app module registers the client on notification-service\'s own durable queue, with the same broker variables as the other clients', () => {
    const start = appModule.indexOf('name: NOTIFICATIONS_CLIENT');
    expect(start).toBeGreaterThan(-1);
    const entry = appModule.slice(start, appModule.indexOf('},\n      },', start));
    expect(entry).toContain('transport: Transport.RMQ');
    expect(entry).toContain('queue: NOTIFICATION_SERVICE_QUEUE');
    expect(entry).toContain('queueOptions: { durable: true }');
    expect(entry).toContain("process.env.RABBITMQ_URI || process.env.RABBITMQ_URL || 'amqp://localhost:5672'");
    expect(NOTIFICATION_SERVICE_QUEUE).toBe('notification_service_queue');
  });

  it('the publisher is a provider of the app module, next to the existing event publisher', () => {
    expect(appModule).toMatch(/provide: NOTIFICATION_EVENT_PUBLISHER, useClass: RabbitMqNotificationEventPublisher \},\s+HomeCountryUpdatedNotificationPublisher,/);
  });

  it('adds no exchange, queue or binding: the publisher only emits to the client', () => {
    const publisherSource = readFileSync(join(__dirname, 'home-country-updated-notification.publisher.ts'), 'utf8');
    expect(publisherSource).not.toMatch(/assertExchange|assertQueue|bindQueue|amqplib/);
  });

  it('the publisher is built by Nest from the registered client token', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const moduleRef = await Test.createTestingModule({
      providers: [HomeCountryUpdatedNotificationPublisher, { provide: NOTIFICATIONS_CLIENT, useValue: { emit } }],
    }).compile();

    const publisher = moduleRef.get(HomeCountryUpdatedNotificationPublisher);
    await expect(publisher.homeCountryUpdated({ userId: 'u1', hostedKycSessionId: 'row-1' })).resolves.toBe(true);
    expect(emit).toHaveBeenCalledWith('notification.send', expect.objectContaining({ recipientId: 'u1' }));
  });

  describe('FreeKycService receives it as the LAST, optional constructor dependency', () => {
    const paramTypes: unknown[] = Reflect.getMetadata('design:paramtypes', FreeKycService);
    const optional: number[] = Reflect.getMetadata('optional:paramtypes', FreeKycService) ?? [];

    it('it is the second-to-last parameter and an optional one, so no earlier position moved', () => {
      // PMCM-651 appended the status-alert publisher after it; both stay optional.
      expect(paramTypes[paramTypes.length - 2]).toBe(HomeCountryUpdatedNotificationPublisher);
      expect(optional).toContain(paramTypes.length - 2);
      expect(optional).toContain(paramTypes.length - 1);
      // `events` stays right before it, still optional.
      expect(optional).toContain(paramTypes.length - 3);
    });

    it('the nine earlier positions are exactly as they were', () => {
      expect(paramTypes).toHaveLength(11);
    });
  });
});
