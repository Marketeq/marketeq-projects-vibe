# 05 — `resume-parsing-service` Integrations: Model Client, Prompt & Pipeline

**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer building this service. Assumes no prior familiarity with it.
**Prerequisites:** Docs 00–04. This document replaces `ExtractionStub` with the real pipeline and fills `src/parsing/llm/`.

> **Verify before you build.** Model identifiers, pricing and the structured-output API move faster than any document. The specifics below were checked against Anthropic's documentation on 22 July 2026; confirm the current values at `https://docs.claude.com/en/api/overview` before relying on them.

---

## 1. What this document gets you

The real extraction pipeline, end to end:

- deterministic text extraction from PDF and DOCX,
- a length gate that truncates-and-flags or rejects,
- a single model call that both classifies and extracts, using **structured outputs** so the response shape is guaranteed by the API rather than hoped for,
- retry with one attempt, timeout, and a clean fallback to the caller's error states,
- the prompt itself, versioned and treated as source code.

At the end, `POST /v1/parse` runs against a real model and the stub is gone.

### 1.1 The shape of the pipeline

```
buffer
  │
  ▼
1. Text extraction        deterministic, no network, ≤ 5s
  │   PDF → pdf-parse   DOCX → mammoth
  ▼
2. Length gate
  │   > HARD_REJECT_CHARS   → 422 DOCUMENT_TOO_LONG (no model call)
  │   > MAX_EXTRACTED_CHARS → truncate at paragraph boundary, keep head, flag
  │   near-empty text        → send the document itself (scanned-resume path)
  ▼
3. Single model call       classify + extract in one request
  │   structured outputs → guaranteed schema
  │   1 retry on transient failure, each attempt ≤ 10s
  ▼
4. Validate + assemble     parseResultSchema, meta signals
  │
  ▼
ExtractionOutput
```

### 1.2 Why one model call, not two

Classification ("is this a resume?") and extraction ("pull the fields") share one call. Splitting them doubles cost and latency, and the two decisions need the same context anyway — you cannot judge whether a document is a resume without reading the same content you would extract from. One call, one prompt, one structured response.

---

## 2. Dependencies

```bash
# from apps/resume-parsing-service
npm install @anthropic-ai/sdk pdf-parse mammoth
npm install -D @types/pdf-parse
```

| Package | Role |
|---|---|
| `@anthropic-ai/sdk` | The model client. **Confined to `src/parsing/llm/`** — nothing else imports it |
| `pdf-parse` | Deterministic PDF text extraction. No network, no cost |
| `mammoth` | DOCX → text. Handles the OOXML structure cleanly |

---

## 3. Configuration additions

### 3.1 `.env.example` — append

```bash
# ── Model provider ───────────────────────────────────────
# The ONLY external credential this service holds. Rotate quarterly.
ANTHROPIC_API_KEY=replace_me
MODEL_ID=claude-haiku-4-5
MODEL_MAX_OUTPUT_TOKENS=4096

# Deterministic extraction: low temperature so the same resume yields the
# same fields. This is data extraction, not creative generation.
MODEL_TEMPERATURE=0

# Below this many characters of extracted text, send the document itself to the
# model instead — the scanned-resume fallback (see §6.2).
NEAR_EMPTY_TEXT_CHARS=50
```

### 3.2 `config.schema.ts` — append to the object

```ts
  // ── Model provider ───────────────────────────────────
  ANTHROPIC_API_KEY: z.string().min(1, 'the model provider key is required'),
  MODEL_ID: z.string().min(1),
  MODEL_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive(),
  MODEL_TEMPERATURE: z.coerce.number().min(0).max(1),
  NEAR_EMPTY_TEXT_CHARS: z.coerce.number().int().nonnegative(),
```

> Once this lands, the boot guard from Doc 02 §10.2 does real work: **the service will not start without a model key.** That is the intended trade — a service that boots and then fails every request is worse than one that refuses to boot.

---

## 4. The `LlmClient` abstraction

The model sits behind an interface so it can be swapped as configuration. This is what makes the post-launch cheaper-model evaluation (RU-807) a config change rather than a rewrite.

