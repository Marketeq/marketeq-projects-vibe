# `resume-parsing-service` — Resolution of the Three Known Gaps

**Prepared:** 22 July 2026
**Status:** rulings, grounded in how the established parsing vendors and the published research handle each case.
**Closes:** Data Dictionary §8, gaps 1–3.

---

## Summary of rulings

| Gap | Ruling | Changed my earlier position? |
|---|---|---|
| **1 · Multilingual** | Mixed-language is the **normal case**, not an edge case. Never declare or select a language. Extract values **as written**, never translate. Do not claim language support until measured per-language. | **Yes** — I had it as an untested edge case. It is the default for a global marketplace. |
| **2 · Truncation** | The gap is largely a phantom. Set a ceiling far above any legitimate resume, **never chunk**, and where the ceiling is hit, **flag it rather than silently truncating**. | **Yes** — I assumed a token-budget problem that the context window makes irrelevant. |
| **3 · Evaluation corpus** | **50 documents, stratified to our own talent population**, two tiers (synthetic committed, real consented and never committed). Per-field precision/recall/F1 with per-field thresholds, not a headline accuracy figure. | No — but the research supplies the numbers and the protocol. |

---

# Gap 1 — Multilingual and mixed-language documents

## What the established vendors do

<cite index="1-1">Textkernel, which absorbed Sovren, extracts from resumes in 29 languages</cite>. <cite index="12-1">Affinda covers 50+, RChilli 40+, and Textkernel adds cross-lingual skills normalisation that maps "Softwareentwickler" to "Software Developer"</cite>.

On language selection, the industry position is unambiguous. Textkernel's own documentation states that <cite index="9-1">the parser includes a language and locale analyser able to detect all supported languages, and that it is never necessary or advisable to manually override the parser's language detection</cite>. <cite index="4-1">Auto language detection means the caller never has to tell the parser what language a CV is written in.</cite>

## The finding that changes my position

**Mixed-language resumes are not an edge case. They are the norm in large parts of the world.**

<cite index="55-1">A developer in Brazil writes in Portuguese, but their skills — Python, Docker, Kubernetes — are in English. A weak parser extracts the keywords and misses the context: team size, seniority, scope.</cite> And the pattern is broader than tech: <cite index="56-1">a resume with an English summary, a Spanish education section and a Portuguese employer name is common in Latin American and EU candidate populations.</cite>

The failure mode is specific and worth internalising: <cite index="56-1">parsers trained primarily on English degrade non-uniformly across the document — section segmentation often holds, but field extraction within sections does not.</cite>

That is the dangerous shape of failure. The document *looks* parsed. Sections are found, the response is well-formed, confidence is respectable — and the values inside are wrong. Nothing in our pipeline would catch it.

## What the accuracy actually looks like

<cite index="55-1">Most parsers handle Latin-script languages — French, Spanish, German — above 94%.</cite> But the warning attached to every vendor claim is the important part: <cite index="12-1">a parser might accept a Japanese resume but extract fields at 60% accuracy versus the 95%+ claimed for English. Always test real samples in that language before committing.</cite>

## Rulings

### 1.1 · Never declare, select, or ask for a language
No language parameter in the request. No language selector in the interface. No "what language is this resume in?" step anywhere. This matches every serious vendor and it is the right default — the talent should not have to tell us something we can determine.

### 1.2 · Mixed-language is the assumed default, not an exception
**Do not attempt to determine "the" language of a document.** Many resumes do not have one. The prompt must be written so the model extracts field by field in whatever language each field appears, rather than establishing a document language and then working within it. This is a **prompt design requirement** and belongs in Doc 05.

### 1.3 · Extract as written. Never translate
A French job title is returned in French. A Japanese institution name is returned in Japanese. Translation is a **product decision about profile display**, not an extraction decision, and it belongs to `user-service` if it is ever wanted.

Two reasons this is the right call:

