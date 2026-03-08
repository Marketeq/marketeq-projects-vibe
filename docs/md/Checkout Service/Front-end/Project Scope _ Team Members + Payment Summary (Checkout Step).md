# **Project Scope / Team Members + Payment Summary (Checkout Step)**

## **Microservices involved**

- **Listing Service** --- source of truth for scope, phases, tasks,
  default assignees, and estimates.

- **Checkout Service** --- source of truth for *draft / edited scope
  during checkout*, pricing rollups, and payment readiness.

- **Contracts Service** --- source of truth for hired talent team
  members once contract exists.

- **Invite Service** --- source of truth for internal client
  stakeholders invited to account/team.

- **User Service** --- source of truth for user profile display data
  (name, avatar, role, company).

> **Rule**:

- Before checkout is finalized → Scope comes from **Listing + Checkout
  draft overrides**.

- After checkout finalized → Team comes from **Contracts + Invite**,
  hydrated by User Service.

# **0) Shared Requirements**

## **Auth**

All endpoints require client JWT.

**Headers**

****Authorization: Bearer \<accessToken\>

Content-Type: application/json

## **Common Error Shape**

****{

\"error\": {

\"code\": \"SCOPE_NOT_FOUND\",

\"message\": \"Scope not found for listing\",

\"requestId\": \"req_abc123\"

}

}

## **Common HTTP Status Codes**

- 200 OK

- 201 Created

- 400 Validation error

- 401 Unauthorized

- 403 Forbidden

- 404 Not found

- 409 Conflict / stale draft

- 422 Business rule violation

- 500 Internal

# **1) Load Page Data (Single Fetch for Fast UI)**

### **Checkout Service**

Use this as the primary page bootstrap. It returns:

- listing snapshot (title, category, etc.)

- scope (phases + tasks) **with draft overrides merged\**

- pricing totals

- current checkout state

GET /checkout/listings/:listingId/summary

### **Query params**

****?draftId=\<optional\>

- \
  If draftId is passed → fetch that draft scope/prices.

- If not passed → Checkout Service finds/creates the active draft for
  this listing+client.

### **Response**

****{

\"listing\": {

\"id\": \"listing_123\",

\"title\": \"UX Research Package\",

\"type\": \"project\",

\"category\": \"UX/UI\",

\"currency\": \"USD\"

},

\"scope\": {

\"source\": \"listing+draft\",

\"draftId\": \"draft_789\",

\"phases\": \[

{

\"id\": \"phase_1\",

\"title\": \"Phase One\",

\"subtitle\": \"Research\",

\"startDay\": 1,

\"endDay\": 8,

\"order\": 1,

\"tasks\": \[

{

\"id\": \"task_111\",

\"title\": \"Consumer Research\",

\"description\": \"Conduct research to understand consumer needs\...\",

\"assigneeUserId\": \"talent_55\",

\"durationHours\": 40,

\"order\": 1,

\"isDraftOverride\": false

}

\]

}

\]

},

\"pricing\": {

\"projectCost\": 94000,

\"discountTotal\": 0,

\"giftCardAppliedTotal\": 0,

\"balanceAppliedTotal\": 0,

\"dueToday\": 94000,

\"futureInstallmentsTotal\": 0

},

\"paymentReadiness\": {

\"canProceedToPayment\": true,

\"blockingReasons\": \[\]

}

}

### **Notes**

- **Frontend uses this to render both tabs + right rail.\**

- The draftId returned must be stored in state and sent in all edit
  calls.

# **2) Project Scope Tab APIs**

## **2.1 Fetch Raw Listing Scope (if needed)**

Only used if you need to show a "reset to original scope" diff.

### **Listing Service**

****GET /listings/:listingId/scope

### **Response**

****{

\"listingId\": \"listing_123\",

\"phases\": \[

{

\"id\": \"phase_1\",

\"title\": \"Phase One\",

\"subtitle\": \"Research\",

\"startDay\": 1,

\"endDay\": 8,

\"order\": 1,

\"tasks\": \[

{

\"id\": \"task_111\",

\"title\": \"Consumer Research\",

\"description\": \"Conduct research\...\",

\"assigneeUserId\": \"talent_55\",

\"durationHours\": 40,

\"order\": 1

}

\]

}

