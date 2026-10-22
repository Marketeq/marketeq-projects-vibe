# **Financial Key Ring — Implementation Notes**

**As of:** 2026-10-20
**Audience:** whoever operates payout-service, and whoever runs the first key rotation.
**Status:** implemented on branch `security/gateway-rate-limiting`, **uncommitted and unpushed.** Requires migration `014_encryption_key_rotations.sql` before deploy.
**Why it exists:** closes `AC-1.3.3` of `CS-1.3` / `US-1.3` / PMCM-739. Rationale and the wider inventory live in `Encryption Key Management — Audit and KMS Plan.md` §5; this document is the operating reference.

---

### **What changed, in one line**

Stored values now record which key encrypted them, so a key can be changed without destroying the data it protected.

---

## **1. The problem it solves**

Three keys in payout-service protect bank account numbers, OAuth provider tokens and crypto wallet addresses. Each stored value looked like this:

```
<iv>:<tag>:<ciphertext>
```

Nothing in it said which key produced it, and only one key could be live at a time. So changing any of those keys made every existing row under it permanently unreadable, with no migration path and no way to tell old rows from new. Rotation was not slow or awkward; it was impossible.

That matters beyond rotation hygiene. A key you cannot change is a key you cannot respond to. If one leaked, the only options were to leave it in place or to destroy the data.

## **2. The format**

```
v2:<kid>:<iv>:<tag>:<ciphertext>
```

All hex except `kid`. The key id is written at encrypt time and read at decrypt time, so several keys can be live at once: new writes use the current key, existing rows keep decrypting under whichever key wrote them.

The reader also accepts the old three-part form and treats it as `k1`, which is correct because there was only ever one key before this. Those rows keep working untouched and get the marker when they are next re-encrypted.

## **3. Configuration**

**Nothing has to change for this to ship.** The single-key form every environment sets today keeps working and is registered as `k1`:

```
BANK_ENCRYPTION_KEY = <64 hex chars>
```

The multi-key form is opt-in, and is what rotation uses:

```
BANK_ENCRYPTION_KEY_CURRENT = k2
BANK_ENCRYPTION_KEY_K1      = <64 hex chars>
BANK_ENCRYPTION_KEY_K2      = <64 hex chars>
```

Same shape for `OAUTH_TOKEN_ENCRYPTION_KEY` and `CRYPTO_ADDRESS_ENCRYPTION_KEY`.

**One behaviour to know before you touch anything.** When `_CURRENT` is not set, the highest-numbered key wins. That is deliberate, so adding `k2` and forgetting the pointer does not leave you quietly still writing under `k1`. But it also means **adding a key is enough to move writes onto it at the next restart.** If you want a staged rotation, set `_CURRENT` explicitly first. §5 does this.

## **4. What records the change**

`encryption_key_rotations`, created by migration `014`. `KeyRotationRecorderService` compares the current key for each ring against the last one recorded at startup, and appends a row when they differ:

| Column | Holds |
|---|---|
| `ring` | `BANK`, `OAUTH_TOKEN` or `CRYPTO_ADDRESS` |
| `key_id` | the key that became current |
| `previous_key_id` | what it replaced, null for the first ever recorded |
| `known_key_ids` | every key still decryptable at that moment, so you can see whether old data was still readable when the key moved |
| `detected_by` | `startup-detected` |
| `recorded_at` | when |

Nobody has to remember to log a rotation, because it is inferred from the configuration the service is running with. Every replica attempts the insert; a unique index on `(ring, key_id)` means the first wins and the rest are ignored.

**It never blocks startup.** A missing table or an unreachable database costs a warning line. Refusing to serve payouts because bookkeeping failed would be the wrong trade.

## **5. Running a rotation**

Not yet exercised. Nothing here has been run against real data, and until it has, treat this as a procedure rather than a proven one. Do the first one on a low-volume ring.

**Before you start,** pin the current key explicitly so that adding the new one does not move writes on its own:

```
BANK_ENCRYPTION_KEY_K1      = <the existing value>
BANK_ENCRYPTION_KEY_CURRENT = k1
```

Deploy, confirm the service is healthy and still reading existing rows. Nothing has changed yet.

