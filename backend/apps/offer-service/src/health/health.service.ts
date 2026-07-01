// apps/offer-service/src/health/health.service.ts
// OS-35: Four dependency checks for readiness probe.
// DB, RabbitMQ, Redis = critical (503). Ably = non-critical (degraded).
import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RabbitMQPublisher } from '../messaging/rabbitmq.publisher';
import { AblyService } from '../realtime/ably.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

export interface DependencyChecks {
  db: 'connected' | 'disconnected';
  rabbitmq: 'connected' | 'disconnected';
  ably: 'connected' | 'degraded';
  redis: 'connected' | 'disconnected';
}

export interface ReadinessStatus {
  status: 'ok' | 'degraded' | 'error';
  uptime: number;
  timestamp: string;
  version: string;
  checks: DependencyChecks;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly version = process.env.APP_VERSION ?? 'dev';

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly publisher: RabbitMQPublisher,
    private readonly ably: AblyService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  isAlive(): true { return true; }

  async getReadinessStatus(): Promise<ReadinessStatus> {
    const [dbOk, rmqOk, ablyOk, redisOk] = await Promise.allSettled([
      this.checkDb(),
      Promise.resolve(this.checkRabbitMQ()),
      this.checkAbly(),
      this.checkRedis(),
    ]).then((results) =>
      results.map((r) => (r.status === 'fulfilled' ? r.value : false)),
    );

    const criticalOk = dbOk && rmqOk && redisOk;
    const status: ReadinessStatus['status'] = !criticalOk
      ? 'error'
      : !ablyOk
        ? 'degraded'
        : 'ok';

    return {
      status,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: this.version,
      checks: {
        db: dbOk ? 'connected' : 'disconnected',
        rabbitmq: rmqOk ? 'connected' : 'disconnected',
        ably: ablyOk ? 'connected' : 'degraded',
        redis: redisOk ? 'connected' : 'disconnected',
      },
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.ds.query('SELECT 1');
      return true;
    } catch (err) {
      this.logger.error('DB health check failed', (err as Error).message);
      return false;
    }
  }

  private checkRabbitMQ(): boolean {
    return this.publisher.isReady();
  }

  private async checkAbly(): Promise<boolean> {
    try {
      return await this.ably.isReady();
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}