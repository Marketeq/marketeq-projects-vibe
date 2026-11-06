# **Dependency Overrides — Register and Justification**

**Covers:** the nine `overrides` in `backend/package.json` — what each one forces, why it exists, and what it costs.
**Satisfies:** AC-2.3 (PMCM-761), "each of the 9 overrides has a written justification".
**Method:** derived from `backend/package-lock.json` — which packages declare a dependency on each target, what range they declare, and how npm itself classifies the installed copy (`dev` flag, the same basis `npm audit --omit=dev` uses). Advisory status is carried from the 2026-10-06 baseline in *Software Composition Analysis — Phase 2 (Triage)* and **needs re-checking at the next scan**; a pin's advisory status is a snapshot, which is the whole lesson of that phase.

---

## **The short version**

**Three of the nine are still pinned to vulnerable versions. Two of the nine are doing nothing at all.**

The three vulnerable pins — `tar`, `multer`, `fast-xml-parser` — are already documented in Phase 2 §3, and all three are fixed by `npm update`, since every caret already permits the patched version.

The two inert ones are new here. `handlebars` is pinned to `^4.7.9` and its only dependent, `ts-jest`, declares `^4.7.9` — the override constrains nothing. `flatted` is pinned to `^3.4.2` where `flat-cache` declares `^3.2.9`, which that pin already satisfies. Both are dev-only. They can be removed without changing a single resolved version, and removing them is worth doing: every override is a standing instruction to ignore what a maintainer asked for, and two of these are buying nothing in return.

**Seven of the nine reach production.** Only `flatted` and `handlebars` are dev-only. That matters for AC-2.1, which sets the clock by whether a finding is runtime.

---

## **The register**

| # | Override | Pinned | Resolved | Reaches production | Advisory status (2026-10-06) |
|---|---|---|---|---|---|
| 1 | `tar` | `^7.5.13` | 7.5.13 | **Yes** | **Vulnerable — critical**, `<=7.5.20` |
| 2 | `multer` | `^2.1.1` | 2.1.1 | **Yes** | **Vulnerable — high**, `<=2.2.0` |
| 3 | `fast-xml-parser` | `^5.5.7` | 5.5.10 | **Yes** | **Vulnerable — moderate**, `<5.7.0` |
| 4 | `minimatch` | `^9.0.7` | 9.0.9 | **Yes** | Clean |
| 5 | `picomatch` | `^4.0.4` | 4.0.4 | **Yes** | Clean |
| 6 | `glob` | `^10.5.0` | 10.5.0 | **Yes** | Clean |
| 7 | `lodash` | `^4.18.1` | 4.18.1 | **Yes** | Clean |
| 8 | `flatted` | `^3.4.2` | 3.4.2 | No — dev only | Clean |
| 9 | `handlebars` | `^4.7.9` | 4.7.9 | No — dev only | Clean |

---

## **Why each one exists**

### **1. `tar` — forces 7.x onto a dependent asking for 6.x**

`bcrypt` → `@mapbox/node-pre-gyp`, which declares `tar: ^6.1.11`. The override forces the 7.x line, a major-version jump its dependent never asked for.

Reaches production through `bcrypt`, which is a runtime dependency — so despite `node-pre-gyp` looking like build tooling, npm places `tar` in the production tree and `npm audit --omit=dev` reports it. Worth stating plainly, because the opposite is easy to assume.

**Status: still vulnerable, critical.** `^7.5.13` already permits 7.5.21; the lockfile is simply stale. `npm update tar` fixes it with no change to `package.json`.

### **2. `multer` — lifts a framework's exact pin**

`@nestjs/platform-express` declares `multer: 2.0.2`, exactly. The override lifts the whole tree to 2.1.1. The repository also declares multer directly.

**Status: still vulnerable, high.** `npm update multer` resolves it.

