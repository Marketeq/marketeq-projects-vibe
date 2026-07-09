// src/main/logger.ts
// Structured logger used by the main process. Uses pino for JSON logs.
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { app: 'marketeq-time-tracker', proc: 'main' },
});

export type Logger = typeof logger;
