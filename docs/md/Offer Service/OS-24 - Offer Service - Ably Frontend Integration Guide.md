**OS-24**

**Offer Service --- Ably Frontend Integration Guide**

**Framework:** React + TypeScript **SDK:** ably (v2.x) **Pattern:**
custom hook + context provider

This document is the complete frontend guide for integrating Ably
real-time updates into the offer UI. It covers: installing the Ably JS
SDK, fetching the server-issued token, the custom React hook that
manages connection/subscription/reconnection, how incoming events update
UI state, token renewal with authCallback, and optimistic UI updates.
All code is production-ready TypeScript.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path (in frontend project)**         **Purpose**

  **0**      (install)                                   npm install ably

  **1**      src/types/offer.types.ts                    TypeScript types for
                                                         offer, counter offer,
                                                         and Ably payload

  **2**      src/api/offer-ably.api.ts                   API helper: fetches
                                                         Ably token from
                                                         backend

  **3**      src/hooks/useAblyOffer.ts                   Core hook: full
                                                         connection,
                                                         subscription,
                                                         reconnection lifecycle

  **4**      src/components/offers/OfferModal.tsx        How to wire the hook
             (example)                                   into a real component

  **5**      src/hooks/useAblyOffer.ts (update)          authCallback:
                                                         automatic token
                                                         renewal (add to Step
                                                         3)

  **6**      src/providers/AblyProvider.tsx              Shared Ably client
                                                         instance for
                                                         multi-offer scenarios

  **7**      (reference)                                 Optimistic UI update
                                                         pattern

  **8**      (reference)                                 Testing and mocking
                                                         Ably in Jest

  **9**      (reference)                                 Ably connection state
                                                         reference and error
                                                         codes
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Overview How the Frontend Integration Works**                       |
|                                                                       |
| End-to-end flow from modal open to real-time UI update                |
+-----------------------------------------------------------------------+

When a user opens an offer detail modal, the frontend fetches a
short-lived Ably token from the backend, creates an Ably client,
subscribes to the offer\'s channel, and listens for offer.updated
events. When an event arrives, the frontend re-fetches the offer from
the REST API and updates its local state. When the modal closes, the
frontend unsubscribes and closes the connection.