### 4.1 `src/parsing/llm/llm-client.port.ts`

```ts
/** What the pipeline asks of a model, independent of which model it is. */
export interface LlmExtractionRequest {
  /** Extracted text, or — for scanned documents — empty, with `document` set. */
  text: string;
  /** Present only on the scanned-resume path: the raw document for the model to read. */
  document?: { buffer: Buffer; mimeType: string };
  correlationId: string;
}

export interface LlmExtractionResponse {
  /** Raw parsed JSON from the model. Validated by the caller, not here. */
  raw: unknown;
  detectedLanguages: string[];
  attempts: number;
}

/**
 * The boundary nothing outside src/parsing/llm/ crosses.
 *
 * Implementations own: the provider SDK, the prompt, retry, timeout, token
 * budgeting, and structured-output enforcement. They do NOT own: text
 * extraction, length gating, or response validation — those are the pipeline's.
 */
export interface LlmClient {
  extract(request: LlmExtractionRequest): Promise<LlmExtractionResponse>;
}

export const LLM_CLIENT = Symbol('LLM_CLIENT');
```

---

## 5. The prompt

**The prompt is source code, not configuration.** It determines output quality more than any other single artefact in this service, so it is versioned in the repository, reviewed like code, and — per Doc 07 — no change to it ships without an evaluation run.

### 5.1 `src/parsing/llm/prompt.ts`

```ts
/**
 * Extraction prompt, v1.
 *
 * CHANGE CONTROL: every edit to this file is a behavioural change. Bump the
 * version, and run the Tier A evaluation (Doc 07) before it ships. A prompt
 * change with a green eval is safe; one without is a guess.
 *
 * The schema is enforced by the API (structured outputs), so this prompt does
 * NOT need to beg for valid JSON. It focuses on extraction judgement instead.
 */
export const PROMPT_VERSION = 'v1';

export const SYSTEM_PROMPT = `You extract structured data from a document that may or may not be a résumé.

CLASSIFICATION
- Decide whether the document is a résumé/CV. Set is_resume and a confidence from 0 to 1.
- A résumé describes a person's work history, education, or skills. A contract, invoice, cover letter, essay, or form is NOT a résumé.
- If you are unsure, reflect that in a lower confidence rather than guessing.

EXTRACTION — apply only when the document is a résumé
- Extract each field in the language it appears in. Do NOT translate. A French job title stays French; a Japanese institution stays Japanese.
- Do NOT assume the document has a single language. Many résumés mix languages — an English summary with a Portuguese employer is normal. Extract each value as written.
- Never invent, infer, or repair a value. If a date is missing, leave it null — do not guess it. If a range looks wrong, return it as written.
- Dates may be partial: "2023", "2023-06", or "2023-06-01". Return whatever precision the document gives.
- job_titles: list the person's role titles, most recent FIRST. Order matters.
- skills: individual skill names only. No proficiency, level, years, or endorsement.
- Prefer PRECISION over recall. A field you are unsure about should be omitted, not guessed. A missing entry costs the person a moment of typing; an invented entry puts something false on their profile.
- Never extract: biography/summary prose, location, phone, email, or postal address.

OUTPUT
- Return only the structured object. Every array defaults to empty. Absent single values are null.`;

export const USER_PROMPT_PREFIX =
  'Extract structured data from the following document.\n\n';
```

### 5.2 Why the prompt tunes toward precision

The evaluation research is explicit that extraction can be tuned toward recall (catch everything, some of it wrong) or precision (only what you are sure of). For us the asymmetry is decisive: our output feeds a profile the talent reviews. A **false positive** — an invented job — lands on their public profile and they must spot and delete it. A **false negative** — a missed job — leaves them typing it in. The first is worse, so the prompt says so in as many words.

### 5.3 The three prompt-level decisions from the gap research