- **Translation is lossy and unrecoverable.** Once "Ingénieur d'études" becomes "Design Engineer" in the response, the original is gone. Extracting faithfully leaves every downstream option open.
- **It is the talent's own text.** They wrote their employer's name; we should not silently rewrite it on their profile.

Cross-lingual normalisation of the kind Textkernel does — mapping a German title onto a canonical taxonomy for matching — is a **search and matching concern**, not an extraction concern. If Marketeq wants it later, it belongs wherever the canonical skill list lives.

### 1.4 · Report the detected language in `meta`, not in `result`
The response gains **no new result field** — the schema stays closed. But `meta` gains `detectedLanguages: string[]`, an observability signal only.

This costs nothing and buys the one thing we cannot currently get: **per-language quality measurement**. Without it, a systematic failure on Japanese resumes is invisible in aggregate metrics, because Japanese resumes are a small fraction of volume and their errors average away.

### 1.5 · Do not claim language support until it is measured
The current position — "supported silently, not advertised until validated" — is correct and is now grounded rather than cautious. **A vendor's language count is a list of languages the parser accepts, not a list it is accurate in.** We should hold ourselves to the same distinction.

**Concretely:** no marketing claim, no help-centre article, and no interface copy naming supported languages until §3's evaluation shows per-language F1 for that language.

### 1.6 · Non-Latin scripts get their own evaluation stratum
Not because they are harder in principle — <cite index="61-1">the research finds no uniform penalty for non-Latin scripts</cite> — but because our measurement must be able to *see* them separately. A stratum that is 3% of volume cannot move a headline number no matter how badly it performs.

## What changes

| Doc | Change |
|---|---|
| Data Dictionary | §8 gap 1 closed. `meta.detectedLanguages` added |
| 03 — DTOs | `meta.detectedLanguages: string[]` in the response envelope |
| 05 — Integrations | Prompt must handle per-field language independently; must not establish a document language |
| 06 — Observability | Per-language parse volume, confidence distribution and rejection rate |
| 07 — QA | Non-Latin script and mixed-language strata in the corpus |

---

# Gap 2 — Truncation of very long documents

## The gap was mostly imaginary

I wrote this gap assuming a token-budget squeeze. Checking the arithmetic against real resume lengths, the squeeze does not exist at any plausible size.

**What resumes actually are:**

| Type | Typical length | Source |
|---|---|---|
| Standard resume | 1–2 pages | <cite index="32-1">1 page for 0–10 years, 2 pages for 10–20, 2–3 only for executives or academics</cite> |
| Federal (USAJOBS) | 3–7 pages | <cite index="30-1">A federal resume might be 3 to 7 pages to fit the required information</cite> |
| Academic CV | 2–5 pages typical | <cite index="31-1">Harvard notes academic CVs have no page limit and most graduate student CVs are two to five pages</cite> |
| Extreme academic CV | 10–50+ pages | <cite index="33-1">In academia there is no page limit; senior professors may have CVs extending to 10, 20, or even 50+ pages</cite> |

A 50-page dense CV is on the order of 40,000 tokens. Claude Haiku's context window is an order of magnitude larger. **Even the pathological case fits comfortably in a single call.**

So the real question is not "how do we truncate?" but "what do we do with a document so long it cannot plausibly be a resume?"

## Two findings worth keeping

**Silent truncation is a known industry failure.** <cite index="32-1">Very long resumes may experience partial parsing on some systems — some parsers truncate after processing a certain amount of text, potentially missing content from later pages.</cite> The talent gets a partial import and no indication anything was lost. That is precisely the behaviour to avoid.

**Length is not what breaks parsers — structure is.** Measured across five ATS engines on 6,800 resumes, <cite index="29-1">parse-completeness drops from 92% at 2.5 pages to 84% at 3 pages and 71% at 3.5 pages — not because parsers fail on length, but because of the structures people add when they pad: repeated section headers, broken multi-column layouts, footers that reflow mid-section. A clean 3-page federal or academic CV parses fine.</cite>

