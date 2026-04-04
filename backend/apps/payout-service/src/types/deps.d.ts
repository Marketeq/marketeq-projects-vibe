declare module '@nestjs/bull' {
  import { DynamicModule, Type } from '@nestjs/common';

  export interface BullModuleOptions {
    url?: string;
    redis?: any;
    [key: string]: any;
  }

  export interface BullModuleAsyncOptions {
    imports?: any[];
    inject?: any[];
    useFactory?: (...args: any[]) => BullModuleOptions | Promise<BullModuleOptions>;
    useClass?: Type<any>;
    useExisting?: Type<any>;
  }

  export class BullModule {
    static forRoot(options?: BullModuleOptions): DynamicModule;
    static forRootAsync(options?: BullModuleAsyncOptions): DynamicModule;
    static registerQueue(...options: Array<{ name: string; [key: string]: any }>): DynamicModule;
  }

  export function InjectQueue(name: string): ParameterDecorator;
  export function Process(name?: string): MethodDecorator;
  export function Processor(options?: { name: string }): ClassDecorator;
}

declare module 'bull' {
  interface Job<T = any> {
    id: string | number;
    data: T;
    done(): Promise<void>;
    progress(value: number): Promise<void>;
  }

  interface Queue<T = any> {
    add(data: T, opts?: any): Promise<Job<T>>;
    add(name: string, data: T, opts?: any): Promise<Job<T>>;
    process(callback: (job: Job<T>) => Promise<any>): void;
    process(name: string, callback: (job: Job<T>) => Promise<any>): void;
  }

  export { Job, Queue };
  export default Queue;
}
