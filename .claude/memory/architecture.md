# Architecture & Setup

## Stack
- Backend: NestJS monorepo (apps at /backend/apps/)
- Frontend: Next.js (/frontend/)
- Database: PostgreSQL (via TypeORM)
- Message broker: RabbitMQ (inter-service communication)
- Real-time: Ably (messaging, notifications)
- Email: SendGrid
- Payments: Stripe
- Search: Algolia
- CMS: Strapi (talent profiles)
- Deployment: Render (backend), Vercel (frontend)

## Monorepo Layout
```
marketeq-projects-vibe/
├── backend/
│   ├── apps/            # One folder per microservice
│   ├── shared/          # Shared DTOs, guards, utilities
│   ├── nest-cli.json
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/             # Next.js app router
│   ├── components/
│   ├── utils/
│   ├── types/
│   └── public/mock/     # Mock data files
├── docs/
│   └── Technical Documentation/  # .docx spec files by service
└── .claude/
    └── memory/          # This memory system
```

## Each Microservice Structure
```
apps/<service-name>/
├── src/
│   ├── main.ts
│   ├── <service>.module.ts
│   ├── <service>.controller.ts
│   ├── <service>.service.ts
│   └── <feature>/       # Feature-specific subdirectories
├── package.json
└── tsconfig.app.json
```

## Inter-Service Communication Pattern
- RabbitMQ used for async events between services
- API Gateway routes HTTP → microservices via RabbitMQ
- Pattern: ClientProxy.send() for request-response, emit() for events

## Auth
- JWT tokens issued by auth-service
- Guards in shared/ used by all services

## Environment Variables Convention
- Each service has its own .env (not committed)
- Key vars: DATABASE_URL, RABBITMQ_URL, JWT_SECRET, etc.

## Documentation Source
- All service specs are in /docs/Technical Documentation/<Service Name>/
- Files are .docx — read them to understand what each service should implement
