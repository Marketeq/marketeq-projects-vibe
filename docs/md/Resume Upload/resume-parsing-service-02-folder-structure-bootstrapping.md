# 02 — `resume-parsing-service` Folder Structure & Bootstrapping

> **Updated 22 July 2026.** Gap resolutions applied.
>
> - Config schema gains the two length variables, plus a cross-field check that `HARD_REJECT_CHARS` exceeds `MAX_EXTRACTED_CHARS` — otherwise the truncate-and-flag path is silently unreachable.


**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer building this service. Assumes no prior familiarity with it.
**Prerequisites:** Doc 00 — Service Overview · Doc 01 — Docker & Runtime Setup.

---

## 1. What this document gets you

A complete, running NestJS skeleton with:

- the full source tree created and explained,
- TypeScript and Nest build configuration,
- configuration loaded, typed, and **validated at boot**,
- structured logging wired up,
- health endpoints serving,
- graceful shutdown working,
- a module graph you can extend without guessing where things go.

At the end, `npm run start:dev` serves `/health/live` and `/health/ready`. There is no `/v1/parse` yet — that arrives in Doc 04.

**Why build the skeleton before the feature.** Configuration validation, logging discipline and shutdown behaviour are painful to retrofit and easy to establish first. Every later document plugs into what you build here.

---

## 2. The organising principle

The tree below follows one rule:

> **Group by responsibility, not by technical type.**

A `dto/` folder at the root holding every DTO in the service looks tidy and is miserable to work in — changing one feature means touching five scattered folders. Instead, everything belonging to parsing lives under `src/parsing/`, and only genuinely cross-cutting code lives in `src/common/`.

**The test for `src/common/`:** would at least two unrelated features use this? If not, it belongs with its feature. A single-use helper in `common/` is a file nobody can safely delete later, because its blast radius is unclear.

---

## 3. The full tree

```
apps/resume-parsing-service/
├── src/
│   ├── main.ts                          ← process entry point
│   ├── app.module.ts                    ← root module, wires everything
│   │
│   ├── config/                          ← configuration, typed and validated
│   │   ├── config.schema.ts             ← Zod schema + boot-time validation
│   │   └── typed-config.service.ts      ← typed accessor, injected everywhere
│   │
│   ├── common/                          ← cross-cutting only
│   │   ├── errors/                      ← (Doc 04)
│   │   ├── guards/                      ← (Doc 04)
│   │   ├── interceptors/                ← (Doc 04)
│   │   └── validation/                  ← (Doc 04)
│   │
│   ├── parsing/                         ← the feature
│   │   ├── parsing.module.ts
│   │   ├── parsing.controller.ts        ← (Doc 04)
│   │   ├── parsing.service.ts           ← (Doc 04)
│   │   ├── extraction.port.ts           ← (Doc 04)
│   │   ├── extraction.stub.ts           ← (Doc 04)
│   │   ├── dto/                         ← (Doc 03)
│   │   └── llm/                         ← (Doc 05)
│   │
│   └── health/                          ← liveness and readiness
│       ├── health.module.ts
│       └── health.controller.ts
│
├── test/
│   ├── setup.ts                         ← test environment variables
│   └── fixtures/                        ← (Doc 07)
│
├── .env
├── .env.example
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── nest-cli.json
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── vitest.config.ts
```

### 3.1 What each folder is for

| Folder | Holds | Rule |
|---|---|---|
| `config/` | Schema, validation, typed accessor | **Nothing outside this folder reads `process.env`** |
| `common/errors/` | Exception types, error codes, the global filter | Codes are a published contract — changing one is a breaking change |
| `common/guards/` | Service-to-service authentication | No user-level authorisation exists here |
| `common/interceptors/` | Correlation IDs, request deadline | Anything that wraps every request |
| `common/validation/` | File signature and size checks | Reusable across future endpoints |
| `parsing/` | Everything about turning a document into JSON | The feature. Most work happens here |
| `parsing/dto/` | Request and response shapes, runtime schema | Doc 03 |
| `parsing/llm/` | Model client and prompt | Doc 05. **Isolated so the model can be swapped as configuration** |
| `health/` | Liveness and readiness | Deliberately outside `parsing/` — it must work even if parsing is broken |

