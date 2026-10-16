# **Client-Side Seed Material (NEXT_PUBLIC_SYSTEM_SECRET) — Plan**

**As of:** 2026-10-08
**Covers:** Security Tasklist item #2 — "Remove client-side exposure of cryptographic seed material (`NEXT_PUBLIC_SYSTEM_SECRET`)."
**Status:** Phase 0 and Phase 1's backend implemented on branch `security/gateway-rate-limiting`, uncommitted and unpushed. Phase 1's frontend half and Phases 2–4 are outstanding. **Item #2 is not closed** — `backup.ts` still reads the variable until the frontend change in §7 lands.
**Implementation references:** `Client-Exposed Secret Guard — Implementation Notes.md` (Phase 0, the CI guard) and `Server-Side Key Custody — Implementation Notes.md` (Phase 1, the API contract, blob formats and prerequisites). This document holds the security rationale and the remaining phases.
**Verified against:** `frontend/src/crypto/backup.ts`, `frontend/src/crypto/keys.ts`, `backend/apps/user-service/src/user-keys/*`, migration `1775000000000-CreateUserKeysAndDevices.ts`, and the git history of `backup.ts` across all five commits that touched it.

---

### **The short version**

**The exposure is real, it is wired, and it is one environment variable away from live.**

Two existing documents — `.claude/memory/services/messaging-service.md` and `frontend/app/(group)/inbox/E2E-NOTES.md` — both say the key-backup flow is scaffolding that is **"NOT WIRED."** That is no longer true, and it is the most dangerous wrong belief in this area. `frontend/src/crypto/keys.ts:4` imports `deriveKEK`, `encryptWithKEK` and `decryptWithKEK` from `backup.ts`, and lines 251–330 implement the full backup, migration and restore flow against `PUT /user-keys/private-key` and `GET /user-keys/private-key`. The backend endpoints exist, are JWT-guarded, and the `user_service.user_keys.encryptedPrivateKey` column is in a shipped migration.

The only thing stopping it is that `NEXT_PUBLIC_SYSTEM_SECRET` is unset, so `deriveKEK` throws and `keys.ts` logs `"KEK derivation unavailable. Private-key backup/restore will be skipped for this session."` and carries on.

**So the system is safe by accident, not by design** — and the accident is fragile in exactly the wrong direction. The single most requested fix in this area is multi-device support, and the spec tells the implementer to turn it on by setting that variable.

**Worse: the variable is already a documented entry in all three frontend env templates.** This corrects an earlier draft of this document, which claimed it appeared nowhere outside `backup.ts`. It is uncommented and active in `frontend/.env.local.example:46`, `frontend/.env.staging.example:49` and `frontend/.env.production.example:43`, under a heading reading `# --- E2E backup KEK seed ---`. The local template ships the placeholder `change-me-in-your-local-env` and this instruction:

> `# Keep this value consistent across environments where recovery is expected.`

That line is the whole problem in one sentence. The templates are the documented provisioning path (DEVOPS_SOP §5), so this is not an obscure variable nobody knows about — it is a blank marked *fill me in* in the production template, with a note telling the operator to use the same value everywhere. The staging and production entries are empty, which is the only reason nothing is exposed today.

*(How the error got made and caught: an earlier repository-wide grep for the variable returned no output, which I read as absence. On this Windows mount an empty grep result can mean the command timed out, not that there is nothing to find. The CI guard built in Phase 0 below found all three on its first run.)*

**Good news, established by reading all five historical versions of the file: a real secret value was never committed.** The variable has only ever been read from the environment or defaulted to `""`. Nothing needs rotating, and there is no exposed data today. This item is preventable rather than remediable — which is the cheap kind.

---

## **1. Why a `NEXT_PUBLIC_` secret is not a secret**

`NEXT_PUBLIC_`-prefixed variables are inlined by Next.js into the JavaScript bundle at build time and served to every visitor. There is no sense in which such a value is private; viewing source is enough.

