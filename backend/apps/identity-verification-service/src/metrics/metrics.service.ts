import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private counters = new Map<string, number>();

  increment(name: string, value: number = 1): void {
    this.counters.set(name, (this.counters.get(name) || 0) + value);
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.counters);
  }
}