### 3.2 Create it

```bash
# from the monorepo root
cd apps
nest new resume-parsing-service --package-manager npm --skip-git
cd resume-parsing-service

# remove the scaffold's placeholder feature
rm -f src/app.controller.ts src/app.controller.spec.ts src/app.service.ts

# create the tree
mkdir -p src/config \
         src/common/errors src/common/guards src/common/interceptors src/common/validation \
         src/parsing/dto src/parsing/llm \
         src/health \
         test/fixtures
```

### 3.3 Install dependencies

```bash
# from apps/resume-parsing-service
npm install @nestjs/config @nestjs/terminus @nestjs/platform-fastify \
            @fastify/multipart fastify zod \
            nestjs-pino pino pino-http pino-pretty file-type

npm install -D vitest @vitest/coverage-v8 @types/node
```

| Package | Why it is here |
|---|---|
| `@nestjs/platform-fastify` | Fastify instead of Express. Measurably faster on file uploads, which is our entire traffic profile |
| `@fastify/multipart` | Streams uploads with a hard byte ceiling, so an oversized file is cut off mid-stream rather than buffered into memory first |
| `zod` | Validates configuration at boot and model output at runtime. One validation library, two jobs |
| `nestjs-pino` | Structured JSON logs with per-request context |
| `file-type` | Reads magic bytes to detect the real format. Used in Doc 04 |
| `@nestjs/terminus` | Health indicators your orchestrator consumes |

---

## 4. Build configuration

### 4.1 `apps/resume-parsing-service/tsconfig.json`

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",

    "declaration": true,
    "removeComments": false,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,

    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "test/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Three settings are non-negotiable and worth understanding:

| Setting | Why it matters here |
|---|---|
| `strict: true` | Model output is unpredictable. Strict null checking is what forces you to handle the absent field rather than discovering it in production |
| `noUncheckedIndexedAccess` | Makes `array[0]` typed as possibly `undefined`. **We read `job_titles[0]` as the most recent role** — this setting forces the empty-array case to be handled |
| `emitDecoratorMetadata` | Nest's dependency injection stops working without it |

> **`noUncheckedIndexedAccess` will feel annoying for about a day.** It is the setting that prevents the exact class of crash where a resume with no job titles produces `undefined` somewhere downstream.

### 4.2 `apps/resume-parsing-service/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

### 4.3 `apps/resume-parsing-service/nest-cli.json`

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

`deleteOutDir` clears `dist/` before each build. Without it, a renamed or deleted source file leaves a stale compiled artefact behind that can still be imported — a genuinely confusing bug to chase.

---

## 5. Configuration

### 5.1 The rule

**Nothing outside `src/config/` reads `process.env`.** Everywhere else injects `TypedConfigService`.

This is not stylistic. A stray `process.env.MODEL_TIMEOUT_MS` deep in a service is untyped, unvalidated, invisible to the boot-time checks, and silently `undefined` when someone renames the variable. Funnelling everything through one validated schema means a misconfiguration is caught at startup by a message naming the variable, rather than at 2am by a `NaN` in a timeout.

### 5.2 `apps/resume-parsing-service/src/config/config.schema.ts`