Here is the derivation as written (`backup.ts:4–30`):

```ts
const systemSecret = process.env.NEXT_PUBLIC_SYSTEM_SECRET
const keyMaterialRaw = encoder.encode(`${userId}:${systemSecret}`)
// PBKDF2, salt: "message-encryption", 100_000 iterations, SHA-256 → AES-GCM-256
```

Three inputs, and an attacker has all three:

| Input | Where it comes from | Secret? |
|---|---|---|
| `userId` | returned by ordinary API responses throughout the app | No |
| `systemSecret` | inlined into the public JS bundle | **No** |
| salt | the hardcoded literal `"message-encryption"` — identical for every user | No |

So the KEK is a pure function of a value that is not secret and a value that is published. **The 100,000 PBKDF2 iterations protect nothing.** Iteration counts raise the cost of guessing an unknown input; here there is no unknown input. Anyone can compute any user's KEK in milliseconds.

The constant salt is a second, independent defect: even with a genuinely secret system secret, one salt for every user means identical inputs produce identical keys and the derivation gains nothing from PBKDF2's design. A per-user random salt is part of the fix.

## **2. What happens the day someone sets the variable**

In order, automatically, for every user who logs in afterwards (`keys.ts:371–383`):

1. The browser generates or loads the user's RSA-4096 private key.
2. It derives the KEK from `userId` + the bundled secret.
3. It encrypts the private key under that KEK.
4. It `PUT`s the blob to `/user-keys/private-key`, where it is stored in `user_service.user_keys.encryptedPrivateKey`.

The result is a server-side table of every user's private key, encrypted under keys that anyone who can read the JS bundle can reproduce. Combined with `GET /user-keys/private-key` — which is JWT-guarded and returns only the caller's own blob — a single compromised or malicious account yields that account's private key in plaintext. Any wider read of that table (a backup, a logging sink, a SQL-injection, a support export, the shared-production-database situation documented in SOP §3.4) yields **all of them**, and with them the entire decryptable message history of the platform.

There is no revocation path. RSA public keys are refused on overwrite by design (`storePublicKey`), so a user whose private key leaks cannot simply be re-keyed without abandoning their message history.

## **3. Current state, stated precisely**

| Question | Answer | How it was established |
|---|---|---|
| Is a secret value committed in git? | **No** — all five versions read from the environment or default to `""` | `git log --follow` + `git show` on each commit touching `backup.ts` |
| Does `NEXT_PUBLIC_SYSTEM_SECRET` appear anywhere outside `backup.ts`? | **Yes — in all three frontend env templates**, active and uncommented. Not in `render.yaml`, not in any Vercel config. | `check-client-secrets.py` over the whole tracked tree |
| Is the backup flow wired? | **Yes** | `keys.ts:4` imports it; `keys.ts:251–330` is the full flow |
| Is it active today? | **No** — `deriveKEK` throws when the var is unset, and `keys.ts` catches and skips | `backup.ts:6–11`, `keys.ts:302–312` |
| Do the backend endpoints exist and are they guarded? | **Yes**, both; `APP_GUARD` → `JwtAuthGuard` in `app.module.ts:102` and `@CurrentUser()` keys on `user.sub`, so there is no IDOR | controller and module read directly |
| Does any user data exist under a weak KEK? | **No** | the var has never been set, so step 4 above has never run |

**Nothing to rotate, nothing to purge.** The work is entirely about stopping it from becoming true.

## **4. The complication: the spec prescribes the flaw**

This is not an implementation slip. `docs/md/Messaging Service/End 2 End Encryption/🔐 Seamless Key Recovery for End-to-End Encrypted Messaging(1).md` specifies this design, at line 105:

```
const systemSecret = import.meta.env.VITE_SYSTEM_SECRET;
```

