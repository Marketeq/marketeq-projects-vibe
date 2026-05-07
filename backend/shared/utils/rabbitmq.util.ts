import net from 'net';

const DEFAULT_RABBITMQ_PORT = 5672;
const DEFAULT_TIMEOUT_MS = 1200;

export function getRabbitMqUrl(): string {
  return process.env.RABBITMQ_URI || process.env.RABBITMQ_URL || 'amqp://localhost:5672';
}

export function shouldRequireRabbitMq(): boolean {
  const rawRequired = String(process.env.RABBITMQ_REQUIRED ?? '').toLowerCase();

  if (rawRequired === 'true') {
    return true;
  }

  if (rawRequired === 'false') {
    return false;
  }

  return process.env.NODE_ENV === 'production';
}

export async function isRabbitMqReachable(urlString: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<boolean> {
  try {
    const url = new URL(urlString);
    const host = url.hostname || 'localhost';
    const port = Number(url.port || DEFAULT_RABBITMQ_PORT);

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });

      const finish = (result: boolean) => {
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => finish(true));
      socket.once('timeout', () => finish(false));
      socket.once('error', () => finish(false));
    });
  } catch {
    return false;
  }
}