```ts
import { z } from 'zod';

/**
 * The complete configuration contract for this service.
 *
 * Every environment variable the service reads is declared here. If it is not
 * in this schema, no code may read it.
 */
export const configSchema = z.object({
  // ── Runtime ──────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  // ── Service-to-service auth ──────────────────────────
  // Long enough that brute force is pointless.
  SERVICE_AUTH_TOKEN: z
    .string()
    .min(32, 'must be at least 32 characters — generate with: openssl rand -hex 32'),

  // ── Limits ───────────────────────────────────────────
  MAX_FILE_BYTES: z.coerce.number().int().positive(),
  REQUEST_DEADLINE_MS: z.coerce.number().int().positive(),
  TEXT_EXTRACTION_TIMEOUT_MS: z.coerce.number().int().positive(),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive(),
  MODEL_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(3),

  // ── Extraction gate ──────────────────────────────────
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1),

  // ── Document length ──────────────────────────────────
  MAX_EXTRACTED_CHARS: z.coerce.number().int().positive(),
  HARD_REJECT_CHARS: z.coerce.number().int().positive(),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Runs once, at boot, before the HTTP server starts listening.
 *
 * Throwing here stops the process. That is intended: a service with broken
 * configuration must never accept traffic. A container that dies immediately
 * is far easier to diagnose than one that starts fine and fails under load.
 */
export function validateConfig(raw: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(raw);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid configuration for resume-parsing-service:\n${details}\n\n` +
        `Compare your .env against .env.example.`,
    );
  }

  const config = parsed.data;

  // ── Cross-field check: the timeouts must fit inside the deadline ──
  //
  // Individual values can each be valid while their sum is not. Someone will
  // eventually raise MODEL_TIMEOUT_MS to debug a slow provider and unknowingly
  // push the worst case past the deadline. That surfaces as intermittent 504s
  // under load — one of the harder things to diagnose, because it only appears
  // when the provider is already misbehaving. Catching it here costs nothing.
  const worstCaseMs =
    config.TEXT_EXTRACTION_TIMEOUT_MS +
    config.MODEL_TIMEOUT_MS * config.MODEL_MAX_ATTEMPTS;

  if (worstCaseMs >= config.REQUEST_DEADLINE_MS) {
    throw new Error(
      `Invalid configuration for resume-parsing-service:\n` +
        `  Worst-case processing time is ${worstCaseMs}ms ` +
        `(TEXT_EXTRACTION_TIMEOUT_MS + MODEL_TIMEOUT_MS × MODEL_MAX_ATTEMPTS)\n` +
        `  but REQUEST_DEADLINE_MS is ${config.REQUEST_DEADLINE_MS}ms.\n\n` +
        `  Lower MODEL_TIMEOUT_MS or MODEL_MAX_ATTEMPTS, or raise the deadline.\n` +
        `  The deadline must also stay below the caller's 30000ms budget.`,
    );
  }

  // ── Cross-field check: the hard reject must sit above the truncation ceiling ──
  //
  // If these were inverted, every document over the ceiling would be rejected
  // outright and the truncate-and-flag path would be unreachable — silently
  // turning a "we read the first part of your long CV" into a hard failure.
  if (config.HARD_REJECT_CHARS <= config.MAX_EXTRACTED_CHARS) {
    throw new Error(
      `Invalid configuration for resume-parsing-service:\n` +
        `  HARD_REJECT_CHARS (${config.HARD_REJECT_CHARS}) must be greater than ` +
        `MAX_EXTRACTED_CHARS (${config.MAX_EXTRACTED_CHARS}).\n` +
        `  Otherwise the truncate-and-flag path is unreachable.`,
    );
  }

  return config;
}
```

### 5.3 `apps/resume-parsing-service/src/config/typed-config.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from './config.schema';

/**
 * Typed accessor over ConfigService.
 *
 * Inject this rather than ConfigService directly: `config.get('PORT')` returns
 * a number here, whereas the raw ConfigService returns `string | undefined`
 * unless every call site remembers the generic parameters.
 */
@Injectable()
export class TypedConfigService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }
}
```

### 5.4 `apps/resume-parsing-service/src/config/config.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateConfig } from './config.schema';
import { TypedConfigService } from './typed-config.service';

