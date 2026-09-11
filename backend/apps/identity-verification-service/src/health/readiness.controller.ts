import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ServiceUnavailableException } from '@nestjs/common';

@Controller('ready')
export class ReadinessController {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  @Get()
  async getReadiness(): Promise<{ status: string }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