That reframes the whole gap. **Our quality risk is layout, not length**, and layout is a prompt and evaluation concern rather than a truncation policy.

## Why chunking is the wrong tool here

The chunking literature is real but it solves a different problem. <cite index="21-1">Chunking exists because documents exceed model token limits, and it aims to keep semantic units intact while fitting within them.</cite> It is built for retrieval-augmented generation over corpora, not single-document extraction that already fits.

For us, chunking would actively hurt. A resume is a **whole** — deciding whether a role is a conflict requires the dates, the company and the title together; classification requires seeing enough of the document to judge it. <cite index="22-1">Sending large amounts of content can also cause relevance degradation through "lost in the middle" effects</cite>, but that argues for not padding the prompt, not for splitting the document.

## Rulings

### 2.1 · Never chunk. One document, one call
The single combined classification-and-extraction call stands. Splitting a resume across calls costs money, loses cross-section context, and creates a reassembly problem we do not need.

### 2.2 · Ceiling set well above any legitimate resume
**150,000 characters** of extracted text — roughly 40,000 tokens, comfortably past a 50-page academic CV. Below it, the entire document goes to the model untouched.

This is deliberately generous. A limit that occasionally clips a real professor's CV is a worse failure than one that occasionally admits a long document.

### 2.3 · Above the ceiling: truncate, but say so
Where extracted text exceeds the ceiling:

1. Truncate at the ceiling, preferring a paragraph boundary.
2. **Keep the beginning.** Resumes are front-loaded and reverse-chronological — identity and most recent roles come first, and those are the highest-value fields.
3. Set **`meta.truncated: true`** and `meta.extractedCharacters` in the response.

**The flag is the point.** `user-service` can then tell the talent that we read the first part of a very long document, which is honest, or ignore it, which is a decision it gets to make. What must not happen is a talent receiving a partial import with no indication that anything was dropped.

> **Note the risk this accepts.** Skills sections often sit at the *bottom* of a resume, so keeping the beginning may drop them. That is a real cost, and it is still the right trade: identity and work history are unrecoverable by any other route, whereas a talent can add skills in a few clicks. The flag exists so this is visible rather than silent.

### 2.4 · Extreme length is a classification signal, not a truncation problem
A 400-page document is not a resume with a length problem. It is a thesis, a contract bundle, or a scanned book.

**Above 500,000 characters, do not call the model at all.** Return `422 UNREADABLE_DOCUMENT`. Rejecting is cheaper than a large model call and more honest than extracting the first 8% of a document and calling it a resume. It also protects against a trivially cheap cost-inflation attack.

### 2.5 · Track the real risk instead
Since length is not the quality risk, **layout complexity is what we should be measuring.** Doc 07's corpus must include multi-column layouts, ATS-stripped walls of text and heavy-table CVs as their own strata — those are what the 6,800-resume study identifies as the actual breakage.

## What changes

| Doc | Change |
|---|---|
| Data Dictionary | §8 gap 2 closed. `meta.truncated`, `meta.extractedCharacters` added |
| 01 — Runtime | `MAX_EXTRACTED_CHARS=150000`, `HARD_REJECT_CHARS=500000` |
| 03 — DTOs | `meta.truncated: boolean`, `meta.extractedCharacters: number` |
| 04 — Endpoints | Above the hard limit → `422 UNREADABLE_DOCUMENT` |
| 05 — Integrations | No chunking. Truncation at a paragraph boundary, keeping the head |
| 06 — Observability | Truncation rate and length distribution |
| 07 — QA | Multi-column, ATS-stripped and table-heavy strata. A 50-page CV fixture |

---

# Gap 3 — The evaluation corpus

## The protocol already exists

