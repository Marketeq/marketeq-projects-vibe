// apps/offer-service/src/redis/redis.constants.ts
// OS-14: Injection token for the shared ioredis client.
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');