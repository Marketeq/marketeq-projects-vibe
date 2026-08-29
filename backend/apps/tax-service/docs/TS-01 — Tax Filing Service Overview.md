# TS-01 — Tax Filing Service Overview

| Property | Value |
|---|---|
| Service | `tax-service` |
| Document | TS-01 — Tax Filing Service Overview |
| Version | 1.0 |
| Status | **NOT BUILT.** Deferred by the CTO on 2026-08-29. |
| Supersedes | Parts of TS-00, which assumed 1099-NEC reporting. See §2. |
| Single responsibility | Own taxpayer identity, certification retention, and year-end information reporting. Nothing else. |

---

## 1. Why this service exists

Marketeq does not introduce a client to a contractor and step aside. Clients pay
the **platform**, and the **platform** pays the contractor, who may be earning
from many clients at once and withdrawing through several different rails
(Stripe, PayPal, Payoneer, ACH, crypto). Money is aggregated by us and settled
by us.

That single fact determines everything below, and it is the thing most likely to
be forgotten by whoever picks this up next.

## 2. The reporting obligation, and the correction it forces

Because the platform settles funds from many payers to one payee, Marketeq is a
**third party settlement organization (TPSO)** operating a **third party payment
network** under **IRC §6050W**.

Consequences, in order of importance:

1. **The form is a 1099-K, not a 1099-NEC.** Under Treas. Reg.
   §1.6041-1(a)(1)(iv), payments settled through a third party network are
   *excluded* from 1099-NEC/1099-MISC reporting, specifically so the same money
   is not reported twice.
2. **The clients issue nothing.** A client never pays the contractor directly,
   so a client has no reporting obligation for these amounts. This is a common
   point of confusion for clients and should be answered in the FAQs.
3. **Marketeq is the filer of record.** Decided by the CTO on 2026-08-29. No
   individual processor sees total volume across all rails, so no processor
   can file a complete return on our behalf. We aggregate, we file.
4. **The W-9 is still required.** A TPSO must still solicit the TIN and is still
   liable for **24% backup withholding** where it does not hold a valid one. The
   W-9 work already built is correct and is not affected by the NEC-to-K change.

> ⚠️ **TS-00 is wrong on this point.** It was written assuming the platform was
> a payer issuing 1099-NECs. Where TS-00 and this document disagree, this one is
> correct.

### 2.1 What a 1099-K actually reports

Not "amount earned". A 1099-K reports:

- **Box 1a — gross settled volume**, *before* platform fees, refunds and
  chargebacks are deducted. This is almost always a larger number than the
  contractor's net earnings, and they will ask why.
- **Box 3 — the count** of settled payment transactions.
- **Boxes 5a–5l — a month-by-month breakdown**, which must sum exactly to box 1a.

This is a settlement-side aggregation. It cannot be derived from
`earnings-service` net figures, and getting it from the wrong source is the most
likely way to produce a materially wrong tax form.

### 2.2 Reporting threshold — verify before every filing season

The de minimis threshold has changed repeatedly: ARPA set $600, the IRS delayed
it twice with phased amounts, and the 2025 reconciliation act restored the
original **$20,000 and 200 transactions** test. **Confirm the threshold with tax
counsel for each filing year rather than hardcoding a constant from this
document.** Note that some states set their own, lower thresholds.

### 2.3 Dates that matter

- **January 31** — recipient copies must be furnished.
- Filing deadlines to the IRS differ from the furnishing deadline and depend on
  paper vs electronic filing. Electronic filing is effectively mandatory at our
  volume.

## 3. What is already built, and where

Working and verified, in `backend/apps/user-service/src/tax-info/`:

| File | What it does |
|---|---|
| `tax-info.entity.ts` | Current taxpayer identity and certification state |
| `tax-info.service.ts` | Completeness rules, forms list, submission |
| `tin-encryption.service.ts` | AES-256-GCM field encryption for the TIN |
| `tax-document.service.ts` | Fills the **real IRS PDFs** |
| `tax-info.controller.ts` | Download and PNG preview endpoints |
| `assets/` | Official IRS forms downloaded from irs.gov |

