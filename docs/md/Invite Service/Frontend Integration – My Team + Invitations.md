# **Frontend Integration -- My Team + Invitations**

## **0) Scope & Goals**

- Wire the **My Team** screens to the **invitations-service** (via API
  Gateway).

- Keep **Onboarding** untouched.

- Implement **Show All / Internal Team / Talent Network** tabs with a
  **grid view** and **endless scroll**.

- Implement the **Invite** flow (modal) and **Internal Team options
  menu** actions: **Resend invite** and **Cancel invite** for
  **Pending** only, plus non-invite actions stubs.

- Use the existing Notification Service indirectly (invitation emails
  are triggered by backend).

## **1) Pre-requisites**

- Ensure invitations-service is deployed and reachable via API Gateway.

- Confirm these env vars exist in the frontend (Vercel):

  - NEXT_PUBLIC_API_GATEWAY_BASE → e.g., https://api.marketeqdigital.com

- Confirm user auth/headers are handled by the gateway (no change in
  FE).

- You have routes for:

  - **My Team** screen (grid): path you use for team management (e.g.,
    /team).

  - **Invite Accept** landing page: /invite/accept?token=\... (FE just
    shows success/error; backend performs accept).

## **2) File & Route Structure (Next.js App Router)**

Create/confirm these entries in the frontend repo:

- **My Team page (grid)\**

  - app/(group)/team/page.tsx (or your confirmed "My Team" path)

  - components/team/TeamTabs.tsx

  - components/team/TeamGrid.tsx

  - components/team/TeamCard.tsx

  - components/team/TeamOptionsMenu.tsx (Internal Team only)

- **Invite modal\**

  - components/invite/InviteModal.tsx (triggered from "Add Team Member")

- **Invite management (optional, for "Manage Invites" link)\**

  - app/(group)/team/invites/page.tsx (list & actions)

- **Shared libs\**

  - lib/invitations.ts (API helpers)

  - lib/pagination.ts (cursor helpers)

  - lib/toast.ts (or use your existing toast system)

> Keep design system components consistent (buttons, chips, inputs). Use
> your existing UI kit.

## **3) Data Sources & Contracts**

- All calls go to **API Gateway** → routed to **invitations-service**.

- Use these endpoints (read-only reminder; no code change here):

  - POST /invitations (create)

  - GET /invitations (list with teamId, status, limit, cursor)

  - POST /invitations/:id/resend (pending only)

  - DELETE /invitations/:id/cancel (pending only)

  - POST /invitations/accept (email CTA; invitee must be signed in)

**Statuses shown on UI:** Pending, Accepted, Canceled, Expired.

## **4) Tabs & Filtering (Show All / Internal Team / Talent Network)**

### **4.1 Tabs**

- **Show All:** display all internal members (accepted) + pending
  invites + talent network hires.

- **Internal Team:** display only **internal** (stakeholders, managers,
  employees) + pending invites.

- **Talent Network:** display only **talent network hires** (cards show
  contract/relation info). **No options menu** here.

> Determine "internal vs talent" using your existing membership/contract
> source; invites are always **internal**. If you don't yet have a
> unified list API, merge results client-side:

- Internal members: your existing team members endpoint

- Invites: GET /invitations filter teamId

- Talent network: your existing talent contract/source

### **4.2 Filters & Sorting**

- Top-right controls (optional per design): **Status filter** (All /
  Pending / Accepted), **Sort** (Recent → Oldest).

- Persist tab selection and filters in query params for deep-linking.

## **5) Grid View & Endless Scroll**

### **5.1 Data Shape**

- **Internal member cards**: avatar/initials, name, role
  (admin/editor/viewer), email, status (if invite).

- **Talent network cards**: avatar, display name, role/discipline,
  contract status.

### **5.2 Paging Strategy**

- Use **cursor-based pagination** for invitations (GET
  /invitations?teamId=&limit=&cursor=).

- For combined "Show All", paginate each source independently and
  interleave by date **OR** provide a "Load more" per section (simpler &
  clearer).

### **5.3 Loading/Empty/Errors**

- **Skeleton loaders** on initial fetch and while loading next page.

- **Empty state** when no entries.

- **Toast** or inline error states for failed fetch; retry controls.

## **6) "Add Team Member" → Invite Modal**

### **6.1 Entry Points**

- **Primary CTA** on My Team: "Add Team Member".

- Optionally from an empty state.

### **6.2 Modal Fields (based on design)**

- **Emails** (chips; allow paste with comma/space/line-separated;
  client-side validation; dedupe)

- **Role** (radio or select): Admin \| Editor \| Viewer

- **Optional message** (textarea)

- **Send** (primary button) / **Cancel** (secondary)

### **6.3 Submission**

- Build payload:

  - teamId (the current client/team context)

  - role

  - emails (unique, valid)

  - note (optional)

- Call POST /invitations.

- Handle response array:

  - For each result, if alreadyInvited: true, surface "Already invited"
    with a **Resend** button (calls POST /invitations/:id/resend) inline
    in the success summary.

- Success toast: "Invites sent to X recipients • Manage Invites".

- Close modal; **optionally** push to /team/invites if the user clicks
  "Manage Invites".

### **6.4 Validation**

- Disable **Send** until at least one valid email and role selected.

- Highlight invalid entries in chips; provide "Remove all invalid"
  action.

