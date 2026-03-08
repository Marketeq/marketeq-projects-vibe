For this front-end page, you only need **wiring + state + UI behavior**
around the existing services. Here's the exact checklist a FE dev should
have before building.

## **1) IDs & routing you must already have**

You need these from the router / previous step:

- listingId (required)

- draftId (returned by summary call; store in state)

- contractId (optional; only exists post-checkout)

- clientAccountId (for internal team invites)

**Route example**

****/checkout/scope?listingId=listing_123



## **2) Endpoints to call (no new backend)**

### **Page bootstrap (single call)**

- GET /checkout/listings/:listingId/summary

  - returns listing snapshot, merged scope, pricing, draftId

### **Scope edit actions (draft only)**

- POST /checkout/drafts/:draftId/phases/:phaseId/tasks

- PATCH /checkout/drafts/:draftId/tasks/:taskId

- DELETE /checkout/drafts/:draftId/tasks/:taskId

- PATCH /checkout/drafts/:draftId/phases/:phaseId

- POST /checkout/drafts/:draftId/reset-scope (optional)

- GET /checkout/drafts/:draftId/pricing (optional refresh)

### **Team members**

Pre-checkout:

- GET /checkout/drafts/:draftId/team\
  Post-checkout (if contract exists):

- GET /contracts/:contractId/team

User hydration:

- POST /users/bulk

Internal stakeholder invite:

- POST /invites/internal-team

Proceed CTA:

- POST /checkout/drafts/:draftId/validate

- POST /checkout/drafts/:draftId/create-session

## **3) Frontend state model you need**

Keep these in React state (or store):

type CheckoutScopeState = {

listing: ListingSnapshot

draftId: string

phases: Phase\[\]

pricing: PricingTotals

paymentReadiness: PaymentReadiness

team: {

talentUserIds: string\[\]

internalClientUserIds: string\[\]

hydratedUsers: UserCard\[\]

}

}

Key rule:

- **Scope UI reads from summary.scope\**

- **All edits write to draft endpoints and replace local scope with
  response\**

## **4) UI components you need to implement**

**Tabs**

- ProjectScopeTab

- TeamMembersTab

**Scope tab**

- PhaseAccordion

- TaskRow

- AddTaskButton

- EditScopeModal (if your design includes it)

**Team tab**

- TalentNetworkSection

- InternalTeamSection

- AddInternalMemberModal

**Right rail**

- PricingSummaryCard

- ProceedToPaymentButton

- ApplyPromoGiftCardModal

## **5) Data-fetching pattern**

Use React Query / SWR style caching.

- useCheckoutSummary(listingId)

- useAddTask(draftId)

- useUpdateTask(draftId)

- useDeleteTask(draftId)

- useDraftTeam(draftId) **or** useContractTeam(contractId)

- useBulkUsers(userIds)

- useValidateDraft(draftId)

- useCreateSession(draftId)

**Invalidate/refresh**

- After any scope mutation → update scope + pricing from response

- Don't refetch listing scope unless doing "reset to original"

## **6) Permission + gating rules FE must enforce**

- Disable "Proceed to Payment" if:

  - paymentReadiness.canProceedToPayment === false

  - or validate call returns blocking reasons

- Hide/disable scope editing if:

  - scope is locked by backend flag (if present)

- Team Members tab:

  - show internal team even if they're not onboarded (per your rule)

## **7) Error & loading UX**

You need:

- Skeletons for scope list + right rail

- Inline row error (task add/update/delete)

- Toast for fatal errors

- Handle 409 stale draft by refetching summary + showing "scope updated
  elsewhere"

## **8) Env + client setup**

FE must already have:

- NEXT_PUBLIC_LISTING_SERVICE_URL

- NEXT_PUBLIC_CHECKOUT_SERVICE_URL

- NEXT_PUBLIC_CONTRACTS_SERVICE_URL

- NEXT_PUBLIC_USERS_SERVICE_URL

- NEXT_PUBLIC_INVITE_SERVICE_URL

And a shared API client that injects JWT.

## **9) What the FE dev does not need**

- No new schemas

- No new backend endpoints

- No new services

- No Strapi calls

- No pricing math on FE (backend is source of truth)
