# 06 — `resume-parsing-service` Observability

**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer instrumenting this service. Assumes no prior familiarity with it.
**Prerequisites:** Docs 00–05.

---

## 1. What this document gets you

Everything needed to know whether this service is healthy, and to diagnose it when it is not, without ever logging a person's resume:

- the metrics that matter and why,
- the one metric that is a quality signal disguised as ordinary telemetry,
- structured logging with document content excluded by construction,
- tracing across the `user-service` boundary,
- alerts with thresholds and owners,
- dashboards that answer specific questions.

### 1.1 The one idea to hold onto

**This is a model-backed service, so its most important signal is not error rate — it is the confidence distribution.** A service where every request succeeds, latency is excellent and error rate is zero can still be quietly getting worse, because the model is returning lower-quality extractions that are all technically valid. Error-rate dashboards cannot see that. The confidence distribution can. Everything below is arranged around making quality drift visible, not just failures.

---

## 2. Metrics

Emitted as counters, histograms and gauges. Names use the `resume_parse_` prefix.

### 2.1 Traffic and outcome

| Metric | Type | Labels | Answers |
|---|---|---|---|
| `resume_parse_requests_total` | counter | `outcome` | How much traffic, and how it splits across success/rejection/failure |
| `resume_parse_classification_total` | counter | `document_type`, `is_resume` | How often uploads are actually resumes |
| `resume_parse_rejections_total` | counter | `code` | Which rejections dominate — bad files, wrong types, non-resumes |
| `resume_parse_nothing_found_total` | counter | — | Resumes that yielded no extractable data |

`outcome` values: `success`, `not_a_resume`, `nothing_found`, `validation_error`, `too_large`, `unsupported_type`, `password_protected`, `document_too_long`, `model_unavailable`, `deadline_exceeded`, `internal_error`.

### 2.2 The headline quality signal

| Metric | Type | Labels | Answers |
|---|---|---|---|
| `resume_parse_confidence` | histogram | `language` | **Is extraction quality drifting?** And where should the 0.7 threshold sit? |

**This is the metric to watch.** Two uses:

1. **Threshold tuning.** After the first 100 production uploads, the confidence distribution tells you whether 0.7 is right. A cluster of real resumes landing at 0.65 means the floor is rejecting good documents; a cluster of non-resumes at 0.75 means it is letting junk through.
2. **Drift detection.** A distribution that shifts downward over weeks — without any error rate moving — is the earliest sign that extraction quality is falling, whether from a provider-side model change or a shift in the documents talent are uploading.

The `language` label is what makes a systematic failure on, say, Japanese resumes visible. Without it, a small-volume language's poor confidence averages away into a healthy-looking aggregate. **The bottom decile of this distribution is where quality problems and equity problems both concentrate** — Doc 07 §3.4 requires reporting it separately, and this metric is how.

### 2.3 Latency and cost

| Metric | Type | Labels | Answers |
|---|---|---|---|
| `resume_parse_duration_ms` | histogram | `stage` | Where time goes, and whether the 30s budget is at risk |
| `resume_parse_model_attempts` | histogram | — | How often the internal retry fires — a proxy for provider flakiness |
| `resume_parse_input_tokens_total` | counter | — | Token spend, the dominant cost |
| `resume_parse_output_tokens_total` | counter | — | |
| `resume_parse_truncated_total` | counter | — | How often documents exceed the ceiling |
| `resume_parse_extracted_characters` | histogram | — | Document-length distribution |

`stage` values: `text_extraction`, `model_call`, `total`. Recording per stage is what lets you tell "the model is slow" from "our text extraction is slow" during an incident — a distinction that decides whether you page the provider or look at your own code.

### 2.4 What is deliberately not a metric

| Not measured | Why |
|---|---|
| Any extracted value | Personal data. Never leaves the service, never enters telemetry |
| Which talent uploaded | The service does not know, by design |
| Model output text | Content, not shape |

---

## 3. Instrumentation

### 3.1 Dependencies

```bash
# from apps/resume-parsing-service
npm install prom-client @willsoto/nestjs-prometheus
```

`prom-client` is the standard Prometheus client; the Nest wrapper exposes a `/metrics` endpoint and handles registration.

### 3.2 `src/observability/metrics.module.ts`

```bash
mkdir -p src/observability
```

