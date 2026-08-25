# 07 — `resume-parsing-service` QA & Test Data

**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer building the test suite and evaluation harness. Assumes no prior familiarity with it.
**Prerequisites:** Docs 00–06. Builds directly on the evaluation rulings in `resume-parsing-service-GAP-RESOLUTIONS.md` §3.

---

## 1. What this document gets you

Two testing disciplines that a conventional service would merge and this one must keep apart:

- **Deterministic testing** — the parts that behave like software. Unit and contract tests, run in CI on every change, pass-or-fail.
- **Evaluation** — the parts that behave like a model. A labelled corpus measured for per-field accuracy, gating every change to the prompt.

Plus the fixture corpus both draw on, and the harness that runs the evaluation.

### 1.1 Why the split is non-negotiable

Software either works or it does not; a model is right *on average*. Testing them the same way fails in both directions: you either write brittle assertions against model output that break on harmless variation, or you let quality regressions through because "the tests pass." The deterministic suite proves the *wiring* is correct. The evaluation proves the *extraction* is good enough. Conflating them is how a prompt change ships with green tests and silently worse extraction.

---

## 2. Deterministic testing

Runs in CI. Fast, hermetic, no network, no provider. These are the tests that gate a merge.

### 2.1 What is unit-tested

| Component | Asserts |
|---|---|
| `FileValidator` | Size limits, type acceptance, **signature-vs-extension mismatch** |
| `LengthGate` | Truncate-and-flag, hard reject, near-empty → scanned path, boundary values |
| `response.schema` | Malformed values null out; required fields throw; `"undefined"` → null |
| `ExtractionPipeline` | Orchestration, schema-failure → `MODEL_UNAVAILABLE`, truncation carried through |
| `ServiceAuthGuard` | Constant-time comparison, length mismatch, missing header |
| `AnthropicLlmClient` | Retry on transient, no retry on 4xx, **against a fake — never the live provider** |

### 2.2 What is contract-tested

The full suite from Doc 04 §10 — every status code, every error code, the `meta` fields, no token leakage. **These must keep passing when the real pipeline replaces the stub**, because they define the shape `user-service` depends on. A contract-test failure is a breaking change for the caller, not a local regression.

### 2.3 The boundary

Deterministic tests **never call the model.** `AnthropicLlmClient` is tested against a fake that returns canned responses and canned errors. Real-model behaviour is not a unit-test concern — it is the evaluation's, below. This is the practical face of the §1.1 split: nothing in CI depends on a paid, non-deterministic external service.

```ts
// The fake the deterministic suite injects for LlmClient
class FakeLlmClient implements LlmClient {
  constructor(private readonly script: { raw?: unknown; error?: Error; attempts?: number }) {}
  async extract() {
    if (this.script.error) throw this.script.error;
    return { raw: this.script.raw, detectedLanguages: ['en'], attempts: this.script.attempts ?? 1 };
  }
}
```

### 2.4 CI gate

```bash
# from apps/resume-parsing-service
npm test          # unit + contract, must be green to merge
npm run test:cov  # coverage; keep the deterministic paths high
```

**The deterministic suite is a merge gate. The evaluation is a separate, prompt-and-model gate** — §3.

---

## 3. Evaluation

The discipline for measuring a probabilistic system. Grounded in the rulings from the gap research, restated here as the working procedure.

### 3.1 The corpus is two tiers

| Tier | Size | Composition | In the repo? | Runs |
|---|---|---|---|---|
| **A — Synthetic** | ~50 | Manufactured to cover every stratum and edge case | **Yes** — committed | Every prompt or model change. In CI-adjacent, not blocking a merge |
| **B — Real** | ~50, rotating | Consented, from our own talent population | **Never committed** | Quarterly and before any model migration, in a controlled environment, deleted after |

**Tier A is the gate; Tier B is the calibration.** Tier A catches regressions cheaply and repeatably. Tier B periodically checks that Tier A has not drifted from what real documents look like — because synthetic data is only as good as the imagination that made it.

### 3.2 Why synthetic can be committed and real cannot

A synthetic resume contains no personal data, so it carries no retention obligation and can live in version control forever. A real resume is personal data with no lawful basis for indefinite retention as a test fixture. This is not a nicety — committing real resumes to a repository would be a standing privacy violation. The two-tier design exists precisely so the permanent, always-available gate carries no such data.

### 3.3 Strata — reflecting our population, not a generic benchmark

Each stratum earns its place by representing a way real documents behave, drawn from the gap research. The set is what a public benchmark would miss.