**1. Generate and add the new key.** Leave the old one in place.

```
openssl rand -hex 32        →  BANK_ENCRYPTION_KEY_K2
```

Deploy. `CURRENT` is still `k1`, so nothing has moved. Both keys are now readable.

**2. Switch writes over.** Set `BANK_ENCRYPTION_KEY_CURRENT = k2` and deploy. New values are written under `k2`; everything already stored still decrypts under `k1`. The recorder appends a row and logs a warning naming both keys.

**3. Re-encrypt the existing rows.** See §6 — the job for this is not written yet.

**4. Verify nothing is left on the old key** before going near step 5. Every encrypted column needs checking, not just the one you were thinking about.

**5. Retire the old key.** Remove `BANK_ENCRYPTION_KEY_K1`, and the legacy `BANK_ENCRYPTION_KEY` if it is still set.

**If you get step 5 wrong** and rows still reference `k1`, the error names the key and the variable to restore:

> Stored value was encrypted with key "k1" for ring BANK, which this process does not have. Set `BANK_ENCRYPTION_KEY_K1`. Available: k2. Retiring a key before its data is re-encrypted makes that data unreadable.

Put the variable back and the data returns. That is the whole point of keeping the old key readable rather than removing it at step 2.

## **6. What is not built**

**The backfill job.** `FieldEncryption.reEncrypt()` exists and does the right thing for a single value: it returns the input unchanged when it is already current, so a job can walk every row and only write the ones that moved. But nothing calls it over the tables. Step 3 of §5 has no implementation.

That is the one piece standing between "rotation is possible" and "rotation is a procedure someone can follow". It needs to handle the encrypted columns in `deposit_methods`, run in batches, be safe to stop and resume, and log what it moved.

**The other six encryption sites.** This covers three of the nine in the platform. The TIN key in user-service, the 2FA key in auth-service, messaging-service, `user-keys.service.ts` and the two scheduling-service sites are all still single-key. See the audit §1.

**AC-1.3.4.** Keys are still plaintext environment variables. This work makes a move to a key service possible — swapping where `FieldEncryption` gets its key material is one function — but does not perform it.

## **7. Test record**

31 tests in `crypto/field-encryption.spec.ts`, plus the service-level cases in `encryption-keys.spec.ts`. Whole payout-service suite: 120 passing, 1 todo.

```
cd backend
npx jest --rootDir apps/payout-service/src
```

| Group | Covers |
|---|---|
| Backwards compatibility | the single-key form still works; values written before key ids still decrypt, including after the ring has moved on to `k2` |
| Rotation | data written under the old key reads after the change; new writes use the current key; three keys live at once, reading from each |
| Re-encryption | `needsReEncryption` identifies stale values including legacy ones; `reEncrypt` moves them; an already-current value is returned untouched so a backfill only writes what moved |
| Retiring too early | the error names the missing key and the variable to restore |
| Format | every written value carries `v2` and a key id; plaintext never appears in the stored value; tampering is detected |
| Choosing current | `CURRENT` is honoured; the highest key wins without it; `k10` sorts after `k9`; a `CURRENT` pointing at an unset key refuses to start |
| Presence and format | no key at all refuses to start; wrong length rejected; **a 64-character non-hex value rejected**, which the old length-only guard allowed through to fail later at the first encrypt |

## **8. Deploy checklist**

1. Apply the migration. New table only, no change to any existing table, safe against a live database.
   ```
   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/014_encryption_key_rotations.sql
   ```
2. Deploy. No environment change needed; the existing single-key variables keep working.
3. Check the logs for `Recorded the first encryption key for ring …` three times, once per ring. That confirms the recorder reached the table.
4. Confirm an existing bank account still decrypts. Old-format rows are the thing most worth checking, since they take the legacy path.

## **9. Change Log**

- **2026-10-20** — Written. Should have accompanied the implementation; it did not, which left the rotation procedure in code comments and a chat log.
- **2026-10-19** — Key ring, rotation record table and recorder added; bank, OAuth-token and crypto-address encryption moved onto it. Closes `AC-1.3.3`. Also fixed the hex-validation gap in `AC-1.3.1`, where a 64-character non-hex key passed startup and failed later at the first encrypt.