`VITE_` is Vite's equivalent of `NEXT_PUBLIC_` — also client-exposed. The frontend is a faithful port of the spec, including the exposure. The spec's own summary table then asserts:

> Platform manages KEK securely ✅

That line is the problem in one sentence. **Deleting or fixing the code without amending the spec guarantees reintroduction**, because the spec is what the next implementer will read when they go to fix multi-device support — the known top limitation that everyone wants closed.

**Treat the spec change as part of this item, not as follow-up.**

## **5. Two defects found in the same code path**

Worth fixing while this area is open, because both live in the code any fix will touch.

**5.1 — The two write paths produce incompatible blobs.**

`user-keys.service.ts` has two ways to store a private key:

- `registerDevice()` (`POST /devices`) wraps the incoming blob again, server-side: `encryptPrivateKey(dto.encryptedPrivateKey)`, producing `iv:authTag:ciphertext`.
- `storeEncryptedPrivateKey()` (`PUT /user-keys/private-key`) stores the blob **raw**, with no server wrap.

`getEncryptedPrivateKey()` returns whatever is in the column and **never unwraps** — there is no `decryptPrivateKey` on the server at all. So a blob written by `registerDevice` is permanently unreadable: the client receives a three-part server-format string and tries to parse it as its own two-part `iv:ciphertext` format.

Latent today, because the live client posts only `publicKey` to `/devices` (`keys.ts:386–390`) and never sends key material down that path. But any client that does will silently destroy that user's recoverability, and `storeEncryptedPrivateKey` overwrites an existing value unconditionally — unlike `storePublicKey`, which refuses.

**5.2 — The server-side salt is also a constant.** `encryptPrivateKey` uses `crypto.scryptSync(secret, "e2ee-salt", 32)`. Server-side so far less serious, but it should be per-user for the same reason.

**And one thing that is already right, which the fix should build on:** the server already has `E2EE_SERVER_SECRET` and a working AES-256-GCM wrap helper. The correct home for the KEK exists and is sitting unused, while the client derives it from a published value.

---

## **6. The plan**

Four phases. Phase 0 is the one that actually prevents the incident and should not wait for the rest.

### **Phase 0 — Make the inertness deliberate instead of accidental — DONE, except the three template deletions**

No behaviour change. Removes the "nobody knew" failure mode. Completed 2026-10-08 on branch `security/gateway-rate-limiting`, uncommitted and unpushed.

**1. A CI guard that fails any PR introducing a client-exposed secret. ✅ Built and tested.**

The highest-value item in the plan and the only one that survives staff turnover.

- `.github/scripts/check-client-secrets.py` — scans the tracked tree for `NEXT_PUBLIC_*`/`VITE_*` names containing `SECRET|PRIVATE|PRIVKEY|SEED|PASSPHRASE|SIGNING|CREDENTIAL`. Standard library only, so it adds no `pip install` to every PR.
- `.github/client-exposed-secrets-allowlist.json` — the four known occurrences, each with a reason, an expiry and a tracking link.
- `.github/workflows/sop-check.yml` — new Section 11, 14 lines, calls the script and reports through the existing `add()` violation mechanism. Verified the file's CRLF line endings survived the edit and that the YAML still parses.

Three design choices worth recording:

- **`TOKEN` and `KEY` are deliberately not in the word list.** A publishable Stripe key and a public map token are both legitimate, and a check that cries wolf on those is switched off within a month — the alert-fatigue lesson from the SCA work. A word gets added the first time one actually matters.
- **The allowlist is a tombstone, not a permission slip.** An entry that matches no existing line is itself a failure, so the exception cannot outlive the code it was written for. Entries need a reason of at least 40 characters and an expiry no more than 90 days out, mirroring `check-sca-ignores.py`.
- **The four known occurrences are allowlisted rather than left failing.** Leaving them red would make every unrelated PR fail, which is how a check gets disabled. The three template entries expire **2026-11-07** (deleting a line from a template is a same-week change) and the `backup.ts` entry expires **2027-01-06** (it waits on Phase 1).