```ts
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

/**
 * Exposes GET /metrics for the scraper. That endpoint is internal-only, like
 * everything else on this service — the metrics reveal traffic shape and should
 * not be public.
 */
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true }, // process/heap/event-loop
    }),
  ],
  providers: [
    MetricsService,
    makeCounterProvider({
      name: 'resume_parse_requests_total',
      help: 'Total parse requests by outcome',
      labelNames: ['outcome'],
    }),
    makeCounterProvider({
      name: 'resume_parse_classification_total',
      help: 'Classification outcomes',
      labelNames: ['document_type', 'is_resume'],
    }),
    makeCounterProvider({
      name: 'resume_parse_rejections_total',
      help: 'Rejections by error code',
      labelNames: ['code'],
    }),
    makeHistogramProvider({
      name: 'resume_parse_confidence',
      help: 'Model confidence distribution',
      labelNames: ['language'],
      buckets: [0.3, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.9, 0.95, 1.0],
    }),
    makeHistogramProvider({
      name: 'resume_parse_duration_ms',
      help: 'Processing duration by stage',
      labelNames: ['stage'],
      buckets: [100, 500, 1000, 2500, 5000, 10000, 20000, 30000],
    }),
    makeHistogramProvider({
      name: 'resume_parse_model_attempts',
      help: 'Model attempts per request',
      labelNames: [],
      buckets: [1, 2, 3],
    }),
    makeCounterProvider({
      name: 'resume_parse_input_tokens_total',
      help: 'Total input tokens',
    }),
    makeCounterProvider({
      name: 'resume_parse_output_tokens_total',
      help: 'Total output tokens',
    }),
    makeCounterProvider({
      name: 'resume_parse_truncated_total',
      help: 'Documents truncated at the ceiling',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
```

### 3.3 `src/observability/metrics.service.ts`

```ts
import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

/**
 * A thin, typed facade so the rest of the service records metrics without
 * knowing the label conventions. One place to change if the metric shape
 * changes.
 */
@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('resume_parse_requests_total') private readonly requests: Counter,
    @InjectMetric('resume_parse_classification_total') private readonly classification: Counter,
    @InjectMetric('resume_parse_rejections_total') private readonly rejections: Counter,
    @InjectMetric('resume_parse_confidence') private readonly confidence: Histogram,
    @InjectMetric('resume_parse_duration_ms') private readonly duration: Histogram,
    @InjectMetric('resume_parse_model_attempts') private readonly attempts: Histogram,
    @InjectMetric('resume_parse_input_tokens_total') private readonly inputTokens: Counter,
    @InjectMetric('resume_parse_output_tokens_total') private readonly outputTokens: Counter,
    @InjectMetric('resume_parse_truncated_total') private readonly truncated: Counter,
  ) {}

  recordOutcome(outcome: string) {
    this.requests.inc({ outcome });
  }
  recordClassification(documentType: string, isResume: boolean) {
    this.classification.inc({ document_type: documentType, is_resume: String(isResume) });
  }
  recordRejection(code: string) {
    this.rejections.inc({ code });
  }
  recordConfidence(value: number, language = 'unknown') {
    this.confidence.observe({ language }, value);
  }
  recordDuration(stage: string, ms: number) {
    this.duration.observe({ stage }, ms);
  }
  recordAttempts(n: number) {
    this.attempts.observe(n);
  }
  recordTokens(input: number, output: number) {
    this.inputTokens.inc(input);
    this.outputTokens.inc(output);
  }
  recordTruncated() {
    this.truncated.inc();
  }
}
```

### 3.4 Recording from the service

`ParsingService.parse()` (Doc 04 §8.1) gains metric calls alongside its existing log line. The pattern:

```ts
// after a successful extraction
this.metrics.recordOutcome(this.deriveOutcome(result));
this.metrics.recordClassification(result.document_type, result.is_resume);
this.metrics.recordConfidence(result.confidence, detectedLanguages[0] ?? 'unknown');
this.metrics.recordDuration('total', processingMs);
this.metrics.recordAttempts(modelAttempts);
if (truncated) this.metrics.recordTruncated();
```

Rejections are recorded in the exception filter (Doc 04 §3.3), where every `ParseException` already passes through:

```ts
// inside AllExceptionsFilter, in the ParseException branch
this.metrics.recordRejection(exception.code);
```

> **`deriveOutcome` maps a result to its outcome label** — `success`, or `nothing_found` when every array is empty. Keep that logic in one place; it is the same distinction the caller makes, and the two must not drift.

