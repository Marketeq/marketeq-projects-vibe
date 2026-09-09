/**
 * Local diagnostic tool. Connects to the same RabbitMQ instance this
 * service publishes to (RABBITMQ_URL) and creates a temporary, exclusive
 * queue bound to the confirmed placeholder exchange
 * (identity-verification.events) with a wildcard binding key, then logs
 * every message it receives.
 *
 * This proves events reach the exchange this service publishes to.
 * It does NOT prove notification-service can receive them.
 *
 * Run with: npx ts-node scripts/dev-consume-events.ts
 */

import * as amqplib from 'amqplib';
import { IDENTITY_VERIFICATION_EVENT_CATALOG } from '../src/events/identity-verification-event-catalog';

const EXCHANGE_NAME = 'identity-verification.events';
const BINDING_KEY = 'identity-verification.#';

async function main(): Promise<void> {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    console.error('RABBITMQ_URL is not set. Export it before running this script (Doc 06 Step 3).');
    process.exit(1);
  }

  const connection = (await amqplib.connect(url)) as any;
  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
  const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue, EXCHANGE_NAME, BINDING_KEY);

  console.log(`Listening on exchange "${EXCHANGE_NAME}" (binding key "${BINDING_KEY}"). Ctrl+C to stop.`);
  console.log(
    'Wired event types:',
    IDENTITY_VERIFICATION_EVENT_CATALOG.filter((e) => e.wired)
      .map((e) => e.eventType)
      .join(', '),
  );

  channel.consume(queue, (msg: any) => {
    if (!msg) return;
    const event = JSON.parse(msg.content.toString());
    console.log(`\n[${new Date().toISOString()}] routingKey=${msg.fields.routingKey}`);
    console.log(JSON.stringify(event, null, 2));
    channel.ack(msg);
  });
}

main().catch((err) => {
  console.error('dev-consume-events failed:', err);
  process.exit(1);
});
