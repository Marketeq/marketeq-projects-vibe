**OS-30**

**Offer Service --- Frontend API Integration Guide**

**Base path:** /api/v1 **Auth:** Authorization: Bearer \<jwt\>
**Idempotency:** X-Idempotency-Key required on all mutating requests

This document is the complete frontend reference for every offer-service
endpoint. It covers the auth header, idempotency key requirement,
request body format for each call, the full error code catalogue and how
to handle each, loading state patterns, and the optimistic update
contract for instant UI feedback.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path (in frontend project)**         **Purpose**

  **1**      src/api/offer.api.ts                        API client: every
                                                         offer-service function
                                                         with typed
                                                         request/response

  **2**      src/api/offer-error.handler.ts              Error handler: maps
                                                         every offer-service
                                                         error code to UI
                                                         action

  **3**      src/hooks/useOfferMutation.ts               Mutation hook: loading
                                                         state, idempotency key
                                                         generation, error
                                                         handling

  **4**      (reference)                                 Complete endpoint
                                                         table with method,
                                                         auth, and idempotency
                                                         key requirements

  **5**      (reference)                                 Error code catalogue
                                                         and recommended
                                                         frontend action for
                                                         each

  **6**      (reference)                                 Loading state and
                                                         optimistic update
                                                         patterns
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Step 1 offer.api.ts --- Typed API Client**                          |
|                                                                       |
| Every offer-service function the frontend needs to call               |
+-----------------------------------------------------------------------+

