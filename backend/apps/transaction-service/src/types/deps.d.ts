declare module '@golevelup/nestjs-rabbitmq' {
  import { DynamicModule } from '@nestjs/common';
  export class RabbitMQModule {
    static forRootAsync(options: any): DynamicModule;
  }
  export function RabbitSubscribe(options: any): MethodDecorator;
  export class AmqpConnection {
    publish(exchange: string, routingKey: string, message: any, options?: any): void;
    managedConnection: any;
  }
}

declare module '@nestjs/event-emitter' {
  import { DynamicModule } from '@nestjs/common';
  export class EventEmitterModule {
    static forRoot(): DynamicModule;
  }
  export class EventEmitter2 {
    emit(event: string, ...values: any[]): boolean;
  }
}

declare module 'prom-client' {
  export type CounterConfiguration<T extends string = string> = any;
  export type HistogramConfiguration<T extends string = string> = any;
  export type GaugeConfiguration<T extends string = string> = any;
  export type LabelValues<T extends string = string> = Record<T, string | number>;
  export class Counter<T extends string = string> {
    constructor(options: any);
    inc(labels?: any, value?: number): void;
  }
  export class Histogram<T extends string = string> {
    constructor(options: any);
    observe(labels: any, value: number): void;
    startTimer(labels?: any): () => number;
  }
  export class Gauge<T extends string = string> {
    constructor(options: any);
    set(labels: any, value: number): void;
  }
  export class Registry {
    metrics(): Promise<string>;
    contentType: string;
    getSingleMetric(name: string): any;
  }
  export const register: Registry;
  export function collectDefaultMetrics(options?: any): void;
}
