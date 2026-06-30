import {
    Controller, Get, Res, Inject, Optional,
    ServiceUnavailableException,
  } from '@nestjs/common';
  import { InjectDataSource } from '@nestjs/typeorm';
  import { DataSource } from 'typeorm';
  import { Redis } from 'ioredis';
  import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
  import * as prom from 'prom-client';
  import { Response } from 'express';

  import { REDIS_CLIENT } from '../constants';

  @Controller()
  export class HealthController {
    private readonly startTime = Date.now();

    constructor(
      @InjectDataSource()   private readonly dataSource: DataSource,
      @Inject(REDIS_CLIENT) @Optional() private readonly redis: Redis | null,
      @Optional() private readonly amqp: AmqpConnection | null,
    ) {}
  
    @Get('health')
    liveness() {
      return {
        status: 'ok',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
      };
    }
  
    @Get('ready')
    async readiness() {
      const checks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkRabbitMQ(),
      ]);
  
      const results = {
        database: checks[0].status === 'fulfilled'
          ? checks[0].value
          : { ok: false, error: String((checks[0] as PromiseRejectedResult).reason) },
        redis: checks[1].status === 'fulfilled'
          ? checks[1].value
          : { ok: false, error: String((checks[1] as PromiseRejectedResult).reason) },
        rabbitmq: checks[2].status === 'fulfilled'
          ? checks[2].value
          : { ok: false, error: String((checks[2] as PromiseRejectedResult).reason) },
      };
  
      const allOk = Object.values(results).every(r => r.ok);
  
      if (!allOk) {
        throw new ServiceUnavailableException({ status: 'degraded', checks: results });
      }
  
      return { status: 'ready', checks: results };
    }
  
    @Get('metrics')
    async metrics(@Res() res: Response): Promise<void> {
      res.set('Content-Type', prom.register.contentType);
      res.end(await prom.register.metrics());
    }
  
    private async checkDatabase(): Promise<{ ok: boolean; latencyMs?: number }> {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      return { ok: true, latencyMs: Date.now() - start };
    }
  
    private async checkRedis(): Promise<{ ok: boolean; latencyMs?: number }> {
      if (!this.redis) return { ok: true };
      const start = Date.now();
      await this.redis.ping();
      return { ok: true, latencyMs: Date.now() - start };
    }

    private async checkRabbitMQ(): Promise<{ ok: boolean }> {
      if (!this.amqp) return { ok: true };
      const connected = this.amqp.managedConnection.isConnected();
      if (!connected) throw new Error('RabbitMQ channel not connected');
      return { ok: true };
    }
  }