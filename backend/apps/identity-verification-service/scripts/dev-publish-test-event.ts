/**
 * Local diagnostic tool — see the note on dev-consume-events.ts above
 * for why this lives outside src/.
 *
 * Publishes one synthetic event through the actual
 * RabbitMqNotificationEventPublisher, unmodified, bypassing HTTP entirely.
 * Both BearerAuthGuard and InternalServiceGuard unconditionally reject
 * every request today (Doc 04 Step 6), which would make an HTTP-triggered
 * verification step impossible to run — this script exists so verification
 * can still prove the publisher works.
 *
 * Run with: npx ts-node scripts/dev-publish-test-event.ts
 */

import { RabbitMqNotificationEventPublisher } from '../src/events/rabbitmq-notification-event-publisher';
import { IdentityVerificationEventType } from '../src/events/identity-verification-event.types';

async function main(): Promise<void> {
  if (!process.env.RABBITMQ_URL) {
    console.error('RABBITMQ_URL is not set. Export it before running this script (Doc 06 Step 3).');
    process.exit(1);
  }

  const publisher = new RabbitMqNotificationEventPublisher();
  await publisher.publish({
    eventType: IdentityVerificationEventType.IDENTITY_VERIFIED,
    profileId: 'test-profile-id',
    userId: 'test-user-id',
    occurredAt: new Date().toISOString(),
    data: { note: 'Synthetic event from dev-publish-test-event.ts — not a real verification.' },
  });

  console.log('Published one synthetic identity_verified event. Check dev-consume-events.ts terminal.');
  await publisher.onModuleDestroy();
}

main().catch((err) => {
  console.error('dev-publish-test-event failed:', err);
  process.exit(1);
});
