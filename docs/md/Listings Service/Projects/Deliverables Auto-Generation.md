# Deliverables Auto-Generation

**Service:** listings-service (publish module)
**Applies to:** Projects and Services only (not Teams)
**Trigger:** Every time the project scope is saved or updated via the frontend

## 1. Overview

Deliverables are automatically generated from the project scope using an LLM. The user never needs to manually create deliverables — they are derived each time the scope changes. The team lead can edit deliverables after generation.

Deliverables are NOT dependent on the CMS. The user only has frontend access.

## 2. Data Model

### Storage

Deliverables are stored as a `jsonb` column on the `project` table:

```sql
ALTER TABLE project ADD COLUMN deliverables jsonb DEFAULT NULL;
```

### Shape

```json
[
  {
    "phaseLabel": "Phase One",
    "phaseName": "Research",
    "items": ["Market Analysis Report", "User Persona Profiles", "Competitor Audit", ...]
  },
  {
    "phaseLabel": "Phase Two",
    "phaseName": "Design",
    "items": ["Wireframe Prototypes", "High-Fidelity Mockups", "Design System", ...]
  }
]
```

## 3. Inputs to the LLM

The LLM receives both project-level context and per-task details.

### Project-level context

| Field | Source | Purpose |
|---|---|---|
| Project type | `categories[0]` (e.g. "Website", "Mobile App", "Cloud Application") | Helps the LLM understand what kind of product is being built |
| Project description | `shortDescription` and/or `fullDescription` | Provides overall project context |

### Per-task inputs

| Field | Source | Purpose |
|---|---|---|
| Task title | `task.taskName` | Primary input — what work is being done |
| Job title / Role | `task.role` | Who is doing the work — informs the type of deliverables |
| Task description | `task.description` | Additional context about the task (optional) |

## 4. Generation Rules

1. Deliverables are generated **per phase** — each phase in the scope produces one deliverable group
2. The number of deliverables per phase is **not fixed** — the LLM evaluates each task and determines how many meaningful deliverables it can produce
3. A task with a detailed name, specific role, and description can produce more deliverables than a vague task with no role
4. **Minimum 3 deliverables per phase** to fill one row of the 3-column frontend grid
5. **Maximum 6 deliverables per phase** to fill two rows (the design target)
6. Deliverables must be **contextually relevant** to the task, role, and project type — not generic filler
7. If multiple tasks exist in a phase, deliverables are distributed across tasks proportionally

### Examples

**1 task in phase, detailed:**
- Task: "E-commerce Product Page Design", Role: "Senior UI/UX Designer", Description: "Design responsive product pages with gallery, reviews, and checkout flow"
- Could generate 5-6 deliverables: "Product Page Wireframes", "High-Fidelity UI Mockups", "Image Gallery Component Design", "Review Section Layout", "Checkout Flow Prototype", "Responsive Breakpoint Specs"

**1 task in phase, vague:**
- Task: "Research", Role: none, Description: none
- Could generate 3 deliverables: "Research Summary", "Findings Report", "Recommendations Document"

**2 tasks in phase:**
- Task 1: "API Development", Role: "Backend Developer"
- Task 2: "Database Design", Role: "Backend Developer"
- Could generate 6 deliverables: "API Endpoint Specifications" (T1), "API Integration Documentation" (T1), "Unit Test Suite" (T1), "Database Schema Design" (T2), "Data Migration Scripts" (T2), "ERD Documentation" (T2)

## 5. When Deliverables Are Generated

| Event | Action |
|---|---|
| Scope saved/updated (`PUT /publish/project/:id/scope`) | Deliverables are re-derived from the new scope |
| Task added to a phase | Deliverables re-derive on next scope save |
| Task removed from a phase | Deliverables re-derive on next scope save |
| Phase added or removed | Deliverables re-derive on next scope save |
| Team lead edits deliverables manually | Manual edits are stored; NOT overwritten on next scope save (future enhancement) |

## 6. LLM Configuration

| Setting | Value |
|---|---|
| Provider | HuggingFace free Inference API |
| Model | `mistralai/Mistral-7B-Instruct-v0.3` |
| Env var | `HUGGINGFACE_API_KEY` (already configured) |
| Fallback | Heuristic adapter (1 deliverable = task title + role, padded to 3 minimum) |
| Timeout | 10 seconds per phase |

### Prompt Template

```
You are generating deliverables for a project scope phase.

Project type: {category}
Project description: {shortDescription}

Phase: {phaseName}
Tasks in this phase:
{for each task}
- Task: {taskName}, Role: {role}, Description: {description}
{end for}

Generate between 3 and 6 specific, actionable deliverables for this phase.
Each deliverable should be a short phrase (2-5 words).
Base the number on how much detail is available — more detail = more deliverables.
Return ONLY a JSON array of strings, nothing else.
```

## 7. Frontend Display

- 3-column grid layout (`grid grid-cols-3`)
- Each phase is a separate section with phase label and name
- Each deliverable is a checklist item with a blue check icon
- "View More" / "View Less" toggle when content exceeds the card height (456px)
- Alert at bottom: "The above list of deliverables is based on the current project scope and tasks. Deliverables are subject to change with any changes to the project scope or tasks."

## 8. API

### Deliverables are returned as part of the project draft response

```
GET /publish/project/:projectId
```

Response includes `deliverables` field alongside other project fields.

### Deliverables are re-generated on scope save

```
PUT /publish/project/:projectId/scope
```

After saving phases and tasks, the service automatically calls the LLM to derive deliverables and persists them to the project record. The response includes the updated scope.

## 9. Architecture

```
Frontend (scope editor)
    |
    | PUT /publish/project/:id/scope
    v
PublishController
    |
    v
PublishService.replaceProjectScope()
    |
    | 1. Delete old phases/tasks
    | 2. Save new phases/tasks
    | 3. Call DeliverablesAdapter.deriveDeliverables()
    | 4. Save deliverables to project record
    v
DeliverablesAdapterHuggingFace
    |
    | Builds prompt from project context + tasks
    | Calls HuggingFace Inference API (Mistral-7B)
    | Parses JSON array response
    | Falls back to heuristic on any failure
    v
deliverables[] saved to project.deliverables (jsonb)
```

## 10. Task Description Field

The `task` entity requires a `description` field to provide richer input to the LLM.

```typescript
// task.entity.ts
@Column({ type: String, nullable: true })
description: string;
```

```sql
ALTER TABLE task ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;
```

This field is optional — deliverables can still be generated from task title and role alone, but description improves quality.