| Decision | Why it is in the prompt, not the code |
|---|---|
| **Extract per-field in whatever language appears; never establish a document language** | Mixed-language is the normal case. A prompt that fixes "the" language first is what produces the non-uniform degradation where sections parse but their fields do not |
| **Never translate** | Translation is lossy and unrecoverable. It is a display decision for `user-service`, not an extraction decision |
| **Precision over recall** | The false-positive cost is higher than the false-negative cost for a reviewed profile |

---

## 6. The pipeline stages

### 6.1 `src/parsing/llm/text-extraction.ts`

```ts
import { Injectable } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ParseException } from '../../common/errors/parse.exception';
import type { AcceptedMimeType } from '../../common/validation/file-validator';

export interface ExtractedText {
  text: string;
  characters: number;
}

/**
 * Deterministic text extraction. No network, no model, no cost.
 *
 * Runs BEFORE the model so that: (a) a document with no extractable text can be
 * caught cheaply, (b) an encrypted document surfaces as password_protected, and
 * (c) the model receives clean text rather than raw bytes wherever possible.
 */
@Injectable()
export class TextExtraction {
  async extract(
    buffer: Buffer,
    mimeType: AcceptedMimeType,
    correlationId: string,
  ): Promise<ExtractedText> {
    try {
      if (mimeType === 'application/pdf') {
        const parsed = await pdfParse(buffer);
        const text = parsed.text ?? '';
        return { text, characters: text.length };
      }
      // DOC and DOCX
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value ?? '';
      return { text, characters: text.length };
    } catch (err) {
      // pdf-parse throws a recognisable error on encrypted PDFs.
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('password') || message.includes('encrypted')) {
        throw ParseException.passwordProtected(correlationId);
      }
      // Anything else: the document is structurally damaged.
      throw ParseException.unreadable(correlationId);
    }
  }
}
```

### 6.2 `src/parsing/llm/length-gate.ts`

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParseException } from '../../common/errors/parse.exception';
import type { AppConfig } from '../../config/config.schema';

export interface GatedText {
  text: string;
  truncated: boolean;
  extractedCharacters: number;
  /** True when text is near-empty — the caller sends the document itself instead. */
  sendDocumentInstead: boolean;
}

/**
 * Applies the length policy from the gap resolutions.
 *
 *   > HARD_REJECT_CHARS   → reject, no model call
 *   > MAX_EXTRACTED_CHARS → truncate at a paragraph boundary, keep the HEAD, flag
 *   < NEAR_EMPTY_TEXT     → signal the scanned-resume path
 */
@Injectable()
export class LengthGate {
  private readonly maxChars: number;
  private readonly hardReject: number;
  private readonly nearEmpty: number;

  constructor(config: ConfigService<AppConfig, true>) {
    this.maxChars = config.get('MAX_EXTRACTED_CHARS', { infer: true });
    this.hardReject = config.get('HARD_REJECT_CHARS', { infer: true });
    this.nearEmpty = config.get('NEAR_EMPTY_TEXT_CHARS', { infer: true });
  }

  apply(text: string, correlationId: string): GatedText {
    const extractedCharacters = text.length;

    // Too long to be a resume. Reject before spending a model call.
    if (extractedCharacters > this.hardReject) {
      throw ParseException.documentTooLong(extractedCharacters, this.hardReject, correlationId);
    }

    // Near-empty: likely a scanned/image PDF. Let the model read the document.
    if (extractedCharacters < this.nearEmpty) {
      return { text: '', truncated: false, extractedCharacters, sendDocumentInstead: true };
    }

    // Within range: send as-is.
    if (extractedCharacters <= this.maxChars) {
      return { text, truncated: false, extractedCharacters, sendDocumentInstead: false };
    }

    // Over the ceiling: keep the head, cut at a paragraph boundary, and FLAG.
    // Resumes are front-loaded and reverse-chronological — identity and the most
    // recent roles are at the top, and those are the highest-value fields.
    const head = text.slice(0, this.maxChars);
    const lastBreak = head.lastIndexOf('\n\n');
    const truncatedText = lastBreak > this.maxChars * 0.8 ? head.slice(0, lastBreak) : head;

    return {
      text: truncatedText,
      truncated: true,
      extractedCharacters,
      sendDocumentInstead: false,
    };
  }
}
```

> **Why keep the head, and what it costs.** Identity and recent work history are at the top of a resume and are unrecoverable by any other route. Skills often sit at the *bottom*, so truncation may drop them — a real cost, accepted deliberately, because a talent can re-add skills in a few clicks whereas they cannot reconstruct a parse. The `truncated` flag is what keeps this honest: the caller can tell the talent we read only the first part.

---

## 7. The model client

Uses **structured outputs** — the API constrains generation to the schema, so a malformed response is impossible rather than merely unlikely. This replaces the older, less reliable pattern of asking the model to return JSON and validating afterwards.

### 7.1 `src/parsing/llm/schema.ts`

The JSON Schema handed to the API. It mirrors `parseResultSchema` from Doc 03, expressed as the JSON Schema the structured-output API expects.

```ts
/**
 * JSON Schema for the structured-output API.
 *
 * additionalProperties:false everywhere is REQUIRED by the API's constrained
 * decoding. Keep this in lockstep with parseResultSchema (Doc 03) — a drift
 * between them is caught by the response validator, but it is cheaper to keep
 * them aligned than to debug the mismatch.
 */