Tested against twelve cases: the four real occurrences pass while allowlisted; new `NEXT_PUBLIC_SYSTEM_SECRET`, `VITE_SIGNING_SEED`, `NEXT_PUBLIC_JWT_PRIVATE_KEY` and `NEXT_PUBLIC_DB_CREDENTIAL` are each caught; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_MAPBOX_TOKEN` are correctly ignored; server-side `GOOGLE_CLIENT_SECRET`, `JWT_SECRET` and `AUTH_JWT_PRIVATE_KEY` are correctly ignored; prose in `docs/` and in any `.md` is ignored; a thin reason, an expired entry, an over-long window, a stale entry and a malformed allowlist each fail with the right message and exit code.

**2. Remove the variable from the three env templates. ⬜ Frontend change request — see §7.**

This replaces what an earlier draft of this plan proposed. The variable does not need *adding* to a template as a warning; it needs *removing* from three, because it is already there telling people to set it. Note that `sop-check.yml` Section 8 forces each file to a different branch, so this is **three separate PRs**: `.env.local.example` → `dev-main`, `.env.staging.example` → `staging`, `.env.production.example` → `live-mvp`.

**3. Correct the stale documents. ✅ Memory file done; `E2E-NOTES.md` is a frontend file.**

`.claude/memory/services/messaging-service.md` is corrected: the flow is wired rather than scaffolding, the private key is in IndexedDB rather than localStorage, the "proper fix (not implemented)" section now says the opposite, and it carries an explicit "do not set this variable" warning. `frontend/app/(group)/inbox/E2E-NOTES.md` needs the same corrections and is in §7.

**4. Confirm the variable is not set in Vercel. ⬜ Assumed not set, on your instruction.**

Proceeding on the stated assumption that it is unset in preview, staging and production. **This is the one Phase 0 item taken on trust rather than verified**, and it is the one that decides whether this is a plan or an incident. Worth five minutes in the Vercel dashboard to confirm — if it is set in any environment, private keys are already being uploaded under publicly-derivable KEKs, and §9 question 3 becomes the only thing that matters.

### **Phase 1 — Move KEK derivation to the server — BACKEND DONE, frontend outstanding**

The actual fix. Two options; the second is better and barely more work.

**Option A — server hands the client its own KEK.** New authenticated endpoint on user-service, `GET /user-keys/kek`, deriving from `E2EE_SERVER_SECRET` + `userId` + a **per-user random salt** stored in `user_keys`. The client receives only its own KEK, over TLS, and `backup.ts` loses the `process.env` read entirely.

**Option B — the KEK never leaves the server.** Instead of handing out a key, add `POST /user-keys/private-key/wrap` and `POST /user-keys/private-key/unwrap`. The client sends the private key PEM to be wrapped, or the blob to be unwrapped, and the KEK stays server-side. Strictly better: the client cannot leak what it never holds, and an XSS can only act within the live session rather than exfiltrating a durable key.

**Recommendation: Option B.** It reuses the `encryptPrivateKey` helper that already exists, and it is the only version where "platform manages KEK securely" is a true statement.

**What this costs honestly.** Under either option the server can derive any user's KEK, so the server can decrypt any user's private key. That is not a regression — the spec already states the trade-off plainly ("server can decrypt the private key, not 'true' E2E in the Signal sense"), and `conversation_raw_keys` already stores server-encrypted raw AES keys. The change does not weaken the trust model. It stops **the general public** from having the same power as the server.

If the CTO wants genuine end-to-end secrecy instead, that is a different and larger decision: a user passphrase or recovery code, with the accepted consequence that a forgotten passphrase loses message history permanently. That conflicts with the spec's stated requirement that history is *never* lost. It should be decided deliberately, not drifted into.

### **Phase 2 — Reconcile the two write paths — the dangerous half is done**

Pick one shape and apply it to both: either `storeEncryptedPrivateKey` also applies the server wrap and `getEncryptedPrivateKey` unwraps, or `registerDevice` stops wrapping. Add a `decryptPrivateKey` counterpart either way. Make `storeEncryptedPrivateKey` refuse to overwrite an existing blob unless the caller proves it holds the matching public key, mirroring `storePublicKey`'s existing protection. Move both salts to per-user random values.

### **Phase 3 — Then enable multi-device**

The reason anyone would have set the variable. Once Phase 1 lands, the recovery flow can be switched on safely and the single-device limitation closes — so this item ends by *delivering* the thing the insecure shortcut was reaching for, rather than just taking it away.

### **Phase 4 — Amend the spec**

Update the key-recovery spec: replace the `VITE_SYSTEM_SECRET` derivation with whichever option Phase 1 adopts, and remove or qualify the "Platform manages KEK securely ✅" claim. Without this, Phases 0 to 3 get undone by the next person who reads the spec and does what it says.

---

## **7. Frontend change request**

All `frontend/` work is specified here for the frontend owner rather than done by me.

**Phase 0 work, ready now — three one-line deletions, three branches.** Each is the removal of the `NEXT_PUBLIC_SYSTEM_SECRET` line and its `# --- E2E backup KEK seed ---` comment block. They go to different branches because `sop-check.yml` Section 8 requires it.

