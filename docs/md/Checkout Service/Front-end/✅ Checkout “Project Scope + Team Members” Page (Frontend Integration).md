# **✅ Checkout "Project Scope + Team Members" Page (Frontend Integration)**

## **Scope of this doc**

**This doc covers ONLY this checkout page:**

- Project Scope Tab

- Team Members Tab

- Pricing Summary rail

- Proceed to Payment CTA

Uses existing microservices only:

- Checkout Service

- Listing Service

- Contracts Service

- Invite Service

- User Service

# **1) Required Inputs / Routing**

Frontend must enter this page with:

type CheckoutScopeRouteParams = {

listingId: string; // required

contractId?: string; // optional (post-checkout only)

clientAccountId: string; // required for internal invites

};

Example route:

/checkout/scope?listingId=listing_123



# **2) Endpoints Used (Existing Only)**

## **Bootstrap**

**Checkout Service**

- GET /checkout/listings/:listingId/summary

## **Scope draft edits (Checkout Service only)**

- POST /checkout/drafts/:draftId/phases/:phaseId/tasks

- PATCH /checkout/drafts/:draftId/tasks/:taskId

- DELETE /checkout/drafts/:draftId/tasks/:taskId

- PATCH /checkout/drafts/:draftId/phases/:phaseId

- POST /checkout/drafts/:draftId/reset-scope

- GET /checkout/drafts/:draftId/pricing *(optional refresh)\*

## **Read-only listing scope**

**Listing Service**

- GET /listings/:listingId/scope *(only for "reset/compare" UX)\*

## **Team members**

Pre-checkout:

- **Checkout Service** GET /checkout/drafts/:draftId/team

Post-checkout:

- **Contracts Service** GET /contracts/:contractId/team

Hydrate cards:

- **User Service** POST /users/bulk

Invite internal stakeholder:

- **Invite Service** POST /invites/internal-team

## **Proceed CTA**

- **Checkout Service** POST /checkout/drafts/:draftId/validate

- **Checkout Service** POST /checkout/drafts/:draftId/create-session

# **3) TypeScript Types (Frontend Contracts)**

Create: /src/types/checkoutScope.ts

// \-\-\-- Listing snapshot \-\-\--

export type ListingSnapshot = {

id: string;

title: string;

type: \"project\" \| \"service\";

category?: string;

currency: \"USD\" \| string;

};

// \-\-\-- Scope \-\-\--

export type Task = {

id: string;

title: string;

description?: string;

assigneeUserId?: string \| null;

durationHours?: number \| null;

order: number;

isDraftOverride: boolean;

};

export type Phase = {

id: string;

title: string;

subtitle?: string;

startDay: number;

endDay: number;

order: number;

tasks: Task\[\];

};

export type DraftMergedScope = {

source: \"listing\" \| \"listing+draft\";

draftId: string;

phases: Phase\[\];

};

// \-\-\-- Pricing \-\-\--

export type PricingTotals = {

projectCost: number;

discountTotal: number;

giftCardAppliedTotal: number;

balanceAppliedTotal: number;

dueToday: number;

futureInstallmentsTotal: number;

};

// \-\-\-- Payment readiness / blocking \-\-\--

export type BlockingReason = {

code: string;

message: string;

};

export type PaymentReadiness = {

canProceedToPayment: boolean;

blockingReasons: BlockingReason\[\];

};

// \-\-\-- Summary response \-\-\--

export type CheckoutSummaryResponse = {

listing: ListingSnapshot;

scope: DraftMergedScope;

pricing: PricingTotals;

paymentReadiness: PaymentReadiness;

};

// \-\-\-- Draft team \-\-\--

export type DraftTeamResponse = {

talentUserIds: string\[\];

internalClientUserIds: string\[\];

};

// \-\-\-- Contract team \-\-\--

export type ContractTeamMember = {

userId: string;

roleOnContract?: string;

roleOnAccount?: string;

status: \"active\" \| \"archived\" \| \"pending\";

};

export type ContractTeamResponse = {

contractId: string;

talent: ContractTeamMember\[\];

internalTeam: ContractTeamMember\[\];

};

// \-\-\-- User card \-\-\--

export type UserCard = {

id: string;

fullName: string;

roleTitle?: string;

companyName?: string;

avatarUrl?: string;

companyLogoUrl?: string;

};

// \-\-\-- Users bulk response \-\-\--

export type BulkUsersResponse = {

users: UserCard\[\];

};

// \-\-\-- Validate / session \-\-\--