export const EXTRACTION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    document_type: { type: 'string', enum: ['resume', 'contract', 'invoice', 'other'] },
    is_resume: { type: 'boolean' },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    name: { type: ['string', 'null'] },
    job_titles: { type: 'array', items: { type: 'string' } },
    skills: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: { name: { type: 'string' } },
        required: ['name'],
      },
    },
    work_experience: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          job_title: { type: ['string', 'null'] },
          company: { type: ['string', 'null'] },
          start_date: { type: ['string', 'null'] },
          end_date: { type: ['string', 'null'] },
          description: { type: ['string', 'null'] },
        },
        required: ['job_title', 'company', 'start_date', 'end_date', 'description'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          institution: { type: ['string', 'null'] },
          degree: { type: ['string', 'null'] },
          field_of_study: { type: ['string', 'null'] },
          start_date: { type: ['string', 'null'] },
          end_date: { type: ['string', 'null'] },
        },
        required: ['institution', 'degree', 'field_of_study', 'start_date', 'end_date'],
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string' },
          issuing_body: { type: ['string', 'null'] },
        },
        required: ['name', 'issuing_body'],
      },
    },
  },
  required: [
    'document_type', 'is_resume', 'confidence', 'name',
    'job_titles', 'skills', 'work_experience', 'education', 'certifications',
  ],
} as const;
```

### 7.2 `src/parsing/llm/anthropic-llm.client.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { ParseException } from '../../common/errors/parse.exception';
import { SYSTEM_PROMPT, USER_PROMPT_PREFIX } from './prompt';
import { EXTRACTION_JSON_SCHEMA } from './schema';
import type { LlmClient, LlmExtractionRequest, LlmExtractionResponse } from './llm-client.port';
import type { AppConfig } from '../../config/config.schema';

/**
 * Anthropic implementation of LlmClient.
 *
 * The ONLY file in the service that imports the provider SDK. Swapping models
 * (RU-807) means adding a sibling of this file and changing which one the
 * module binds — never touching the pipeline.
 */