| File | Line | Target branch | Change |
|---|---|---|---|
| `frontend/.env.local.example` | 43–46 | `dev-main` | Delete the heading, both comment lines (including "Keep this value consistent across environments") and `NEXT_PUBLIC_SYSTEM_SECRET=change-me-in-your-local-env`. |
| `frontend/.env.staging.example` | 48–49 | `staging` | Delete the heading and `NEXT_PUBLIC_SYSTEM_SECRET=`. |
| `frontend/.env.production.example` | 42–43 | `live-mvp` | Delete the heading and `NEXT_PUBLIC_SYSTEM_SECRET=`. |

After each merge, **delete the matching entry from `.github/client-exposed-secrets-allowlist.json`** — the guard fails on an allowlist entry that no longer matches anything, which is deliberate. If all three land before Phase 1, only the `backup.ts` entry should remain.

**Phase 1 work, after the KEK decision in §9.**

| File | Change |
|---|---|
| `frontend/src/crypto/backup.ts` | Delete `deriveKEK` and its `process.env.NEXT_PUBLIC_SYSTEM_SECRET` read. Under Option B, delete `encryptWithKEK`/`decryptWithKEK` too and call the new endpoints instead; under Option A, keep them and take the KEK as a parameter. |
| `frontend/src/crypto/keys.ts` | Replace the `deriveKEK` call (~line 302) and the `kek`-gated branches at ~251–330 and ~371–383 with calls to the new endpoint(s). Keep the existing "refusing to migrate stale private key" guard at ~276 — it is correct and worth preserving. |

**Documentation, any time.**

| File | Change |
|---|---|
| `frontend/app/(group)/inbox/E2E-NOTES.md` | Three corrections. (a) The flow is **wired**, not scaffolding — the TL;DR's "the gap is small… ~half a day to wire properly" and the §"What's currently implemented" bullet are both out of date. (b) The private key is in **IndexedDB** via `idb` (`keys.ts:30–41`), not localStorage; only `deviceId` is in localStorage, so the "copy these localStorage entries" workaround is wrong. (c) Add that `NEXT_PUBLIC_SYSTEM_SECRET` must not be set, and why. The equivalent corrections are already made in `.claude/memory/services/messaging-service.md` and can be copied from there. |

**Three things to be explicit about with the frontend owner:**

