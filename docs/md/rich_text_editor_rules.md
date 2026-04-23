# Rich Text Editor Rules & Guidelines

Based on a review of the project documentation, here is a list of all explicit rules, constraints, and configuration details regarding the usage of Rich Text Editors (Lexical in Payload CMS, and Editor.js in the Portfolio frontend) across the system.

## 1. Project Content Rules (`project_description` / `fullDescription`)
- **Formatting Allowed**: The editor must support line breaks, bulleted lists, and block quotes.
- **Restrictions**: 
  - **NO third-party links** are allowed.
  - **NO custom fonts** are allowed.
- **Validation**: 
  - The content is strictly validated based on plain-text length extracted from the Lexical nodes.
  - The length must be between **100** and **2,000** characters.
  - The content must pass content moderation.
- **Sync/Export**: When syncing to the `listings-service`, the Lexical rich-text content is converted into an HTML string (`description` field) which supports images, superscript, subscript, code blocks, checklists, and text alignment.

## 2. Media Uploads inside Rich Text
- **Payload CMS (Lexical)**: Lexical rich-text upload nodes must be pre-populated with their resolved media documents/URLs so that consuming services (like `listings-service`) never have to call back into Payload CMS to fetch image URLs.
- **Portfolio Frontend (Editor.js)**: The Editor.js Image Tool must first call the `/media/upload` endpoint (with fileName, etc.) before inserting the block, ensuring media goes through standard backend handling and validation.

## 3. Internal Usage & Fallbacks
- **Admin Notes (`admin_notes`)**: Certain fields designated for admin notes use Rich Text but are strictly **Internal Only** and must never be exposed to the frontend APIs.
- **Deliverables (`deliverables`)**: While deliverables are represented using a Rich Text editor (or JSON), authored content manually entered by humans always overrides ("wins") any AI-generated scope derivations.

## 4. UI Rendering Specifications
- **Max Columns Rule**: When rendering Editor.js or Lexical blocks on the frontend (Next.js), the parent wrapper must enforce a maximum column limit/layout rules before calling the block renderer, preventing the rich text content from breaking the responsive grid structure.

## Current Implementation Status (Audit)
* **`fullDescription` Content Restrictions**: 🔴 **Not Implemented**. The `fullDescription` field in Payload (`Projects.ts`) uses the default `lexicalEditor({})` config with no custom `validate` function. Therefore, there are no checks enforcing the 100-2,000 character limits, and no configurations disabling third-party links or custom fonts.
* **Lexical Media Pre-population**: 🟢 **Implemented**. The `syncProjectToListings` hook actively runs `populateLexicalUploads` to walk the rich text tree and correctly resolves all media nodes to their full URLs before sending them to the `listings-service`.
* **Internal Usage (`adminNotes`)**: 🟡 **Partially Implemented**. The field `adminNotes` exists and correctly uses `type: 'richText'`. It is also properly stripped during project sync (never sent to `listings-service`). However, it lacks strict field-level `access` controls in Payload, meaning any user capable of reading the Project document via the CMS API could theoretically read these notes.
* **Deliverables Manual Override**: 🟢 **Implemented**. The CMS backfill hook explicitly checks for the existence of human-authored deliverable nodes and skips the AI generation/derivation if any manual edits are found.
* **Portfolio Editor.js Configuration**: 🔴 **Not Implemented**. Editor.js is not currently installed or configured in the `frontend/` repository.
