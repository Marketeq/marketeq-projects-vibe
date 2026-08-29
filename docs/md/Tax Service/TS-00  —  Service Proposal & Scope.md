**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**tax-service** (proposed --- not built)

TS-00 --- Service Proposal & Scope

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         tax-service

  **Document**        TS-00 --- Service Proposal & Scope

  **Version**         0.1 (proposal)

  **Status**          NOT BUILT. Deferred by CTO 2026-08-29. Scaffolded as
                      documentation only at backend/apps/tax-service.

  **Superseded by**   TS-01 --- Tax Filing Service Overview, at
                      backend/apps/tax-service/docs. TS-00 assumed Marketeq
                      was a payer issuing 1099-NECs. It is not. Where the two
                      documents disagree, TS-01 is correct. Sections 2, 6 and
                      7 below carry corrections.

  **Single            Own taxpayer identity and year-end information
  responsibility**    reporting. Nothing else.
  -----------------------------------------------------------------------

---

## 1. Why this is a separate service

Tax collection currently lives in `user-service` (`user_service.tax_info`,
`/user/tax-info/*`). That was the pragmatic place to put it while building the
Taxes settings screen. It is not where it belongs long term.

| Reason | Detail |
| --- | --- |
| **Different cadence** | Reporting is year-end batch work: aggregate the year, generate thousands of 1099s, transmit, handle corrections. `user-service` is a hot path for profile loading and is already large. |
| **Blast radius** | TINs, filing records and the audit trail get their own database, credentials and access control. This is the strongest argument. |
| **Cross-cutting reads** | Needs payment totals from earnings / payout / transaction, plus taxpayer identity, and must feed backup-withholding decisions back into the payment path. |
| **Retention** | IRS record-keeping runs years past the point a user profile might be deleted. Different lifecycle, different rules. |

---

> ### ⚠️ Correction, 2026-08-29 --- the reporting form is a 1099-K
>
> Clients pay Marketeq and Marketeq pays the contractor, who earns from many
> clients at once and withdraws through several rails (Stripe, PayPal,
> Payoneer, ACH, crypto). The platform settles the funds, which makes it a
> **third party settlement organization** operating a **third party payment
> network** under **IRC 6050W**.
>
> Consequently the form is a **1099-K, not a 1099-NEC**. Treas. Reg.
> 1.6041-1(a)(1)(iv) excludes payments settled through a third party network
> from 1099-NEC and 1099-MISC reporting, so the same money is not reported
> twice. The clients issue nothing, because no client pays the contractor
> directly. Marketeq is the filer of record, decided by the CTO on 2026-08-29,
> because no single processor sees total volume across all rails.
>
> A 1099-K also reports something different: **gross settled volume** before
> platform fees, refunds and chargebacks, plus a **transaction count** and a
> **month by month breakdown** that must sum to it. That is a settlement-side
> aggregation and cannot be derived from net earnings. Read TS-01 section 2
> before doing anything with figures.
>
> The W-9 work is unaffected. A settlement organisation still solicits the TIN
> and is still liable for 24% backup withholding without a valid one.

## 2. What it owns

- Taxpayer identity: W-9 (US) and W-8 series (non-US) records, including the TIN
  and the optional W-9 line 4 exemption codes (entities only)
- TIN matching against IRS records
- Year-end aggregation of reportable payments
- 1099-K generation, transmission and corrections (see the correction above)
- Backup-withholding determination (the *decision*, not the deduction)
- Audit trail: who certified what, when, and exactly what was certified

## 3. What it does NOT own

- **Transmission to the IRS.** See section 5.
- **Applying** backup withholding. That is a payout-path change. This service
  answers "is this contractor subject to withholding"; the payout path asks and
  acts.
- Anything about a user's profile beyond their taxpayer record.

---

## 4. Migration from user-service

Already built and working, to be moved rather than rewritten:

| Asset | Current location |
| --- | --- |
| `tax_info` table | `user_service` schema, migration `1797300000000-CreateTaxInfo` |
| Read / upsert / submit | `apps/user-service/src/tax-info/tax-info.controller.ts` |
| Completion + certification rules | `tax-info.service.ts` |
| TIN encryption (AES-256-GCM) | `tin-encryption.service.ts`, key `TAX_TIN_ENCRYPTION_KEY` |
| PDF generation | `tax-document.service.ts` |
| Official IRS form assets | `apps/user-service/src/tax-info/assets/`: `fw9.pdf`, `f1099k.pdf`, `f1099nec.pdf` (superseded), `fw8ben.pdf` (not yet filled) |
| Asset copy rule | `nest-cli.json` copies `assets/**` into `dist`; without it the forms 404 in a deployed build |

The frontend calls through the gateway by path, so moving the routes is a
gateway-proxy change plus a data migration. The Taxes settings screen itself
should not need to change.

---

## 5. Build vs buy: DO NOT build IRS e-filing

Transmitting to the IRS yourself means IRIS enrolment, a TCC code, schema
validation, corrections, B-notices, and state filing on top of federal. It is
months of work to reproduce something that already exists and is audited by
other people.

**Recommendation:** use a provider (Track1099, Tax1099, or Stripe's 1099
product) for transmission, at a few dollars per form. `tax-service` owns the
data, the aggregation and the orchestration; the provider owns the wire.

---

## 6. Obligations not currently met

Stated plainly, because none of these exist anywhere in the platform today:

1. **1099-K filing.** Due to recipients by 31 January. Nothing files anything
   today. The settings screen can now fill a real 1099-K Copy B from the
   official IRS form, but it refuses to issue one until the filer block and the
   settled volume exist, so no form is currently listed. **Do not use the $600
   figure.** The de minimis threshold has changed repeatedly: ARPA set $600, the
   IRS delayed it twice with phased amounts, and the 2025 reconciliation act
   restored the original $20,000 and 200 transactions test. Confirm the current
   threshold with tax counsel each filing year, and note that some states set
   their own lower ones.
2. **TIN matching.** Without it the `TIN_MISMATCH` state described in
   `PS-26 — UX States Not Present in Designs` cannot be detected.
3. **Backup withholding.** 24% must be withheld from payments to anyone without
   a valid W-9 or who fails TIN matching. The payout path does not do this.

## 7. Note on the W-9

The W-9 is **not** sent to the IRS. The form states it: *"Give form to the
requester. Do not send to the IRS."* Marketeq is the requester. Storing it is
the correct and complete handling of that form. The government-facing
obligation is the 1099-K, which is what section 6 is about.

A W-9 also never expires, so it is kept until superseded. A **W-8BEN does
expire**, at the end of the third calendar year following signing, which means
non-US filers need an expiry and re-solicitation flow the W-9 path has no
equivalent of. Non-US persons receive neither 1099; where there is US-source
withholdable income the form is a 1042-S. See TS-01 section 7, item 5.

One real gap in what is built: a resubmitted certification currently
**overwrites** its predecessor. The superseded W-9 is the evidence for a return
already filed, so certifications must become append-only, capturing timestamp,
IP, user agent and the version of the text certified, retained at least 4 years.
TS-01 section 5.2 has the model.

---

## 8. Suggested order of work

1. ~~Finish filling the official IRS forms~~ **Done 2026-08-29.** The real
   W-9 and 1099-K Copy B are filled from the official irs.gov PDFs, with
   verified field maps in TS-01 section 4. Still outstanding: `fw8ben.pdf`, the
   payer identity env vars, and the settlement aggregation that feeds box 1a.
2. Choose a filing provider
3. Spec and build `tax-service`, migrating the assets in section 4
4. Wire backup withholding into the payout path

Steps 3 and 4 need engineering ownership and a compliance review.
