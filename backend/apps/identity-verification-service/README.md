# Identity Verification Service

A microservice for identity and location verification in the Marketeq platform.

## Features

- **Location Verification**: Detect and confirm user's home country
- **Travel/Relocation Classification**: Manage temporary travel and permanent relocation status
- **Document Verification**: Submit and verify government-issued identity documents via Didit
- **Duplicate Detection**: Prevent duplicate documents across accounts
- **Travel Mode Management**: Automatic reminders for temporarily traveling users
- **Webhook Integration**: Receive verification results from Didit vendor
- **Event Publishing**: Emit verification events to RabbitMQ for notifications

## Prerequisites

- Node.js 20+
- PostgreSQL 13+
- RabbitMQ 3.10+
- npm

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Database setup**:
   ```bash
   # Copy .env.local and update DATABASE_URL
   cp .env.local.example .env.local
   
   # Run migrations
   npm run migration:run
   ```

3. **Start the service**:
   ```bash
   # Development
   npm run start:dev
   
   # Production
   npm run build
   npm start
   ```

The service runs on port 3019 by default.

## API Endpoints

### Location Verification
- `POST /identity-verification/location/confirm-home-country/:userId` - Confirm home country
- `GET /identity-verification/location/status/:userId` - Get location verification status
- `POST /identity-verification/location/update-detected/:userId` - Update detected location

### Travel Management
- `POST /identity-verification/travel/classify/:userId` - Classify travel status
- `GET /identity-verification/travel/status/:userId` - Get travel status
- `DELETE /identity-verification/travel/deactivate/:userId` - Deactivate travel mode

### Document Handling
- `POST /identity-verification/documents/submit/:userId` - Submit identity document
- `GET /identity-verification/documents/history/:userId` - Get document submission history
- `GET /identity-verification/documents/:documentId` - Get specific document

### Verification Status
- `GET /identity-verification/verification/status/:userId` - Get verification status
- `GET /identity-verification/verification/attempts/:userId` - Get verification attempts
- `POST /identity-verification/verification/initiate-session` - Initiate verification session

### Webhooks
- `POST /identity-verification/webhooks/didit` - Didit webhook receiver

### Health Check
- `GET /health` - Service health status

## Environment Variables

```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/db
RABBITMQ_URL=amqp://guest:guest@localhost:5672
DIDIT_API_KEY=your-api-key
DIDIT_WEBHOOK_SECRET=your-webhook-secret
BACKEND_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

## Database Schema

The service uses three main tables:

- **identity_verification_profiles**: User verification status and location data
- **identity_documents**: Submitted identity documents
- **verification_attempts**: Verification attempt history with retry tracking

## Vendor Integration

### Didit
- **Purpose**: Document verification, liveness, and face matching
- **Coverage**: 220+ countries, 14,000+ document types
- **Webhook**: Receives verification results via HMAC-signed webhooks

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## Monitoring

The service logs to stdout. Key events:
- Service startup/shutdown
- Profile creation
- Location verification
- Document submissions
- Verification attempts
- Webhook processing
- RabbitMQ event publishing

## Architecture

- **Controllers**: HTTP endpoints for all features
- **Services**: Business logic layer
- **Entities**: TypeORM database models
- **DTOs**: Request/response validation
- **Event Publisher**: RabbitMQ integration

## Integration Points

- **API Gateway**: Reverse proxy and load balancer
- **Auth Service**: User authentication and JWT validation
- **User Service**: User profile and location data
- **Notifications Service**: Event consumption and notification delivery
- **Didit**: Third-party document verification vendor

## Notes

- Minimum age requirement: 18 years
- Verification attempts: 3 per document
- Travel mode reminders: Daily + login + country change
- Account deletion: Cascades to documents and attempts
- Duplicate detection: Prevents same document across accounts

## Support

For issues or questions, refer to the documentation in `/docs/md/identity-verification-service/`
