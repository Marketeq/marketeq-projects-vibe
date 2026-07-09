declare module '@huggingface/inference' {
  export class HfInference {
    constructor(token?: string);
    featureExtraction(params: { model: string; inputs: string | string[] }): Promise<number[] | number[][]>;
  }
}

declare module '@nestjs/throttler' {
  import { CanActivate } from '@nestjs/common';
  import { DynamicModule } from '@nestjs/common';
  export class ThrottlerModule {
    static forRoot(options?: any): DynamicModule;
    static forRootAsync(options?: any): DynamicModule;
  }
  export class ThrottlerGuard implements CanActivate {
    canActivate(context: any): boolean;
  }
  export function Throttle(options: any): MethodDecorator & ClassDecorator;
  export function SkipThrottle(): MethodDecorator & ClassDecorator;
}

declare module 'cache-manager-redis-store' {
  export function redisStore(options?: any): any;
}

declare module '@libs/owner-target-grpc' {
  export function resolveOwnerTargetProtoPath(): string;
}