@Injectable()
export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AnthropicLlmClient.name);
    this.client = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY', { infer: true }) });
    this.modelId = config.get('MODEL_ID', { infer: true });
    this.maxTokens = config.get('MODEL_MAX_OUTPUT_TOKENS', { infer: true });
    this.temperature = config.get('MODEL_TEMPERATURE', { infer: true });
    this.timeoutMs = config.get('MODEL_TIMEOUT_MS', { infer: true });
    this.maxAttempts = config.get('MODEL_MAX_ATTEMPTS', { infer: true });
  }

  async extract(request: LlmExtractionRequest): Promise<LlmExtractionResponse> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const message = await this.client.messages.create(
          {
            model: this.modelId,
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            system: SYSTEM_PROMPT,
            messages: [this.buildUserMessage(request)],
            // Structured outputs (GA): constrained decoding guarantees the
            // response matches the schema. No "please return JSON" required.
            output_config: {
              format: { type: 'json_schema', schema: EXTRACTION_JSON_SCHEMA },
            },
          },
          { timeout: this.timeoutMs },
        );

        const raw = this.readJsonBlock(message);
        return {
          raw,
          detectedLanguages: this.readLanguages(message),
          attempts: attempt,
        };
      } catch (err) {
        lastError = err;
        if (!this.isRetryable(err) || attempt === this.maxAttempts) break;
        this.logger.warn(
          { correlationId: request.correlationId, attempt },
          'Model call failed, retrying',
        );
      }
    }

    this.logger.error(
      { correlationId: request.correlationId, err: lastError },
      'Model call failed after all attempts',
    );
    throw ParseException.modelUnavailable(request.correlationId);
  }

  private buildUserMessage(request: LlmExtractionRequest) {
    // Scanned-resume path: hand the document to the model to read directly.
    if (request.document) {
      return {
        role: 'user' as const,
        content: [
          {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: request.document.mimeType,
              data: request.document.buffer.toString('base64'),
            },
          },
          { type: 'text' as const, text: USER_PROMPT_PREFIX },
        ],
      };
    }
    // Normal path: extracted text.
    return {
      role: 'user' as const,
      content: `${USER_PROMPT_PREFIX}${request.text}`,
    };
  }

  private readJsonBlock(message: Anthropic.Message): unknown {
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text block in model response');
    }
    // The API guarantees valid JSON matching the schema; parse is safe.
    return JSON.parse(textBlock.text);
  }

  private readLanguages(_message: Anthropic.Message): string[] {
    // Language detection is observability only and lives outside the schema.
    // A later revision can add a lightweight detector over the extracted text;
    // for v1 we return an empty array rather than a guess.
    return [];
  }

  private isRetryable(err: unknown): boolean {
    // Retry transient transport/5xx/timeout; never retry a 4xx from the provider.
    if (err instanceof Anthropic.APIError) {
      return err.status === undefined || err.status >= 500 || err.status === 429;
    }
    return true; // network errors, timeouts
  }
}
```

> **The retry here is not the caller's retry.** The caller retries the whole HTTP request once, for `429`/`503`/`504`. This retries a flaky *model call* once, inside a single request, within the timeout budget the config guard verified at boot. Two layers, different purposes.

---

## 8. The pipeline that ties it together

This is the real `ExtractionPort` implementation. It orchestrates the stages and produces the `ExtractionOutput` the service already expects.

### 8.1 `src/parsing/llm/extraction.pipeline.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { parseResultSchema } from '../dto/response.schema';
import { ParseException } from '../../common/errors/parse.exception';
import { TextExtraction } from './text-extraction';
import { LengthGate } from './length-gate';
import { LLM_CLIENT, type LlmClient } from './llm-client.port';
import type { ExtractionInput, ExtractionOutput, ExtractionPort } from '../extraction.port';

/**
 * The real extraction pipeline. Replaces ExtractionStub.
 *
 * Owns orchestration and validation. Does NOT own the prompt, the provider, or
 * retry — those belong to the LlmClient. Does NOT persist anything.
 */
