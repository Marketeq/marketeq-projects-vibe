# **Encryption Key Management — Audit and KMS Plan**

**As of:** 2026-10-16
**Covers:** Security Tasklist item — "Centralize encryption-key management under a KMS/HSM (not raw environment variables)."
**Status:** audit complete, plan only. No code written.
**Verified against:** every `createCipheriv`/`createDecipheriv` call site in `backend/apps` and `backend/libs` (node_modules and specs excluded), read on branch `security/gateway-rate-limiting` at merge commit `8f5860c0`.

---

### **The short version**

**Nine encryption sites across six services, and no two of them manage keys the same way.** Four different key-derivation conventions, two unauthenticated cipher modes, and one environment variable used two different ways by two different services.

Three things matter more than the rest:

1. **`TAX_TIN_ENCRYPTION_KEY` falls back to a random ephemeral key**, and it is now the only one left that does. It protects taxpayer identification numbers — the most sensitive data class on the platform. When the variable is unset the service logs a warning and carries on, and every TIN written in that window becomes permanently unreadable on restart.

   **This bug is already understood here.** The identical fallback existed in payout-service for bank details, wallet addresses and OAuth tokens, and all three were fixed upstream on `dev-main` — the comment in `bank-encryption.service.ts` even reads "same failure mode fixed for `OAUTH_TOKEN_ENCRYPTION_KEY`". The fix went service by service and user-service was never reached. So the one instance that survives is the one guarding the most sensitive data, in the service nobody thought to check.
2. **The repo already contains a correct key-management implementation** — `scheduling-service/app/packages/lib/crypto/keyring.ts`, inherited from Cal.com. Named rings, key IDs recorded against each ciphertext, a `CURRENT` pointer, length validation, fail-closed. It is still env-backed, but the *interface* is exactly what a KMS plugs into. This item does not need inventing; it needs that shape applied everywhere and its backend swapped.
3. **"Not raw environment variables" and "under a KMS" are two different goals,** and the difference decides the whole project. A secrets manager (Doppler, Infisical, 1Password) removes the env var and still hands your process the key. A KMS never gives you the key — you send it data, or a data key to unwrap. Adopting a secrets manager satisfies the wording of this item and achieves almost none of its intent.

**And my own recent work is in scope.** Phase 1 of the client-secret item put key custody for every user's private key on `E2EE_SERVER_SECRET`, a raw environment variable. It was the right call against the alternative (a key published in the browser bundle), but it is the second-best answer to this item, and it should move behind whatever this item chooses.

---

## **1. The inventory**

| # | Service / file | Protects | Key source | When the key is missing |
|---|---|---|---|---|
| 1 | `user-service/tax-info/tin-encryption.service.ts` | **Taxpayer ID numbers** | `TAX_TIN_ENCRYPTION_KEY`, raw hex | ⚠️ **warns, then `randomBytes(32)`** |
| 2 | `payout-service/methods/bank-encryption.service.ts` | Bank account details | `BANK_ENCRYPTION_KEY`, raw hex | ✅ throws (fixed upstream) |
| 3 | `payout-service/crypto/crypto-connection.service.ts` | Crypto wallet addresses | `CRYPTO_ADDRESS_ENCRYPTION_KEY`, raw hex | ✅ throws (fixed upstream) |
| 4 | `payout-service/oauth/oauth.service.ts` | OAuth provider tokens | `OAUTH_TOKEN_ENCRYPTION_KEY`, raw hex | ✅ throws (fixed upstream) |
| 5 | `auth-service/auth/auth.service.ts` | 2FA secrets / backup codes | `TWO_FACTOR_ENCRYPTION_KEY` → `scrypt(key, "marketeq-2fa-salt")` | ✅ throws |
| 6 | `messaging-service/encryption/encryption.service.ts` | Conversation AES keys | `E2EE_SERVER_SECRET` → `sha256(secret)` | ✅ throws |
| 7 | `user-service/user-keys/user-keys.service.ts` | Users' RSA private keys | `E2EE_SERVER_SECRET` → `scrypt(secret:userId, random salt)` | ✅ throws |
| 8 | `scheduling-service/lib/crypto.ts` | Cal.com credentials (legacy) | key passed in, `Buffer.from(key, "latin1")` | caller's problem |
| 9 | `scheduling-service/lib/crypto/keyring.ts` | Cal.com credentials (current) | `CALCOM_KEYRING_<RING>_<KID>`, base64url | ✅ throws, validates length |

