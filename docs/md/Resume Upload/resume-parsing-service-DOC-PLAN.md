# `resume-parsing-service` — Documentation Index

**Service:** `resume-parsing-service`
**Owner:** Platform / Talent Profile
**Prepared:** 22 July 2026
**Status:** index. The series it planned is complete; this file is now the map to it.

> This began as a planning artefact proposing a document structure. That plan was superseded by the seven-doc build checklist, which is now finished. What follows is the accurate index of what exists, kept in place of the original plan so nothing points at a structure that was never built.

---

## The build series — complete

Read in order. Each assumes the ones before it and states its prerequisites at the top.

| Doc | File | Covers |
|---|---|---|
| 00 | `resume-parsing-service-doc-00-overview.md` | Overview and architecture — responsibilities, boundaries, the stateless pipeline, model choice, response shape |
| 01 | `resume-parsing-service-01-docker-runtime-setup.md` | Docker, health probes, graceful shutdown, every env var, and why there is no database |
| 02 | `resume-parsing-service-02-folder-structure-bootstrapping.md` | Source tree, config validation at boot, logging discipline, module wiring |
| 03 | `resume-parsing-service-03-dtos-extraction-schema.md` | Request and response shapes, the runtime schema, per-field semantics, the extraction port |
| 04 | `resume-parsing-service-04-api-endpoints.md` | `POST /v1/parse`, auth, error codes, interceptors, the stub, contract tests, the caller contract |
| 05 | `resume-parsing-service-05-integrations.md` | The real pipeline — text extraction, length gate, the prompt, structured outputs, the model client, retry, cost |
| 06 | `resume-parsing-service-06-observability.md` | Metrics, the confidence-distribution quality signal, logging, tracing, alerts, dashboards |
| 07 | `resume-parsing-service-07-qa-test-data.md` | Deterministic tests vs evaluation, the two-tier corpus, the eval harness, the release gate |

## Supporting artefacts

| File | Purpose |
|---|---|
| `resume-parsing-service-DATA-DICTIONARY.md` | The wire contract in one place. §8 records the closed gaps |
| `resume-parsing-service-GAP-RESOLUTIONS.md` | The three known gaps — multilingual, truncation, evaluation corpus — resolved with research |

## What shaped the series

Two facts drove every decision worth remembering:

**It is stateless.** No database, no disk, no cache. It takes bytes, returns JSON, forgets. That single property determines the runtime (Doc 01 §9), the folder rules (Doc 02 §11), and why it holds no storage credentials (Doc 04 §1.1).

**Its core dependency is a probabilistic model.** That moves the documentation weight away from schemas and migrations and toward prompt design, evaluation, cost, and model migration. Docs 05, 06 and 07 have no equivalent in a conventional CRUD service, and they are the ones that matter most — because a model-backed service fails quietly, in quality and cost, before it fails loudly.

## The three properties to protect as it evolves

Each erodes one reasonable-looking commit at a time:

1. **Statelessness** — Doc 01 §9. The moment something needs a database, it has been designed into the wrong service.
2. **The model boundary** — Doc 05 §4. Nothing outside `src/parsing/llm/` knows which model is in use, which is what makes the cheaper-model evaluation a config change.
3. **The evaluation gate** — Doc 07 §8.1. No prompt, model or schema change ships without an eval run.

---

## Note on the two numbering spaces

The `01–08` documents in this directory are the **Talent Profile epic's** frontend series (they span `user-service`), not this service's docs. The two series share small numbers but are separate deliverables — the epic docs are referenced by ID throughout and were deliberately not renumbered. Keeping the spaces distinct is less confusing than making them look continuous when they are not.