/**
 * Global so every module can inject TypedConfigService without importing this.
 *
 * Global modules are usually a smell, but configuration is the standard
 * exception: it is genuinely needed everywhere and has no dependencies of
 * its own, so there is no coupling to hide.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      cache: true, // read once at boot; env does not change at runtime
    }),
  ],
  providers: [TypedConfigService],
  exports: [TypedConfigService],
})
export class ConfigModule {}
```

---

## 6. Health

Built now rather than later, because it is what proves the skeleton runs, and because Doc 01's Docker health check already depends on it.

### 6.1 `apps/resume-parsing-service/src/health/health.controller.ts`

```ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';

/**
 * Deliberately unauthenticated — the orchestrator holds no token, and these
 * endpoints expose nothing beyond up or down.
 *
 * Note the missing version prefix: probes are configured in infrastructure and
 * should not have to change when the API version does.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  /**
   * Liveness — is the process alive?
   * Failure means the orchestrator restarts the container.
   *
   * This checks NOTHING on purpose. If the HTTP server can answer, the process
   * is alive by definition. Adding dependency checks here is how a model
   * provider blip turns into a restart loop across the entire fleet.
   */
  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  /**
   * Readiness — can this instance accept work?
   * Failure removes it from the load balancer. It does NOT restart it.
   *
   * Heap is checked because this service buffers 5MB documents; sustained high
   * heap means requests are queueing. Stepping out of the pool briefly is far
   * better than accepting work that cannot finish inside the deadline.
   *
   * There is deliberately no model provider check — see Doc 01 §6.2.
   */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 400 * 1024 * 1024),
    ]);
  }
}
```

### 6.2 `apps/resume-parsing-service/src/health/health.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

---

## 7. The parsing module skeleton

An empty shell for now. Docs 03, 04 and 05 fill it in.

### 7.1 `apps/resume-parsing-service/src/parsing/parsing.module.ts`

```ts
import { Module } from '@nestjs/common';

/**
 * The feature module. Currently empty.
 *
 *   Doc 03 — DTOs and the extraction schema
 *   Doc 04 — ParsingController, ParsingService, ExtractionPort
 *   Doc 05 — the LLM client behind the port
 */
@Module({
  controllers: [],
  providers: [],
})
export class ParsingModule {}
```

> **Register the empty module now.** It makes the module graph complete from the start, so later documents add providers to an existing file rather than introducing new wiring at the same time as new logic. Debugging one change is easier than debugging two.

---

## 8. Logging

### 8.1 `apps/resume-parsing-service/src/logging/logging.module.ts`

```bash
mkdir -p src/logging
```

```ts
import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Structured logging.
 *
 * Pretty-printed locally; JSON everywhere else so a log aggregator can index it.
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',

        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
            : undefined,

        // Redaction is a safety net for things frameworks add automatically.
        // It is NOT the primary control — see §8.2.
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body',
            'res.body',
          ],
          remove: true,
        },

        // Request logging is handled explicitly by the correlation interceptor
        // in Doc 04, which has the correlation ID and timing. Automatic logging
        // here would double every line.
        autoLogging: false,
      },
    }),
  ],
})
export class LoggingModule {}
```

> **This is one of only two places `process.env` is read directly** (the other is `main.ts`). Logging is configured before the dependency injection container exists, so it cannot inject `TypedConfigService`. Everywhere else, the §5.1 rule holds without exception.

### 8.2 The rule that matters most in this service

**Document content must never reach a log line.** No extracted name, company, skill, job title, raw text or model output.

A resume is personal data. A log aggregator is a long-retention, broadly-readable system that was never designed to hold it. This is the easiest privacy mistake to make here and the hardest to undo — once personal data is in a retention system, removing it is an incident, not a fix.

**Log the shape, never the content:**

```ts
// Correct — outcomes and counts
logger.info({
  correlationId,
  documentType: result.document_type,
  isResume: result.is_resume,
  confidence: result.confidence,
  fileBytes: buffer.length,
  processingMs,
  counts: {
    skills: result.skills.length,
    workExperience: result.work_experience.length,
  },
}, 'Parse completed');

// WRONG — never, at any level
logger.debug({ name: result.name, skills: result.skills }, 'Parse completed');
```