+-----------------------------------------------------------------------+
| // End-to-end flow:                                                   |
|                                                                       |
| 1\. User opens offer modal                                            |
|                                                                       |
| \|                                                                    |
|                                                                       |
| v                                                                     |
|                                                                       |
| 2\. Frontend: GET /v1/offers/:id/ably-token                           |
|                                                                       |
| \| Headers: Authorization: Bearer \<jwt\>                             |
|                                                                       |
| \| Response: { token, expires, issued, capability }                   |
|                                                                       |
| v                                                                     |
|                                                                       |
| 3\. Frontend creates Ably.Realtime({ authCallback })                  |
|                                                                       |
| \| authCallback calls GET /v1/offers/:id/ably-token automatically     |
|                                                                       |
| \| Ably connects via WebSocket to Ably edge servers                   |
|                                                                       |
| v                                                                     |
|                                                                       |
| 4\. Frontend subscribes:                                              |
| channel(\"offer:{offerId}\").subscribe(\"offer.updated\", handler)    |
|                                                                       |
| \| Token capability: { \"offer:{offerId}\": \[\"subscribe\"\] }       |
|                                                                       |
| \| Ably verifies token before allowing subscription                   |
|                                                                       |
| v                                                                     |
|                                                                       |
| 5\. offer-service publishes offer.updated when state changes          |
|                                                                       |
| \| (triggered by: accept, decline, edit, counter offer, expiry, etc.) |
|                                                                       |
| v                                                                     |
|                                                                       |
| 6\. Frontend handler receives message                                 |
|                                                                       |
| \| message.data = { offer, counterOffer, rateWarning, updatedAt }     |
|                                                                       |
| \|                                                                    |
|                                                                       |
| v                                                                     |
|                                                                       |
| 7\. Frontend re-fetches GET /v1/offers/:id from REST API              |
|                                                                       |
| \| Updates local React state with current offer + counter offer       |
|                                                                       |
| \| UI renders new state (status chip, action buttons, terms)          |
|                                                                       |
| v                                                                     |
|                                                                       |
| 8\. User closes modal                                                 |
|                                                                       |
| \| channel.unsubscribe()                                              |
|                                                                       |
| \| ably.close()                                                       |
|                                                                       |
| v                                                                     |
|                                                                       |
| Connection closed. No further events received.                        |
|                                                                       |
| // If disconnected for \< 2 minutes: Ably buffers events, delivers on |
| reconnect.                                                            |
|                                                                       |
| // If disconnected for \> 2 minutes: frontend re-fetches REST on      |
| reconnect.                                                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| The frontend NEVER uses the Ably API key directly.                    |
|                                                                       |
| The API key is a backend secret (set in ABLY_API_KEY env var on the   |
| server).                                                              |
|                                                                       |
| If the API key is leaked to the frontend, any user can publish to any |
| channel.                                                              |
|                                                                       |
| The frontend always uses a short-lived token with subscribe-only      |
| capability.                                                           |
|                                                                       |
| The token is obtained from GET /v1/offers/:id/ably-token (requires    |
| valid JWT).                                                           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 0 Install the Ably JavaScript SDK**                            |
|                                                                       |
| npm install ably                                                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# Install the Ably v2 SDK (includes TypeScript types)                |
|                                                                       |
| npm install ably                                                      |
|                                                                       |
| \# Verify installation                                                |
|                                                                       |
| cat package.json \| grep ably                                         |
|                                                                       |
| \# Expected: \"ably\": \"\^2.x.x\"                                    |
|                                                                       |
| \# The ably package includes TypeScript definitions.                  |
|                                                                       |
| \# \@types/ably is NOT needed and should NOT be installed.            |
|                                                                       |
| \# Ably v2 vs v1:                                                     |
|                                                                       |
| \# This guide uses Ably v2 (released 2023). The API changed           |
| significantly from v1.                                                |
|                                                                       |
| \# If your project has ably \^1.x.x: upgrade or the code below will   |
| not work.                                                             |
|                                                                       |
| \# To upgrade: npm install ably@latest                                |
|                                                                       |
| \# Confirm v2 is installed:                                           |
|                                                                       |
| node -e \"const Ably = require(\'ably\');                             |
| console.log(Ably.Realtime.version)\"                                  |
|                                                                       |
| \# Expected: 2.x.x                                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 TypeScript Types --- offer.types.ts**                        |
|                                                                       |
| Shared types for offer, counter offer, and Ably payload               |
+-----------------------------------------------------------------------+

Define all types in a single file. These types are used by the hook, the
API helper, and every component that renders offer data. The shape
matches exactly what offer-service returns in the Ably payload and REST
API responses.

  -----------------------------------------------------------------------
  **FILE: src/types/offer.types.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* Types for the offer real-time integration.                         |
|                                                                       |
| \* These match the shapes returned by offer-service:                  |
|                                                                       |
| \* REST API: GET /v1/offers/:id                                       |
|                                                                       |
| \* Ably event: offer.updated payload (OS-23)                          |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export type OfferStatus = \'PENDING\' \| \'ACCEPTED\' \| \'DECLINED\' |
| \| \'WITHDRAWN\' \| \'EXPIRED\' \| \'COUNTERED\';                     |
|                                                                       |
| export type CounterOfferStatus = \'PENDING\' \| \'ACCEPTED\' \|       |
| \'DECLINED\' \| \'WITHDRAWN\' \| \'EXPIRED\' \| \'SUPERSEDED\';       |
|                                                                       |
| export type ContractType = \'PROJECT\' \| \'SERVICE\' \| \'TEAM\' \|  |
| \'CONTRACT\';                                                         |
|                                                                       |
| export type WorkScheduleType = \'FULL_TIME\' \| \'PART_TIME\' \|      |
| \'CUSTOM\';                                                           |
|                                                                       |
| export type PartyRole = \'CLIENT\' \| \'TALENT\';                     |
|                                                                       |
| export interface WorkSchedule {                                       |
|                                                                       |
| type: WorkScheduleType;                                               |
|                                                                       |
| hoursPerWeek?: number; // Only present when type = CUSTOM             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface Offer {                                              |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| clientId: string;                                                     |
|                                                                       |
| talentId: string;                                                     |
|                                                                       |
| jobListingId: string;                                                 |
|                                                                       |
| contractType: ContractType;                                           |
|                                                                       |
| contractTitle: string;                                                |
|                                                                       |
| status: OfferStatus;                                                  |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: WorkSchedule;                                           |
|                                                                       |
| startDate: string; // YYYY-MM-DD                                      |
|                                                                       |
| message: string \| null;                                              |
|                                                                       |
| expiresAt: string; // ISO 8601 UTC                                    |
|                                                                       |
| acceptedAt: string \| null;                                           |
|                                                                       |
| declinedAt: string \| null;                                           |
|                                                                       |
| withdrawnAt: string \| null;                                          |
|                                                                       |
| expiredAt: string \| null;                                            |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| updatedAt: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| export interface CounterOffer {                                       |
|                                                                       |
| id: string;                                                           |
|                                                                       |
| offerId: string;                                                      |
|                                                                       |
| submittedBy: PartyRole;                                               |
|                                                                       |
| submittedById: string;                                                |
|                                                                       |
| status: CounterOfferStatus;                                           |
|                                                                       |
| rate: number;                                                         |
|                                                                       |
| currencyCode: string;                                                 |
|                                                                       |
| durationMonths: number;                                               |
|                                                                       |
| workSchedule: WorkSchedule;                                           |
|                                                                       |
| startDate: string;                                                    |
|                                                                       |
| message: string \| null;                                              |
|                                                                       |
| expiresAt: string;                                                    |
|                                                                       |
| acceptedAt: string \| null;                                           |
|                                                                       |
| declinedAt: string \| null;                                           |
|                                                                       |
| withdrawnAt: string \| null;                                          |
|                                                                       |
| expiredAt: string \| null;                                            |
|                                                                       |
| supersededAt: string \| null;                                         |
|                                                                       |
| createdAt: string;                                                    |
|                                                                       |
| updatedAt: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Payload carried in every offer.updated Ably event. \*/          |
|                                                                       |
| export interface AblyOfferUpdatedPayload {                            |
|                                                                       |
| offer: Offer;                                                         |
|                                                                       |
| counterOffer: CounterOffer \| null;                                   |
|                                                                       |
| rateWarning: boolean;                                                 |
|                                                                       |
| updatedAt: string;                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Response from GET /v1/offers/:id/ably-token \*/                 |
|                                                                       |
| export interface AblyTokenResponse {                                  |
|                                                                       |
| token: string;                                                        |
|                                                                       |
| expires: number; // Unix ms timestamp                                 |
|                                                                       |
| issued: number; // Unix ms timestamp                                  |
|                                                                       |
| capability: string; // JSON string: { \"offer:{id}\":                 |
| \[\"subscribe\"\] }                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Combined state managed by the useAblyOffer hook. \*/            |
|                                                                       |
| export interface OfferRealtimeState {                                 |
|                                                                       |
| offer: Offer \| null;                                                 |
|                                                                       |
| counterOffer: CounterOffer \| null;                                   |
|                                                                       |
| rateWarning: boolean;                                                 |
|                                                                       |
| isLoading: boolean;                                                   |
|                                                                       |
| isConnected: boolean; // Ably channel is ATTACHED                     |
|                                                                       |
| error: string \| null;                                                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 API Helper --- offer-ably.api.ts**                           |
|                                                                       |
| Fetches the Ably token and offer data from the backend                |
+-----------------------------------------------------------------------+

Centralise all offer-related API calls in one file. The hook imports
these functions rather than calling fetch() directly, making the code
testable and easy to swap if the API client changes.

  -----------------------------------------------------------------------
  **FILE: src/api/offer-ably.api.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import type { AblyTokenResponse, Offer, CounterOffer } from           |
| \'../types/offer.types\';                                             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Fetch a short-lived Ably token for the given offer.                |
|                                                                       |
| \* Requires the user to be authenticated (JWT in the auth header).    |
|                                                                       |
| \* The token grants subscribe-only access to offer:{offerId}.         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@throws {Error} If the request fails (network error, 401, 403,    |
| 404)                                                                  |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export async function fetchAblyToken(                                 |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| getAuthHeader: () =\> string, // Returns \"Bearer \<jwt\>\"           |
|                                                                       |
| ): Promise\<AblyTokenResponse\> {                                     |
|                                                                       |
| const response = await                                                |
| fetch(\`/api/v1/offers/\${offerId}/ably-token\`, {                    |
|                                                                       |
| method: \'GET\',                                                      |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| Authorization: getAuthHeader(),                                       |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!response.ok) {                                                   |
|                                                                       |
| const body = await response.json().catch(() =\> ({}));                |
|                                                                       |
| throw new Error(                                                      |
|                                                                       |
| \`Failed to fetch Ably token: \${response.status} \${body.message ??  |
| response.statusText}\`,                                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return response.json() as Promise\<AblyTokenResponse\>;               |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Fetch the current full offer state from the REST API.              |
|                                                                       |
| \* Called on reconnect or when the Ably event does not carry enough   |
| context.                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@throws {Error} If the request fails                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export async function fetchOffer(                                     |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| getAuthHeader: () =\> string,                                         |
|                                                                       |
| ): Promise\<{ offer: Offer; counterOffer: CounterOffer \| null }\> {  |
|                                                                       |
| const response = await fetch(\`/api/v1/offers/\${offerId}\`, {        |
|                                                                       |
| method: \'GET\',                                                      |
|                                                                       |
| headers: {                                                            |
|                                                                       |
| Authorization: getAuthHeader(),                                       |
|                                                                       |
| \'Content-Type\': \'application/json\',                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!response.ok) {                                                   |
|                                                                       |
| throw new Error(\`Failed to fetch offer: \${response.status}\`);      |
|                                                                       |
| }                                                                     |
|                                                                       |
| return response.json();                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Core Hook --- useAblyOffer.ts**                              |
|                                                                       |
| Manages the complete Ably lifecycle for one offer                     |
+-----------------------------------------------------------------------+

This is the primary integration point. useAblyOffer manages the entire
Ably lifecycle: token fetch, Ably.Realtime connection, channel
subscription, event handling, reconnection, cleanup. Import this hook in
any component that needs real-time offer updates. It returns the current
offer state and a reload function.

+-----------------------------------------------------------------------+
| What the hook manages:                                                |
|                                                                       |
| \- Creating and destroying the Ably.Realtime client                   |
|                                                                       |
| \- authCallback: Ably calls this to get tokens automatically          |
| (initial + renewal)                                                   |
|                                                                       |
| \- channel.subscribe(\'offer.updated\', handler)                      |
|                                                                       |
| \- Connection state events: connected, disconnected, suspended,       |
| failed                                                                |
|                                                                       |
| \- On suspended/reconnect: re-fetches current offer state from REST   |
|                                                                       |
| \- Cleanup on unmount: unsubscribe, close connection                  |
|                                                                       |
| \- Error state when connection permanently fails                      |
|                                                                       |
| What the hook does NOT manage:                                        |
|                                                                       |
| \- Rendering. The hook only manages state and connection.             |
|                                                                       |
| \- Making API calls to mutate the offer (accept, decline, etc.).      |
|                                                                       |
| \- Authentication tokens for the main app JWT.                        |
|                                                                       |
| The hook receives a getAuthHeader() function for JWT access.          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: src/hooks/useAblyOffer.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { useEffect, useRef, useCallback, useState } from \'react\';   |
|                                                                       |
| import \* as Ably from \'ably\';                                      |
|                                                                       |
| import { fetchAblyToken, fetchOffer } from \'../api/offer-ably.api\'; |
|                                                                       |
| import type {                                                         |
|                                                                       |
| OfferRealtimeState, AblyOfferUpdatedPayload,                          |
|                                                                       |
| } from \'../types/offer.types\';                                      |
|                                                                       |
| /\*\* Options passed to the useAblyOffer hook. \*/                    |
|                                                                       |
| interface UseAblyOfferOptions {                                       |
|                                                                       |
| /\*\* The offer ID to subscribe to. \*/                               |
|                                                                       |
| offerId: string;                                                      |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Returns the Authorization header value (\"Bearer \<jwt\>\").       |
|                                                                       |
| \* Called every time a token request is made.                         |
|                                                                       |
| \* Use your app\'s auth context or session store.                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| getAuthHeader: () =\> string;                                         |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Whether the hook should be active.                                 |
|                                                                       |
| \* Set to false when the offer is not being viewed (e.g. modal is     |
| closed).                                                              |
|                                                                       |
| \* The hook disconnects and cleans up when enabled becomes false.     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| enabled?: boolean;                                                    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Optional callback fired when an offer.updated event arrives.       |
|                                                                       |
| \* Receives the full Ably payload including offer and counterOffer.   |
|                                                                       |
| \* The hook already updates its internal state --- this is for side   |
| effects.                                                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| onUpdate?: (payload: AblyOfferUpdatedPayload) =\> void;               |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Return value of the useAblyOffer hook. \*/                      |
|                                                                       |
| interface UseAblyOfferResult extends OfferRealtimeState {             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Manually re-fetch the offer from REST API.                         |
|                                                                       |
| \* Call after you perform a mutation (accept, decline, etc.)          |
|                                                                       |
| \* to get the definitive server state.                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| reload: () =\> Promise\<void\>;                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* useAblyOffer --- Real-time offer subscription hook.                |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Manages the complete Ably lifecycle for one offer:                 |
|                                                                       |
| \* connection, token auth, subscription, reconnection, cleanup.       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* const { offer, counterOffer, isConnected, error, reload } =        |
| useAblyOffer({                                                        |
|                                                                       |
| \* offerId: \'f47ac10b-\...\',                                        |
|                                                                       |
| \* getAuthHeader: () =\> \`Bearer \${session.accessToken}\`,          |
|                                                                       |
| \* enabled: isModalOpen,                                              |
|                                                                       |
| \* });                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function useAblyOffer({                                        |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| getAuthHeader,                                                        |
|                                                                       |
| enabled = true,                                                       |
|                                                                       |
| onUpdate,                                                             |
|                                                                       |
| }: UseAblyOfferOptions): UseAblyOfferResult {                         |
|                                                                       |
| const \[state, setState\] = useState\<OfferRealtimeState\>({          |
|                                                                       |
| offer: null,                                                          |
|                                                                       |
| counterOffer: null,                                                   |
|                                                                       |
| rateWarning: false,                                                   |
|                                                                       |
| isLoading: true,                                                      |
|                                                                       |
| isConnected: false,                                                   |
|                                                                       |
| error: null,                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Refs: hold mutable values that persist across renders without      |
| causing re-renders.                                                   |
|                                                                       |
| const ablyClientRef = useRef\<Ably.Realtime \| null\>(null);          |
|                                                                       |
| const channelRef = useRef\<Ably.RealtimeChannel \| null\>(null);      |
|                                                                       |
| const isMountedRef = useRef(true);                                    |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // reload() --- fetch current offer state from REST API               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| const reload = useCallback(async () =\> {                             |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const { offer, counterOffer } = await fetchOffer(offerId,             |
| getAuthHeader);                                                       |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({                                                  |
|                                                                       |
| \...prev,                                                             |
|                                                                       |
| offer,                                                                |
|                                                                       |
| counterOffer,                                                         |
|                                                                       |
| isLoading: false,                                                     |
|                                                                       |
| error: null,                                                          |
|                                                                       |
| }));                                                                  |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({                                                  |
|                                                                       |
| \...prev,                                                             |
|                                                                       |
| isLoading: false,                                                     |
|                                                                       |
| error: err instanceof Error ? err.message : \'Failed to load offer\', |
|                                                                       |
| }));                                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| }, \[offerId, getAuthHeader\]);                                       |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Main effect: connect to Ably when enabled                          |
|                                                                       |
| // ============================================================       |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| isMountedRef.current = true;                                          |
|                                                                       |
| if (!enabled \|\| !offerId) {                                         |
|                                                                       |
| setState(prev =\> ({ \...prev, isLoading: false }));                  |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| setState(prev =\> ({ \...prev, isLoading: true, error: null }));      |
|                                                                       |
| // Fetch initial offer state immediately while Ably connects.         |
|                                                                       |
| // This ensures the UI shows data even before the WebSocket is ready. |
|                                                                       |
| reload();                                                             |
|                                                                       |
| // Create Ably.Realtime with authCallback.                            |
|                                                                       |
| // authCallback: Ably calls this to get a token on initial connect    |
|                                                                       |
| // AND whenever the current token is about to expire.                 |
|                                                                       |
| // This fully automates token renewal --- no manual refresh needed.   |
|                                                                       |
| const client = new Ably.Realtime({                                    |
|                                                                       |
| authCallback: async (tokenParams, callback) =\> {                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const tokenResponse = await fetchAblyToken(offerId, getAuthHeader);   |
|                                                                       |
| callback(null, tokenResponse.token);                                  |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // authCallback error: Ably enters \"failed\" state.                  |
|                                                                       |
| callback(err instanceof Error ? err : new Error(String(err)), null);  |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| // autoConnect: true (default) --- connects immediately.              |
|                                                                       |
| // disconnectedRetryTimeout: how long to wait before retrying after   |
| disconnect.                                                           |
|                                                                       |
| disconnectedRetryTimeout: 15000, // 15 seconds                        |
|                                                                       |
| // suspendedRetryTimeout: how long to wait when in suspended state.   |
|                                                                       |
| suspendedRetryTimeout: 30000, // 30 seconds                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| ablyClientRef.current = client;                                       |
|                                                                       |
| // \-\-\-- Connection state listeners \-\-\--                         |
|                                                                       |
| client.connection.on(\'connected\', () =\> {                          |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({ \...prev, isConnected: true, error: null }));    |
|                                                                       |
| });                                                                   |
|                                                                       |
| client.connection.on(\'disconnected\', () =\> {                       |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({ \...prev, isConnected: false }));                |
|                                                                       |
| // disconnected: Ably is retrying automatically.                      |
|                                                                       |
| // Do not show an error --- this is a transient state.                |
|                                                                       |
| });                                                                   |
|                                                                       |
| client.connection.on(\'suspended\', () =\> {                          |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| // suspended: disconnected for \> 2 minutes. Ably buffer has expired. |
|                                                                       |
| // Re-fetch offer from REST to get any state changes we missed.       |
|                                                                       |
| setState(prev =\> ({ \...prev, isConnected: false }));                |
|                                                                       |
| reload();                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| client.connection.on(\'failed\', (stateChange) =\> {                  |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| // failed: terminal state. Usually means token is invalid or expired. |
|                                                                       |
| // authCallback already handles token renewal, so this should be      |
| rare.                                                                 |
|                                                                       |
| setState(prev =\> ({                                                  |
|                                                                       |
| \...prev,                                                             |
|                                                                       |
| isConnected: false,                                                   |
|                                                                       |
| isLoading: false,                                                     |
|                                                                       |
| error: stateChange.reason?.message ?? \'Ably connection failed        |
| permanently.\',                                                       |
|                                                                       |
| }));                                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-\-\-- Subscribe to the offer channel \-\-\--                     |
|                                                                       |
| const channelName = \`offer:\${offerId}\`;                            |
|                                                                       |
| const channel = client.channels.get(channelName);                     |
|                                                                       |
| channelRef.current = channel;                                         |
|                                                                       |
| channel.on(\'attached\', () =\> {                                     |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({ \...prev, isConnected: true, isLoading: false    |
| }));                                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| channel.on(\'suspended\', () =\> {                                    |
|                                                                       |
| // Channel suspended: re-fetch current state.                         |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| setState(prev =\> ({ \...prev, isConnected: false }));                |
|                                                                       |
| reload();                                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| // offer.updated: the only event offer-service publishes.             |
|                                                                       |
| // Payload: AblyOfferUpdatedPayload (offer + counterOffer +           |
| rateWarning)                                                          |
|                                                                       |
| channel.subscribe(\'offer.updated\', (message) =\> {                  |
|                                                                       |
| if (!isMountedRef.current) return;                                    |
|                                                                       |
| const payload = message.data as AblyOfferUpdatedPayload;              |
|                                                                       |
| // Apply the full current state from the Ably event.                  |
|                                                                       |
| // No REST re-fetch needed --- the event already carries full state.  |
|                                                                       |
| setState(prev =\> ({                                                  |
|                                                                       |
| \...prev,                                                             |
|                                                                       |
| offer: payload.offer,                                                 |
|                                                                       |
| counterOffer: payload.counterOffer,                                   |
|                                                                       |
| rateWarning: payload.rateWarning,                                     |
|                                                                       |
| isLoading: false,                                                     |
|                                                                       |
| error: null,                                                          |
|                                                                       |
| }));                                                                  |
|                                                                       |
| // Fire the optional callback for side effects.                       |
|                                                                       |
| onUpdate?.(payload);                                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| // \-\-\-- Cleanup \-\-\--                                            |
|                                                                       |
| return () =\> {                                                       |
|                                                                       |
| isMountedRef.current = false;                                         |
|                                                                       |
| // Unsubscribe and close gracefully.                                  |
|                                                                       |
| channelRef.current?.unsubscribe();                                    |
|                                                                       |
| channelRef.current?.detach();                                         |
|                                                                       |
| channelRef.current = null;                                            |
|                                                                       |
| ablyClientRef.current?.close();                                       |
|                                                                       |
| ablyClientRef.current = null;                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| }, \[offerId, enabled, getAuthHeader\]); // Re-run if offerId or      |
| enabled changes.                                                      |
|                                                                       |
| return { \...state, reload };                                         |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Component Usage --- OfferModal.tsx**                         |
|                                                                       |
| How to wire the hook into a real component                            |
+-----------------------------------------------------------------------+

This example shows the hook being used inside an OfferModal component.
The key pattern: the hook is enabled only when the modal is open. When
the user performs a mutation (accept, decline, etc.), the component
calls reload() after the mutation to get the definitive server state.

  -----------------------------------------------------------------------
  **FILE: src/components/offers/OfferModal.tsx (abbreviated example)**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import React from \'react\';                                          |
|                                                                       |
| import { useAblyOffer } from \'../../hooks/useAblyOffer\';            |
|                                                                       |
| import { useAuth } from \'../../hooks/useAuth\'; // Your auth hook    |
|                                                                       |
| import { acceptOffer } from \'../../api/offer.api\'; // Your mutation |
| API                                                                   |
|                                                                       |
| import type { Offer, CounterOffer } from \'../../types/offer.types\'; |
|                                                                       |
| interface OfferModalProps {                                           |
|                                                                       |
| offerId: string;                                                      |
|                                                                       |
| isOpen: boolean;                                                      |
|                                                                       |
| onClose: () =\> void;                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| export function OfferModal({ offerId, isOpen, onClose }:              |
| OfferModalProps) {                                                    |
|                                                                       |
| const { getAuthHeader } = useAuth();                                  |
|                                                                       |
| // useAblyOffer: manages connection only when modal is open.          |
|                                                                       |
| // enabled=isOpen: connects on modal open, disconnects on modal       |
| close.                                                                |
|                                                                       |
| const {                                                               |
|                                                                       |
| offer,                                                                |
|                                                                       |
| counterOffer,                                                         |
|                                                                       |
| rateWarning,                                                          |
|                                                                       |
| isLoading,                                                            |
|                                                                       |
| isConnected,                                                          |
|                                                                       |
| error,                                                                |
|                                                                       |
| reload,                                                               |
|                                                                       |
| } = useAblyOffer({                                                    |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| getAuthHeader,                                                        |
|                                                                       |
| enabled: isOpen,                                                      |
|                                                                       |
| onUpdate: (payload) =\> {                                             |
|                                                                       |
| // Optional: fire analytics, sound effect, etc.                       |
|                                                                       |
| console.debug(\'offer.updated received:\', payload.offer.status);     |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // After accepting: reload to get definitive server state.            |
|                                                                       |
| const handleAccept = async () =\> {                                   |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await acceptOffer(offerId, getAuthHeader);                            |
|                                                                       |
| // The Ably event will also trigger a state update.                   |
|                                                                       |
| // Call reload() as a safety net in case the event is delayed.        |
|                                                                       |
| await reload();                                                       |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Handle mutation error                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| if (!isOpen) return null;                                             |
|                                                                       |
| return (                                                              |
|                                                                       |
| \<div className=\"offer-modal\"\>                                     |
|                                                                       |
| {/\* Connection indicator \*/}                                        |
|                                                                       |
| {!isConnected && !isLoading && (                                      |
|                                                                       |
| \<div className=\"connection-banner\"\>                               |
|                                                                       |
| Real-time updates paused.                                             |
|                                                                       |
| \<button onClick={reload}\>Reload\</button\>                          |
|                                                                       |
| \</div\>                                                              |
|                                                                       |
| )}                                                                    |
|                                                                       |
| {/\* Loading state \*/}                                               |
|                                                                       |
| {isLoading && \<div className=\"spinner\"\>Loading offer\...\</div\>} |
|                                                                       |
| {/\* Error state \*/}                                                 |
|                                                                       |
| {error && \<div className=\"error-banner\"\>{error}\</div\>}          |
|                                                                       |
| {/\* Offer content \*/}                                               |
|                                                                       |
| {offer && (                                                           |
|                                                                       |
| \<\>                                                                  |
|                                                                       |
| \<h2\>{offer.contractTitle}\</h2\>                                    |
|                                                                       |
| \<OfferStatusChip status={offer.status} expiresAt={offer.expiresAt}   |
| /\>                                                                   |
|                                                                       |
| \<OfferTerms offer={offer} /\>                                        |
|                                                                       |
| {/\* Counter offer panel --- only visible when offer is COUNTERED     |
| \*/}                                                                  |
|                                                                       |
| {counterOffer && offer.status === \"COUNTERED\" && (                  |
|                                                                       |
| \<CounterOfferPanel                                                   |
|                                                                       |
| counterOffer={counterOffer}                                           |
|                                                                       |
| parentRate={offer.rate}                                               |
|                                                                       |
| rateWarning={rateWarning}                                             |
|                                                                       |
| /\>                                                                   |
|                                                                       |
| )}                                                                    |
|                                                                       |
| {/\* Action buttons --- conditional on offer status \*/}              |
|                                                                       |
| \<OfferActions                                                        |
|                                                                       |
| offer={offer}                                                         |
|                                                                       |
| counterOffer={counterOffer}                                           |
|                                                                       |
| onAccept={handleAccept}                                               |
|                                                                       |
| /\>                                                                   |
|                                                                       |
| \</\>                                                                 |
|                                                                       |
| )}                                                                    |
|                                                                       |
| \</div\>                                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Token Renewal --- authCallback Explained**                   |
|                                                                       |
| How Ably automatically renews tokens before they expire               |
+-----------------------------------------------------------------------+

The authCallback pattern already included in the hook (Step 3) handles
automatic token renewal. This step explains how it works so developers
understand what is happening and can debug it if needed.

  --------------------- -------------------------------------------------
  **What is             A function you provide to Ably.Realtime. Ably
  authCallback**        calls it when it needs a token --- on initial
                        connect AND when the current token is about to
                        expire.

  **When Ably calls     On initial connect (before any WebSocket is
  it**                  opened) and approximately 15 seconds before the
                        current token expires.

  **What it must do**   Fetch a new token from the backend and call
                        callback(null, tokenString). If it fails: call
                        callback(error, null).

  **If it throws**      Ably enters the \"failed\" state. The hook sets
                        state.error. The user sees the error banner and
                        can reload.

  **Token TTL**         3600 seconds (1 hour) by default. Set by
                        ABLY_TOKEN_TTL_SECONDS on the backend. The
                        frontend does not control this.

  **No manual renewal** You do NOT need to set timers or track expiry.
                        authCallback is the only mechanism needed. Do not
                        mix it with manual token management.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| // The authCallback implementation in the hook (from Step 3):         |
|                                                                       |
| authCallback: async (tokenParams, callback) =\> {                     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| // tokenParams: contains clientId, capability, ttl from the Ably      |
| server.                                                               |
|                                                                       |
| // We ignore tokenParams and always call our backend.                 |
|                                                                       |
| const tokenResponse = await fetchAblyToken(offerId, getAuthHeader);   |
|                                                                       |
| // callback(null, tokenString): tells Ably the token is ready.        |
|                                                                       |
| callback(null, tokenResponse.token);                                  |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // callback(error, null): tells Ably token fetch failed.              |
|                                                                       |
| // Ably will enter \"failed\" state if this happens repeatedly.       |
|                                                                       |
| callback(err instanceof Error ? err : new Error(String(err)), null);  |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| // Ably renewal timeline:                                             |
|                                                                       |
| // T=0: User opens modal. authCallback called. Token issued (expires  |
| T+3600s).                                                             |
|                                                                       |
| // T=3585s: 15 seconds before expiry. Ably calls authCallback again   |
| automatically.                                                        |
|                                                                       |
| // T=3585s: authCallback calls /v1/offers/:id/ably-token. New token   |
| issued.                                                               |
|                                                                       |
| // T=3600s: Old token expires. New token is already in use.           |
| Connection continues.                                                 |
|                                                                       |
| // T=7200s: New token expires. Same renewal process repeats.          |
|                                                                       |
| // \...                                                               |
|                                                                       |
| // Result: connection stays alive indefinitely as long as the user    |
| has the modal open.                                                   |
|                                                                       |
| // What if the user\'s main app JWT expires during this time?         |
|                                                                       |
| // getAuthHeader() will return an invalid/expired JWT.                |
|                                                                       |
| // fetchAblyToken() will receive a 401 from the backend.              |
|                                                                       |
| // authCallback calls callback(error).                                |
|                                                                       |
| // Ably enters \"failed\" state. Hook sets error message.             |
|                                                                       |
| // User sees error banner and must re-authenticate.                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 AblyProvider --- Shared Client Instance (Optional)**         |
|                                                                       |
| For users with multiple offers open simultaneously                    |
+-----------------------------------------------------------------------+

When a user might have multiple offer modals open at once (e.g. in a
dashboard view), creating one Ably.Realtime client per modal is wasteful
--- each client opens its own WebSocket connection. An AblyProvider
creates one shared client and lets each hook subscribe to its own
channel on that shared connection.

+-----------------------------------------------------------------------+
| When to use AblyProvider vs the plain hook:                           |
|                                                                       |
| Plain hook (Step 3): each offer modal creates its own Ably.Realtime   |
| instance.                                                             |
|                                                                       |
| Use when: only one offer is ever viewed at a time. Simpler code.      |
|                                                                       |
| AblyProvider (Step 6): one shared Ably.Realtime instance.             |
|                                                                       |
| Use when: users can have multiple offer modals open simultaneously.   |
|                                                                       |
| Each modal subscribes to its own channel on the shared connection.    |
|                                                                       |
| Ably recommendation: one connection per browser tab (not per          |
| component).                                                           |
|                                                                       |
| Multiple channels on one connection is efficient and supported.       |
|                                                                       |
| AblyProvider is the preferred pattern for production.                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: src/providers/AblyProvider.tsx**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import React, { createContext, useContext, useEffect, useRef,         |
| ReactNode } from \'react\';                                           |
|                                                                       |
| import \* as Ably from \'ably\';                                      |
|                                                                       |
| import { useAuth } from \'../hooks/useAuth\';                         |
|                                                                       |
| /\*\* Context value: the shared Ably.Realtime client. \*/             |
|                                                                       |
| interface AblyContextValue {                                          |
|                                                                       |
| client: Ably.Realtime \| null;                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| const AblyContext = createContext\<AblyContextValue\>({ client: null  |
| });                                                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* AblyProvider --- Creates one shared Ably.Realtime client for the   |
| app.                                                                  |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Place this near the top of your component tree (e.g. inside the    |
| auth provider).                                                       |
|                                                                       |
| \* The shared client stays connected as long as the provider is       |
| mounted.                                                              |
|                                                                       |
| \* Individual offer hooks subscribe to channels on this shared        |
| connection.                                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function AblyProvider({ children }: { children: ReactNode }) { |
|                                                                       |
| const { getAuthHeader } = useAuth();                                  |
|                                                                       |
| const clientRef = useRef\<Ably.Realtime \| null\>(null);              |
|                                                                       |
| const \[client, setClient\] = React.useState\<Ably.Realtime \|        |
| null\>(null);                                                         |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| // Create one shared client for the entire app session.               |
|                                                                       |
| // authCallback here uses a generic token endpoint.                   |
|                                                                       |
| // For offer-level tokens, each channel subscription fetches its own  |
| token.                                                                |
|                                                                       |
| const ablyClient = new Ably.Realtime({                                |
|                                                                       |
| authCallback: async (tokenParams, callback) =\> {                     |
|                                                                       |
| // NOTE: For the shared client, the token must have capability for    |
| all                                                                   |
|                                                                       |
| // channels this client will subscribe to.                            |
|                                                                       |
| // Simplest approach: wildcard capability                             |
| \"offer:\*\":\[\"subscribe\"\].                                       |
|                                                                       |
| // Backend must support a wildcard token endpoint.                    |
|                                                                       |
| // Alternative: each channel attach triggers its own token fetch.     |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const res = await fetch(\'/api/v1/ably/token\', {                     |
|                                                                       |
| headers: { Authorization: getAuthHeader() }                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| const data = await res.json();                                        |
|                                                                       |
| callback(null, data.token);                                           |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| callback(err instanceof Error ? err : new Error(\'Token fetch         |
| failed\'), null);                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| },                                                                    |
|                                                                       |
| disconnectedRetryTimeout: 15000,                                      |
|                                                                       |
| suspendedRetryTimeout: 30000,                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| clientRef.current = ablyClient;                                       |
|                                                                       |
| setClient(ablyClient);                                                |
|                                                                       |
| return () =\> {                                                       |
|                                                                       |
| ablyClient.close();                                                   |
|                                                                       |
| clientRef.current = null;                                             |
|                                                                       |
| };                                                                    |
|                                                                       |
| }, \[\]); // Run once on mount.                                       |
|                                                                       |
| return (                                                              |
|                                                                       |
| \<AblyContext.Provider value={{ client }}\>                           |
|                                                                       |
| {children}                                                            |
|                                                                       |
| \</AblyContext.Provider\>                                             |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Hook to access the shared Ably client from any component. \*/   |
|                                                                       |
| export function useAblyClient(): Ably.Realtime \| null {              |
|                                                                       |
| const { client } = useContext(AblyContext);                           |
|                                                                       |
| return client;                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // useAblyChannel hook --- subscribes to one offer channel            |
|                                                                       |
| // using the shared client                                            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| import { AblyOfferUpdatedPayload } from \'../types/offer.types\';     |
|                                                                       |
| export function useAblyChannel(                                       |
|                                                                       |
| offerId: string,                                                      |
|                                                                       |
| onUpdate: (payload: AblyOfferUpdatedPayload) =\> void,                |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const client = useAblyClient();                                       |
|                                                                       |
| const channelRef = useRef\<Ably.RealtimeChannel \| null\>(null);      |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| if (!client \|\| !offerId) return;                                    |
|                                                                       |
| const channel = client.channels.get(\`offer:\${offerId}\`);           |
|                                                                       |
| channelRef.current = channel;                                         |
|                                                                       |
| channel.subscribe(\'offer.updated\', (message) =\> {                  |
|                                                                       |
| onUpdate(message.data as AblyOfferUpdatedPayload);                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| return () =\> {                                                       |
|                                                                       |
| channel.unsubscribe();                                                |
|                                                                       |
| channel.detach();                                                     |
|                                                                       |
| channelRef.current = null;                                            |
|                                                                       |
| };                                                                    |
|                                                                       |
| }, \[client, offerId\]);                                              |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 (Optional) Optimistic UI Updates**                           |
|                                                                       |
| Apply local state immediately, revert on error                        |
+-----------------------------------------------------------------------+

By default the hook re-renders when the Ably event arrives from the
server, which takes a few hundred milliseconds after the user action.
For a snappier feel, apply the expected state locally as soon as the
user acts, then confirm or revert when the server responds. This is
optional --- the default pattern is perfectly acceptable for most use
cases.

+-----------------------------------------------------------------------+
| import { useState, useCallback } from \'react\';                      |
|                                                                       |
| import type { Offer, OfferStatus } from \'../../types/offer.types\';  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* useOptimisticOfferStatus                                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Wraps an offer with an optimistic status override.                 |
|                                                                       |
| \* Shows the expected next status immediately, reverts if the API     |
| call fails.                                                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage:                                                             |
|                                                                       |
| \* const { displayStatus, applyOptimistic, revert } =                 |
| useOptimisticOfferStatus(offer?.status ?? \'PENDING\');               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* const handleDecline = async () =\> {                               |
|                                                                       |
| \* applyOptimistic(\'DECLINED\'); // Show DECLINED immediately        |
|                                                                       |
| \* try {                                                              |
|                                                                       |
| \* await declineOffer(offerId); // Call API                           |
|                                                                       |
| \* } catch {                                                          |
|                                                                       |
| \* revert(); // Revert to previous status on error                    |
|                                                                       |
| \* }                                                                  |
|                                                                       |
| \* };                                                                 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export function useOptimisticOfferStatus(serverStatus: OfferStatus) { |
|                                                                       |
| const \[optimisticStatus, setOptimisticStatus\] =                     |
| useState\<OfferStatus \| null\>(null);                                |
|                                                                       |
| const previousStatusRef = React.useRef\<OfferStatus\>(serverStatus);  |
|                                                                       |
| const displayStatus = optimisticStatus ?? serverStatus;               |
|                                                                       |
| const applyOptimistic = useCallback((nextStatus: OfferStatus) =\> {   |
|                                                                       |
| previousStatusRef.current = serverStatus;                             |
|                                                                       |
| setOptimisticStatus(nextStatus);                                      |
|                                                                       |
| }, \[serverStatus\]);                                                 |
|                                                                       |
| const revert = useCallback(() =\> {                                   |
|                                                                       |
| setOptimisticStatus(null);                                            |
|                                                                       |
| }, \[\]);                                                             |
|                                                                       |
| // When server status changes (from Ably event or reload):            |
|                                                                       |
| // clear the optimistic override --- we have the real state now.      |
|                                                                       |
| React.useEffect(() =\> {                                              |
|                                                                       |
| setOptimisticStatus(null);                                            |
|                                                                       |
| }, \[serverStatus\]);                                                 |
|                                                                       |
| return { displayStatus, applyOptimistic, revert };                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Usage in OfferModal:                                               |
|                                                                       |
| // const { displayStatus, applyOptimistic, revert } =                 |
| useOptimisticOfferStatus(offer?.status ?? \'PENDING\');               |
|                                                                       |
| //                                                                    |
|                                                                       |
| // \<OfferStatusChip status={displayStatus} /\> // Always shows       |
| optimistic or real status                                             |
|                                                                       |
| //                                                                    |
|                                                                       |
| // const handleAccept = async () =\> {                                |
|                                                                       |
| // applyOptimistic(\'ACCEPTED\');                                     |
|                                                                       |
| // try {                                                              |
|                                                                       |
| // await acceptOffer(offerId);                                        |
|                                                                       |
| // } catch (err) {                                                    |
|                                                                       |
| // revert();                                                          |
|                                                                       |
| // showErrorToast(err.message);                                       |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // };                                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 Testing --- Mock Ably in Jest**                              |
|                                                                       |
| Unit test hooks and components without a real Ably connection         |
+-----------------------------------------------------------------------+

The useAblyOffer hook must be testable without a real Ably connection.
The recommended approach is to mock the ably module in Jest and provide
a fake EventEmitter so tests can simulate offer.updated events.

  -----------------------------------------------------------------------
  **FILE: src/test-utils/mockAbly.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { EventEmitter } from \'events\';                              |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* MockAblyChannel: emulates an Ably channel for testing.             |
|                                                                       |
| \* Call emit(\'offer.updated\', payload) to simulate an incoming      |
| event.                                                                |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class MockAblyChannel extends EventEmitter {                   |
|                                                                       |
| public name: string;                                                  |
|                                                                       |
| public state = \'attached\';                                          |
|                                                                       |
| constructor(name: string) {                                           |
|                                                                       |
| super();                                                              |
|                                                                       |
| this.name = name;                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| subscribe(event: string, listener: (msg: { data: unknown }) =\> void) |
| {                                                                     |
|                                                                       |
| this.on(event, (data) =\> listener({ data }));                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| unsubscribe() { this.removeAllListeners(); }                          |
|                                                                       |
| detach() { return Promise.resolve(); }                                |
|                                                                       |
| on(event: string, listener: (\...args: unknown\[\]) =\> void) {       |
|                                                                       |
| return super.on(event, listener);                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Simulate an offer.updated event arriving from the server. \*/   |
|                                                                       |
| emitOfferUpdate(payload:                                              |
| import(\'../types/offer.types\').AblyOfferUpdatedPayload) {           |
|                                                                       |
| this.emit(\'offer.updated\', payload);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class MockAblyConnection extends EventEmitter {                |
|                                                                       |
| state = \'connected\';                                                |
|                                                                       |
| on(event: string, listener: (\...args: unknown\[\]) =\> void) {       |
|                                                                       |
| return super.on(event, listener);                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class MockAblyRealtime {                                       |
|                                                                       |
| public channels = new Map\<string, MockAblyChannel\>();               |
|                                                                       |
| public connection = new MockAblyConnection();                         |
|                                                                       |
| getChannel(name: string): MockAblyChannel {                           |
|                                                                       |
| if (!this.channels.has(name)) {                                       |
|                                                                       |
| const channel = new MockAblyChannel(name);                            |
|                                                                       |
| this.channels.set(name, channel);                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| return this.channels.get(name)!;                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Ably API compatibility                                             |
|                                                                       |
| get(name: string) { return { get: (n: string) =\> this.getChannel(n)  |
| }; }                                                                  |
|                                                                       |
| close() {}                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Jest setup --- mock the ably module:                               |
|                                                                       |
| jest.mock(\'ably\', () =\> ({                                         |
|                                                                       |
| Realtime: jest.fn().mockImplementation(() =\> {                       |
|                                                                       |
| const mock = new MockAblyRealtime();                                  |
|                                                                       |
| return {                                                              |
|                                                                       |
| connection: mock.connection,                                          |
|                                                                       |
| channels: { get: (name: string) =\> mock.getChannel(name) },          |
|                                                                       |
| close: jest.fn(),                                                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| }),                                                                   |
|                                                                       |
| }));                                                                  |
|                                                                       |
| // Example test:                                                      |
|                                                                       |
| describe(\'useAblyOffer\', () =\> {                                   |
|                                                                       |
| it(\'applies state from offer.updated event\', async () =\> {         |
|                                                                       |
| const { result } = renderHook(() =\> useAblyOffer({                   |
|                                                                       |
| offerId: \'test-offer-id\',                                           |
|                                                                       |
| getAuthHeader: () =\> \'Bearer test-token\',                          |
|                                                                       |
| enabled: true,                                                        |
|                                                                       |
| }));                                                                  |
|                                                                       |
| // Simulate an offer.updated event from the server:                   |
|                                                                       |
| const channel = getAblyMockChannel(\'offer:test-offer-id\');          |
|                                                                       |
| act(() =\> {                                                          |
|                                                                       |
| channel.emitOfferUpdate({                                             |
|                                                                       |
| offer: { \...mockOffer, status: \'ACCEPTED\' },                       |
|                                                                       |
| counterOffer: null,                                                   |
|                                                                       |
| rateWarning: false,                                                   |
|                                                                       |
| updatedAt: new Date().toISOString(),                                  |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
|                                                                       |
| expect(result.current.offer?.status).toBe(\'ACCEPTED\');              |
|                                                                       |
| expect(result.current.counterOffer).toBeNull();                       |
|                                                                       |
| });                                                                   |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 9 Ably Connection State Reference**                            |
|                                                                       |
| All connection states and how the hook handles each                   |
+-----------------------------------------------------------------------+

The hook listens to connection and channel state changes via event
listeners. This table shows every Ably state, what it means, and what
the hook does when it transitions into that state.

  ------------------ ------------------------- ----------------- --------------------
  **State**          **What it means**         **isConnected**   **Hook response**

  **initialized**    Ably not yet started.     **false**         N/A --- hook starts
                     Before                                      in loading state
                     connection.connect() is                     
                     called.                                     

  **connecting**     WebSocket is being        **false**         Loading spinner
                     opened. authCallback may                    visible
                     be called.                                  

  **connected**      WebSocket open. Messages  **true**          Sets
                     can be sent and received.                   isConnected=true,
                                                                 isLoading=false

  **disconnected**   Connection lost. Ably     **false**         Sets
                     retrying automatically                      isConnected=false.
                     every 15s.                                  No error shown
                                                                 (transient)

  **suspended**      Disconnected \> 2 min.    **false**         Sets
                     Buffer expired. Ably                        isConnected=false.
                     retrying every 30s.                         Calls reload() to
                                                                 re-fetch REST

  **closing**        close() was called.       **false**         N/A --- triggered by
                     Connection being torn                       hook cleanup
                     down.                                       

  **closed**         Connection closed         **false**         N/A --- normal
                     gracefully.                                 shutdown

  **failed**         Terminal error. Invalid   **false**         Sets error message.
                     token or unrecoverable                      User sees error
                     error.                                      banner
  ------------------ ------------------------- ----------------- --------------------

**Verification checklist**

+-----------------------------------------------------------------------+
| \# 1. Token endpoint returns valid token                              |
|                                                                       |
| curl -s http://localhost:3005/v1/offers/\<id\>/ably-token \\          |
|                                                                       |
| -H \"Authorization: Bearer \<jwt\>\" \| jq .capability                |
|                                                                       |
| \# Expected: {\"offer:\<id\>\":\[\"subscribe\"\]}                     |
|                                                                       |
| \# 2. Hook connects and populates offer state                         |
|                                                                       |
| \# Open React DevTools. Mount a component using useAblyOffer.         |
|                                                                       |
| \# Verify: isLoading -\> false, isConnected -\> true, offer is        |
| populated.                                                            |
|                                                                       |
| \# 3. Real-time update reaches frontend                               |
|                                                                       |
| \# With modal open: trigger a state change from the other party.      |
|                                                                       |
| \# Verify: offer.status updates in the UI without page reload.        |
|                                                                       |
| \# Verify: no REST call fired (check Network tab) on the update.      |
|                                                                       |
| \# 4. Reconnection after disconnect                                   |
|                                                                       |
| \# Disable network in browser DevTools (Network tab -\> Throttle -\>  |
| Offline)                                                              |
|                                                                       |
| \# Wait \> 2 minutes                                                  |
|                                                                       |
| \# Re-enable network                                                  |
|                                                                       |
| \# Verify: offer state re-fetches via REST (check Network tab)        |
|                                                                       |
| \# Verify: isConnected goes false, then back to true after reconnect  |
|                                                                       |
| \# 5. Token renewal after 1 hour (staging test)                       |
|                                                                       |
| \# Set ABLY_TOKEN_TTL_SECONDS=60 on backend temporarily               |
|                                                                       |
| \# Open modal and watch Ably connection logs in browser console:      |
|                                                                       |
| \# Ably logs: \"Auth callback called\" every \~45 seconds             |
|                                                                       |
| \# Connection should stay connected across token renewals             |
|                                                                       |
| \# 6. Cleanup on modal close                                          |
|                                                                       |
| \# Open browser Network tab -\> WS connections                        |
|                                                                       |
| \# Open modal: verify WebSocket is opened                             |
|                                                                       |
| \# Close modal: verify WebSocket is closed                            |
+-----------------------------------------------------------------------+