| Stratum | Why it is in the set |
|---|---|
| Standard English, 1–2 pages | The volume case |
| Multi-column layout | A characteristic way real resumes break parsers |
| ATS-stripped wall of text | No clear section boundaries; header-detection parsers underperform |
| Mixed-language | The normal case in several markets — Gap 1 |
| Non-Latin script | Must be separately visible or it averages away |
| Scanned / image-only | OCR-style character errors propagate |
| Academic CV, 15+ pages | Truncation and volume — Gap 2 |
| New graduate, education only | The `nothing_found` boundary |
| Dateless roles | The matching-key edge case |
| Non-résumé documents | Contract, invoice, cover letter — the classification gate |

### 3.4 Metrics — per field, not one headline number

A single accuracy figure hides exactly the failures that matter. Every evaluation reports **precision, recall and F1 per field**, plus the classification accuracy separately.

| Field | Minimum F1 | Basis |
|---|---|---|
| Name | 0.95 | Basic fields hit ~0.99 in production parsers |
| Dates | 0.95 | ~0.99 measured for a Claude-class model |
| Company, job title, institution | 0.90 | Named-entity performance sits near 0.95 |
| Skills | **0.80** | Production parsers run 0.75–0.85; below 0.80 means systematically excluding qualified people |
| Classification (`is_resume`) | 0.98 | A false accept writes wrong data to a profile |

**A run fails if any field is below its threshold on any stratum that represents 15% or more of production volume.**

### 3.5 The tail, reported separately

Every run reports the **bottom decile by confidence** on its own. A headline F1 that hides a bad tail is not a passing result. The tail is where our difficult-to-parse populations sit — non-native speakers, scanned documents, unfamiliar conventions — so a good average over a bad tail is an equity problem, not a rounding detail. This mirrors the production confidence metric in Doc 06 §7.2; offline and online measure the same thing at different times.

### 3.6 The gate

**No change to the prompt (Doc 05 §5) and no change to the model ships without a Tier A run that clears every threshold in §3.4.** The prompt is source code; this is its test suite. This rule is the whole reason the service's quality does not drift silently.

---

## 4. The fixture corpus

### 4.1 Layout

```
test/fixtures/
├── documents/                    ← the input files
│   ├── standard-en-01.pdf
│   ├── standard-en-02.docx
│   ├── multicolumn-01.pdf
│   ├── ats-stripped-01.pdf
│   ├── mixed-lang-pt-en-01.pdf
│   ├── nonlatin-ja-01.pdf
│   ├── scanned-01.pdf
│   ├── academic-cv-01.pdf        ← 15+ pages, exercises truncation
│   ├── new-grad-01.pdf           ← education only, nothing_found boundary
│   ├── dateless-roles-01.pdf
│   ├── not-a-resume-contract-01.pdf
│   ├── not-a-resume-invoice-01.pdf
│   ├── password-protected-01.pdf
│   └── oversized-01.pdf          ← over HARD_REJECT_CHARS
└── expected/                     ← the labels, one JSON per document
    ├── standard-en-01.json
    └── …
```

### 4.2 A label file

The known-correct extraction for a synthetic document. Because the document is synthetic, the label is authoritative — we manufactured both.

```json
{
  "document": "standard-en-01.pdf",
  "stratum": "standard-en",
  "volumeWeight": 0.55,
  "expected": {
    "document_type": "resume",
    "is_resume": true,
    "confidence_min": 0.7,
    "name": "Jordan Rivera",
    "job_titles": ["Senior Product Manager", "Product Manager"],
    "skills": ["Roadmapping", "SQL", "A/B Testing", "Stakeholder Management"],
    "work_experience": [
      { "job_title": "Senior Product Manager", "company": "Northwind Labs", "start_date": "2021-01" }
    ],
    "education": [
      { "institution": "State University", "degree": "BA Economics" }
    ],
    "certifications": []
  }
}
```

Notes on the label shape:

- `confidence_min`, not an exact confidence — the model's confidence is not deterministic, so we assert a floor.
- `volumeWeight` — the stratum's share of production traffic, used by the 15%-threshold rule in §3.4.
- Fields are matched **normalised**: case-insensitive, punctuation-stripped, the same normalisation the evaluation uses so a trivial formatting difference is not scored as a miss.

### 4.3 Growing the corpus without hoarding resumes

When a production failure surfaces — a resume that parsed badly — **reproduce it synthetically.** Manufacture a document with the same structural property (the same multi-column quirk, the same date format, the same language mix) and add it to Tier A with its label. The real document is never retained. Over time the synthetic corpus accumulates the real failure modes without ever accumulating real personal data.