A `debug` line is still a log line. Debug output reaches the same aggregator the moment someone raises the level to investigate an incident — which is exactly when volume is highest and scrutiny is lowest.

**Redaction will not save you here.** It matches known paths like `req.body`. It has no idea that `result.name` holds a person's name.

---

## 9. Bootstrapping

### 9.1 `apps/resume-parsing-service/src/app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { LoggingModule } from './logging/logging.module';
import { HealthModule } from './health/health.module';
import { ParsingModule } from './parsing/parsing.module';

/**
 * Root module.
 *
 * Order reflects dependency direction: configuration and logging are
 * infrastructure that everything else relies on; health and parsing are
 * features that rely on them.
 *
 * Doc 04 adds the global exception filter here.
 */
@Module({
  imports: [
    ConfigModule,   // global — provides TypedConfigService everywhere
    LoggingModule,  // global — provides PinoLogger everywhere
    HealthModule,
    ParsingModule,
  ],
})
export class AppModule {}
```

### 9.2 `apps/resume-parsing-service/src/main.ts`

```ts
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { TypedConfigService } from './config/typed-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // bodyLimit sits deliberately above MAX_FILE_BYTES. Multipart framing adds
    // overhead on top of the file, so if the two were equal a file of exactly
    // 5MB would be rejected by Fastify's transport layer with an opaque error
    // instead of by our validator with a clean 413.
    new FastifyAdapter({ bodyLimit: 6 * 1024 * 1024 }),
    // Buffer startup logs until the real logger is attached, so configuration
    // failures are still visible and correctly formatted.
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const config = app.get(TypedConfigService);

  await app.register(multipart, {
    limits: {
      fileSize: config.get('MAX_FILE_BYTES'),
      files: 1,   // exactly one document per request
      fields: 0,  // no other form fields accepted
    },
  });

  // URI versioning: /v1/parse. Health endpoints opt out via their own decorator.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Without this, Node ignores SIGTERM and every deploy waits out the full
  // termination grace period while killing in-flight parses.
  app.enableShutdownHooks();

  const port = config.get('PORT');

  // '0.0.0.0', not 'localhost'. Inside a container, binding to localhost makes
  // the service unreachable from outside it — a confusing failure, because the
  // process starts perfectly and simply never answers.
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
```

### 9.3 Boot sequence

```
1. bootstrap() called
2. NestFactory.create()
   └─ ConfigModule loads .env
      └─ validateConfig() runs
         └─ schema check → cross-field timeout check
            └─ FAILURE HERE STOPS THE PROCESS ✋
3. LoggingModule initialises Pino
4. HealthModule + ParsingModule instantiate
5. Real logger attached, buffered startup logs flush
6. Multipart registered with the configured byte limit
7. URI versioning enabled
8. Shutdown hooks registered
9. Server listens on 0.0.0.0:PORT
```

**Step 2 is the important one.** Configuration is validated before anything else exists. A service with a bad `.env` never reaches the point of accepting a request.

---

## 10. Verify

```bash
# from apps/resume-parsing-service
npm run start:dev
```

Expect:

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] LOG [InstanceLoader] LoggingModule dependencies initialized
[Nest] LOG [InstanceLoader] TerminusModule dependencies initialized
[Nest] LOG [InstanceLoader] ParsingModule dependencies initialized
[Nest] LOG [RoutesResolver] HealthController {/health}
[Nest] LOG [RouterExplorer] Mapped {/health/live, GET}
[Nest] LOG [RouterExplorer] Mapped {/health/ready, GET}
[Nest] LOG [NestApplication] Nest application successfully started
```

`ParsingController` is absent. Correct — it arrives in Doc 04.

### 10.1 Endpoints

```bash
curl -s http://localhost:3002/health/live
# {"status":"ok"}

curl -s http://localhost:3002/health/ready
# {"status":"ok","info":{"memory_heap":{"status":"up"}},"error":{},"details":{...}}
```