\]

}



## **2.2 Add Task (per phase) --- Draft Scope**

UI shows "+ Add task" inside each phase.\
This **must write to draft**, not to the listing.

### **Checkout Service**

****POST /checkout/drafts/:draftId/phases/:phaseId/tasks

### **Body**

****{

\"title\": \"Competitor Interviews\",

\"description\": \"Interview 5 competitors' customers to map
expectations\",

\"assigneeUserId\": \"talent_55\",

\"durationHours\": 12

}

### **Response 201**

****{

\"task\": {

\"id\": \"task_999\",

\"title\": \"Competitor Interviews\",

\"description\": \"Interview 5 competitors' customers to map
expectations\",

\"assigneeUserId\": \"talent_55\",

\"durationHours\": 12,

\"order\": 2,

\"isDraftOverride\": true

},

\"pricing\": {

\"projectCost\": 96500,

\"dueToday\": 96500

}

}



## **2.3 Update Task (title, description, duration, assignee)**

### **Checkout Service**

****PATCH /checkout/drafts/:draftId/tasks/:taskId

### **Body (partial allowed)**

****{

\"title\": \"Consumer Research (Expanded)\",

\"durationHours\": 50,

\"assigneeUserId\": \"talent_72\"

}

### **Response**

****{

\"task\": {

\"id\": \"task_111\",

\"title\": \"Consumer Research (Expanded)\",

\"description\": \"Conduct research to understand consumer needs\...\",

\"assigneeUserId\": \"talent_72\",

\"durationHours\": 50,

\"order\": 1,

\"isDraftOverride\": true

},

\"pricing\": {

\"projectCost\": 99000,

\"dueToday\": 99000

}

}



## **2.4 Delete Task (draft only)**

### **Checkout Service**

****DELETE /checkout/drafts/:draftId/tasks/:taskId

### **Response**

****{

\"deleted\": true,

\"pricing\": {

\"projectCost\": 91000,

\"dueToday\": 91000

}

}



## **2.5 Update Phase Metadata (title, days, order)**

UI has editable phase headers / "Edit Scope".

### **Checkout Service**

****PATCH /checkout/drafts/:draftId/phases/:phaseId

### **Body**

****{

\"title\": \"Phase One\",

\"subtitle\": \"Research & Discovery\",

\"startDay\": 1,

\"endDay\": 10

}

### **Response**

****{

\"phase\": {

\"id\": \"phase_1\",

\"title\": \"Phase One\",

\"subtitle\": \"Research & Discovery\",

\"startDay\": 1,

\"endDay\": 10,

\"order\": 1

},

\"pricing\": {

\"projectCost\": 97000

}

}



## **2.6 Reset Draft Scope to Listing Default**

### **Checkout Service**

****POST /checkout/drafts/:draftId/reset-scope

### **Response**

****{

\"scope\": {

\"source\": \"listing\",

\"draftId\": \"draft_789\",

\"phases\": \[/\* original listing phases \*/\]

},

\"pricing\": {

\"projectCost\": 94000

}

}



# **3) Team Members Tab APIs**

> Tab displays two sections:

1.  **Talent Network** (hired talent on contract)

2.  **Internal Team** (client stakeholders invited)

## **3.1 Fetch Team for Draft / Pre-Contract**

Before final checkout, you may still want to show expected talent.

### **Checkout Service**

****GET /checkout/drafts/:draftId/team

### **Response**

****{

\"talentUserIds\": \[\"talent_55\", \"talent_72\"\],

\"internalClientUserIds\": \[\"client_12\"\]

}

> Frontend must hydrate profiles via User Service (3.3 below).

## **3.2 Fetch Team for Active Contract (Post-Checkout)**

Once contract exists, this tab should switch to contract truth.

### **Contracts Service**

****GET /contracts/:contractId/team

### **Response**

****{

\"contractId\": \"contract_333\",

\"talent\": \[

{

\"userId\": \"talent_55\",

\"roleOnContract\": \"Lead UX Researcher\",

\"status\": \"active\"

}

\],

\"internalTeam\": \[

{

\"userId\": \"client_12\",

\"roleOnAccount\": \"Stakeholder\",

\"status\": \"active\"

}

\]

}



## **3.3 Hydrate User Cards (bulk)**