## **2. Four failure patterns**

### **2.1 A key that invents itself — one left, and it is the worst one**

**Corrected 2026-10-16.** My first pass through this said four sites did this. It was written against the pre-merge tree: `dev-main` had already fixed all three payout-service keys to throw on a missing or malformed value, with clear error messages naming `openssl rand -hex 32`. Only **site 1, the TIN key, still does it.**

Site 1 responds to a missing or malformed key by generating a random one and continuing. The consequences are severe:

- Data written under the generated key is **unrecoverable after restart** — the key only ever existed in memory.
- The service looks healthy. Encryption "works". The loss is silent and only discovered when someone tries to read the data back, potentially months later.
- A **typo is indistinguishable from an absence**: the key is accepted only if it is exactly 64 hex characters, and a random key is substituted otherwise. One wrong character in a Render env var produces a service that quietly stops being able to read its own data.

A taxpayer identification number is the closest thing to a government ID this platform stores, and PS-26 requires it encrypted at rest — a requirement that an ephemeral key does not meet in any meaningful sense. The fix is already written three times over in payout-service; it needs copying into `tin-encryption.service.ts`.

### **2.2 Two unauthenticated cipher modes**

- **Site 5, `aes-256-cbc`** — protects 2FA secrets and backup codes. CBC provides confidentiality but no integrity: there is no authentication tag, so a modified ciphertext decrypts to modified plaintext rather than failing. Everything else on the platform uses GCM.
- **Site 8, `aes256`** (an alias for `aes-256-cbc`) — same issue, plus `Buffer.from(key, "latin1")`, which silently mangles any key byte above 0x7F rather than rejecting it.

Neither is a break on its own, but "some of our encryption is authenticated" is not a property anyone can reason about, and the item is an opportunity to make it uniform.

### **2.3 No key versioning — rotation is a mass decryption failure**

Only the keyring (site 9) records *which* key encrypted a given record. Everywhere else, rotating a key makes every existing ciphertext undecryptable, with no migration path and no way to tell old records from new.

This is not hypothetical — I hit it a week ago. Phase 1 of the client-secret work had to invent a `v2:` prefix inside the stored blob purely so a future rotation would be possible. That was a local workaround for a platform-wide gap.

### **2.4 One secret, two key schedules**

`E2EE_SERVER_SECRET` is consumed by two services that derive different keys from it:

- messaging-service: `sha256(secret)` — no salt, no KDF
- user-service: `scrypt(secret + ":" + userId, random salt)` — the Phase 1 code

Same variable, two meanings, two services, and a rotation breaks both in different ways at different times. The second of those is mine.

## **3. The part that is already right**

`scheduling-service/app/packages/lib/crypto/keyring.ts` does what the rest of the platform does not:

```
CALCOM_KEYRING_<RING>_CURRENT = k2        ← which key to encrypt with now
CALCOM_KEYRING_<RING>_K1      = <base64url 32 bytes>
CALCOM_KEYRING_<RING>_K2      = <base64url 32 bytes>
```

Each ciphertext carries its `kid`, so old records stay readable while new ones use the current key. Keys are per-ring, so a compromise is scoped to one data class. Length is validated and a missing key throws. It also supports AAD, which binds ciphertext to its context.

**This is the migration path.** Everything in section 2 is fixed by putting every site behind this interface — and once they are, moving from env-backed keys to a KMS is a change to one function (`getKeyMaterial`), not to nine services. The expensive half of this item is the refactor, and it pays off whether or not a KMS is ever bought.