- **The three template deletions are safe to ship immediately** and independently of everything else. They remove an instruction, not a behaviour: staging and production already have empty values, and the local placeholder is not a real secret.
- Removing the `NEXT_PUBLIC_SYSTEM_SECRET` read from `backup.ts` is also safe on its own — the variable is unset and the path already fails closed — but it breaks the recovery flow's only key source, so it should land with Phase 1 rather than before it.
- The `convKey:<convId>` entries that `frontend/src/crypto/storage.ts` writes are **raw conversation AES keys in localStorage, base64, unwrapped**, read by the live inbox at six-plus call sites. That is separate from item #2 and is not in this plan, but it is the larger client-side key-material exposure of the two and should get its own item.

---

## **8. Adjacent findings, not part of item #2**

Recording these so they are not lost, and so nobody mistakes them for being covered here.

1. **Raw conversation AES keys in localStorage** — `crypto/storage.ts`. XSS-readable, plaintext at rest, and the single largest client-side key exposure in the app. Deserves its own tasklist item. There is also a parallel unused `crypto/indexedDb.ts` with the same raw-base64 approach; consolidate onto one store, holding non-extractable `CryptoKey` handles rather than base64.
2. **JWTs in localStorage at six call sites** — `app/(group)/time-tracking/page.tsx` and `app/(group)/inbox/components/message-components.tsx`, bypassing the cookie-based auth the rest of the app uses and undercutting the CSRF work already done.
3. **Three other `NEXT_PUBLIC_` API keys** — `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY`, `NEXT_PUBLIC_LOCATIONIQ_API_KEY`, `NEXT_PUBLIC_DROPBOX_APP_KEY`. Browser keys are not automatically wrong, but each needs confirming as domain-restricted and quota-capped. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct by design and needs no action.
4. **Dev bypasses readable and reasoned-about from the bundle** — `NEXT_PUBLIC_ENABLE_DEV_LOGIN_BYPASS`, `NEXT_PUBLIC_DEV_NDA_USER_ID`, `NEXT_PUBLIC_ENABLE_DEBUG_PANELS`. Worth confirming each is false in production builds and that the backend does not honour the bypass regardless of the client flag.

---

## **9. Decisions needed before Phase 1**

1. **Option A or Option B** for KEK custody — recommendation is B, where the KEK never leaves the server.
2. **Is server-decryptable acceptable as the permanent model?** The spec says yes. If the answer is now no, Phase 1 changes shape entirely and the "history is never lost" requirement has to give.
3. **Is `NEXT_PUBLIC_SYSTEM_SECRET` set in any Vercel environment?** Needs someone with Vercel access. A yes turns Phase 0 into an incident response.
4. **Who owns the frontend changes in section 7**, and does the Phase 0 CI guard go in now, independently of that?

---

## **10. Revision log**

| Date | Change |
|---|---|
| 2026-10-08 | Initial plan. Established that the backup flow is wired (correcting two documents that say otherwise), that no secret value was ever committed, and that the spec itself prescribes the exposure. |
| 2026-10-08 | Phase 0 built: `check-client-secrets.py`, the allowlist, and `sop-check.yml` Section 11, tested against twelve cases. **Corrected a factual error in the initial draft** — the variable is an active entry in all three frontend env templates, not absent from the repository as first stated; the guard found it on its first run. Memory file corrected. The three template deletions and the `E2E-NOTES.md` corrections remain as frontend change requests. |
| 2026-10-09 | Phase 1 backend built: server-side wrapping bound to the user id with a per-wrap random salt, `backup`/`restore`/`status` routes, overwrite protection, and a format-aware reader. 22 tests passing, `tsc --noEmit` clean. **No schema change or migration needed** — the salt lives in the blob. Found during the work: `E2EE_SERVER_SECRET` was declared in no Render env group (now declared in `render.yaml`), and `registerDevice`'s wrapped rows had no reader anywhere in the service, so they were write-only. Also corrected: jest does run on the linked machine when scoped to one directory, contrary to an earlier note in the dry-run record. |