There is a well-established industry protocol for this, and it is smaller than instinct suggests. <cite index="43-1">The practical recommendation from production testing is a 50-CV benchmark: pull 50 resumes from your own applicant population, covering the full range of formats, industries and experience levels you actually receive. Run them through the parser. Manually compare extracted data against the source documents. Measure precision, recall and F1 specifically on skills, because that's where the damage concentrates.</cite>

<cite index="40-1">The whole protocol takes a recruiter and an analyst about a day to execute.</cite>

**Fifty, not five hundred.** A day of work, repeatable, and it is what the vendors themselves are benchmarked against.

## Why headline accuracy is the wrong metric

<cite index="40-1">Accuracy in resume parsing is a contested metric. The honest version uses three numbers per field: precision, recall and F1. A parser that extracts only the most obvious fields and ignores ambiguous ones can have very high precision and miss a lot of content. A parser that extracts aggressively can have high recall and a lot of false positives.</cite>

The distinction matters directly for us. Our extraction feeds a profile the talent then reviews:

- **A false positive** — an invented job — lands on their profile and they have to spot and delete it.
- **A false negative** — a missed job — leaves them typing it in manually.

Neither is free, but the first is worse: it puts something on a talent's public profile that they never claimed. **We should tune toward precision over recall** and say so explicitly in the prompt design.

## Where the error concentrates

<cite index="43-1">Field-level accuracy for skill extraction in production parsers ranges from 0.75 to 0.85, while basic fields like name and email hit 0.99 or higher. Every downstream matching decision inherits the error rate of the weakest extracted field.</cite>

Published benchmark figures for a Claude-class model on a real resume dataset show the same shape — near-perfect on dates, strong on named entities, and much weaker on free text:

| Field group | F1 |
|---|---|
| <cite index="41-1">Period (dates)</cite> | <cite index="41-1">0.986</cite> |
| <cite index="41-1">Named entity</cite> | <cite index="41-1">0.959</cite> |
| <cite index="41-1">Long text</cite> | <cite index="41-1">0.548</cite> |

That last row is worth sitting with. **Free-text description extraction is barely better than a coin flip on real documents.** It is a good thing we do not depend on it — and a good argument against ever surfacing job descriptions as a headline feature of this import.

## The long tail is where the real damage is

<cite index="56-1">The third thing to ask about, which most vendors will resist, is long-tail accuracy — the bottom 5–10% of resumes by parser confidence. That tail is where bias and quality issues concentrate. A parser that is 95% on average and 60% on the bottom 5% is rejecting candidates from the difficult-to-parse population at a much higher rate than the average suggests.</cite>

For a marketplace this is not only a quality question. The difficult-to-parse population skews toward non-native English speakers, older talent submitting scanned documents, and candidates from regions with different resume conventions. **An average that hides a bad tail is an equity problem wearing a metrics costume.**

## The privacy problem, and its answer

We cannot simply keep real resumes as a permanent test set. They are personal data with no ongoing lawful basis for indefinite retention as test fixtures.

The established answer is synthetic data. <cite index="49-1">A purely synthetic dataset, since it contains no actual patient data, is not subject to GDPR</cite> — the same reasoning applies to any personal data. <cite index="52-1">Instead of masking real data, synthetic generation builds fake yet statistically representative datasets where you control distribution, outlier rates and edge cases.</cite>

That control is a real advantage, not just a compliance workaround. We can deliberately manufacture the awkward cases — the dateless role, the multi-column layout, the mononym, the mixed-language CV — at whatever frequency we want, instead of waiting for them to arrive.

## Rulings

### 3.1 · Two-tier corpus

| Tier | Size | Composition | Committed to the repo? | Purpose |
|---|---|---|---|---|
| **A — Synthetic** | ~50 | Manufactured to cover every stratum and edge case | **Yes** | The permanent regression gate. Runs in CI |
| **B — Real** | ~50, rotating | Consented, from our own talent population | **Never** | Periodic reality check that Tier A has not drifted from real documents |

**Tier A is the gate. Tier B is the calibration.** Tier A runs on every prompt or model change. Tier B runs quarterly and before any model migration, in a controlled environment, and is deleted after each run.

