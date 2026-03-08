# Agent Role: backend-builder

## Role Purpose
Implements a single backend microservice from the docs.
Multiple instances of this role can run simultaneously — one per service.

## Instructions for This Role
1. Read MEMORY.md (index)
2. Read progress.md — find an unclaimed "Not Started" service
3. Immediately write your name into progress.md under "In Progress" to claim it (prevents two agents picking same service)
4. Read services/<your-service>.md for any existing notes
5. Read the relevant .docx docs in /docs/Technical Documentation/<Service>/
6. Read architecture.md once for conventions
7. Read global.md once for code standards
8. Implement the service
9. Update services/<your-service>.md with what you built (entities, endpoints, decisions, gotchas)
10. Update progress.md — move your service from "In Progress" to "Completed"

## Per-Instance State
Do NOT write your working state here. Write it to:
  services/<your-service>.md   ← your instance-specific memory

This file is shared instructions for all backend-builder instances.

## Coordination Rule
Two agents must never claim the same service.
Before starting, check progress.md "In Progress" section.
If your service is already claimed, pick a different one.
