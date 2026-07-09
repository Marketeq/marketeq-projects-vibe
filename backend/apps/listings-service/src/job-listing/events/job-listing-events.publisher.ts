import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class JobListingEventsPublisher {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  emit(routingKey: string, payload: Record<string, unknown>): void {
    this.client.emit(routingKey, {
      ...payload,
      emittedAt: new Date().toISOString(),
    });
  }
}