Centralise every offer-service API call in one file. This makes it easy
to swap the HTTP client, add logging, or change base URLs in one place.
All functions return typed Promises and never swallow errors --- error
handling happens in the calling hook or component.

  -----------------------------------------------------------------------
  **FILE: src/api/offer.api.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import type {                                                         |
|                                                                       |
| Offer, CounterOffer, AblyTokenResponse,                               |
|                                                                       |
| } from \'../types/offer.types\';                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Base configuration                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? \'\'; // e.g.     |
| \"https://api.marketeq.com\"                                          |
|                                                                       |
| const API_V1 = \`\${BASE_URL}/api/v1\`;                               |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Base fetch wrapper with auth and idempotency headers.              |
|                                                                       |
| \* Throws on non-OK responses with a structured error object.         |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async function apiFetch\<T\>(                                         |
|                                                                       |
| path: string,                                                         |
|                                                                       |
| options: RequestInit,                                                 |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey?: string,                                              |
|                                                                       |
| ): Promise\<T\> {                                                     |
|                                                                       |
| const headers: Record\<string, string\> = {                           |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| Authorization: \`Bearer \${getToken()}\`,                             |
|                                                                       |
| \...(idempotencyKey ? { \'X-Idempotency-Key\': idempotencyKey } :     |
| {}),                                                                  |
|                                                                       |
| \...(options.headers as Record\<string, string\> ?? {}),              |
|                                                                       |
| };                                                                    |
|                                                                       |
| const res = await fetch(\`\${API_V1}\${path}\`, { \...options,        |
| headers });                                                           |
|                                                                       |
| if (!res.ok) {                                                        |
|                                                                       |
| const body = await res.json().catch(() =\> ({}));                     |
|                                                                       |
| // Throw a structured error so error handlers can check errorCode.    |
|                                                                       |
| throw Object.assign(new Error(body.message ?? res.statusText), {      |
|                                                                       |
| statusCode: res.status,                                               |
|                                                                       |
| errorCode: body.error ?? body.errorCode,                              |
|                                                                       |
| data: body,                                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return res.json() as Promise\<T\>;                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Offer endpoints                                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* GET /v1/offers/:id --- fetch offer + counter offer state. \*/   |
|                                                                       |
| export async function getOffer(                                       |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| ): Promise\<{ offer: Offer; counterOffer: CounterOffer \| null }\> {  |
|                                                                       |
| return apiFetch(\`/offers/\${offerId}\`, { method: \'GET\' },         |
| getToken);                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST /v1/offers --- create a new offer. \*/                     |
|                                                                       |
| export async function createOffer(                                    |
|                                                                       |
| body: CreateOfferBody,                                                |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \'/offers\',                                                          |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* PATCH /v1/offers/:id --- edit a pending offer. \*/              |
|                                                                       |
| export async function editOffer(                                      |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| body: EditOfferBody,                                                  |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}\`,                                              |
|                                                                       |
| { method: \'PATCH\', body: JSON.stringify(body) },                    |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST /v1/offers/:id/accept --- talent accepts the offer. \*/    |
|                                                                       |
| export async function acceptOffer(                                    |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/accept\`,                                       |
|                                                                       |
| { method: \'POST\', body: JSON.stringify({}) },                       |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST /v1/offers/:id/decline --- talent declines the offer. \*/  |
|                                                                       |
| export async function declineOffer(                                   |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| body: { reason: string; chip?: string },                              |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/decline\`,                                      |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST /v1/offers/:id/withdraw --- client withdraws the offer.    |
| \*/                                                                   |
|                                                                       |
| export async function withdrawOffer(                                  |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| body: { withdrawalMessage: string \| null },                          |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/withdraw\`,                                     |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST /v1/offers/:id/resend --- client resends a terminal offer. |
| \*/                                                                   |
|                                                                       |
| export async function resendOffer(                                    |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| body: ResendOfferBody,                                                |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<Offer\> {                                                 |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/resend\`,                                       |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* GET /v1/offers/:id/history --- paginated event history. \*/     |
|                                                                       |
| export async function getOfferHistory(                                |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| cursor: string \| null,                                               |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| ): Promise\<OfferHistoryPage\> {                                      |
|                                                                       |
| const qs = cursor ? \`?cursor=\${cursor}\` : \'\';                    |
|                                                                       |
| return apiFetch(\`/offers/\${offerId}/history\${qs}\`, { method:      |
| \'GET\' }, getToken);                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* GET /v1/offers/:id/ably-token --- Ably subscribe token. \*/     |
|                                                                       |
| export async function getAblyToken(                                   |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| ): Promise\<AblyTokenResponse\> {                                     |
|                                                                       |
| return apiFetch(\`/offers/\${offerId}/ably-token\`, { method: \'GET\' |
| }, getToken);                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Counter offer endpoints                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\* POST /v1/offers/:offerId/counter-offers --- submit counter      |
| offer. \*/                                                            |
|                                                                       |
| export async function createCounterOffer(                             |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| body: CreateCOBody,                                                   |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<{ counterOffer: CounterOffer; rateWarning: boolean }\> {  |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/counter-offers\`,                               |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* PATCH /v1/offers/:offerId/counter-offers/:coId --- edit CO      |
| in-place. \*/                                                         |
|                                                                       |
| export async function editCounterOffer(                               |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| body: EditCOBody,                                                     |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<{ counterOffer: CounterOffer; rateWarning: boolean }\> {  |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/counter-offers/\${coId}\`,                      |
|                                                                       |
| { method: \'PATCH\', body: JSON.stringify(body) },                    |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST \.../counter-offers/:coId/accept --- non-submitter accepts |
| CO. \*/                                                               |
|                                                                       |
| export async function acceptCounterOffer(                             |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/counter-offers/\${coId}/accept\`,               |
|                                                                       |
| { method: \'POST\', body: JSON.stringify({}) },                       |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST \.../counter-offers/:coId/decline --- non-submitter        |
| declines CO. \*/                                                      |
|                                                                       |
| export async function declineCounterOffer(                            |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/counter-offers/\${coId}/decline\`,              |
|                                                                       |
| { method: \'POST\', body: JSON.stringify({}) },                       |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* POST \.../counter-offers/:coId/withdraw --- submitter withdraws |
| CO. \*/                                                               |
|                                                                       |
| export async function withdrawCounterOffer(                           |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| coId: string,                                                         |
|                                                                       |
| body: { withdrawalMessage: string \| null },                          |
|                                                                       |
| getToken: () =\> string,                                              |
|                                                                       |
| idempotencyKey: string,                                               |
|                                                                       |
| ): Promise\<CounterOffer\> {                                          |
|                                                                       |
| return apiFetch(                                                      |
|                                                                       |
| \`/offers/\${offerId}/counter-offers/\${coId}/withdraw\`,             |
|                                                                       |
| { method: \'POST\', body: JSON.stringify(body) },                     |
|                                                                       |
| getToken,                                                             |
|                                                                       |
| idempotencyKey,                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Request body types                                                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export interface CreateOfferBody {                                    |
|                                                                       |
| talentId: string;                                                     |
|                                                                       |
| jobListingId: string;                                                 |
|                                                                       |
| contractType: string;                                                 |
|                                                                       |
| contractTitle: string;                                                |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: { type: string; hoursPerWeek?: number };                |
|                                                                       |
| startDate: string; // YYYY-MM-DD                                      |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface EditOfferBody {                                      |
|                                                                       |
| rate?: number;                                                        |
|                                                                       |
| currencyCode?: string;                                                |
|                                                                       |
| durationMonths?: number;                                              |
|                                                                       |
| workSchedule?: { type: string; hoursPerWeek?: number };               |
|                                                                       |
| startDate?: string;                                                   |
|                                                                       |
| message?: string \| null;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface ResendOfferBody extends Partial\<EditOfferBody\> {}  |
|                                                                       |
| export interface CreateCOBody {                                       |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: { type: string; hoursPerWeek?: number };                |
|                                                                       |
| startDate: string;                                                    |
|                                                                       |
| message?: string;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface EditCOBody extends Partial\<CreateCOBody\> {}        |
|                                                                       |
| export interface OfferHistoryPage {                                   |
|                                                                       |
| events: OfferHistoryEvent\[\];                                        |
|                                                                       |
| nextCursor: string \| null; // null means no more pages               |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface OfferHistoryEvent {                                  |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| eventType: string;                                                    |
|                                                                       |
| actor: string;                                                        |
|                                                                       |
| actorId: string \| null;                                              |
|                                                                       |
| terms: Record\<string, unknown\>;                                     |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 offer-error.handler.ts --- Centralised Error Handling**      |
|                                                                       |
| Maps every offer-service error code to a UI action                    |
+-----------------------------------------------------------------------+

Every error from offer-service has a structured errorCode. This handler
maps each code to the correct UI response: toast message, reload,
redirect, or specific modal. Import and call handleOfferError() in every
mutation catch block.

  -----------------------------------------------------------------------
  **FILE: src/api/offer-error.handler.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| export interface OfferApiError extends Error {                        |
|                                                                       |
| statusCode: number;                                                   |
|                                                                       |
| errorCode: string;                                                    |
|                                                                       |
| data: Record\<string, unknown\>;                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function isOfferApiError(err: unknown): err is OfferApiError { |
|                                                                       |
| return err instanceof Error && \'errorCode\' in err;                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface ErrorHandlerCallbacks {                              |
|                                                                       |
| /\*\* Show a toast notification to the user. \*/                      |
|                                                                       |
| showToast: (msg: string, type: \'error\' \| \'warning\' \| \'info\')  |
| =\> void;                                                             |
|                                                                       |
| /\*\* Reload the current offer from the REST API. \*/                 |
|                                                                       |
| reloadOffer: () =\> Promise\<void\>;                                  |
|                                                                       |
| /\*\* Navigate to a different URL. \*/                                |
|                                                                       |
| navigate: (path: string) =\> void;                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* handleOfferError()                                                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Call this in every offer mutation catch block.                     |
|                                                                       |
| \* It maps the server errorCode to the correct UI action.             |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* try {                                                              |
|                                                                       |
| \* await acceptOffer(offerId, getToken, idempKey);                    |
|                                                                       |
| \* } catch (err) {                                                    |
|                                                                       |
| \* handleOfferError(err, { showToast, reloadOffer, navigate });       |
|                                                                       |
| \* }                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function handleOfferError(                                     |
|                                                                       |
| err: unknown,                                                         |
|                                                                       |
| callbacks: ErrorHandlerCallbacks,                                     |
|                                                                       |
| ): void {                                                             |
|                                                                       |
| const { showToast, reloadOffer } = callbacks;                         |
|                                                                       |
| if (!isOfferApiError(err)) {                                          |
|                                                                       |
| // Unexpected non-API error (network failure, etc.)                   |
|                                                                       |
| showToast(\'Something went wrong. Check your internet connection and  |
| try again.\', \'error\');                                             |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| switch (err.errorCode) {                                              |
|                                                                       |
| // \-\-\-- 409: Concurrent modification --- reload and retry \-\-\--  |
|                                                                       |
| case \'OFFER_CONCURRENT_MODIFICATION\':                               |
|                                                                       |
| case \'COUNTER_OFFER_CONCURRENT_MODIFICATION\':                       |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'This offer was updated by another action. Loading the latest        |
| state...\',                                                           |
|                                                                       |
| \'info\',                                                             |
|                                                                       |
| );                                                                    |
|                                                                       |
| reloadOffer();                                                        |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 409: Active offer already exists \-\-\--                   |
|                                                                       |
| case \'ACTIVE_OFFER_ALREADY_EXISTS\': {                               |
|                                                                       |
| const activeOfferId = err.data.activeOfferId as string;               |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'You already have an active offer with this talent. Withdraw it      |
| first.\',                                                             |
|                                                                       |
| \'warning\',                                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Optionally: navigate to the existing offer so user can withdraw    |
| it.                                                                   |
|                                                                       |
| // callbacks.navigate(\`/offers/\${activeOfferId}\`);                 |
|                                                                       |
| break;                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- 409: Counter offer already pending \-\-\--                 |
|                                                                       |
| case \'COUNTER_OFFER_ALREADY_PENDING\':                               |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'A counter offer is already pending for this offer. Reload to see    |
| it.\',                                                                |
|                                                                       |
| \'warning\',                                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| reloadOffer();                                                        |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 409: Invalid state transition \-\-\--                      |
|                                                                       |
| case \'OFFER_INVALID_TRANSITION\':                                    |
|                                                                       |
| case \'COUNTER_OFFER_INVALID_TRANSITION\':                            |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'This action is no longer available. The offer state may have        |
| changed.\',                                                           |
|                                                                       |
| \'warning\',                                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| reloadOffer();                                                        |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 403: Not a party to this offer \-\-\--                     |
|                                                                       |
| case \'OFFER_ACCESS_DENIED\':                                         |
|                                                                       |
| showToast(\'You do not have access to this offer.\', \'error\');      |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 403: Wrong role for this action \-\-\--                    |
|                                                                       |
| case \'OFFER_ROLE_MISMATCH\':                                         |
|                                                                       |
| showToast(\'You cannot perform this action on this offer.\',          |
| \'error\');                                                           |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 404: Offer not found \-\-\--                               |
|                                                                       |
| case \'OFFER_NOT_FOUND\':                                             |
|                                                                       |
| case \'COUNTER_OFFER_NOT_FOUND\':                                     |
|                                                                       |
| showToast(\'Offer not found.\', \'error\');                           |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 422: Validation errors \-\-\--                             |
|                                                                       |
| case \'VALIDATION_ERROR\': {                                          |
|                                                                       |
| const details = err.data.details as                                   |
| Array\<{field:string;message:string}\> ?? \[\];                       |
|                                                                       |
| const msg = details.length \> 0                                       |
|                                                                       |
| ? details.map(d =\> \`\${d.field}: \${d.message}\`).join(\'; \')      |
|                                                                       |
| : err.message;                                                        |
|                                                                       |
| showToast(msg, \'error\');                                            |
|                                                                       |
| break;                                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-\-- 422: Invalid listing \-\-\--                               |
|                                                                       |
| case \'LISTING_NOT_FOUND_OR_ACCESS_DENIED\':                          |
|                                                                       |
| showToast(\'The selected job listing is no longer available.\',       |
| \'error\');                                                           |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 422: Rate out of bounds \-\-\--                            |
|                                                                       |
| case \'RATE_OUT_OF_BOUNDS\':                                          |
|                                                                       |
| showToast(\'Rate must be between \$1 and \$9,999.\', \'error\');      |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 429: Rate limit \-\-\--                                    |
|                                                                       |
| case \'RATE_LIMIT_EXCEEDED\':                                         |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'Too many requests. Please wait a moment and try again.\',           |
|                                                                       |
| \'warning\',                                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 503: Downstream service unavailable \-\-\--                |
|                                                                       |
| case \'LISTINGS_SERVICE_UNAVAILABLE\':                                |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'The listings service is temporarily unavailable. Please try again   |
| in a moment.\',                                                       |
|                                                                       |
| \'error\',                                                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| break;                                                                |
|                                                                       |
| // \-\-\-- 409: Idempotency conflict (replay of different request)    |
| \-\-\--                                                               |
|                                                                       |
| case \'IDEMPOTENCY_CONFLICT\':                                        |
|                                                                       |
| showToast(                                                            |
|                                                                       |
| \'Request conflict detected. Please refresh and try again.\',         |
|                                                                       |
| \'error\',                                                            |
|                                                                       |
| );                                                                    |
|                                                                       |
| reloadOffer();                                                        |
|                                                                       |
| break;                                                                |
|                                                                       |
| default:                                                              |
|                                                                       |
| // Unknown error code: show generic message.                          |
|                                                                       |
| showToast(err.message \|\| \'An unexpected error occurred.\',         |
| \'error\');                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 useOfferMutation --- Mutation Hook**                         |
|                                                                       |
| Loading state, idempotency key generation, error handling in one      |
| place                                                                 |
+-----------------------------------------------------------------------+

useOfferMutation wraps any offer API call with: loading state, automatic
idempotency key generation (UUID per call), and error handling via
handleOfferError(). Import this hook whenever a component needs to call
a mutating endpoint.

  -----------------------------------------------------------------------
  **FILE: src/hooks/useOfferMutation.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { useState, useCallback } from \'react\';                      |
|                                                                       |
| import { handleOfferError, ErrorHandlerCallbacks } from               |
| \'../api/offer-error.handler\';                                       |
|                                                                       |
| interface UseOfferMutationOptions\<TArgs extends unknown\[\],         |
| TResult\> {                                                           |
|                                                                       |
| /\*\* The API function to call. Must accept idempotencyKey as its     |
| last argument. \*/                                                    |
|                                                                       |
| mutationFn: (\...args: \[\...TArgs, string\]) =\> Promise\<TResult\>; |
|                                                                       |
| /\*\* Callbacks for error handling. \*/                               |
|                                                                       |
| onError?: (err: unknown) =\> void;                                    |
|                                                                       |
| /\*\* Called on success with the API result. \*/                      |
|                                                                       |
| onSuccess?: (result: TResult) =\> void;                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| interface UseOfferMutationResult\<TArgs extends unknown\[\],          |
| TResult\> {                                                           |
|                                                                       |
| mutate: (\...args: TArgs) =\> Promise\<TResult \| void\>;             |
|                                                                       |
| isLoading: boolean;                                                   |
|                                                                       |
| error: string \| null;                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* useOfferMutation --- Wraps an offer API call with loading state,   |
|                                                                       |
| \* automatic idempotency key, and centralised error handling.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage:                                                             |
|                                                                       |
| \* const { mutate: accept, isLoading } = useOfferMutation({           |
|                                                                       |
| \* mutationFn: (offerId, getToken, idempKey) =\> acceptOffer(offerId, |
| getToken, idempKey),                                                  |
|                                                                       |
| \* onSuccess: (updatedOffer) =\> setOffer(updatedOffer),              |
|                                                                       |
| \* });                                                                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* // In a click handler:                                             |
|                                                                       |
| \* await accept(offerId, getAuthHeader);                              |
|                                                                       |
| \* // idempotencyKey is generated automatically per call.             |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function useOfferMutation\<TArgs extends unknown\[\],          |
| TResult\>({                                                           |
|                                                                       |
| mutationFn,                                                           |
|                                                                       |
| onError,                                                              |
|                                                                       |
| onSuccess,                                                            |
|                                                                       |
| }: UseOfferMutationOptions\<TArgs, TResult\>):                        |
| UseOfferMutationResult\<TArgs, TResult\> {                            |
|                                                                       |
| const \[isLoading, setIsLoading\] = useState(false);                  |
|                                                                       |
| const \[error, setError\] = useState\<string \| null\>(null);         |
|                                                                       |
| const mutate = useCallback(async (\...args: TArgs): Promise\<TResult  |
| \| void\> =\> {                                                       |
|                                                                       |
| setIsLoading(true);                                                   |
|                                                                       |
| setError(null);                                                       |
|                                                                       |
| // Generate a unique idempotency key for this specific call.          |
|                                                                       |
| // UUID v4 guarantees uniqueness per button press.                    |
|                                                                       |
| const idempotencyKey = crypto.randomUUID();                           |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const result = await mutationFn(\...args, idempotencyKey);            |
|                                                                       |
| onSuccess?.(result);                                                  |
|                                                                       |
| return result;                                                        |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| const msg = err instanceof Error ? err.message : \'Unknown error\';   |
|                                                                       |
| setError(msg);                                                        |
|                                                                       |
| onError?.(err);                                                       |
|                                                                       |
| // Re-throw so calling code can also handle if needed.                |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| } finally {                                                           |
|                                                                       |
| setIsLoading(false);                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }, \[mutationFn, onError, onSuccess\]);                               |
|                                                                       |
| return { mutate, isLoading, error };                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Usage example in OfferActions component:                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| import { acceptOffer } from \'../api/offer.api\';                     |
|                                                                       |
| import { useAuth } from \'./useAuth\';                                |
|                                                                       |
| import { useOfferMutation } from \'./useOfferMutation\';              |
|                                                                       |
| import { handleOfferError } from \'../api/offer-error.handler\';      |
|                                                                       |
| function OfferActions({ offerId, onOfferUpdated, reload }) {          |
|                                                                       |
| const { getAuthHeader } = useAuth();                                  |
|                                                                       |
| const { showToast } = useToast();                                     |
|                                                                       |
| const { mutate: accept, isLoading: accepting } = useOfferMutation({   |
|                                                                       |
| mutationFn: (offerId, getToken, idempKey) =\>                         |
|                                                                       |
| acceptOffer(offerId, getToken, idempKey),                             |
|                                                                       |
| onSuccess: (updatedOffer) =\> {                                       |
|                                                                       |
| onOfferUpdated(updatedOffer);                                         |
|                                                                       |
| },                                                                    |
|                                                                       |
| onError: (err) =\> {                                                  |
|                                                                       |
| handleOfferError(err, { showToast, reloadOffer: reload, navigate: ()  |
| =\> {} });                                                            |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| return (                                                              |
|                                                                       |
| \<button                                                              |
|                                                                       |
| onClick={() =\> accept(offerId, getAuthHeader)}                       |
|                                                                       |
| disabled={accepting}                                                  |
|                                                                       |
| \>                                                                    |
|                                                                       |
| {accepting ? \'Accepting...\' : \'Accept Offer\'}                     |
|                                                                       |
| \</button\>                                                           |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 (Reference) Complete Endpoint Table**                        |
|                                                                       |
| Every offer-service endpoint with auth and idempotency key            |
| requirements                                                          |
+-----------------------------------------------------------------------+

  ------------ -------------------------------------------------- ------------ ----------------- ---------------------
  **Method**   **Endpoint**                                       **Auth       **Idempotency**   **Who can call**
                                                                  required**                     

  **GET**      **/v1/offers/:id**                                 JWT          NO                CLIENT or TALENT on
                                                                                                 this offer

  **POST**     **/v1/offers**                                     JWT          YES               CLIENT only

  **PATCH**    **/v1/offers/:id**                                 JWT          YES               CLIENT only, offer
                                                                                                 must be PENDING

  **POST**     **/v1/offers/:id/accept**                          JWT          YES               TALENT only, offer
                                                                                                 must be PENDING (not
                                                                                                 COUNTERED)

  **POST**     **/v1/offers/:id/decline**                         JWT          YES               TALENT only, offer
                                                                                                 must be PENDING (not
                                                                                                 COUNTERED)

  **POST**     **/v1/offers/:id/withdraw**                        JWT          YES               CLIENT only, offer
                                                                                                 must be PENDING or
                                                                                                 COUNTERED

  **POST**     **/v1/offers/:id/resend**                          JWT          YES               CLIENT only, offer
                                                                                                 must be terminal
                                                                                                 (DECLINED, WITHDRAWN,
                                                                                                 EXPIRED)

  **GET**      **/v1/offers/:id/history**                         JWT          NO                CLIENT or TALENT on
                                                                                                 this offer

  **GET**      **/v1/offers/:id/ably-token**                      JWT          NO                CLIENT or TALENT on
                                                                                                 this offer

  **POST**     **/v1/offers/:id/counter-offers**                  JWT          YES               Either party, offer
                                                                                                 PENDING or COUNTERED

  **PATCH**    **/v1/offers/:id/counter-offers/:coId**            JWT          YES               Submitter of the CO,
                                                                                                 CO must be PENDING

  **POST**     **/v1/offers/:id/counter-offers/:coId/accept**     JWT          YES               NON-submitter of the
                                                                                                 CO, CO must be
                                                                                                 PENDING

  **POST**     **/v1/offers/:id/counter-offers/:coId/decline**    JWT          YES               NON-submitter of the
                                                                                                 CO, CO must be
                                                                                                 PENDING

  **POST**     **/v1/offers/:id/counter-offers/:coId/withdraw**   JWT          YES               Submitter of the CO,
                                                                                                 CO must be PENDING

  **GET**      **/health**                                        None         NO                Public (no auth)

  **GET**      **/ready**                                         None         NO                Public (no auth)
  ------------ -------------------------------------------------- ------------ ----------------- ---------------------

+-----------------------------------------------------------------------+
| Idempotency key rules (all YES endpoints):                            |
|                                                                       |
| Generate a new UUID v4 for each distinct user action (button press).  |
|                                                                       |
| Do NOT reuse keys across different actions.                           |
|                                                                       |
| Do NOT store keys beyond the current session.                         |
|                                                                       |
| On retry after network failure: reuse the SAME key for the retry.     |
|                                                                       |
| This ensures the server de-duplicates the retry and does not process  |
| twice.                                                                |
|                                                                       |
| On retry after a known server error (4xx): generate a NEW key.        |
|                                                                       |
| The original request failed --- a new idempotency key starts fresh.   |
|                                                                       |
| Header name: X-Idempotency-Key                                        |
|                                                                       |
| Format: UUID v4 string (e.g.                                          |
| \"f47ac10b-58cc-4372-a567-0e02b2c3d479\")                             |
|                                                                       |
| Generation: crypto.randomUUID() in modern browsers and Node.js \>=    |
| 16.                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 (Reference) Error Code Catalogue**                           |
|                                                                       |
| Every errorCode returned by offer-service and the recommended         |
| frontend action                                                       |
+-----------------------------------------------------------------------+

  ---------- ---------------------------------------- --------------- -------------------- ----------------
  **HTTP**   **errorCode**                            **Retryable**   **User message**     **Frontend
                                                                                           action**

  **200**    **IDEMPOTENT_REPLAY**                    NO              (no toast --- return Use the returned
                                                                      cached response)     cached response
                                                                                           as-is

  **400**    **VALIDATION_ERROR**                     NO              Show field-level     Show inline
                                                                      details from         field errors
                                                                      details\[\]          

  **401**    **UNAUTHORIZED**                         NO              Session expired.     Redirect to
                                                                      Please log in again. login

  **403**    **OFFER_ACCESS_DENIED**                  NO              You do not have      Show error, do
                                                                      access to this       not reload
                                                                      offer.               

  **403**    **OFFER_ROLE_MISMATCH**                  NO              You cannot perform   Disable the
                                                                      this action.         action button

  **404**    **OFFER_NOT_FOUND**                      NO              Offer not found.     Show 404 state
                                                                                           in modal

  **404**    **COUNTER_OFFER_NOT_FOUND**              NO              Counter offer not    Reload offer to
                                                                      found.               sync state

  **409**    **OFFER_CONCURRENT_MODIFICATION**        **YES (new      This offer was just  reloadOffer(),
                                                      key)**          updated.             then re-enable
                                                                      Refreshing...        buttons

  **409**    **ACTIVE_OFFER_ALREADY_EXISTS**          NO              You have an active   Show
                                                                      offer with this      activeOfferId in
                                                                      talent.              error banner

  **409**    **COUNTER_OFFER_ALREADY_PENDING**        **YES (new      A counter offer      reloadOffer()
                                                      key)**          already exists.      
                                                                      Refreshing...        

  **409**    **OFFER_INVALID_TRANSITION**             **YES (new      This action is no    reloadOffer()
                                                      key)**          longer available.    

  **409**    **IDEMPOTENCY_CONFLICT**                 NO              Request conflict.    reloadOffer()
                                                                      Please refresh.      

  **422**    **LISTING_NOT_FOUND_OR_ACCESS_DENIED**   NO              The job listing is   Disable create
                                                                      no longer available. offer button

  **422**    **RATE_OUT_OF_BOUNDS**                   NO              Rate must be         Show inline rate
                                                                      \$1--\$9,999.        error

  **422**    **START_DATE_IN_PAST**                   NO              Start date cannot be Show inline date
                                                                      in the past.         error

  **422**    **OFFER_NOT_RESENDABLE**                 NO              This offer cannot be Disable resend
                                                                      resent.              button

  **429**    **RATE_LIMIT_EXCEEDED**                  **YES (wait     Too many requests.   Disable button,
                                                      60s)**          Please wait.         show countdown

  **503**    **LISTINGS_SERVICE_UNAVAILABLE**         **YES (wait     Service temporarily  Show retry
                                                      5s)**           unavailable.         button
  ---------- ---------------------------------------- --------------- -------------------- ----------------

+-----------------------------------------------------------------------+
| **Step 6 (Reference) Loading States & Optimistic Updates**            |
|                                                                       |
| Patterns for instant UI feedback                                      |
+-----------------------------------------------------------------------+

**Loading state rules**

  ----------------------------- -------------------------------------------------
  **GET /v1/offers/:id**        Show skeleton loader until response arrives.
                                Never block UI for GET calls.

  **POST/PATCH mutations**      Show a spinner on the action button. Disable the
                                button during the request. Enable after success
                                or error.

  **GET                         Paginated: show skeleton for initial load. On
  /v1/offers/:id/history**      \"Load more\": show a small spinner at the bottom
                                without replacing existing items.

  **GET                         No loading state shown. This is a background call
  /v1/offers/:id/ably-token**   on modal open.
  ----------------------------- -------------------------------------------------

**Optimistic update pattern for status chips**

Apply the expected new status immediately when the user clicks an action
button. Revert if the API returns an error. The Ably offer.updated event
will arrive with the authoritative state within milliseconds of the API
success.

+-----------------------------------------------------------------------+
| // Pattern for action buttons (accept, decline, withdraw):            |
|                                                                       |
| // 1. User clicks \"Accept\"                                          |
|                                                                       |
| // 2. Immediately show ACCEPTED chip (optimistic)                     |
|                                                                       |
| // 3. Disable all action buttons                                      |
|                                                                       |
| // 4. Call acceptOffer() API                                          |
|                                                                       |
| // 5a. On API success: the Ably event updates the authoritative       |
| state.                                                                |
|                                                                       |
| // The chip stays ACCEPTED. No additional action needed.              |
|                                                                       |
| // 5b. On API error: revert chip to previous status.                  |
|                                                                       |
| // Show error toast. Re-enable buttons.                               |
|                                                                       |
| // Using useOptimisticOfferStatus from OS-24:                         |
|                                                                       |
| import { useOptimisticOfferStatus } from                              |
| \'../hooks/useOptimisticOfferStatus\';                                |
|                                                                       |
| function OfferStatusDisplay({ offer, onAccept }) {                    |
|                                                                       |
| const { displayStatus, applyOptimistic, revert } =                    |
|                                                                       |
| useOptimisticOfferStatus(offer?.status ?? \'PENDING\');               |
|                                                                       |
| const handleAccept = async () =\> {                                   |
|                                                                       |
| applyOptimistic(\'ACCEPTED\'); // Show ACCEPTED immediately           |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await onAccept();                                                     |
|                                                                       |
| // Success: Ably event confirms the state. displayStatus stays        |
| ACCEPTED.                                                             |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| revert(); // Error: put status chip back to previous                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| return \<OfferStatusChip status={displayStatus} /\>;                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Rules:                                                             |
|                                                                       |
| // ONLY apply optimistic updates for status chip changes.             |
|                                                                       |
| // NEVER apply optimistic updates to financial data (rate, terms).    |
|                                                                       |
| // These must always reflect the authoritative server state.          |
|                                                                       |
| // When NOT to use optimistic updates:                                |
|                                                                       |
| // - Creating a counter offer (the coId is unknown until API          |
| responds)                                                             |
|                                                                       |
| // - Editing offer terms (new rate not known to display               |
| optimistically)                                                       |
|                                                                       |
| // - Any action where the result data is needed for display           |
+-----------------------------------------------------------------------+

**POST request retry pattern (idempotency)**

+-----------------------------------------------------------------------+
| // When to retry a failed mutation:                                   |
|                                                                       |
| // Network failure (no response at all):                              |
|                                                                       |
| // -\> Retry with the SAME idempotency key.                           |
|                                                                       |
| // -\> The server de-duplicates and returns the original result.      |
|                                                                       |
| // 5xx server error:                                                  |
|                                                                       |
| // -\> Retry with the SAME idempotency key after a short delay.       |
|                                                                       |
| // -\> The request may not have been processed. Idempotency key       |
| prevents double-processing.                                           |
|                                                                       |
| // 409 OFFER_CONCURRENT_MODIFICATION:                                 |
|                                                                       |
| // -\> Do NOT retry automatically.                                    |
|                                                                       |
| // -\> Call reloadOffer() to sync state.                              |
|                                                                       |
| // -\> Let the user decide if they still want to take the action.     |
|                                                                       |
| // -\> If they retry: generate a NEW idempotency key.                 |
|                                                                       |
| // 4xx client errors (400, 401, 403, 404, 422):                       |
|                                                                       |
| // -\> Do NOT retry. These are deterministic failures.                |
|                                                                       |
| // -\> Show the appropriate error and let the user correct it.        |
|                                                                       |
| // Implementation in useOfferMutation (automatic retry on network     |
| failure):                                                             |
|                                                                       |
| const mutateWithRetry = useCallback(async (\...args) =\> {            |
|                                                                       |
| const idempotencyKey = crypto.randomUUID(); // One key per user       |
| action                                                                |
|                                                                       |
| let attempt = 0;                                                      |
|                                                                       |
| const maxAttempts = 3;                                                |
|                                                                       |
| while (attempt \< maxAttempts) {                                      |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await mutationFn(\...args, idempotencyKey); // SAME key on     |
| retry                                                                 |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| attempt++;                                                            |
|                                                                       |
| const isNetworkError = !(err instanceof Error && \'statusCode\' in    |
| err);                                                                 |
|                                                                       |
| const is5xx = isOfferApiError(err) && err.statusCode \>= 500;         |
|                                                                       |
| if ((isNetworkError \|\| is5xx) && attempt \< maxAttempts) {          |
|                                                                       |
| await new Promise(r =\> setTimeout(r, attempt \* 1000)); // 1s, 2s    |
| backoff                                                               |
|                                                                       |
| continue;                                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| throw err; // Non-retryable error: propagate to error handler         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }, \[mutationFn\]);                                                   |
+-----------------------------------------------------------------------+