@Injectable()
export class ExtractionPipeline implements ExtractionPort {
  constructor(
    private readonly textExtraction: TextExtraction,
    private readonly lengthGate: LengthGate,
    @Inject(LLM_CLIENT) private readonly llm: LlmClient,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ExtractionPipeline.name);
  }

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    // 1. Deterministic text extraction (may throw password_protected / unreadable)
    const extracted = await this.textExtraction.extract(
      input.buffer, input.mimeType, input.correlationId,
    );

    // 2. Length gate (may throw document_too_long)
    const gated = this.lengthGate.apply(extracted.text, input.correlationId);

    // 3. Single model call — text, or the document itself for scanned resumes
    const llmResponse = await this.llm.extract({
      text: gated.text,
      document: gated.sendDocumentInstead
        ? { buffer: input.buffer, mimeType: input.mimeType }
        : undefined,
      correlationId: input.correlationId,
    });

    // 4. Validate. Structured outputs guarantee shape, but we validate anyway:
    //    the schema is the contract, and defence in depth is cheap. A validation
    //    failure here is a genuine anomaly and becomes MODEL_UNAVAILABLE.
    const result = parseResultSchema.safeParse(llmResponse.raw);
    if (!result.success) {
      this.logger.error(
        { correlationId: input.correlationId, issues: result.error.issues },
        'Model response failed schema validation',
      );
      throw ParseException.modelUnavailable(input.correlationId);
    }

    return {
      result: result.data,
      modelAttempts: llmResponse.attempts,
      detectedLanguages: llmResponse.detectedLanguages,
      truncated: gated.truncated,
      extractedCharacters: gated.extractedCharacters,
    };
  }
}
```

### 8.2 Why validate a guaranteed-valid response

Structured outputs make a schema-violating response impossible *in principle*. Validating anyway costs microseconds and covers the cases the guarantee does not: a provider bug, a schema drift between `EXTRACTION_JSON_SCHEMA` and `parseResultSchema`, or a future model swapped in behind the port that does not enforce constraints. The validation is the contract; the API guarantee is an optimisation on top of it. **Never rely on the guarantee alone** — the whole reason this service is trustworthy is that a bad model response becomes a clean error rather than a corrupt profile write.

---

## 9. Wiring the pipeline in

Replace the stub binding from Doc 04.

### 9.1 `src/parsing/parsing.module.ts` — updated

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ParsingController } from './parsing.controller';
import { ParsingService } from './parsing.service';
import { FileValidator } from '../common/validation/file-validator';
import { EXTRACTION_PORT } from './extraction.port';
import { ExtractionStub } from './extraction.stub';
import { ExtractionPipeline } from './llm/extraction.pipeline';
import { TextExtraction } from './llm/text-extraction';
import { LengthGate } from './llm/length-gate';
import { LLM_CLIENT } from './llm/llm-client.port';
import { AnthropicLlmClient } from './llm/anthropic-llm.client';
import type { AppConfig } from '../config/config.schema';

@Module({
  controllers: [ParsingController],
  providers: [
    ParsingService,
    FileValidator,

    // Pipeline stages
    TextExtraction,
    LengthGate,
    ExtractionStub, // retained for non-production, see the factory below

    // The model client
    { provide: LLM_CLIENT, useClass: AnthropicLlmClient },

    // Bind EXTRACTION_PORT: real pipeline everywhere except local/test where a
    // key may be absent. The production guard from Doc 04 still applies — the
    // stub can never serve production.
    {
      provide: EXTRACTION_PORT,
      useFactory: (
        config: ConfigService<AppConfig, true>,
        pipeline: ExtractionPipeline,
        stub: ExtractionStub,
      ) => {
        const env = config.get('NODE_ENV', { infer: true });
        const hasKey = config.get('ANTHROPIC_API_KEY', { infer: true }) !== 'replace_me';

        if (env === 'production') {
          // Production always uses the real pipeline. If the key is a placeholder,
          // config validation has already failed at boot.
          return pipeline;
        }
        // Local/test: use the real pipeline when a key is set, the stub otherwise,
        // so the service runs offline without a provider account.
        return hasKey ? pipeline : stub;
      },
      inject: [ConfigService, ExtractionPipeline, ExtractionStub],
    },

    ExtractionPipeline,
    AnthropicLlmClient,
  ],
})
export class ParsingModule {}
```

> **The local/test fallback is a convenience, never a production path.** A developer without a provider key still gets a running service against the stub. Production is unconditional: the real pipeline, or a boot failure. There is no configuration in which production silently serves stub data.

---

## 10. Cost

Grounded in current Haiku 4.5 pricing — **$1 per million input tokens, $5 per million output** (verified 22 July 2026; confirm before relying on it).

| Component | Estimate |
|---|---|
| Input: a 2-page resume as text | ~1,500 tokens |
| Input: system prompt | ~450 tokens |
| Output: structured result | ~600 tokens |
| **Per resume** | **~$0.005** |
| **Per 1,000 resumes** | **~$5** |

