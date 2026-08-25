# 03 — `resume-parsing-service` DTOs & Extraction JSON Schema

**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer building this service. Assumes no prior familiarity with it.
**Prerequisites:** Doc 00 — Service Overview · Doc 01 — Docker & Runtime · Doc 02 — Folder Structure & Bootstrapping.

---

## 1. What this document gets you

Every data shape the service deals in: the request it accepts, the response it returns, and the runtime validation that guarantees the response even when the model misbehaves. This fills `src/parsing/dto/`.

**No entities, no tables.** This service is stateless — see Doc 01 §9. Everything here is a wire shape, not a persisted one.

### 1.1 The one idea to hold onto

The response originates in a **probabilistic model**. Nothing upstream guarantees its shape. So this document validates on the way *out* as strictly as most services validate on the way *in* — a malformed model response becomes a clean failure, never a corrupt profile write downstream.

---

## 2. The request

Assembled by the controller (Doc 04) after multipart parsing and validation.

### 2.1 `src/parsing/dto/parse-request.dto.ts`

```ts
import type { AcceptedMimeType } from '../../common/validation/file-validator';

/** One parse request, after the controller has validated the upload. */
export interface ParseRequestDto {
  buffer: Buffer;
  mimeType: AcceptedMimeType;
  correlationId: string;
  idempotencyKey: string;
}
```

The service never receives a talent identifier, an account name, or any existing profile data. It classifies and extracts; it does not compare, match or decide. Everything contextual belongs to `user-service`.

---

## 3. The response schema

This is the contract from the Data Dictionary, expressed as runtime validation. **Every field is validated before the response leaves the service.**

### 3.1 `src/parsing/dto/response.schema.ts`

```ts
import { z } from 'zod';

/**
 * Runtime schema for the parse result.
 *
 * Not defensive programming for its own sake: the values come from a model, so
 * the shape is not guaranteed by anything upstream. Validating here is what
 * turns "the model returned something odd" into a clean failure rather than a
 * corrupt profile write two services away.
 */

/**
 * Empty-equivalent values normalise to null.
 * "", whitespace, and the literal strings "undefined"/"null" never pass through.
 */
const nullableText = z
  .string()
  .transform((v) => {
    const t = v.trim();
    return t === '' || t === 'undefined' || t === 'null' ? null : t;
  })
  .nullable()
  .catch(null);

/**
 * Partial dates are legitimate: "2023", "2023-06", "2023-06-01".
 * NEVER inferred, never repaired. An implausible date is returned as written.
 */
const partialDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Expected YYYY, YYYY-MM or YYYY-MM-DD')
  .nullable()
  .catch(null);

export const skillSchema = z.object({
  name: z.string().min(1),
});

export const workEntrySchema = z.object({
  job_title: nullableText,
  company: nullableText,
  start_date: partialDate,
  end_date: partialDate,
  description: nullableText,
});

export const educationEntrySchema = z.object({
  institution: nullableText,
  degree: nullableText,
  field_of_study: nullableText,
  start_date: partialDate,
  end_date: partialDate,
});

export const certificationSchema = z.object({
  name: z.string().min(1),
  issuing_body: nullableText,
});

export const parseResultSchema = z.object({
  document_type: z.enum(['resume', 'contract', 'invoice', 'other']),
  is_resume: z.boolean(),

  // Required. An absent confidence is a CONTRACT VIOLATION, not a passing score.
  // No .catch here — a response missing it must fail loudly.
  confidence: z.number().min(0).max(1),

  name: nullableText,

  // Order is significant: the caller takes [0] as the most recent role.
  // NEVER sort, dedupe or reorder this array.
  job_titles: z.array(z.string().min(1)).default([]),

  skills: z.array(skillSchema).default([]),
  work_experience: z.array(workEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  certifications: z.array(certificationSchema).default([]),
});

export type ParseResult = z.infer<typeof parseResultSchema>;
```

### 3.2 Why `.catch(null)` on optional fields but not required ones

Where a single optional field is malformed, null it and keep the rest — losing one end date is far better than discarding an otherwise-perfect extraction. The three required fields (`document_type`, `is_resume`, `confidence`) deliberately have **no** `.catch`, so a response missing them fails loudly rather than silently defaulting. A missing `is_resume` that defaulted to `false` would reject good resumes; a missing `confidence` that defaulted to a number would bypass the gate.

### 3.3 Field semantics

Per the Data Dictionary and the gap resolutions.

| Field | Rule |
|---|---|
| `name` | Extracted as written, any script. Absence is normal — a **pass**, never a mismatch |
| `job_titles[]` | **Order significant.** Reverse-chronological; the caller uses `[0]` only |
| `skills[].name` | Name only. No level, proficiency, years or endorsement — those fields do not exist in the consumer model |
| `work/education dates` | Partial allowed. Never inferred or repaired. Implausible values returned as written |
| `company`, `institution` | As written. **Not** normalised here — the caller normalises for matching |
| `certifications[].issuing_body` | Commonly absent. Name alone is valid |
| **Never present** | `bio`, `location`, phone, email, address. Excluded by design |

