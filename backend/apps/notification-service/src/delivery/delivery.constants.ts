// The queue every producer already publishes to. Its declaration (durable, no arguments) is
// NOT changed anywhere: RabbitMQ rejects a re-declare with different arguments (406
// PRECONDITION_FAILED), so retry and dead-letter handling live in separate, new queues.
export const NOTIFICATION_QUEUE = 'notification_service_queue';

// Delay queues: no consumer; a message waits out the queue-level TTL and is then dead-lettered
// by RabbitMQ straight back into NOTIFICATION_QUEUE (default exchange, routing key = main queue).
export const RETRY_QUEUE_SHORT = `${NOTIFICATION_QUEUE}.retry.30s`;
export const RETRY_QUEUE_LONG = `${NOTIFICATION_QUEUE}.retry.5m`;
export const RETRY_DELAY_SHORT_MS = 30_000;
export const RETRY_DELAY_LONG_MS = 300_000;

// Messages that keep failing end here, with their original body, for inspection and replay.
export const DEAD_LETTER_QUEUE = `${NOTIFICATION_QUEUE}.dlq`;

// Total deliveries before a message is dead-lettered (the first try plus four retries).
export const MAX_DELIVERY_ATTEMPTS = 5;

export const ATTEMPT_HEADER = 'x-notification-attempt';
export const FAILURE_HEADER = 'x-notification-failure';
export const FAILED_AT_HEADER = 'x-notification-failed-at';

export const SEND_PATTERN = 'notification.send';
