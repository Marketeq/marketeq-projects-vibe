# **Documentation Authoring Playbook**

Audience: Technical Documentation Engineers\
\
Purpose: Define how to build, update, and maintain backend documentation
following the standards established in the **Technical Architecture
Overview & Documentation Standards**.

## **1. Objective**

This playbook ensures every documentation engineer writes, edits, and
maintains backend documents in a **consistent, modular, and
version-safe** way --- aligned with how the AI documentation assistant
is trained.

Use this as your day‑to‑day reference when creating or editing any
technical document in the Marketeq ecosystem.

## **2. Core Principles**

1.  **Minimal Changes Rule\**
    Never rewrite or regenerate entire documents when editing small
    sections. Only modify what is required and leave the rest untouched.

2.  **Numbered & Modular Docs\**
    Each service or feature should have numbered documents (Doc 00, Doc
    01, etc.) in logical order --- avoiding duplication between docs.

3.  **Zero Assumptions Rule\**
    Every document assumes the reader knows *nothing* about setup. Early
    sections must walk through Docker and service initialization before
    diving into code.

4.  **Scope-Only Content\**
    Each document covers exactly one topic. For example:

    - API docs describe routes, not Docker or DTO setup.

    - Integration docs describe external APIs, not endpoints.

5.  **Readable, Hybrid Tone\**
    Technical but friendly. Write as if explaining to a new engineer
    joining mid‑project.

## **3. Documentation Series Template**

Each microservice should have a complete numbered series of documents.

  ------------------------------------------------------------------------
  **Doc    **Title**             **Purpose**
  \#**                           
  -------- --------------------- -----------------------------------------
  **Doc    Service Overview &    Responsibilities, dependencies, folder
  00**     Repo Placement        path under /apps/\<service\>

  **Doc    Docker & Runtime      Dockerfile, Render deployment, health
  01**     Setup                 check, and environment variables

  **Doc    Folder Structure &    main.ts, modules, and configuration
  02**     Bootstrapping         wiring

  **Doc    Data Models & DTOs    Entities, DTOs, validation, and
  03**                           transformation

  **Doc    API Endpoints         Routes, guards, DTOs, and error schemas
  04**                           

  **Doc    Integrations & Events External systems (Stripe, QuickBooks,
  05**                           Ably, etc.) and queues

  **Doc    Observability &       /health, /ready, logs, metrics, SLOs
  06**     Health                

  **Doc    QA & Test Data        Test cases, fixtures, and seeding scripts
  07**                           
  ------------------------------------------------------------------------

When new functionality is added, create the next numbered doc (e.g., Doc
08 -- Billing Webhooks) rather than expanding old ones.

## **4. Writing Workflow**

### **Step 1 -- Check Existing Docs**

- Before writing, check if the same topic already exists. If it does,
  **link to it** instead of duplicating.

- Review **Doc 00** for dependencies or folder placement rules.

### **Step 2 -- Create New Document**

- Follow the numbering sequence.

- Copy structure from the template of a similar service.

- Use clear headings: Purpose, Setup, Implementation, Verification,
  References.

### **Step 3 -- Include Docker Early (for setup docs)**

Every setup or implementation doc should start with:

# Example Docker build

FROM node:20-alpine

WORKDIR /usr/src/app

COPY package\*.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE \$PORT

CMD \[\"node\", \"dist/main.js\"\]

Include Render health check path and sample environment variables.

### **Step 4 -- Link, Don't Repeat**

When referencing a previously covered topic (e.g., environment
variables), write:

> "See **Doc 01 -- Docker & Runtime Setup** for environment
> configuration."

Avoid copy‑pasting that content.

### **Step 5 -- Review Before Commit**

Before finalizing any doc:

- Check headings consistency.

- Validate examples (Docker, code snippets, endpoints) are functional.

- Confirm that no unrelated content was rewritten.

### **Step 6 -- Version Control**

- Each doc edit must include a **Change Summary** in the PR (what
  changed, why, and related doc IDs).

- Add new docs sequentially (no renumbering existing ones).

- Never delete old docs --- mark them **Deprecated** instead.

## **5. Authoring Style Guide**

### **5.1 Tone**

- Be instructional, not academic.

- Avoid jargon when simple words will do.

- Always define abbreviations (e.g., "DTO -- Data Transfer Object").

### **5.2 Formatting**

- Use H2 and H3 for structure (avoid deep nesting).

- Use fenced code blocks with language tags (ts, bash, json).

- Highlight important notes with blockquotes (\> Important:).

- Use bullet lists for clarity, not prose paragraphs.

### **5.3 Examples**

Each document should contain at least one real code example.\
Prefer fully working, copy‑paste‑ready examples.

### **5.4 Environment Variables Section**

Always list variables alphabetically, with:

- Variable name

- Description

- Example value

Example:

DATABASE_URL=postgres://user:pass@host:5432/marketeq

PORT=3000

JWT_SECRET=supersecret



## **6. Review & Approval**

- Docs are reviewed by the **Documentation Lead** for clarity and
  format.

- The **CTO or service owner** approves for technical accuracy.

- After approval, the doc enters the AI training dataset for future
  document generation.

## **7. Common Mistakes to Avoid**

❌ Duplicating setup instructions in multiple docs\
❌ Renumbering existing docs (always append)\
❌ Using placeholders like TODO or TBD\
❌ Deleting sections without version notes\
❌ Writing without checking folder paths in /apps/\<service\>/src

## **8. Change Control**

- Every change should be **atomic** (one topic per commit).

- Always use the **Minimal Edits Rule**: edit the smallest necessary
  scope.

- Use pull requests for all documentation updates.

- Tag reviewers: \@DocumentationLead, \@CTO.

## **9. Appendix -- Quick Reference**

**Doc Naming Convention:\**
\<service-name\>-doc-\<number\>-\<short-topic\>.md

**Example:\**
listings-service-doc-04-api-endpoints.md

**Doc Placement:\**
/docs/microservices/\<service-name\>/

**PR Template:**

****\### Summary

\- Updated Doc 03 for listings-service (added team entity description)

\### Reason

Aligning with new entity model in Strapi sync.

\### Related Docs

\- Doc 00 -- Overview

\- Doc 04 -- API Endpoints



**With this playbook**, every documentation engineer can build
consistent, modular, implementation‑ready technical docs while keeping
the repository stable and AI‑trainable.