The UI needs name, avatar, company, role line.

### **User Service**

****POST /users/bulk

### **Body**

****{

\"userIds\": \[\"talent_55\", \"talent_72\", \"client_12\"\]

}

### **Response**

****{

\"users\": \[

{

\"id\": \"talent_55\",

\"fullName\": \"Vivek R.\",

\"handle\": \"topdesigner321\",

\"roleTitle\": \"UX Designer\",

\"companyName\": \"MoonBabe\",

\"avatarUrl\": \"https://\...\"

},

{

\"id\": \"client_12\",

\"fullName\": \"Alicia Hebert\",

\"roleTitle\": \"User Experience Designer\",

\"companyName\": \"Alliance Corp.\",

\"companyLogoUrl\": \"https://\...\"

}

\]

}



## **3.4 Invite Internal Team Member (Stakeholder)**

Triggered by "Add Team Member" flow, writes to Invite Service.

### **Invite Service**

****POST /invites/internal-team

### **Body**

****{

\"clientAccountId\": \"clientacct_77\",

\"email\": \"stakeholder@company.com\",

\"roleTitle\": \"Stakeholder\",

\"companyName\": \"Alliance Corp.\"

}

### **Response 201**

****{

\"inviteId\": \"invite_abc\",

\"status\": \"pending\",

\"internalTeamUserId\": \"client_999\"

}

> After invite creation, refresh team via 3.1 or 3.2.

# **4) Right-Rail Payment Summary APIs**

## **4.1 Live Pricing Refresh (if scope edits happen rapidly)**

### **Checkout Service**

****GET /checkout/drafts/:draftId/pricing

### **Response**

****{

\"projectCost\": 99000,

\"discountTotal\": 0,

\"giftCardAppliedTotal\": 0,

\"balanceAppliedTotal\": 0,

\"dueToday\": 99000,

\"futureInstallmentsTotal\": 0

}



## **4.2 Apply Gift Card / Promo Code**

UI has "Add Gift Card / Promo Code".

### **Checkout Service**

****POST /checkout/drafts/:draftId/apply-code

### **Body**

****{

\"code\": \"WELCOME500\"

}

### **Response**

****{

\"applied\": true,

\"codeType\": \"promo\",

\"pricing\": {

\"projectCost\": 94000,

\"discountTotal\": 500,

\"dueToday\": 93500

}

}



## **4.3 Remove Applied Code**

### **Checkout Service**

****DELETE /checkout/drafts/:draftId/apply-code/:codeId

### **Response**

****{

\"removed\": true,

\"pricing\": {

\"dueToday\": 94000

}

}



# **5) Proceed to Payment CTA**

## **5.1 Validate Draft Readiness**

Use to block navigation if scope incomplete or invalid.

### **Checkout Service**

****POST /checkout/drafts/:draftId/validate

### **Response**

****{

\"valid\": true,

\"blockingReasons\": \[\]

}

### **If invalid 422**

****{

\"valid\": false,

\"blockingReasons\": \[

{

\"code\": \"TASK_MISSING_ASSIGNEE\",

\"message\": \"All tasks must have an assignee before payment.\"

}

\]

}



## **5.2 Create Payment Session (next screen)**

### **Checkout Service**

****POST /checkout/drafts/:draftId/create-session

### **Response**

****{

\"checkoutSessionId\": \"cs_123\",

\"redirectRoute\": \"/checkout/payment?sessionId=cs_123\"

}



# **Frontend Integration Flow (exact order)**

1.  **Bootstrap page\**

    - GET /checkout/listings/:listingId/summary

2.  **Render Project Scope tab\**

    - use scope.phases/tasks

3.  **Render Team Members tab\**

    - if contract not created → GET /checkout/drafts/:draftId/team

    - else → GET /contracts/:contractId/team

    - then hydrate via POST /users/bulk

4.  **On Add/Edit/Delete task\**

    - call draft endpoints (2.2--2.4)

    - update UI with returned scope + pricing

5.  **On Apply Gift Card/Promo\**

    - (4.2) then refresh right rail from response

6.  **On Proceed to Payment\**

    - POST /checkout/drafts/:draftId/validate

    - if valid → POST /checkout/drafts/:draftId/create-session

    - route to payment screen
