# resume-parsing-service — Doc 00: Service Overview & Repo Placement

> **Updated 22 July 2026.** Confirmed decisions cascaded from the Overview Docs.
>
> - **Extraction schema closed.** Fixed set of six fields — `name`, `job_titles[]`, `skills[]`, `work_experience[]`, `education[]`, `certifications[]`. Extraction fills fields the profile data model already has and **never introduces one**. A response key outside that set is a contract defect, not new data.
> - Removed the earlier "the schema follows the onboarding steps" language, which implied this service could originate fields.
> - `job_titles[]` added; array order is now significant (reverse-chronological, first entry is the most recent role).
> - Certifications confirmed as **name and issuing body only** — no expiry field exists in the data model, so none is extracted.
> - **Correction, same day:** the six-field table is **illustrative, not a whitelist.** Any existing `user-service` field a resume can supply is extracted, including fields not enumerated in these docs. The prohibition is on *originating* a field, not on filling an undocumented one.


**Service Name:** `resume-parsing-service`
**Purpose:** Take an uploaded document, confirm it is actually a resume, and return typed structured data (skills, work experience, education, certifications, and — for the onboarding path — name) for `user-service` to apply to a profile.
**Owners:** _Backend — Profile/Onboarding pod (confirm)._
**Status:** Doc 00 of the standard series. Docs 01–07 to follow. Consolidated with the settled decisions log (01b of the feature series).

---

## 1) Purpose & Boundaries

This service exists for one reason: **document extraction is the only part of the resume-upload feature that doesn't belong in `user-service`.** It is external-dependency-heavy (an LLM vendor), failure-prone, and evolving. Isolating it keeps a third-party AI dependency out of the core identity service — the same reason `algolia-service` isolates search rather than scattering it.

It is deliberately **thin and stateless**. It does not own resumes, users, profiles, or files.

| | |
|---|---|
| **Owns** | Text extraction from PDF/DOC/DOCX; document-type classification (is this a resume?); LLM-based structured extraction; returning typed JSON + confidence. |
| **Does NOT own** | The resume file, its storage, its metadata, the profile, add-vs-replace logic, undo, or any user-facing state. All of that is `user-service`. |

Consumers: **`user-service`** only (internal auth). Not called by the frontend directly.

## 2) Repo Placement

Per the Folder Structure Policy — all code under `/apps/resume-parsing-service/src`, no repo-root `/src`, shared types via `/shared`.

```
apps/
└─ resume-parsing-service/
   ├─ Dockerfile
   ├─ Supabase.yaml
   ├─ package.json
   └─ src/
      ├─ app.module.ts
      ├─ main.ts
      ├─ controllers/      # POST /v1/parse
      ├─ services/         # text-extraction, llm-client, prompt/schema
      ├─ dto/              # parse-request, parse-result
      └─ config/
```

Stateless: no entities, no database. If a parse cache is later wanted, use Redis keyed by file hash (see §7).

## 3) Engine Decision: LLM (settled)

**Chosen: a small hosted LLM with structured/JSON-schema output.** Rejected alternatives and why:

| Option | Verdict | Reason |
|---|---|---|
| **Small hosted LLM** (Flash / mini / Haiku class) | ✅ **Chosen** | ~$0.001–0.007 per resume; understands context; classification + extraction in one call. |
| Commercial resume-parsing API (Affinda, Textkernel, RChilli) | ❌ | ~$0.02–$0.10+ per doc plus monthly minimums — 10–100× the LLM — and the same class of tool that mis-parsed a contract as a resume. |
| Self-hosted Hugging Face model | ❌ (for now) | GPU instance floor (~$200–500/mo) applies regardless of volume, plus ops burden. Only wins at millions/month. |
| Existing/legacy parser | ❌ | Demonstrated failure: imported data from a contract as if it were a resume. No concept of document type. |

**Model choice (settled): Claude Haiku class.** Already validated as extracting resumes well in manual testing, and reliable with schema-constrained output. Verified pricing at time of writing is $1 / $5 per million input / output tokens — roughly **$0.0045 per resume**, or **$4.50 per 1,000**.

Cheaper tiers exist and were considered explicitly:

| Option | Approx. per 1,000 resumes | Verdict |
|---|---|---|
| Claude Haiku class | ~$4.50 | ✅ Chosen — validated, reliable structured output |
| Gemini Flash-Lite class | ~$0.44 | Deferred — ~10× cheaper but weaker extraction; untested here |
| Mistral Small class | ~$0.75 | Deferred — untested here |
| DeepSeek class | ~$0.70 | ❌ Rejected — data residency / vendor trust constraints |

The order-of-magnitude gap is acknowledged and is **not** dismissed as noise. It is accepted for launch because extraction quality is the thing that makes this feature usable, and Haiku is the only option validated against real resumes.

**Fast-follow (tracked):** post-launch, run a real resume batch through the cheaper tiers and compare field-level accuracy against Haiku. If quality holds, migrate — the saving is 80–90%. Keep the vendor behind a `LlmClient` interface so this is a config change, not a rewrite.

