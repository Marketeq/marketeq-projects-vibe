<!--
Marketeq PR template — required by Code Review SOP (docs/CODE_REVIEW_SOP.md).
The mechanical SOP check (.github/workflows/sop-check.yml) fails the PR if
off-limits files are touched without the correct four-point confirmation
in this description. Do not delete sections — leave "N/A" if they do not
apply.
-->

## Summary

<!-- 1-3 sentences. What does this PR do and why? -->

## Linked issues

<!-- e.g. Closes #123, Relates to #456 -->

## Breaking-change analysis

<!--
For every exported symbol, prop, function signature, API response shape, DTO,
entity, or shared component you changed, list it here and name the callers
you verified still work. If none, write "No breaking changes — no exported
symbols touched."
-->

- Changed symbol / shape: `<name>` in `<file>`
  - Callers verified: `<path>`, `<path>`
  - Impact: `<none | breaking | handled by <mechanism>>`

## Migration status

<!--
If you changed a TypeORM entity, link the migration file. If not, write N/A.
-->

- Entity changed: `<file>` → Migration: `<file>`

## QA performed

<!--
What did you actually test? Be specific. "It works on my machine" is not
acceptable — name the flows you clicked through.
-->

- [ ] Ran locally against a fresh `.env.local`
- [ ] Signed in as a client account and confirmed dashboard loads
- [ ] Signed in as a talent account and confirmed dashboard loads
- [ ] <flow 1>
- [ ] <flow 2>

## Off-limits confirmations (fill in ONLY the ones that apply)

### If this PR touches profile data loading (SOP §1.3)
Paste each of the following verbatim on its own line:

> no API call shapes in the profile data-loading path were changed
> useEffect ordering around the profile fetch was not modified
> loading spinner / fallback states still work for slow-network and error cases
> manual QA was performed against the live backend on a real talent and client profile

### If this PR touches local-login-frozen files (SOP §1.8)
Paste each of the following verbatim on its own line:

> local dev login on the frontend still works against a fresh .env
> backend JWT signing, verification, and guards are unchanged
> manual QA was performed locally with a client account and a talent account
> no credentials, keys, or secrets are committed in this PR

### If this PR targets `staging` and touches login or `.env.staging.example` (SOP §1.10)
Paste each of the following verbatim on its own line:

> staging login on Vercel preview still works against the staging Render backend
> staging cookie SameSite/Secure flags are unchanged
> staging CORS origin allowlist is unchanged
> manual QA was performed against the staging Render deployment with a client account and a talent account

### If this PR targets `main-live` and touches login or `.env.production.example` (SOP §1.10)
Paste each of the following verbatim on its own line:

> production login on Vercel production still works against the production Render backend
> production cookie SameSite/Secure flags are unchanged
> production CORS origin allowlist is unchanged
> manual QA was performed against the production Render deployment with a client account and a talent account

## Reviewer checklist

- [ ] I have read `docs/CODE_REVIEW_SOP.md` §1 (non-negotiable rules)
- [ ] I have verified the SOP Check and AI Breakage Detector are passing
- [ ] I have verified CODEOWNERS review is requested
- [ ] I have confirmed no off-limits files are touched without the required confirmation
- [ ] I have confirmed this PR does not couple `dev-main` to Render (SOP §1.9)

---

🤖 This PR will be reviewed by Claude Code on behalf of @CTorres9800 per the Code Review SOP.