**The trap, repeated from Phase 2 §3 because it is expensive to get wrong:** npm reports this fix as needing `--force` and a breaking `@nestjs/platform-express@12` upgrade. It does not. The version is controlled by this override, so raising the pin fixes it and leaves the framework alone. Following the tool's advice here turns a one-line change into a migration across thirty-five services.

### **3. `fast-xml-parser` — a patch floor over an AWS SDK pin**

`@aws-sdk/xml-builder` declares `5.5.8` exactly; the override resolves 5.5.10. A minor lift rather than a major jump.

**Status: still vulnerable, moderate.** The advisory covers everything below 5.7.0, so the current pin does not clear it. `^5.5.7` permits 5.7.x, so `npm update fast-xml-parser` is enough.

### **4. `minimatch` — escaping the 3.x ReDoS line**

Declared as `^3.x` by the ESLint family (`eslint`, `@eslint/eslintrc`, `@humanwhocodes/config-array`), `fork-ts-checker-webpack-plugin` and `test-exclude`. The override forces 9.0.9 — a 3 → 9 jump on packages that asked for 3.

Reaches production via `glob`, which declares `^9.0.4` and is itself pulled in by `typeorm`. So the runtime path is a compatible one; the forced jump lands on dev tooling.

**Status: clean.** Justified. The cost is compatibility exposure on five dev-tooling dependents, which has not caused a problem.

### **5. `picomatch` — same shape, 2.x → 4.x**

Declared `^2.x` by `anymatch`, `micromatch`, `readdirp` and `jest-util`; `@angular-devkit/core` declares `4.0.1`. The override forces 4.0.4 on all of them.

**Status: clean.** Justified, same reasoning as `minimatch`, with the same standing compatibility cost.

### **6. `glob` — 7.x dependents forced to 10.x**

`rimraf` and the Jest family (`@jest/reporters`, `jest-config`, `jest-runtime`, `test-exclude`) declare `^7.1.x`. `typeorm` declares `^10.5.0` and `@nestjs/cli` declares `10.4.5`, both already on the 10 line.

**Status: clean.** Justified. The forced jump affects the 7.x dependents only.

### **7. `lodash` — lifting two exact pins**

Most dependents declare `^4.17.21`, which 4.18.1 satisfies, so for them the override changes nothing. It bites on `@nestjs/config` and `@nestjs/swagger`, which declare `4.17.21` exactly and are lifted.

**Status: clean.** Justified, and low risk given lodash's compatibility record within a major line.

### **8. `flatted` — redundant**

Only dependent is `flat-cache`, declaring `^3.2.9`. The pinned `^3.4.2` already satisfies that range, so the override forces nothing a normal install would not have produced.

**Recommendation: remove.** Dev-only, clean, and constraining nothing.

### **9. `handlebars` — inert**

Only dependent is `ts-jest`, declaring `^4.7.9`. The override is `^4.7.9` — the same range. It cannot change any resolution.

**Recommendation: remove.** It reads as a safeguard and is not one, which is worse than having no entry, because the next person to audit this list will assume it is load-bearing.

---

## **Actions**

| Action | Which | Why |
|---|---|---|
| `npm update tar multer fast-xml-parser` | 1, 2, 3 | All three carets already permit the patched version; no `package.json` change needed |
| Remove the override | 8, 9 | Constrain nothing; resolved versions are unchanged by their removal |
| Keep, with the justification above | 4, 5, 6, 7 | Clean, and each is preventing a dependent from pulling a vulnerable older line |
| Re-check every row at the next scan | all | A pin's advisory status is a snapshot. Three of these went stale unnoticed, which is how this register came to exist |

---

## **A note on keeping this true**

Phase 2 put it well: a pin is a snapshot of one afternoon's advisory database, and the point of a pin is that you stop thinking about the package. That is why three of these went stale without anyone noticing.

This register does not solve that by existing. It solves it only if the re-check in the last row actually happens at each scan. Treat an override with no recent re-check the same way you would treat an unreviewed grant — as unverified, not as safe.