## 4) The Pipeline

```
file ──▶ 1. text extraction ──▶ 2. empty? ──▶ 3. single LLM call ──▶ 4. gate ──▶ typed JSON
         (deterministic)          fallback      (classify + extract)   (reject non-resumes)
```

1. **Text extraction** — `pdf-parse`/`pdfjs` for PDF, `mammoth` for DOCX. Deterministic, free, and cuts token count substantially.
2. **Near-empty text → fallback.** A scanned/image-only resume yields no text; send the document to the model directly. Costs more tokens, handles the case.
3. **One LLM call** does classification *and* extraction, using a strict JSON schema. No second model, no extra infrastructure, no extra cost.
4. **Gate** — if not a resume or confidence is low, return a rejection. Nothing reaches the profile.

## 5) Response Shape (detail in Doc 04)

```jsonc
{
  "document_type": "resume | contract | invoice | other",
  "is_resume": true,
  "confidence": 0.0,
  "name": "…",
  "job_titles": [],
  "skills": [],
  "work_experience": [],
  "education": [],
  "certifications": []
}
```

**The classification gate is the fix for the contract bug.** A dedicated parser cannot do this — it has no concept of what it is reading. Bundling the check into the extraction call makes it free.

**Confidence threshold: 0.7 (settled).** Below it, `user-service` surfaces the "Not a resume" rejection state rather than a bad autofill. Tunable after the first 100 production uploads.

**The rule: fill any existing field the resume can supply. Never introduce one.**

This service does not define profile data. It reads a document and hands back values for fields the `user-service` data model already has. Whether a given field appears in this doc is irrelevant — **if the field exists and a resume can supply it, extract it.**

Known at time of writing:

| Field | Maps to |
|---|---|
| `name` | Account name — **onboarding only** |
| `job_titles[]` | Job title slots. Only the first (most recent) is ever used |
| `skills[]` | Profile skills |
| `work_experience[]` | Work history |
| `education[]` | Education |
| `certifications[]` | Certifications — name and issuing body only |

**This table is illustrative, not a whitelist.** The onboarding flow and the profile model contain fields not enumerated here. Any of them a resume can populate should be populated. Do not leave a field empty because it is absent from this document.

**What is prohibited** is originating a field — extraction never causes a schema change, and never invents a value for a field that does not exist. Adding a field is owned by the `user-service` data model.

**Explicit exclusions, regardless of existence.** `bio` — hand-authored *(01b)*. `location` — drives timezone and rates *(01b)*. Contact details — data minimisation *(01b)*.

## 6) Why an imperfect parser is acceptable

Extraction must be *good*, not perfect. The classification gate keeps whole wrong documents out; the review screens in `user-service` catch the rest. Additions are visible and reversible while the summary dialog is open, and anything that would **overwrite** existing profile data is held behind the explicit "Update Current Information?" dialog. Nothing destructive happens without a deliberate click.

## 7) Dependencies

| Dependency | Why |
|---|---|
| **LLM vendor API** | Classification + extraction. Behind a swappable client interface. |
| **`user-service`** | The only caller. Internal auth. |
| ~~Redis~~ | Parse caching was considered and **rejected for MVP** — each upload is parsed once, so a cache solves a problem this feature does not have. |

No database. No R2 access — the file (or its bytes) arrives from `user-service`.

## 8) Environment Variables (full list in Doc 01)

- `PORT` — service HTTP port (match Dockerfile/Supabase).
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` — vendor-agnostic naming so the model can be swapped by config.
- `PARSE_CONFIDENCE_THRESHOLD` — gate cutoff.
- `JWT_SECRET` / internal-auth config — guard the endpoint to `user-service` only.

## 9) Doc Series (create next)

- **Doc 01** — Docker & Runtime Setup (`PORT`, `/health`, `npm run start:dev`, Supabase notes).
- **Doc 02** — Folder Structure & Bootstrapping.
- **Doc 03** — DTOs & the extraction JSON schema (no entities — stateless).
- **Doc 04** — API Endpoints: `POST /v1/parse`, request/response, rejection shapes, error codes.
- **Doc 05** — Integrations: LLM client, prompt + schema, retry/timeout/token limits, fallback path.
- **Doc 06** — Observability: `/health`, parse success/rejection rates, latency, token spend.
- **Doc 07** — QA & Test Data: fixtures for clean resume, scanned resume, **contract (must be rejected)**, oversized, unsupported type, low-confidence.

## 10) Settled Parameters

| Parameter | Value |
|---|---|
| Model | Claude Haiku class (swappable via `LlmClient`) |
| Confidence threshold | **0.7** |
| Parse cache | **None** for MVP |
| Timeout | **30s hard limit**, one automatic retry before surfacing an error |
| Waiting UX | Under 10s inline loader; beyond 10s async with in-app notification |
| Vendor data handling | No training, no retention on resume content |
| Virus scan | Performed by `user-service` before the file reaches this service |

---

_Compliance/DPA considerations for sending resume text to a third-party LLM are intentionally out of scope here and belong in the standard compliance doc._
