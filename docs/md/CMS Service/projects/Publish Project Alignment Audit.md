# Publish-Project ↔ CMS Projects Alignment Audit

Date: 2026-04-22

This audit compares the frontend publish flow (`frontend/app/publish-project/page.tsx`) against the Payload CMS Projects collection (`backend/apps/cms-service/src/collections/Projects.ts`) and highlights where the CMS schema / validations diverge.

## What “Publish Project” Enforces (Frontend)

From `projectInfoSchema`:

- `title`: string, min 10 chars, max 120 chars
- `category`: array length **3** of `{ category: string, subCategories: string[] (min 1, max 5) }`
- `industry`: array, min 1, max 5
- `shortDescription`: string, min 50 chars, max 300 chars
- `fullDescription`: string, min 100 chars, max 2,000 chars
- `tags`: array, min 1, max 10
- `skills`: array, min 1, max 10

From `mediaFormSchema`:

- `featuredImages`: at least 1
- `featuredVideo`: optional, must be a valid URL if present

From `taskFormSchema` + `projectScopeSchema`:

- At least 1 phase
- Each phase has a `phaseName` and at least 1 task
- Each task has required `task`, `role`, `location`, `experience` (enum), and `duration` (`value` number + `type`)

## How CMS Stores Similar Data (Payload)

The Projects collection uses different shapes for several concepts:

- Categories are stored as:
  - `categorySelections`: array (exactly 3) of `{ category: string, subCategories: {value: string}[] (1–5) }`
  - `categories`: derived array of `{ value: string }` (flattened, kept for sync compatibility)
  - `subcategories`: derived array of `{ value: string }` (flattened, max 15, kept for sync compatibility)
- Skills are stored as `projectSkills`: array of `{ value: string }` (labeled “Skills” in the admin UI)
- Long-form copy uses Lexical rich text (`richText`), not a raw string.
- Long-form copy in CMS `fullDescription` now mirrors `/publish-project` (plain text / textarea).
- Project scope is stored as:
  - `publishScope`: canonical scope shape that mirrors `/publish-project`
  - `scope`: derived legacy scope shape used for computed fields + listings-service sync compatibility

## Key Mismatches (Before Fix)

- Length limits:
  - CMS `title` allowed up to 140, and had a special-character restriction; publish-project uses 10–120 chars with no special-char restriction.
  - CMS `shortDescription` allowed up to 320; publish-project uses 50–300.
  - CMS `fullDescription` had no min/max; publish-project uses 100–2,000.
- Required-ness / min counts:
  - CMS allowed empty `tags`, `industries`, and `projectSkills`; publish-project requires at least 1 for tags/industry/skills.
  - CMS `categories` allowed 1–3; publish-project requires exactly 3.
  - CMS `subcategories` was optional; publish-project requires at least 1 (per category).
- Shape mismatch that can’t be made identical without a schema redesign:
  - (Resolved in CMS) CMS now stores category groups (`categorySelections`) like publish-project; it still derives flattened `categories` / `subcategories` for sync compatibility.
- Scope mismatch (data model + rules differ):
  - (Resolved in CMS) CMS now stores scope in `publishScope` with the same duration (value+type), locations array, and required-ness as `/publish-project`.
  - CMS still derives `scope` (legacy) for downstream compatibility; it derives `estimatedHours` from duration when not provided.
  - publish-project task fields are named differently (`task` vs `title`, `role` vs `roleName`), and the phase model differs (publish flow also carries extra phase metadata in its API payloads).

## Changes Applied To CMS (So It Matches Publish Rules Where Possible)

Implemented in `backend/apps/cms-service/src/collections/Projects.ts`:

- `title`
  - now validates like publish-project (min 10, max 120)
  - maxLength set to 120
- `shortDescription`
  - now validates like publish-project (min 50, max 300)
  - maxLength set to 300
- `fullDescription` (Lexical rich text)
  - now validates plain-text length extracted from Lexical content (min 100, max 2,000)
- `categories`
  - now requires exactly 3 rows (`minRows: 3`, `maxRows: 3`)
- `subcategories`
  - now derived from `categorySelections` and allowed up to 15 total (3×5) for sync compatibility
- `categorySelections`
  - new canonical categorization shape in CMS to match `/publish-project` (exactly 3 categories, each with 1–5 subcategories)
- `publishScope`
  - new canonical scope shape in CMS to match `/publish-project` (phases + tasks with locations array + duration value/type)
- `tags`
  - now required, 1–10 rows
- `projectSkills` (labeled “Skills”)
  - now required, 1–10 rows
- `industries`
  - now required, 1–5 rows

## Remaining Differences / Follow-Ups

- If you want CMS to match publish-project *exactly*, we’d need to remodel categorization in CMS to a `categorySelections`-style array so each of the 3 categories owns its own 1–5 subcategories.
- CMS scope (`scope[]`) is a different structure than the publish-project phase/task payloads. To align scope rules with the publish flow, we’d need a decision on:
  - whether CMS must require `scope` (and potentially deprecate / hide `totalEstimatedHours` fallback), or keep the fallback for legacy/partial entries
  - whether CMS should store `duration` (value + type) like the publish form, or standardize everything to `estimatedHours`
  - how to represent multi-location (publish types suggest `location` can be an array in some API payloads) vs CMS’s current single string