## **4. Choosing the KMS — the decision this item actually needs**

The platform runs on Render, Supabase and a Hostinger VPS. **None of them offers a KMS.** So this item cannot be completed without adopting something new, and the options differ in what they actually protect.

| Option | The key material | Honest assessment |
|---|---|---|
| **Secrets manager** (Doppler, Infisical, 1Password) | Delivered to the process at boot | Removes env vars, improves distribution, audit and rotation workflow. **The key is still in your process memory, so a compromised service still leaks it.** Satisfies the item's wording, not its intent. |
| **AWS KMS** | Never leaves AWS; you get data keys under envelope encryption | Real KMS properties: per-call audit trail, IAM-scoped, key policies, automatic rotation. Usable from Render over the API. **`@aws-sdk/*` is already a dependency across six services** for Cloudflare R2, so the SDK and credential patterns are familiar. ~$1/key/month plus per-request. |
| **GCP KMS / Azure Key Vault** | Same properties | Equivalent. No existing footprint in the stack, so no head start. |
| **Self-hosted Vault / OpenBao** | Yours to operate | Full control, no vendor. But it becomes critical infrastructure you run — and the obvious host is the Hostinger VPS that already carries the database, so a single box failure takes out both the data and the means to decrypt it. |
| **Supabase Vault (pgsodium)** | In the database | Keys live beside the data they protect, which defeats most of the point. Not recommended for this. |

**Recommendation: AWS KMS, with envelope encryption.** Each service asks KMS to decrypt a wrapped data key at boot (or per record for the highest-sensitivity classes), and the master key never exists in any Marketeq process. The SDK is already in the tree, it works fine from Render, and the per-key cost is negligible at this scale.

**Worth stating plainly:** envelope encryption means the *data key* is still in process memory while the service runs. A KMS does not change that. What it changes is that the master key is never in your infrastructure, every unwrap is logged and attributable, access is revocable without redeploying, and rotation is a KMS operation rather than a coordinated outage.

## **5. The plan**

### **Phase 0 — Stop the silent data loss. Does not wait on any decision.**

**One file.** Make `tin-encryption.service.ts` throw on a missing or malformed key, exactly as the three payout-service equivalents already do — the error message can be copied almost verbatim from `bank-encryption.service.ts`.

Needs no vendor, no budget and no architecture decision, and it closes the single most damaging thing in this audit.

**Correction, 2026-10-20.** An earlier draft said this would make test case US-1.3 pass. It will not. `CS-1.3` and everything downstream of it are scoped to payout-service, so the TIN key in user-service appears in no feature, story, criterion, test case or ticket. It is the worst remaining instance of the bug and it is tracked nowhere. That needs its own ticket.

One caution: if `TAX_TIN_ENCRYPTION_KEY` is unset in a running environment, failing startup turns a silent problem into a visible crash-loop. Set the variable first, then ship the check. And if it has ever been unset while TINs were being written, those records are already unreadable — that is data recovery, not a config fix.

### **Phase 1 — One key interface, platform-wide — 3 of 9 sites done**

**Done 2026-10-19 for payout-service**, which closes `AC-1.3.3` for the three financial keys. Operating reference, including the rotation procedure: `Financial Key Ring — Implementation Notes.md`. `crypto/field-encryption.ts` holds the ring; stored values carry the id of the key that wrote them as `v2:<kid>:<iv>:<tag>:<ciphertext>`; `encryption_key_rotations` records when each key took over. Bank, OAuth-token and crypto-address encryption all run through it, and the single-key environment form still works unchanged. 31 tests in `crypto/field-encryption.spec.ts`.

**Six sites remain:** the TIN key in user-service, the 2FA key in auth-service, messaging-service, `user-keys.service.ts` in user-service, and the two scheduling-service sites.

The original plan, still applicable to those six. Standardise on AES-256-GCM, kill the two CBC sites, give every ciphertext a `kid`, and define one ring per data class — `TIN`, `BANK`, `OAUTH`, `CRYPTO_ADDRESS`, `TWO_FACTOR`, `E2EE`, `CREDENTIALS`.