This is the number RU-807 tests against post-launch: whether a cheaper model holds extraction quality at the per-field thresholds in Doc 07. The `LlmClient` abstraction is what makes that a config change. The scanned-resume path costs more — a document sent as an image consumes more input tokens — but it is a small fraction of traffic.

> **Cost is a monitored signal, not a fixed fact.** Doc 06 tracks token spend per period and alerts on anomalies. A cost spike is usually either the scanned-resume path rising or an attempted abuse of the endpoint, and both are things you want to see.

---

## 11. Fallback and failure paths

Every way the pipeline can fail, and what the caller sees. All map to the error codes from Doc 04.

| Stage | Failure | Result | Retryable? |
|---|---|---|---|
| Text extraction | Encrypted document | `422 PASSWORD_PROTECTED` | No |
| Text extraction | Damaged structure | `422 UNREADABLE_DOCUMENT` | No |
| Length gate | Over the hard limit | `422 DOCUMENT_TOO_LONG` | No |
| Model call | Provider 5xx / timeout / network | one retry, then `503 MODEL_UNAVAILABLE` | **Yes** |
| Model call | Provider 4xx | `503 MODEL_UNAVAILABLE`, no retry | No |
| Validation | Response fails the schema | `503 MODEL_UNAVAILABLE` | **Yes** |
| Deadline | Whole request over budget | `504 DEADLINE_EXCEEDED` | **Yes** |

### 11.1 There is no degraded mode

This service either extracts or it does not. It has **no partial-success path** — a half-extracted resume is not a thing it returns, because a caller cannot tell a deliberately-empty field from a giving-up one. When the model cannot be reached, the honest answer is `503`, and the caller's single retry plus its talent-facing `parse_failed` state handle it. Inventing a degraded mode here would push ambiguity downstream, which is exactly what the strict response contract exists to prevent.

### 11.2 What the caller does with each

Recall the mapping from Doc 04 §11.4. The two rows worth re-stating:

- **`200` with every array empty** → the caller shows `nothing_found` **and stores the file.** This is a success, not a failure — the document was a resume, it just yielded nothing extractable.
- **`200` with `meta.truncated: true`** → the caller may tell the talent only the first part was read. Never silent.

---

## 12. Testing the pipeline

Unit tests for the deterministic stages; the model client is tested against a fake, not a live provider.

### 12.1 `src/parsing/llm/length-gate.spec.ts`

```ts
import { describe, expect, it } from 'vitest';
import { LengthGate } from './length-gate';
import { ParseException } from '../../common/errors/parse.exception';

function gate(over = {}) {
  const config = {
    get: (k: string) => ({
      MAX_EXTRACTED_CHARS: 150000,
      HARD_REJECT_CHARS: 500000,
      NEAR_EMPTY_TEXT_CHARS: 50,
      ...over,
    })[k],
  } as never;
  return new LengthGate(config);
}

describe('LengthGate', () => {
  it('passes normal text untouched', () => {
    const r = gate().apply('a normal resume'.repeat(100), 'cid');
    expect(r.truncated).toBe(false);
    expect(r.sendDocumentInstead).toBe(false);
  });

  it('signals the scanned path for near-empty text', () => {
    const r = gate().apply('   ', 'cid');
    expect(r.sendDocumentInstead).toBe(true);
  });

  it('truncates and flags above the ceiling', () => {
    const r = gate().apply('x'.repeat(160000), 'cid');
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBeLessThanOrEqual(150000);
    expect(r.extractedCharacters).toBe(160000);
  });

  it('rejects above the hard limit without truncating', () => {
    expect(() => gate().apply('x'.repeat(600000), 'cid')).toThrow(ParseException);
  });
});
```

### 12.2 `src/parsing/llm/extraction.pipeline.spec.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { ExtractionPipeline } from './extraction.pipeline';
import type { LlmClient } from './llm-client.port';