## **7) Internal Team Card -- Options Menu (Pending vs Accepted)**

> **Talent Network tab has no options menu** (per your direction).

### **7.1 For Pending Invites (Internal Team)**

- **Resend invite** → call POST /invitations/:id/resend

  - Show spinner on menu item while sending.

  - Success toast: "Invitation resent."

  - Increment local resentCount if you show it.

- **Cancel invite** → call DELETE /invitations/:id/cancel

  - Confirm dialog: "Cancel this invite? They will no longer be able to
    accept."

  - After success, update card to **Canceled** or remove from list
    depending on filter.

### **7.2 For Accepted Members**

- **View profile** → route to /profile/:userId (or existing path).

- **Change role** → open a role-picker and call your **team-members**
  service (not part of invitations).

- **Remove from team** → call **team-members delete** (not part of
  invitations).

- **Manage permissions** → open future permissions page/drawer (stub).

- **Add to project...** → open project picker (stub).

- **Transfer ownership** (optional, owner-only).

> Only show actions valid for the current status and user's own role
> (e.g., admin-only for membership management).

## **8) Invite Accept Landing Page**

### **8.1 Route & Flow**

- Route: /invite/accept?token=\...

- FE behavior:

  - Ensure user is signed in. If not, redirect to login with
    next=/invite/accept?token=\....

  - After returning authenticated, call POST /invitations/accept with
    the token (Gateway passes x-user-email).

  - If success:

    - Show confirmation UI: "You've joined **{teamName}** as
      **{role}**."

    - CTA: "Go to Team" → /team

  - If error:

    - Show specific message (Expired / Token invalid / Email mismatch).

    - CTA: "Request new invite" → opens support or informs their
      inviter.

> The backend enforces email match and expiry. FE just presents results.

## **9) State Management & Caching**

- Use your existing data layer (React Query/RTK Query/SWR):

  - Cache keys must include teamId and status for GET /invitations.

  - Invalidate or update caches after **Resend** and **Cancel**.

- Optimistic updates:

  - **Cancel**: mark as canceled locally then confirm; revert if failed.

  - **Resend**: no visual change except a toast; keep non-optimistic or
    update resentCount if displayed.

## **10) Accessibility & Keyboard**

- Tabs: arrow-key navigation; focus ring visible.

- Card menu: ESC to close, Tab trap within menu, focus returns to
  trigger.

- Invite modal:

  - Focus first field on open.

  - ESC closes only if no submission in progress.

  - SR labels for role radio/select, errors for invalid emails read out.

## **11) Telemetry & Analytics (optional but recommended)**

Track events with your analytics provider:

- myteam_tab_viewed { tab, teamId }

- invite_opened { teamId }

- invite_sent { teamId, role, count, invalidCount }

- invite_resend { inviteId, teamId }

- invite_cancel { inviteId, teamId }

- invite_accept_success { teamId, role }

- invite_accept_error { reason }

## **12) Feature Flags & Permissions (future-proofing)**

- Gate **options menu** actions behind role checks:

  - Only **admin** can invite/resend/cancel, change roles, remove
    members.

- Add a feature flag for **My Team** invite UI rollout if needed:

  - e.g., FF_MY_TEAM_INVITES toggled via your config service.

## **13) QA Checklist (UI/UX)**

- Tabs switch correctly and persist in URL.

- Grid shows correct counts and mixes (Show All).

- Infinite scroll loads next pages and doesn't duplicate cards.

- Invite modal:

  - Validates emails (chips), dedupes, proper empty and error states.

  - Role required; optional message.

  - Returns alreadyInvited recipients clearly with **Resend** CTA.

- Resend/Cancel:

  - Only visible for **Pending**.

  - Toasters on success; error fallback with retry.

- Accept page:

  - Works when logged out (redirect path preserved).

  - Clear messaging for **Expired** and **Invalid** token.

- Accessibility:

  - Focus order, keyboard operable menus and modal, labels and ARIA.

## **14) Error Handling & Messaging**

- Network error: "We couldn't reach the server. Try again."

- Auth missing: route guard to sign-in.

- Invite create errors:

  - Mixed results: show success summary and identify alreadyInvited.

- Resend:

  - If not pending → show: "Only pending invites can be resent."

- Cancel:

  - If not pending → show: "Only pending invites can be canceled."

- Accept:

  - Expired → "This invite has expired. Ask your admin to resend."

  - Email mismatch → "You're signed in as {email}. This invite was sent
    to {invitedEmail}."

  - Invalid token → "This invite link is invalid."

## **15) Performance**

- Debounce scroll-based page loads.

- Batch invites (send up to 50 emails/submit; enforce FE soft limit with
  helper text).

- Avoid re-render storm by memoizing card lists and menu handlers.

## **16) Security Notes**

- Never expose tokens in logs or analytics.

- Do not display full invite tokens on UI.

- Accept endpoint requires authentication; FE must route user to login
  first if needed.

- Emails are PII---mask where possible (e.g., j\*\*\*@domain.com) in
  toasts.

## **17) Deliverables Summary**

- **UI**: My Team page with tabs, grid, endless scroll; invite modal;
  internal-team options menu.

- **API integration**: create/list/resend/cancel invites; accept flow
  page.

- **State**: caching, pagination, optimistic cancel.

- **UX**: toasts, empty/error states, accessibility.

- **Docs**: Readme snippet for env vars and routes for future devs.