### 3.2 · Strata reflect *our* population, not a generic benchmark

<cite index="56-1">Public benchmark sets skew English-language and standard-format. If your candidate population includes meaningful proportions of bilingual resumes, executive CVs, or non-Latin-script names, the vendor's benchmark accuracy is an upper bound, not an estimate.</cite>

| Stratum | Why it is in the set |
|---|---|
| Standard English, 1–2 pages | The volume case |
| Multi-column layout | <cite index="56-1">Named as one of five characteristic ways real resumes break parsers</cite> |
| ATS-stripped wall of text | <cite index="56-1">Candidates who over-optimise for ATS produce text without clear section boundaries, and parsers built around header detection underperform</cite> |
| Mixed-language | The normal case in several markets — Gap 1 |
| Non-Latin script | Must be separately visible or it averages away |
| Scanned / image-only | <cite index="56-1">OCR introduces character-level errors that propagate through the pipeline</cite> |
| Academic CV, 15+ pages | Truncation and volume — Gap 2 |
| New graduate, education only | Our `nothing_found` boundary |
| Dateless roles | Our matching-key edge case |
| Non-resume documents | Contract, invoice, cover letter — the classification gate |

### 3.3 · Per-field thresholds, not one number

| Field | Minimum F1 | Rationale |
|---|---|---|
| Name | 0.95 | <cite index="43-1">Basic fields hit 0.99 in production parsers</cite> |
| Dates | 0.95 | <cite index="41-1">0.986 measured for a Claude-class model</cite> |
| Company, job title, institution | 0.90 | Named-entity performance sits near 0.95 |
| Skills | **0.80** | <cite index="43-1">Production parsers range 0.75–0.85; below 0.80 on skill extraction means systematically excluding qualified people</cite> |
| Classification (`is_resume`) | 0.98 | A false accept writes wrong data to a profile |

**A run fails if any field is below its threshold on any stratum representing 15% or more of production volume** — the procurement bar the research recommends, applied to ourselves.

### 3.4 · Report the tail, not just the mean
Every run reports the **bottom decile by confidence** separately. A headline F1 that hides a bad tail is not an acceptable result, and the tail is where our difficult-to-parse populations sit.

### 3.5 · The gate
**No prompt change and no model change ships without a Tier A run.** The prompt is source code — Doc 05 — and this is its test suite. This is what makes the post-launch cheaper-model evaluation a measured decision rather than a hopeful one.

### 3.6 · Growing the corpus without hoarding resumes
When a production failure is found, **reproduce it synthetically** — manufacture a document with the same structural property — and add that to Tier A. The real document is never retained.

## What changes

| Doc | Change |
|---|---|
| Data Dictionary | §8 gap 3 closed |
| 05 — Integrations | Prompt tuned toward **precision over recall**. Change control gated on a Tier A run |
| 06 — Observability | Confidence distribution with the bottom decile reported separately |
| 07 — QA | The whole of §3 becomes this document's core |

---

# What I got wrong

Worth recording, since two of these were my own framing rather than real gaps.

**Gap 1 — I filed mixed-language under "untested edge case."** It is the normal case across Latin America, the EU and most of tech. Treating it as exotic would have meant a prompt that establishes a document language and then works within it — which is exactly the design that produces <cite index="56-1">non-uniform degradation where sections parse but fields inside them do not</cite>. The fix is a prompt-level decision, and it needed to be made before Doc 05, not after.

**Gap 2 — I assumed a token-budget problem that does not exist.** Checking real resume lengths against the context window, even a 50-page academic CV fits in a single call with room to spare. The genuine risk is layout complexity, which the measured data shows clearly, and which I had not flagged at all.

**Gap 3 — I framed this as a large undertaking.** It is fifty documents and about a day of work, using a protocol the industry already runs. Framing it as heavy was how it stayed unstarted.