This also resolves §2.4: messaging-service and user-service stop deriving different keys from one shared variable and each take their own ring.

Ciphertext formats change, so each site needs a reader that understands both the old and new shapes — the same approach Phase 1 of the client-secret work already used for `user_keys`.

### **Phase 2 — Swap the keyring's backend for the KMS**

With Phase 1 done this is one function. `getKeyMaterial(ring, kid)` stops reading `process.env` and starts unwrapping a data key through KMS, cached per process with a bounded lifetime. Nothing else changes.

### **Phase 3 — Rotation, which is the point**

A documented, exercised rotation: add `k3`, move `CURRENT`, re-encrypt in the background, retire `k1`. Until a rotation has actually been performed once, the system is not rotatable — it only looks it.

## **6. The shared process environment**

Found 2026-10-19 while answering a narrower question. It is the largest key-exposure problem in this document and it has nothing to do with which KMS gets chosen.

**All 39 backend services share one process environment.** `render.yaml` deploys a single service, `marketeq-backend`, built from one Dockerfile with one secrets group attached. `boot-all.js` then spawns every service as a child:

```js
function buildInternalServiceEnv(svc) {
  const env = {
    ...process.env,     // every secret, to every service
```

So `autocomplete-service` can read `BANK_ENCRYPTION_KEY`, and `cms-service` can read `TAX_TIN_ENCRYPTION_KEY`. A bug in any one of the 39 gives up the keys protecting bank accounts, taxpayer identification numbers and payment tokens, whether or not that service has anything to do with money.

**The design is not reckless, and the reason is documented.** `boot-all.js` records a memory budget of roughly 2 GB of heap across 32 processes inside one 4 GB Render Pro container; 39 separate Render services would cost many times more. The chosen control is network-level: only the gateway is exposed, everything else listens on localhost. The secret sharing is not a decision anyone made. It falls out of `spawn` inheriting the parent environment, which is what you write by default.

*(Noted in passing: dev, staging and live-mvp all point at this same backend, so there is no environment separation either. Out of scope here, probably worth its own item.)*

### **6.1 Per-service environment allowlist — DONE, in monitor mode**

Implemented 2026-10-19 on branch `security/gateway-rate-limiting`.

Each service now receives only the variables it reads. `scripts/generate-env-manifest.js` scans each service and writes `env-manifest.json`, `env-isolation.js` applies it, and `boot-all.js` calls it for every child and for the gateway.

Measured against a sample of 14 platform secrets, **23 of the 36 services would keep 2** — the pair every service needs to verify a caller's token — and lose the other 12. `payout-service` keeps its three encryption keys and Stripe. `autocomplete-service` and `cms-service` keep no secrets at all.

Three things worth knowing:

- **It ships in monitor mode.** It reports what it would withhold and changes nothing, because a missing variable is a service that does not boot. `ENV_ISOLATION_MODE` takes `off`, `monitor` or `enforce`, and an unrecognised value falls back to monitor rather than silently enforcing. Switch to enforce only after a full deploy's worth of monitor output reads correctly.
- **It fails open.** A service with no manifest entry, or an unreadable manifest, gets the full environment and is reported. A new service never fails to boot because nobody regenerated a JSON file.
- **Monitor already earned itself.** Moving payout-service's three keys onto the key ring (§5, Phase 1) made their variable names dynamic, so the static scan stopped seeing them. In enforce mode payout-service would have failed to start. They are now listed as prefixes under `extra`, with a note saying why.

**This is defence in depth, not a boundary.** All 39 children run as the same user, so an attacker with code execution inside one could still read a sibling's environment from `/proc`. What it removes is accidental exposure: a log line, an error handler that dumps config, a crash report, a dependency that phones home. That is how secrets usually actually escape.

### **6.2 Split the container by risk tier — NOT DONE, needs a budget decision**

The real boundary, and the reason 6.1 is only half an answer.

**The change.** Move the money and identity services into their own Render service with their own secrets group:

| Service | Contains | Holds |
|---|---|---|
| `marketeq-backend-sensitive` (new) | payout, user, auth, wallet, checkout, billing, earnings, transaction, wire-review | the encryption keys, Stripe, the TIN key, `E2EE_SERVER_SECRET` |
| `marketeq-backend` (existing) | the remaining ~27 | no financial or identity keys at all |

A compromise in the CMS then cannot reach the bank key, because the key is not in that container. That is a different claim from 6.1, which only makes it harder to leak by accident.

**What it costs.**

- A second Render service. The 4 GB container currently carries about 2 GB of heap, so this is two smaller instances rather than two full-size ones, but it is still a second line on the bill. This is the part that needs the CTO.
- Service-to-service calls currently go to `localhost:<port>`. Cross-container calls need Render internal URLs, so the URL table in `boot-all.js` and the gateway's proxy configuration both change.
- Two deploys to keep in step. The n8n orchestrator pins deploys to commit SHAs, so both services need the same SHA or the platform runs split-brain.
- `boot-all.js` needs to launch a subset rather than everything, driven by an env var naming the tier.

**Why it is worth doing anyway.** The allowlist reduces how easily a secret leaks. The split reduces what there is to leak. Only the second survives an attacker who actually gets code execution, and the data behind these keys — bank accounts and taxpayer identification numbers — is where that distinction earns its cost.

**They stack.** The allowlist stays useful after the split, because even inside the sensitive container not every service needs every key. 6.1 is not throwaway work.

**Suggested order.** Let 6.1 run in monitor through a full deploy cycle, switch it to enforce, then use the enforce-mode logs as the evidence for which services genuinely need the sensitive keys. That list is the membership of `marketeq-backend-sensitive`, derived from measurement rather than from a guess.

## **7. What I would do regardless of the KMS decision**

If this item stalls on procurement, these still stand on their own and together close most of the real risk:

1. Fail startup on the TIN key — the last self-generating one, guarding the most sensitive data.
2. Move the two CBC sites to GCM.
3. Give every ciphertext a key id, so a future rotation is possible at all.
4. Split `E2EE_SERVER_SECRET` into two variables, one per service, since they are already two different keys in practice.

## **8. Decisions needed**

1. **KMS or secrets manager?** They are not the same thing and the item's wording permits the weaker one. Worth being deliberate rather than letting procurement decide by default.
2. **If KMS, which?** AWS is recommended on the strength of the existing SDK footprint.
3. **Which data classes get per-record KMS calls** rather than a cached data key? TIN and bank details are the candidates; everything else can use a per-process data key.
4. **Is Phase 0 authorised to ship ahead of the rest?** It is the highest-value change here and it blocks on nothing.
5. **Is `TAX_TIN_ENCRYPTION_KEY` set in production today?** If it is not, TINs are being written under a key that dies with the process, and that is an incident rather than a planning item.

   There is a clue worth following: **none of these five key variables is declared in `render.yaml`** — not the TIN key, not the three payout keys, not `TWO_FACTOR_ENCRYPTION_KEY`. Since the three payout keys now *throw* on startup and payout-service is running, they must be set directly in the Render dashboard. So `render.yaml` is out of sync with the live environment group, and the only way to know whether the TIN key is among them is to look.

## **9. Recommended standing policy**

**For the team to adopt, not a description of today.** Everything below is a rule for the future; §1 says what the platform actually does now. Written because `CS-1.3` has recommended a KMS since 17 September 2026 and nothing has been decided either way since. A recommendation nobody accepts or rejects turns into a test case nobody can pass, which is where `AC-1.3.4` ended up.

### **9.1 Adopt a key service**

Pick one and pay for it. AWS KMS is the recommendation in §4, on the strength of `@aws-sdk/*` already being a dependency in six services. GCP and Azure are equivalent; OpenBao is viable but not advised for a team this size, for the reasons in §4.