---

## 4. Logging

Doc 01 §11 and Doc 02 §8 established the rule; this section is the operational view of it.

### 4.1 The one inviolable rule

**No document content in any log line, at any level.** No name, company, skill, extracted text or model output. A resume is personal data; a log aggregator is long-retention and broadly readable. Once personal data is in it, removal is an incident.

### 4.2 What a good log line looks like

Every parse emits exactly one structured completion line — shape, never content:

```json
{
  "level": "info",
  "correlationId": "b3f1…",
  "documentType": "resume",
  "isResume": true,
  "confidence": 0.94,
  "fileBytes": 214113,
  "mimeType": "application/pdf",
  "modelAttempts": 1,
  "processingMs": 3241,
  "truncated": false,
  "extractedCharacters": 4180,
  "detectedLanguages": ["en"],
  "counts": { "skills": 12, "workExperience": 4, "education": 2, "certifications": 1 },
  "msg": "Parse completed"
}
```

Counts, not values. `"skills": 12` — never the twelve skills.

### 4.3 Log levels and what belongs at each

| Level | Use | Example |
|---|---|---|
| `error` | Our bug, or a 5xx | Unhandled exception; schema-validation failure |
| `warn` | Expected non-success, or a retry | A rejected upload; a model retry |
| `info` | Normal completion | The line above |
| `debug` | Local diagnosis only | Stage timings — **still never content** |

**`debug` is not an escape hatch.** A `LOG_LEVEL=debug` line reaches the same aggregator the instant someone raises the level during an incident — which is exactly when volume is highest and review is lowest. The content rule holds at every level.

### 4.4 Correlation

Every line carries `correlationId`, supplied by `user-service` and echoed on the response (Doc 04 §5.1). This is the thread a support engineer follows from a talent's complaint, through `user-service`, into this service's logs. Because the ID originates upstream, it appears in both services' logs — a generated one would not.

---

## 5. Tracing

### 5.1 The boundary that matters

The one trace worth instrumenting is the `user-service` → `resume-parsing-service` call. When a parse is slow, the question is always "was it the model, our text extraction, or the network between the services?" — and a distributed trace answers it directly.

### 5.2 Spans

| Span | Parent | Captures |
|---|---|---|
| `parse.request` | the caller's span | whole request |
| `parse.text_extraction` | `parse.request` | deterministic extraction |
| `parse.length_gate` | `parse.request` | gating decision |
| `parse.model_call` | `parse.request` | the model round-trip, including retries |
| `parse.validation` | `parse.request` | schema validation |

Propagate the trace context from the incoming `x-correlation-id` and any standard trace headers `user-service` sends, so the spans nest under the caller's trace rather than starting a disconnected one.

**Span attributes follow the same content rule** — durations, attempt counts, outcome codes, never extracted values.

---

## 6. Alerts

Each alert names a threshold and an owner. The philosophy: **page on things a human must act on now; ticket on things that need attention this week.**

| Alert | Condition | Severity | Owner acts on |
|---|---|---|---|
| Model provider down | `model_unavailable` rate > 20% for 5 min | **Page** | Provider incident — check status, consider the fallback in RU-807 |
| Elevated failures | 5xx rate > 5% for 10 min | **Page** | Something in our pipeline broke |
| Latency budget at risk | p95 `total` > 20s for 10 min | **Page** | Approaching the 30s deadline; parses will start timing out |
| Cost spike | input tokens/hour > 2× trailing 7-day mean | Ticket | Usually the scanned-resume path rising or endpoint abuse |
| Confidence drift | median `confidence` drops > 0.1 vs 7-day baseline | Ticket | **Quality is falling** — investigate before talent notice |
| Rejection surge | `not_a_resume` rate > 40% for 30 min | Ticket | Either the gate is miscalibrated or something upstream changed |
| Truncation surge | `truncated` rate > 5% | Ticket | Unusual — investigate the document mix |
| Data-shape anomaly | `validation_error` rate > 0 sustained | Ticket | **Contract drift** with the model or the schema |

### 6.1 The two alerts unique to a model-backed service

Most services do not have these, and they are the ones that catch the failures error rates miss:

- **Confidence drift** is the early warning that extraction quality is falling. By the time it shows up in talent complaints, it has been happening for weeks. This alert catches it while it is still a ticket, not an incident.
- **Data-shape anomaly** fires when the model's output stops matching the schema — a provider-side model change, or a drift between the JSON Schema and the Zod schema. Any sustained occurrence is a contract problem, never a talent problem, and it should never be zero-tolerance-adjacent quietly.

### 6.2 What not to alert on

| Not an alert | Why |
|---|---|
| A single `model_unavailable` | The caller retries. One is noise |
| `nothing_found` occurring | A normal outcome, not a failure |
| A truncation event | Expected on very long documents; only a *surge* is interesting |
| High `not_a_resume` on low volume | Wait for volume before reading a rate |

---

## 7. Dashboards

Three dashboards, each answering a specific question. A dashboard that does not answer a question nobody asks is clutter.

### 7.1 "Is the service healthy right now?" — the on-call view

| Panel | Metric |
|---|---|
| Request rate | `rate(resume_parse_requests_total)` |
| Success vs failure | `resume_parse_requests_total` by `outcome` |
| p50 / p95 / p99 latency | `resume_parse_duration_ms{stage="total"}` |
| Model availability | `model_unavailable` rate |
| Model attempts | `resume_parse_model_attempts` — a rising p95 means provider flakiness |

This is what an on-call engineer opens first. It answers up-or-down and where-it-hurts in five seconds.

### 7.2 "Is extraction quality holding?" — the weekly review

| Panel | Metric |
|---|---|
| Confidence distribution | `resume_parse_confidence` heatmap over time |
| Confidence by language | `resume_parse_confidence` by `language` — **the bottom decile is the panel to read** |
| Classification split | `resume_parse_classification_total` — what fraction of uploads are resumes |
| `nothing_found` rate | rising means extraction is degrading even when nothing errors |
| Rejection breakdown | `resume_parse_rejections_total` by `code` |

**This is the dashboard the on-call view cannot replace.** Nothing here is an error, yet all of it is quality. A downward confidence trend, a rising `nothing_found` rate, or a per-language cluster near the floor each signals degradation that the health view shows as perfectly green.

### 7.3 "What is this costing?" — the monthly view

| Panel | Metric |
|---|---|
| Token spend | `rate(resume_parse_input_tokens_total)`, `output` |
| Cost estimate | tokens × current rate |
| Truncation rate | `resume_parse_truncated_total` |
| Document-length distribution | `resume_parse_extracted_characters` |
| Cost per resume | total spend / `resume_parse_requests_total{outcome="success"}` |

Cost per resume is the number RU-807 moves. A cheaper model that holds the Doc 07 quality bar drops this panel by 80–90%, and this is where that gets confirmed in production rather than assumed.

---

## 8. The three signals that matter most

If only three things were watched, these:

| Signal | Catches | Where it would otherwise hide |
|---|---|---|
| **Confidence distribution, by language** | Quality drift and per-language failure | Invisible in error rate — every request succeeds |
| **`validation_error` rate** | Contract drift with the model or schema | Looks like a rare 5xx until you notice it is systematic |
| **Cost per resume** | Provider price change, scanned-path rise, abuse | Buried in an aggregate cloud bill |

Every one of these is invisible on a conventional up/down dashboard. That is the theme of this whole document: **a model-backed service fails quietly, in quality and in cost, long before it fails loudly.** Instrument for the quiet failures, because the loud ones were never the hard part.

---

## 9. Definition of done

- [ ] `/metrics` serves Prometheus metrics, internal-only
- [ ] Every `outcome` value is emitted by real traffic in a test run
- [ ] `resume_parse_confidence` records with a `language` label
- [ ] Rejections increment `resume_parse_rejections_total` by `code` from the exception filter
- [ ] Token counts are recorded per request
- [ ] The completion log line contains counts and never a single extracted value
- [ ] `grep` for any extracted-field name in the log output during a test run returns nothing
- [ ] The three dashboards from §7 exist and load
- [ ] Confidence-drift and data-shape-anomaly alerts are configured with owners

---

## 10. What comes next

| Doc | Relationship |
|---|---|
| **07 — QA & Test Data** | The evaluation corpus is the offline counterpart to the confidence metric here — one measures quality pre-release, the other in production |

> **Doc 06 and Doc 07 are the pair that make this service operable.** 07 proves quality before a change ships; 06 watches it after. A model-backed service without both is a service nobody can reason about — it will appear healthy while slowly getting worse, and no one will know until the complaints arrive.