> **This is the mechanism that keeps Tier A honest.** Left alone, a synthetic corpus tests only the failures its authors imagined. Fed by production failures reproduced synthetically, it tests the failures that actually happen — while Tier B independently checks that the reproduction is faithful.

---

## 5. The evaluation harness

Runs the corpus through the real pipeline and scores it. Lives outside the CI merge gate — it needs a provider key and is slower — but is required before a prompt or model change.

### 5.1 `test/eval/run-eval.ts`

```ts
/**
 * Evaluation harness. NOT part of `npm test` — it calls the real model and
 * costs money. Run before shipping any prompt or model change:
 *
 *   npm run eval
 *
 * Fails the process (non-zero exit) if any field is below its threshold on any
 * stratum at or above 15% volume weight. That exit code is what a release
 * pipeline gates on.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreDocument, type FieldScores } from './scoring';
import { THRESHOLDS } from './thresholds';
import { runPipelineOnce } from './harness';

interface Label {
  document: string;
  stratum: string;
  volumeWeight: number;
  expected: Record<string, unknown>;
}

async function main() {
  const expectedDir = join(__dirname, '../fixtures/expected');
  const labels: Label[] = readdirSync(expectedDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(expectedDir, f), 'utf8')));

  const byStratum = new Map<string, { scores: FieldScores[]; weight: number }>();

  for (const label of labels) {
    const actual = await runPipelineOnce(label.document); // calls the real pipeline
    const scores = scoreDocument(actual, label.expected);
    const bucket = byStratum.get(label.stratum) ?? { scores: [], weight: label.volumeWeight };
    bucket.scores.push(scores);
    byStratum.set(label.stratum, bucket);
  }

  let failed = false;
  console.log('\n=== Evaluation results ===\n');

  for (const [stratum, { scores, weight }] of byStratum) {
    const f1 = aggregateF1(scores); // per-field F1 across the stratum
    console.log(`Stratum: ${stratum} (weight ${weight})`);

    for (const [field, threshold] of Object.entries(THRESHOLDS)) {
      const value = f1[field] ?? 0;
      const gated = weight >= 0.15;
      const pass = value >= threshold || !gated;
      const mark = value >= threshold ? 'ok ' : gated ? 'FAIL' : 'warn';
      console.log(`  ${mark}  ${field}: ${value.toFixed(3)} (min ${threshold})`);
      if (!pass) failed = true;
    }
    console.log('');
  }

  // The tail, reported separately — never gated away by a healthy average.
  reportBottomDecile(byStratum);

  if (failed) {
    console.error('Evaluation FAILED — a gated field is below threshold.');
    process.exit(1);
  }
  console.log('Evaluation passed.');
}

void main();
```

### 5.2 `test/eval/thresholds.ts`

```ts
/** Per-field F1 floors from Doc 07 §3.4. Changing these is a policy decision. */
export const THRESHOLDS: Record<string, number> = {
  name: 0.95,
  dates: 0.95,
  company: 0.90,
  job_title: 0.90,
  institution: 0.90,
  skills: 0.80,
  classification: 0.98,
};
```

### 5.3 Scoring notes

- **Precision, recall, F1 per field** — a missed certification and an invented one are different failures and must score differently. Recall catches the miss; precision catches the invention.
- **Normalised comparison** — case, punctuation and suffix-insensitive, matching the pipeline's own normalisation, so formatting differences are not scored as errors.
- **Classification scored separately** from extraction — a parser can be great at extraction and bad at knowing when to, and those are different problems with different fixes.

### 5.4 `package.json` — add

```json
{
  "scripts": {
    "eval": "tsx test/eval/run-eval.ts"
  }
}
```

```bash
npm install -D tsx
```

---

## 6. Test data for the deterministic suite

Distinct from the evaluation corpus — these are tiny, hand-built inputs that exercise specific code paths, not extraction quality.

### 6.1 Minimal binary fixtures

| Fixture | Exercises |
|---|---|
| Valid minimal PDF | Happy path through validation |
| PNG bytes named `.pdf` | Signature mismatch → `415 TYPE_MISMATCH` |
| Zero-byte file | `400 EMPTY_FILE` |
| 6MB file | `413 FILE_TOO_LARGE` |
| Encrypted PDF | `422 PASSWORD_PROTECTED` |
| Text over `HARD_REJECT_CHARS` | `422 DOCUMENT_TOO_LONG` |

These are constructed in-test where possible — a PNG signature is eight bytes — so the repository does not fill with binary blobs.

### 6.2 Model-response fixtures

Canned `raw` responses fed to the fake `LlmClient`, to drive the pipeline's validation paths without a provider:

