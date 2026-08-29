**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**tax-service** (proposed --- not built)

TS-00 --- Service Proposal & Scope

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Service**         tax-service

  **Document**        TS-00 --- Service Proposal & Scope

  **Version**         0.1 (proposal)

  **Status**          NOT BUILT. Deferred by CTO 2026-08-29. This document
                      exists so the reasoning is not lost.

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

## 2. What it owns

- Taxpayer identity: W-9 (US) and W-8 series (non-US) records, including the TIN
- TIN matching against IRS records
- Year-end aggregation of reportable payments
- 1099-NEC generation, transmission and corrections
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
| Official IRS form assets | `apps/user-service/src/tax-info/assets/fw9.pdf`, `fw8ben.pdf` |

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

1. **1099-NEC filing.** Required for every US contractor paid $600 or more
   directly by Marketeq. Due to recipients by 31 January. Nothing files
   anything today; the 1099 PDFs the settings screen produces are placeholders
   that say totals are not final.
2. **TIN matching.** Without it the `TIN_MISMATCH` state described in
   `PS-26 — UX States Not Present in Designs` cannot be detected.
3. **Backup withholding.** 24% must be withheld from payments to anyone without
   a valid W-9 or who fails TIN matching. The payout path does not do this.

## 7. Note on the W-9

The W-9 is **not** sent to the IRS. The form states it: *"Give form to the
requester. Do not send to the IRS."* Marketeq is the requester. Storing it is
the correct and complete handling of that form. The government-facing
obligation is the 1099, which is what section 6 is about.

---

## 8. Suggested order of work

1. Finish filling the official IRS forms (hours, in `user-service` today)
2. Choose a filing provider
3. Spec and build `tax-service`, migrating the assets in section 4
4. Wire backup withholding into the payout path

Steps 3 and 4 need engineering ownership and a compliance review.