### 3.4 Extraction fills existing fields; it never originates one

The schema above is the shape known at time of writing. The governing rule from the Data Dictionary still holds: **any existing `user-service` field a resume can supply should be filled, and this list is illustrative rather than a whitelist.** What the schema forbids is a field that corresponds to nothing in the consumer model. Adding a field is a schema change owned by `user-service`, never originated by extraction.

---

## 4. The response envelope

### 4.1 `src/parsing/dto/parse-response.dto.ts`

```ts
import type { ParseResult } from './response.schema';

/** The full body returned on 200. */
export interface ParseResponseDto {
  result: ParseResult;
  meta: {
    correlationId: string;
    idempotencyKey: string;

    /** Echoed for observability. The caller enforces the floor, not us. */
    confidenceThreshold: number;

    processingMs: number;
    modelAttempts: number;

    /**
     * Languages observed in the document. Observability ONLY — not a result
     * field, never written to a profile. A systematic failure on, say,
     * Japanese resumes is invisible in aggregate metrics because the volume is
     * small and the errors average away; per-language measurement is the only
     * way to see it.
     */
    detectedLanguages: string[];

    /**
     * True where extracted text exceeded MAX_EXTRACTED_CHARS and was cut.
     * The caller MAY tell the talent; it must never be silent. Silent
     * truncation is a known industry failure.
     */
    truncated: boolean;

    /** Character count after text extraction, before any truncation. */
    extractedCharacters: number;
  };
}
```

### 4.2 Why the language and truncation signals live in `meta`, not `result`

`result` is the closed set of fields that map to the profile. `meta` is everything the caller needs to *operate* — trace the request, tune the threshold, decide whether to warn about a truncated document. Putting `detectedLanguages` in `result` would imply it belongs on the profile; putting it in `meta` correctly marks it as observability. The distinction keeps the profile-bound schema closed while still surfacing what operations needs.

---

## 5. The extraction port

The controller and service depend on an interface, not on a model. Doc 05 supplies the real implementation; Doc 04 wires a stub so the API layer builds and tests without a provider.

### 5.1 `src/parsing/extraction.port.ts`

```ts
import type { ParseResult } from './dto/response.schema';
import type { AcceptedMimeType } from '../common/validation/file-validator';

export interface ExtractionInput {
  buffer: Buffer;
  mimeType: AcceptedMimeType;
  correlationId: string;
}

export interface ExtractionOutput {
  result: ParseResult;
  modelAttempts: number;
  detectedLanguages: string[];
  truncated: boolean;
  extractedCharacters: number;
}

/**
 * The boundary between the API layer and everything expensive.
 *
 * Implementations MUST:
 *   - throw ParseException.passwordProtected() for encrypted documents
 *   - throw ParseException.unreadable() when no text can be extracted
 *   - throw ParseException.documentTooLong() above HARD_REJECT_CHARS,
 *     BEFORE any model call
 *   - truncate at a paragraph boundary above MAX_EXTRACTED_CHARS, keeping the
 *     HEAD of the document, and report truncated: true
 *   - throw ParseException.modelUnavailable() when the provider fails
 *   - never chunk: one document, one call
 *   - never return a partially-validated result
 *   - never persist the buffer
 */
export interface ExtractionPort {
  extract(input: ExtractionInput): Promise<ExtractionOutput>;
}

/** Injection token — Nest cannot inject a bare interface. */
export const EXTRACTION_PORT = Symbol('EXTRACTION_PORT');
```

### 5.2 Why this interface is the most important boundary in the service

Everything on the far side of it — the model, the prompt, retry, truncation, token budgeting — is the volatile, expensive part. Everything on the near side is stable HTTP plumbing. Because the near side depends only on this interface, the post-launch model evaluation (RU-807) is a change behind the port, not a rewrite of the service. **Nothing outside `src/parsing/llm/` may know which model is in use**, and this interface is what enforces it.

---

## 6. Definition of done

- [ ] `src/parsing/dto/` contains `parse-request.dto.ts`, `parse-response.dto.ts`, `response.schema.ts`
- [ ] `src/parsing/extraction.port.ts` exists with the token
- [ ] `parseResultSchema.parse()` accepts a well-formed result and returns typed data
- [ ] A result with `confidence` absent **throws** rather than defaulting
- [ ] A result with `"undefined"` as a string value yields `null` for that field
- [ ] A malformed single date nulls that field without failing the whole result
- [ ] `npm run build` compiles with no type errors

---

## 7. What comes next

| Doc | Uses this |
|---|---|
| **04 — API Endpoints** | Wires the controller, the stub behind `EXTRACTION_PORT`, and the caller contract |
| **05 — Integrations** | Replaces the stub with the real pipeline; produces the `meta` signals defined here |
| **07 — QA** | Tests the schema against the fixture corpus |
