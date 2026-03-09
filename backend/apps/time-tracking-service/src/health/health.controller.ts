import { Controller, Get, HttpException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  root() {
    return { status: 'ok' };
  }

  @Get('db')
  async db() {
    try {
      const ds: any = this.dataSource as any;
      if (typeof ds.query === 'function') {
        await ds.query('SELECT 1');
      } else if (typeof ds.manager?.query === 'function') {
        await ds.manager.query('SELECT 1');
      } else {
        throw new Error('No query method available on DataSource');
      }
      return { status: 'ok' };
    } catch (err: any) {
      throw new HttpException(
        { status: 'error', reason: err?.message ?? 'db check failed' },
        503,
      );
    }
  }
}