### 3.1 Form assets

Downloaded from irs.gov and committed under `assets/`:

| File | Form | Used |
|---|---|---|
| `fw9.pdf` | Form W-9 (Rev. March 2024) | ✅ filled |
| `f1099k.pdf` | Form 1099-K (Rev. December 2026) | ✅ filled |
| `f1099nec.pdf` | Form 1099-NEC | ⚠️ superseded, see §2 |
| `fw8ben.pdf` | Form W-8BEN | ❌ not yet filled |

`nest-cli.json` has an `assets` rule copying these into `dist`. Without it the
forms 404 in a deployed build. Carry that rule over to the new service.

### 3.2 Rules already enforced, keep them

- **Never furnish an incomplete form.** A 1099-K with a blank box 1a, or a W-9
  with both TIN boxes blank, is not a document to hand anybody. Generation
  throws rather than emitting a partly filled government form.
- **Only Copy B is furnished.** Copy A is the red scannable sheet; the IRS warns
  a downloaded Copy A must not be filed. Generation strips every other page.
- **The furnished copy masks the TIN** to `XXX-XX-nnnn`. The taxpayer's own W-9
  carries the full number, exactly as the paper form does.
- **The signing date is always today** and is read-only.

## 4. Verified field maps

Derived by filling the official PDFs and reading the rendered output, not by
guesswork. Fields repeat their trailing identifiers across copies (Copy 2 reuses
Copy B's `f2_*` names), so **always scope the lookup to `CopyB[0]` first**.

### 4.1 Form W-9 (`fw9.pdf`, page 1)

| Field | Box |
|---|---|
| `f1_01` | Line 1, name |
| `f1_07`, `f1_08` | Line 5 address, line 6 city/state/ZIP |
| `c1_1[0..6]` | Line 3a classification, in printed order: Individual/sole proprietor, C corp, S corp, Partnership, Trust/estate, LLC, Other |
| `f1_11`, `f1_12`, `f1_13` | SSN, split 3-2-4 |
| `f1_14`, `f1_15` | EIN, split 2-7 |

The signature line and date are **not** form fields. They are drawn onto the
page at `y ≈ 205`, `x = 150` and `x = 400`.

### 4.2 Form 1099-K (`f1099k.pdf`, **Copy B is page index 3**)

| Field | Box |
|---|---|
| `f2_1` | Calendar year, two digits |
| `f2_2`…`f2_9` | FILER name, street, room, city, phone, state, country, ZIP |
| `c2_2` | FILER is a **Payment settlement entity (PSE)** — check this |
| `c2_5` | Transactions reported are **Third party network** — check this |
| `f2_10`, `f2_11` | FILER'S TIN, PAYEE'S TIN |
| `f2_12`…`f2_18` | PAYEE name, street, apt, city, state, country, ZIP |
| `f2_19`, `f2_20` | PSE name and phone, account number |
| `f2_21` | **Box 1a gross amount** |
| `f2_27` | **Box 3 transaction count** |
| `f2_28` | Box 4 federal income tax withheld |
| `f2_29`…`f2_40` | **Boxes 5a–5l**, January→December, left column then right |

> Both checkboxes need the mark **drawn onto the page after flattening**. The
> forms' own "on" appearance renders as a barely visible grey square in most
> viewers. The same applies to the W-9 classification boxes.

## 5. Data model for the new service

### 5.1 `tax_identity` — current state
Migrate `tax_info` broadly as-is: legal name, federal tax classification, TIN
type, encrypted TIN, address, and the current certification pointer.

### 5.2 `tax_certification` — **append-only, this is the gap**

Today a resubmitted W-9 **overwrites** its predecessor. That is wrong and gets
worse with time: the superseded certification is what justified a prior year's
reporting, and destroying it destroys the evidence for a return already filed.

Industry practice, and what to build:

- One immutable row per submission. The current one is simply the latest.
- Capture the evidence, not just the values: **UTC timestamp, IP address, user
  agent, and a version identifier for the exact certification text** the person
  agreed to. Without the text version you cannot later show *what* was certified.
- **Retain at least 4 years.** The W-9 requester instructions require retention
  for 4 years for possible IRS inspection; many platforms keep 7.
- The typed signature makes the **E-SIGN Act** apply, which requires affirmative
  consent to sign electronically and the ability to retain a copy. Both consents
  and the download link already satisfy this; the retention record is what is
  missing.

### 5.3 `settlement_aggregate` — the box 1a source

Per contractor, per tax year: gross settled volume, transaction count, and
twelve monthly figures, built from settlement records across **all** payout
rails. Must be a stored, reproducible snapshot: a figure recomputed on the fly
years later will not match the return that was filed.

## 6. Interfaces

Inbound over RabbitMQ, since a service must never query another service's
tables:

- `payout.settled` — the event that feeds the settlement aggregate.
- `user.updated` — legal name changes, which should prompt re-certification.

Outbound:

- `tax.form.issued` — so notification-service can tell the contractor.
- `tax.backup_withholding.required` — so payout-service can withhold 24% where
  a valid TIN is not held.

## 7. Open items

1. **Payer identity is unset.** `TAX_PAYER_STREET`, `TAX_PAYER_CITY`,
   `TAX_PAYER_STATE`, `TAX_PAYER_POSTAL_CODE`, `TAX_PAYER_PHONE` and
   `TAX_PAYER_TIN` are all blank, so no 1099-K can be issued. These are real
   business details and must be supplied, not invented.
2. **`TAX_TIN_ENCRYPTION_KEY` must be set on Render**, and must never change. A
   changed key makes every stored TIN unreadable, exactly as happened locally on
   2026-08-29. This is the same failure mode as the E2EE secret incident.
3. **IRS TIN Matching** is not implemented. Validating the name/TIN pair before
   filing is standard practice; a mismatch drives the B-notice sequence and
   backup withholding. Requires IRS e-Services enrolment.
4. **Electronic filing to the IRS** (IRIS/FIRE) is not implemented. Everything
   built so far produces the *recipient's* copy only. Nothing has ever been
   transmitted to the IRS.
5. **W-8BEN is incomplete.** Non-US filers correctly see W-8BEN certification
   text rather than the W-9's, since item 3 of the W-9 is an affirmation of US
   person status. But three things are missing:
   - `fw8ben.pdf` is committed and **not filled**; non-US filers still get the
     older substitute rendering.
   - The form needs **country of citizenship, date of birth, permanent
     residence address, and a foreign TIN**, none of which are collected.
   - **A W-8BEN expires**, at the end of the third calendar year following
     signing, or earlier on a change of circumstances. A W-9 does not. The
     service needs an expiry and re-solicitation flow that the W-9 path has no
     equivalent of.
   - Non-US persons receive **neither a 1099-K nor a 1099-NEC**. Where there is
     US-source withholdable income the form is a **1042-S**, which is not built
     and is a separate reporting pipeline.
6. **State reporting** is not considered at all. Several states have their own
   1099-K thresholds and filing requirements.

## 8. Migration notes

Move, do not rewrite. The generation code is verified against the real forms and
the field maps above were confirmed by rendering. When the service is built:

1. Move `src/tax-info/` into the new service, keeping the asset rule.
2. Add the append-only certification table (§5.2) — the one real design gap.
3. Add the settlement aggregate (§5.3) and wire `payout.settled`.
4. Swap the frontend's `/user/tax-info/*` calls to the new routes. The frontend
   at `frontend/components/settings-tax-info.tsx` needs no other change; it is
   already written against a forms list that carries its own download and
   preview URLs.
