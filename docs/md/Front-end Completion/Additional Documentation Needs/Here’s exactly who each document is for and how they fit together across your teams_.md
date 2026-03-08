Here's exactly **who each document is for** and **how they fit
together** across your teams:

## **🧭 OVERVIEW --- WHO USES WHAT**

  **Document / Process**                                                   **Audience**                                                           **Purpose**                                                                                                                                   **When It's Used**
  ------------------------------------------------------------------------ ---------------------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------- ------------------------------------------------------------------
  **Frontend Deployment -- From Local to QA**                              **Frontend Developers**                                                Shows how to push code to Vercel testing and submit it for QA.                                                                                During active development and before QA review.
  **QA Testing & Approval Process**                                        **QA Testers**                                                         Explains how to test builds on the Vercel testing project, document results in Jira, and communicate via Pumble DM.                           After each new frontend feature is deployed to testing.
  **Production Deployment -- Promoting QA-Approved Code to Live**          **Frontend Leads / Maintainers**                                       Defines how to merge QA-approved PRs into main and verify the production build on Vercel.                                                     After QA passes a feature and it's ready for live release.
  **SOP -- Export & Enrich OpenAPI (Per Microservice)**                    **Backend Engineers**                                                  Teaches how to generate and enrich the OpenAPI spec (openapi.json) for their microservice, so frontend documentation can be auto-generated.   After completing backend endpoints for a new feature or service.
  **Frontend-Only API Template (Stripe-Style Example)**                    **AI training reference** for **Docs Owner & Frontend Developers**     A static template used to train the AI (and serve as the visual model for the generated frontend API docs).                                   Used when generating or reviewing frontend API documentation.
  **Upcoming: SOP -- How to Train the AI to Generate Frontend API Docs**   **Docs Owner / Tech Lead** (or whoever runs the generation workflow)   Step-by-step on how to upload the openapi.json, the UI map, and the template into the AI and get Stripe-style API docs back.                  Whenever a new epic/page is ready for documentation.
  **Frontend Readiness Checklist (optional next doc)**                     **Frontend Team Leads + QA + PM**                                      A high-level validation checklist ensuring the frontend app is fully functional, stable, and ready for live launch.                           Before a sprint release or final production launch.

## **🧩 HOW IT ALL CONNECTS**

**1. Backend engineers\**
→ run the **OpenAPI exporter SOP**, create openapi.json, and hand that
off.

**2. Docs owner / AI\**
→ uses the **template** + openapi.json + UI Map to auto-generate
frontend API docs.

**3. Frontend developers\**
→ use those generated frontend API docs to wire up endpoints to the UI.\
→ deploy features using the **Frontend → QA → Live SOPs**.

**4. QA testers\**
→ follow the **QA Testing SOP** to validate and approve features.

**5. Maintainers / Leads\**
→ follow the **Production Deployment SOP** to push QA-approved features
live.\
→ review everything against the **Frontend Readiness Checklist** before
final launch.

So in short:

- 🧱 **Backend docs** → used by **backend engineers** (OpenAPI export &
  enrichment).

- 🎨 **Frontend deployment docs** → used by **frontend developers &
  maintainers**.

- 🧪 **QA docs** → used by **QA testers**.

- 🤖 **AI + Template docs** → used by **docs owner / leads** to generate
  final frontend API references.

- ✅ **Readiness checklist** → used by **team leads** before each
  release.