const noopLogger = { setContext: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;

const validRaw = {
  document_type: 'resume', is_resume: true, confidence: 0.9,
  name: 'Test Person', job_titles: ['Engineer'],
  skills: [{ name: 'TypeScript' }],
  work_experience: [], education: [], certifications: [],
};

function pipeline(llm: Partial<LlmClient>, gateResult = {
  text: 'some text', truncated: false, extractedCharacters: 9, sendDocumentInstead: false,
}) {
  const textExtraction = { extract: vi.fn().mockResolvedValue({ text: 'some text', characters: 9 }) };
  const lengthGate = { apply: vi.fn().mockReturnValue(gateResult) };
  return new ExtractionPipeline(
    textExtraction as never, lengthGate as never, llm as LlmClient, noopLogger,
  );
}

describe('ExtractionPipeline', () => {
  it('returns a validated result with truncation carried through', async () => {
    const llm = { extract: vi.fn().mockResolvedValue({ raw: validRaw, detectedLanguages: ['en'], attempts: 1 }) };
    const p = pipeline(llm, { text: 't', truncated: true, extractedCharacters: 160000, sendDocumentInstead: false });
    const out = await p.extract({ buffer: Buffer.from('x'), mimeType: 'application/pdf', correlationId: 'cid' });
    expect(out.result.is_resume).toBe(true);
    expect(out.truncated).toBe(true);
    expect(out.extractedCharacters).toBe(160000);
  });

  it('rejects a model response that fails the schema', async () => {
    const llm = { extract: vi.fn().mockResolvedValue({ raw: { garbage: true }, detectedLanguages: [], attempts: 1 }) };
    const p = pipeline(llm);
    await expect(
      p.extract({ buffer: Buffer.from('x'), mimeType: 'application/pdf', correlationId: 'cid' }),
    ).rejects.toThrow();
  });
});
```

> **The pipeline tests never call the real provider.** They inject a fake `LlmClient`. Real-model behaviour is measured by the evaluation corpus in Doc 07, which is a different discipline — deterministic tests prove the wiring; evaluation proves the extraction quality.

---

## 13. Verify end to end

```bash
# from apps/resume-parsing-service
# set a real ANTHROPIC_API_KEY in .env first
npm run start:dev
```

```bash
TOKEN=$(grep SERVICE_AUTH_TOKEN .env | cut -d= -f2)
curl -s -X POST http://localhost:3002/v1/parse \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-correlation-id: live-001" \
  -H "x-idempotency-key: idem-live-001" \
  -F "file=@/path/to/a/real/resume.pdf;type=application/pdf" | jq .
```

Expect a populated `result`, a `confidence` above 0.7 for a real resume, and `meta.modelAttempts: 1`. Try a non-resume PDF and confirm `is_resume: false` with `200`.

---

## 14. Definition of done

- [ ] `src/parsing/llm/` contains the port, prompt, schema, client, text extraction, length gate, pipeline
- [ ] Service starts against a real key and parses a real resume end to end
- [ ] A non-resume returns `200` with `is_resume: false`
- [ ] An encrypted PDF returns `422 PASSWORD_PROTECTED`
- [ ] A document over `HARD_REJECT_CHARS` returns `422 DOCUMENT_TOO_LONG` with no model call
- [ ] A document over `MAX_EXTRACTED_CHARS` returns `200` with `meta.truncated: true`
- [ ] `ANTHROPIC_API_KEY` unset prevents startup in production
- [ ] The provider SDK is imported in **exactly one file** — `grep -rl "@anthropic-ai/sdk" src/` returns only `anthropic-llm.client.ts`
- [ ] Length-gate and pipeline unit tests pass
- [ ] No log line contains extracted document content
- [ ] The prompt file carries a `PROMPT_VERSION`

---

## 15. What comes next

| Doc | Uses this |
|---|---|
| **06 — Observability** | The `confidence`, `modelAttempts`, `truncated` and token signals produced here |
| **07 — QA & Test Data** | The evaluation corpus that gates every change to §5's prompt |

> **The prompt is now the highest-leverage file in the service.** Doc 07 is its test suite, and the rule that no prompt change ships without an evaluation run is what keeps this service's quality from drifting silently. Treat §5 with the seriousness you would give a security boundary.
