# Identity Verification Service - Logging Conventions

## Overview
This service uses NestJS's built-in Logger for all logging. All log messages are output to stdout and stderr, following the platform standard.

## PII & Sensitive Data

**Never log these values directly:**
- Document images or image references (`documentImageReference`)
- Didit API credentials (`DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`)
- Cloudflare R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
- Database connection strings (`DATABASE_URL`)
- RabbitMQ connection strings (`RABBITMQ_URL`)
- JWT tokens or bearer tokens
- User authentication headers

## Log Levels
- **ERROR**: Service failures, exceptions, vendor errors
- **WARN**: Retry attempts, degraded conditions
- **LOG**: Significant business events (verification submitted, travel mode activated)
- **DEBUG**: Entry/exit of major operations (development only)

## Request Identification
All responses include an `X-Request-Id` header for log correlation. This header:
- Is read from the request if present
- Is generated as UUID if not present
- Is echoed in all response headers
- Should be included in structured logs when available

## Example Logging
```typescript
this.logger.log(`Travel Mode reminder sweep: ${dueProfiles.length} profile(s) due.`);
this.logger.error(`Failed to publish ${event.eventType}: ${(err as Error).message}`);
```