**If the answer is no, record that too.** A documented "not this year, accepted risk, revisit in April" is a legitimate outcome and far better than silence. What does not work is leaving it open, because every downstream document keeps generating criteria against infrastructure nobody has bought.

### **9.2 The rules worth writing down**

These hold whichever provider is chosen, and most of them are worth adopting even if the answer to 9.1 is no.

**One key per data class, never one key for everything.** Bank details, taxpayer IDs, payment-provider tokens and wallet addresses each get their own. A compromise should cost one category of data, not all of them. The ring names in `crypto/field-encryption.ts` already encode this.

**Each service gets access only to its own keys.** This is the main thing a key service buys that an environment variable cannot: access becomes a permission that can be revoked in seconds, instead of a secret that can only be withdrawn by changing it and re-encrypting everything behind it.

**Every encrypted value records which key encrypted it.** Already true in payout-service as of §5. Any new encryption site uses the shared key ring rather than its own `createCipheriv` call, so this stays true by default rather than by discipline.

**Rotation has a date and gets exercised.** Annually at minimum, and immediately on suspected compromise or when someone with access leaves. A rotation that has never been performed is not a capability, it is an assumption. Run one deliberately on a low-volume ring and write down how long it took.

**Nothing is retired until its data has moved.** Removing a key while rows still reference it makes those rows unreadable for good. The ring throws a named error for this rather than failing obscurely, but the ordering is still the operator's responsibility: add, repoint, re-encrypt, verify nothing remains on the old key, then retire.

**Authenticated encryption only.** AES-256-GCM everywhere. The two sites still on CBC (§2.2) move when they are next touched.

**Plan for losing access to the key service before you need to.** This is the failure mode that takes the platform down rather than merely exposing it: if the KMS is unreachable or an account is locked, every encrypted field becomes unreadable at once. Decide in advance who can restore access, how an offline copy of the master key material is held and by whom, and test that path once. A key service you cannot recover is worse than an environment variable.

**New keys and new access grants need an approval, and leave a record.** The `encryption_key_rotations` table (§5) covers the "what changed and when" for rotation. Who approved it belongs with whatever the team uses for change approval, which today means CODEOWNERS review on the PR.

### **9.3 Who owns this**

Key custody sits with the cybersecurity domain, not with the services whose data the keys protect. Doc 01 says so explicitly for `CS-1.3`: "key custody, not knowing the business logic that uses them, is this domain's responsibility, consistent with how `JWT_SECRET` custody is handled for auth-service."

Practically that means payout-service should not be deciding how its keys are stored, and whoever owns this domain should be the one answering 9.1.

## **10. Revision log**

| Date | Change |
|---|---|
| 2026-10-16 | Initial audit of all nine encryption sites. Found the TIN ephemeral-key fallback, the two unauthenticated cipher modes, and the existing Cal.com keyring that gives this item its migration path. |
| 2026-10-16 | **Corrected:** the first draft said four keys self-generate. Three had already been fixed upstream on `dev-main` and the draft was written against the pre-merge tree. Only the TIN key remains — which sharpens the finding rather than softening it, since the team fixed this exact bug three times and missed the instance guarding taxpayer IDs. Also recorded that none of the five key variables is declared in `render.yaml`. |
| 2026-10-19 | Added §6 after finding that all 39 services share one process environment. Implemented the per-service allowlist (§6.1) in monitor mode and documented the container split (§6.2) for a future budget decision. Separately closed AC-1.3.3 with a key ring in payout-service. |
| 2026-10-20 | Added §9, a standing KMS policy for the team to adopt. Written because CS-1.3 has recommended a key service since 2026-09-17 with no decision taken either way, which is how AC-1.3.4 became a QA task for infrastructure that does not exist. |
| 2026-10-20 | Updated §5 to record that Phase 1 is done for payout-service's three sites (AC-1.3.3 closed) with six remaining. **Corrected** a claim in Phase 0 that fixing the TIN key would make US-1.3 pass: it would not, because CS-1.3 is scoped to payout-service and the TIN key is tracked in no document or ticket anywhere. |