export type ValidateDraftResponse =

\| { valid: true; blockingReasons: \[\] }

\| { valid: false; blockingReasons: BlockingReason\[\] };

export type CreateSessionResponse = {

checkoutSessionId: string;

redirectRoute: string;

};



# **4) API Client Layer (Existing Services)**

Create: /src/api/http.ts

export type HttpClientOptions = {

baseUrl: string;

getAccessToken: () =\> string \| null;

};

export const createHttpClient = ({ baseUrl, getAccessToken }:
HttpClientOptions) =\> {

const request = async \<T\>(path: string, init: RequestInit = {}):
Promise\<T\> =\> {

const token = getAccessToken();

const res = await fetch(\`\${baseUrl}\${path}\`, {

\...init,

headers: {

\"Content-Type\": \"application/json\",

\...(token ? { Authorization: \`Bearer \${token}\` } : {}),

\...(init.headers \|\| {}),

},

});

if (!res.ok) {

let payload: any = null;

try { payload = await res.json(); } catch {}

const err = new Error(payload?.error?.message \|\| res.statusText);

(err as any).status = res.status;

(err as any).payload = payload;

throw err;

}

return (await res.json()) as T;

};

return {

get: \<T\>(path: string) =\> request\<T\>(path),

post: \<T\>(path: string, body?: any) =\>

request\<T\>(path, { method: \"POST\", body: body ? JSON.stringify(body)
: undefined }),

patch: \<T\>(path: string, body?: any) =\>

request\<T\>(path, { method: \"PATCH\", body: body ?
JSON.stringify(body) : undefined }),

del: \<T\>(path: string) =\> request\<T\>(path, { method: \"DELETE\" }),

};

};



## **4.1 Checkout Service Client**

Create: /src/api/checkoutService.ts

import {

CheckoutSummaryResponse,

DraftTeamResponse,

PricingTotals,

ValidateDraftResponse,

CreateSessionResponse,

Phase,

Task,

} from \"@/types/checkoutScope\";

import { createHttpClient } from \"./http\";

const client = createHttpClient({

baseUrl: process.env.NEXT_PUBLIC_CHECKOUT_SERVICE_URL!,

getAccessToken: () =\> localStorage.getItem(\"accessToken\"),

});

export const checkoutService = {

getSummary: (listingId: string) =\>

client.get\<CheckoutSummaryResponse\>(\`/checkout/listings/\${listingId}/summary\`),

addTask: (draftId: string, phaseId: string, payload: {

title: string;

description?: string;

assigneeUserId?: string \| null;

durationHours?: number \| null;

}) =\>

client.post\<{ task: Task; pricing: PricingTotals }\>(

\`/checkout/drafts/\${draftId}/phases/\${phaseId}/tasks\`,

payload

),

updateTask: (draftId: string, taskId: string, payload: Partial\<{

title: string;

description: string;

assigneeUserId: string \| null;

durationHours: number \| null;

order: number;

}\>) =\>

client.patch\<{ task: Task; pricing: PricingTotals }\>(

\`/checkout/drafts/\${draftId}/tasks/\${taskId}\`,

payload

),

deleteTask: (draftId: string, taskId: string) =\>

client.del\<{ deleted: true; pricing: PricingTotals }\>(

\`/checkout/drafts/\${draftId}/tasks/\${taskId}\`

),

updatePhase: (draftId: string, phaseId: string, payload:
Partial\<Phase\>) =\>

client.patch\<{ phase: Phase; pricing: PricingTotals }\>(

\`/checkout/drafts/\${draftId}/phases/\${phaseId}\`,

payload

),

resetScope: (draftId: string) =\>

client.post\<{ scope: { phases: Phase\[\] }; pricing: PricingTotals }\>(

\`/checkout/drafts/\${draftId}/reset-scope\`

),

getPricing: (draftId: string) =\>

client.get\<PricingTotals\>(\`/checkout/drafts/\${draftId}/pricing\`),

getDraftTeam: (draftId: string) =\>

client.get\<DraftTeamResponse\>(\`/checkout/drafts/\${draftId}/team\`),

validateDraft: (draftId: string) =\>

client.post\<ValidateDraftResponse\>(\`/checkout/drafts/\${draftId}/validate\`),

createSession: (draftId: string) =\>

client.post\<CreateSessionResponse\>(\`/checkout/drafts/\${draftId}/create-session\`),

};



## **4.2 Listing Service Client**

Create: /src/api/listingService.ts

import { DraftMergedScope } from \"@/types/checkoutScope\";

import { createHttpClient } from \"./http\";

const client = createHttpClient({

baseUrl: process.env.NEXT_PUBLIC_LISTING_SERVICE_URL!,

getAccessToken: () =\> localStorage.getItem(\"accessToken\"),

});

export const listingService = {

getScope: (listingId: string) =\>

client.get\<DraftMergedScope\>(\`/listings/\${listingId}/scope\`),

};



## **4.3 Contracts Service Client**

Create: /src/api/contractsService.ts

import { ContractTeamResponse } from \"@/types/checkoutScope\";

import { createHttpClient } from \"./http\";

const client = createHttpClient({

baseUrl: process.env.NEXT_PUBLIC_CONTRACTS_SERVICE_URL!,

getAccessToken: () =\> localStorage.getItem(\"accessToken\"),

});

export const contractsService = {

getTeam: (contractId: string) =\>

client.get\<ContractTeamResponse\>(\`/contracts/\${contractId}/team\`),

};



## **4.4 User Service Client**

Create: /src/api/userService.ts

import { BulkUsersResponse } from \"@/types/checkoutScope\";

import { createHttpClient } from \"./http\";

const client = createHttpClient({

baseUrl: process.env.NEXT_PUBLIC_USERS_SERVICE_URL!,

getAccessToken: () =\> localStorage.getItem(\"accessToken\"),

});

export const userService = {

bulkUsers: (userIds: string\[\]) =\>

client.post\<BulkUsersResponse\>(\`/users/bulk\`, { userIds }),

};



## **4.5 Invite Service Client**

Create: /src/api/inviteService.ts

import { createHttpClient } from \"./http\";

const client = createHttpClient({

baseUrl: process.env.NEXT_PUBLIC_INVITE_SERVICE_URL!,

getAccessToken: () =\> localStorage.getItem(\"accessToken\"),

});

export const inviteService = {

inviteInternalTeam: (payload: {

clientAccountId: string;

email: string;

roleTitle: string;

companyName?: string;

}) =\>

client.post\<{

inviteId: string;

status: \"pending\";

internalTeamUserId: string;

}\>(\`/invites/internal-team\`, payload),

};



# **5) React Query Hooks (Page Only)**

Create: /src/hooks/useCheckoutScopePage.ts

import { useMutation, useQuery, useQueryClient } from
\"@tanstack/react-query\";

import { checkoutService } from \"@/api/checkoutService\";

import { contractsService } from \"@/api/contractsService\";

import { userService } from \"@/api/userService\";

import { inviteService } from \"@/api/inviteService\";

import {

CheckoutSummaryResponse,

DraftTeamResponse,

ContractTeamResponse,

UserCard,

} from \"@/types/checkoutScope\";

// \-\-\-- Summary \-\-\--

export const useCheckoutSummary = (listingId: string) =\>

useQuery({

queryKey: \[\"checkoutSummary\", listingId\],

queryFn: () =\> checkoutService.getSummary(listingId),

enabled: !!listingId,

});

// \-\-\-- Scope mutations \-\-\--

export const useScopeMutations = (draftId: string, listingId: string)
=\> {

const qc = useQueryClient();

const patchSummary = (updater: (current: CheckoutSummaryResponse) =\>
CheckoutSummaryResponse) =\> {

qc.setQueryData(\[\"checkoutSummary\", listingId\], (current: any) =\> {

if (!current) return current;

return updater(current);

});

};

const addTask = useMutation({

mutationFn: (vars: { phaseId: string; payload: any }) =\>

checkoutService.addTask(draftId, vars.phaseId, vars.payload),

onSuccess: ({ task, pricing }) =\> {

patchSummary((cur) =\> ({

\...cur,

scope: {

\...cur.scope,

phases: cur.scope.phases.map((p) =\>

p.id === task.id.split(\"\_\")\[0\] // fallback if backend doesn\'t
return phaseId in task

? { \...p, tasks: \[\...p.tasks, task\] }

: p

),

},

pricing,

}));

},

});

const updateTask = useMutation({

mutationFn: (vars: { taskId: string; payload: any }) =\>

checkoutService.updateTask(draftId, vars.taskId, vars.payload),

onSuccess: ({ task, pricing }) =\> {

patchSummary((cur) =\> ({

\...cur,

scope: {

\...cur.scope,

phases: cur.scope.phases.map((p) =\> ({

\...p,

tasks: p.tasks.map((t) =\> (t.id === task.id ? task : t)),

})),

},

pricing,

}));

},

});

const deleteTask = useMutation({

mutationFn: (taskId: string) =\> checkoutService.deleteTask(draftId,
taskId),

onSuccess: ({ pricing }, taskId) =\> {

patchSummary((cur) =\> ({

\...cur,

scope: {

\...cur.scope,

phases: cur.scope.phases.map((p) =\> ({

\...p,

tasks: p.tasks.filter((t) =\> t.id !== taskId),

})),

},

pricing,

}));

},

});

const updatePhase = useMutation({

mutationFn: (vars: { phaseId: string; payload: any }) =\>

checkoutService.updatePhase(draftId, vars.phaseId, vars.payload),

onSuccess: ({ phase, pricing }) =\> {

patchSummary((cur) =\> ({

\...cur,

scope: {

\...cur.scope,

phases: cur.scope.phases.map((p) =\> (p.id === phase.id ? phase : p)),

},

pricing,

}));

},

});

const resetScope = useMutation({

mutationFn: () =\> checkoutService.resetScope(draftId),

onSuccess: ({ scope, pricing }) =\> {

patchSummary((cur) =\> ({

\...cur,

scope: {

\...cur.scope,

phases: scope.phases,

},

pricing,

}));

},

});

return { addTask, updateTask, deleteTask, updatePhase, resetScope };

};

// \-\-\-- Team loading + hydration \-\-\--

export const useTeamMembers = (draftId: string, contractId?: string) =\>
{

const teamQuery = useQuery({

queryKey: \[\"team\", draftId, contractId\],

queryFn: async (): Promise\<{

talentUserIds: string\[\];

internalClientUserIds: string\[\];

hydratedUsers: UserCard\[\];

}\> =\> {

let talentUserIds: string\[\] = \[\];

let internalClientUserIds: string\[\] = \[\];

if (contractId) {

const ct: ContractTeamResponse = await
contractsService.getTeam(contractId);

talentUserIds = ct.talent.map((m) =\> m.userId);

internalClientUserIds = ct.internalTeam.map((m) =\> m.userId);

} else {

const dt: DraftTeamResponse = await
checkoutService.getDraftTeam(draftId);

talentUserIds = dt.talentUserIds;

internalClientUserIds = dt.internalClientUserIds;

}

const allIds = Array.from(new Set(\[\...talentUserIds,
\...internalClientUserIds\]));

const hydrated = allIds.length ? await userService.bulkUsers(allIds) : {
users: \[\] };

return {

talentUserIds,

internalClientUserIds,

hydratedUsers: hydrated.users,

};

},

enabled: !!draftId,

});

return teamQuery;

};

// \-\-\-- Invite internal stakeholder \-\-\--

export const useInviteInternalTeam = (clientAccountId: string, draftId:
string, contractId?: string) =\> {

const qc = useQueryClient();

return useMutation({

mutationFn: (vars: { email: string; roleTitle: string; companyName?:
string }) =\>

inviteService.inviteInternalTeam({

clientAccountId,

email: vars.email,

roleTitle: vars.roleTitle,

companyName: vars.companyName,

}),

onSuccess: () =\> {

qc.invalidateQueries({ queryKey: \[\"team\", draftId, contractId\] });

},

});

};

// \-\-\-- Proceed CTA \-\-\--

export const useProceedToPayment = (draftId: string) =\>

useMutation({

mutationFn: async () =\> {

const validation = await checkoutService.validateDraft(draftId);

if (!validation.valid) {

const err = new Error(\"Draft invalid\");

(err as any).blockingReasons = validation.blockingReasons;

throw err;

}

return checkoutService.createSession(draftId);

},

});

> Note: If your backend returns phaseId with task create/update, swap
> out the little fallback line.

# **6) Page Component Wiring (Minimal Example)**

Create: /src/app/checkout/scope/page.tsx

\"use client\";

import { useState } from \"react\";

import { useCheckoutSummary, useScopeMutations, useTeamMembers,
useInviteInternalTeam, useProceedToPayment } from
\"@/hooks/useCheckoutScopePage\";

export default function CheckoutScopePage({ searchParams }: any) {

const listingId = searchParams.listingId as string;

const contractId = searchParams.contractId as string \| undefined;

const clientAccountId = searchParams.clientAccountId as string;

const summaryQ = useCheckoutSummary(listingId);

const draftId = summaryQ.data?.scope.draftId;

const scopeMut = useScopeMutations(draftId \|\| \"\", listingId);

const teamQ = useTeamMembers(draftId \|\| \"\", contractId);

const inviteMut = useInviteInternalTeam(clientAccountId, draftId \|\|
\"\", contractId);

const proceedMut = useProceedToPayment(draftId \|\| \"\");

if (summaryQ.isLoading) return \<div\>Loading\...\</div\>;

if (summaryQ.isError \|\| !summaryQ.data) return \<div\>Failed to load
summary\</div\>;

const { scope, pricing, paymentReadiness } = summaryQ.data;

return (

\<div className=\"checkout-scope-page\"\>

{/\* LEFT: Tabs \*/}

\<div className=\"left-tabs\"\>

{/\* Project Scope Tab \*/}

\<section\>

{scope.phases.map((phase) =\> (

\<div key={phase.id}\>

\<h3\>{phase.title}\</h3\>

{phase.tasks.map((task) =\> (

\<div key={task.id}\>

\<div\>{task.title}\</div\>

\<button

onClick={() =\>

scopeMut.updateTask.mutate({

taskId: task.id,

payload: { title: task.title + \" (edited)\" },

})

}

\>

Edit task

\</button\>

\<button onClick={() =\>
scopeMut.deleteTask.mutate(task.id)}\>Delete\</button\>

\</div\>

))}

\<button

onClick={() =\>

scopeMut.addTask.mutate({

phaseId: phase.id,

payload: { title: \"New Task\", durationHours: 4 },

})

}

\>

Add task

\</button\>

\</div\>

))}

\</section\>

{/\* Team Members Tab \*/}

\<section\>

{teamQ.isLoading ? (

\<div\>Loading team\...\</div\>

) : (

\<\>

\<h3\>Talent Network\</h3\>

{teamQ.data?.hydratedUsers

.filter((u) =\> teamQ.data?.talentUserIds.includes(u.id))

.map((u) =\> (

\<div key={u.id}\>{u.fullName}\</div\>

))}

\<h3\>Internal Team\</h3\>

{teamQ.data?.hydratedUsers

.filter((u) =\> teamQ.data?.internalClientUserIds.includes(u.id))

.map((u) =\> (

\<div key={u.id}\>{u.fullName}\</div\>

))}

\<button

onClick={() =\>

inviteMut.mutate({ email: \"stakeholder@x.com\", roleTitle:
\"Stakeholder\" })

}

\>

Add internal member

\</button\>

\</\>

)}

\</section\>

\</div\>

{/\* RIGHT: Pricing + CTA \*/}

\<aside className=\"right-rail\"\>

\<div\>Project Cost: \${pricing.projectCost}\</div\>

\<div\>Due Today: \${pricing.dueToday}\</div\>

\<button

disabled={!paymentReadiness.canProceedToPayment \|\|
proceedMut.isPending}

onClick={() =\>

proceedMut.mutate(undefined, {

onSuccess: (res) =\> {

window.location.href = res.redirectRoute;

},

onError: (err: any) =\> {

if (err.blockingReasons) {

alert(err.blockingReasons.map((b: any) =\> b.message).join(\"\\n\"));

} else {

alert(err.message);

}

},

})

}

\>

Proceed to Payment

\</button\>

\</aside\>

\</div\>

);

}



# **7) Frontend File Structure (This Page Only)**

****/src

/app/checkout/scope/page.tsx

/components/checkout-scope

ProjectScopeTab.tsx

TeamMembersTab.tsx

PhaseAccordion.tsx

TaskRow.tsx

AddTaskModal.tsx

EditScopeModal.tsx

PricingSummaryRail.tsx

ProceedToPaymentCTA.tsx

InternalTeamInviteModal.tsx

/api

http.ts

checkoutService.ts

listingService.ts

contractsService.ts

userService.ts

inviteService.ts

/hooks

useCheckoutScopePage.ts

/types

checkoutScope.ts



# **8) Behavior Rules FE Must Follow (No Guesswork)**

1.  **Summary is the source of truth.\**

    - Always bootstrap with summary.

2.  **All scope edits hit draft endpoints only.\**

    - Never write to Listing Service.

3.  **Pricing is never calculated on FE.\**

    - Only accept backend totals.

4.  **Team tab uses draft team until contract exists.\**

    - If contractId exists → Contracts Service is truth.

5.  **Stakeholders show even if not onboarded.\**

6.  **Proceed CTA must validate first.\**

    - validation blocks disable CTA + show reasons.