### 10.2 Prove the validation works

Each of these must **prevent startup**. If any of them starts successfully, the wiring is wrong.

```bash
# Missing variable
SERVICE_AUTH_TOKEN= npm run start:dev
# → "SERVICE_AUTH_TOKEN: must be at least 32 characters"

# Wrong type
PORT=not_a_number npm run start:dev
# → "PORT: Expected number, received nan"

# Invalid enum
NODE_ENV=staging_typo npm run start:dev
# → "NODE_ENV: Invalid enum value"

# Cross-field: timeouts exceed the deadline
MODEL_TIMEOUT_MS=20000 npm run start:dev
# → "Worst-case processing time is 45000ms but REQUEST_DEADLINE_MS is 25000ms."

# Cross-field: length limits inverted
HARD_REJECT_CHARS=1000 npm run start:dev
# → "HARD_REJECT_CHARS (1000) must be greater than MAX_EXTRACTED_CHARS (150000)."
```

> **Run all four now.** They are the proof that the boot-time guard is real. Once Doc 05 introduces a model provider key, this guard is what stops a service starting without one.

---

## 11. Where does new code go?

Use this when you are unsure, so the tree does not drift.

| You are adding… | It goes in… |
|---|---|
| A new environment variable | `config/config.schema.ts` — **and nowhere else** |
| Something that wraps every request | `common/interceptors/` |
| A new error code | `common/errors/error-codes.ts` — **it becomes a published contract** |
| Authentication logic | `common/guards/` |
| A reusable validator | `common/validation/` — only if two unrelated features would use it |
| A request or response shape | `parsing/dto/` |
| Model-provider code | `parsing/llm/` — nothing outside this folder knows which model is in use |
| Prompt text | `parsing/llm/` — versioned in source, never in configuration |
| A helper used by one file | Beside that file. **Not in `common/`** |
| A database client | **Nowhere.** See Doc 01 §9 |

### 11.1 Two boundaries not to cross

**Nothing outside `config/` reads `process.env`.** One exception each in `logging.module.ts` and `main.ts`, both because they run before dependency injection exists. Both are commented as such.

**Nothing outside `parsing/llm/` knows which model is in use.** The rest of the service talks to an interface. This is what makes the post-launch model evaluation a configuration change rather than a rewrite — the difference between a day's work and a fortnight's.

---

## 12. Definition of done

- [ ] Folder tree matches §3 exactly
- [ ] `npm run start:dev` starts with no errors
- [ ] Startup log lists `ConfigModule`, `LoggingModule`, `TerminusModule`, `ParsingModule`
- [ ] `/health/live` returns `{"status":"ok"}`
- [ ] `/health/ready` returns `200` with a `memory_heap` entry
- [ ] All four failure cases in §10.2 prevent startup with a readable message
- [ ] `npm run build` produces `dist/` with no TypeScript errors
- [ ] `node dist/main` runs the built output
- [ ] Logs are pretty-printed with `NODE_ENV=development`, JSON otherwise
- [ ] `grep -rn "process\.env" src/` returns exactly two hits — `logging.module.ts` and `main.ts`
- [ ] `Ctrl+C` shuts down cleanly with no unhandled rejection

---

## 13. What comes next

| Doc | Adds |
|---|---|
| **03 — DTOs & Extraction JSON Schema** | Fills `parsing/dto/`. Request and response types, runtime validation, per-field semantics |
| **04 — API Endpoints** | Fills `parsing/` and `common/`. The controller, the port, error codes, the caller contract |
| **05 — Integrations** | Fills `parsing/llm/`. Model client, prompt, retry, token limits, fallback |
| **06 — Observability** | Metrics, parse and rejection rates, latency, token spend |
| **07 — QA & Test Data** | Fixture corpus and the full test suite |

> **Docs 03 and 04 are complete** as separate documents — `resume-parsing-service-03-dtos-extraction-schema.md` and `resume-parsing-service-04-api-endpoints.md` — both on `npm`.