| Fixture | Exercises |
|---|---|
| Well-formed resume result | Happy path |
| `is_resume: false` | Classification rejection → `not_a_resume` on the caller side |
| All arrays empty | `nothing_found` boundary |
| `confidence` absent | Schema throws — required field |
| `"undefined"` string in a field | Normalises to null |
| Object where a string is expected | Field discarded, no `[object Object]` |
| Malformed date | That field nulls, the rest survives |
| Duplicate job titles preserved in order | Order significance |

### 6.3 The privacy assertion

One deterministic test earns a special mention because it guards the rule that matters most:

```ts
it('never logs extracted content', async () => {
  const logs = captureLogs();
  await parseWith({ name: 'Jane Confidential', skills: [{ name: 'SecretSkill' }] });
  const output = logs.all();
  expect(output).not.toContain('Jane Confidential');
  expect(output).not.toContain('SecretSkill');
});
```

**This test should exist and stay green permanently.** It is the automated form of the §4 logging rule from Doc 06 — the one privacy failure that is easy to introduce and hard to undo. A failing version of this test is a release blocker, not a warning.

---

## 7. What each testing layer catches

| Layer | Catches | Misses |
|---|---|---|
| Unit | Logic bugs in validation, gating, schema | Whether extraction is any good |
| Contract | Breaking changes to the `user-service` interface | Quality; model behaviour |
| Evaluation (Tier A) | Extraction-quality regressions from a prompt or model change | Drift between synthetic and real documents |
| Evaluation (Tier B) | That drift | Nothing it does not sample — it is periodic |
| Production metrics (Doc 06) | Quality and cost drift in the wild | Anything before release |

**No single layer is sufficient, and the gaps are deliberate.** Unit and contract tests gate the merge. Tier A gates the prompt. Tier B calibrates Tier A. Production metrics watch what all of them cannot see until it is live. A change to this service is only safe when it has cleared the layer that governs it — and a prompt change that passed unit tests but skipped evaluation has not been tested in the way that matters.

---

## 8. CI and release gates

| Gate | Runs | Blocks | On |
|---|---|---|---|
| Unit + contract | Every push | Merge | `npm test` |
| Coverage | Every push | Merge if it drops sharply | `npm run test:cov` |
| Privacy log assertion | Every push | Merge | part of `npm test` |
| **Evaluation (Tier A)** | **Every prompt or model change** | **Release** | `npm run eval` |
| Evaluation (Tier B) | Quarterly; pre-migration | Migration sign-off | Manual, controlled env |

### 8.1 The rule to enforce in the pipeline

**A diff that touches `src/parsing/llm/prompt.ts`, `MODEL_ID`, or `EXTRACTION_JSON_SCHEMA` must run `npm run eval` and clear it before release.** Wire this as a required check keyed on those paths. It is the single most important gate in the service, because those three files are the ones that change extraction behaviour, and they are exactly the ones a green unit-test suite says nothing about.

---

## 9. Definition of done

- [ ] Unit tests cover validator, length gate, schema, pipeline, guard, model client — all against fakes
- [ ] The full Doc 04 §10 contract suite passes against the real pipeline
- [ ] The privacy log assertion exists and passes
- [ ] Tier A corpus exists: ~50 synthetic documents across the §3.3 strata, each with a label
- [ ] `npm run eval` runs the corpus and reports per-field F1 by stratum
- [ ] The harness exits non-zero when a gated field is below threshold
- [ ] The bottom decile is reported separately
- [ ] No real resume is committed to the repository
- [ ] The release pipeline gates prompt/model/schema changes on `npm run eval`

---

## 10. The whole service, in one line

**Deterministic tests prove it is wired correctly; evaluation proves it extracts well; production metrics prove it still does.** Each answers a question the others cannot, and the service is trustworthy only with all three — because a model-backed service is the kind that passes every test and still, quietly, gets worse.

---

## 11. Series complete

This is the last document in the `resume-parsing-service` build series.

| Doc | Covers |
|---|---|
| 00 | Service overview |
| 01 | Docker & runtime |
| 02 | Folder structure & bootstrapping |
| 03 | DTOs & extraction schema |
| 04 | API endpoints |
| 05 | Integrations — model, prompt, pipeline |
| 06 | Observability |
| **07** | **QA & test data** |

Supporting artefacts: the Data Dictionary, the Gap Resolutions, and — on the epic side — the `user-service` feature docs and the 01–08 frontend series.

**The three things to protect as this service evolves:** statelessness (Doc 01 §9), the model boundary (Doc 05 §4), and the evaluation gate (this document §8.1). Each is easy to erode one reasonable-looking change at a time, and each is why the service is what it is.
