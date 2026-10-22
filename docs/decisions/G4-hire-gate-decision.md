# G4 hiring-flow gate - offers, counter-offers and hire requests

Status: **ACCEPTED.** `/hire-requests` is gated on the talent's verification gate like offers and counter-offers
(Christopher, final G4 decision). A hire request is part of the hiring flow even though it does not currently create a
contract, and the route having no frontend caller does not exempt it.

## The rule
For every action that creates, extends or commits a hire, the **talent** must satisfy
`gate_open = is_verified OR in_grace` (30-day grace window), as answered by identity-verification-service over the
`identity_verification.gate_check` RPC. Only the talent is evaluated; **the client/sender's verification is never read
and has no effect.** The gate subject is always taken from trusted server-side data (the validated `talentUserId` on
create, the stored `talentUserId` on an existing record) - a verification result in a request body is never used.

## Gated and ungated actions

| Surface | Gated (talent's gate) | Ungated |
|---|---|---|
| Offers (offer-service) | create `POST /offers`, edit `PATCH /offers/:id`, accept, resend | decline, withdraw, reads |
| Counter-offers (offer-service) | create, edit, accept | withdraw/decline, reads |
| **Hire requests (user-service)** | **create `POST /hire-requests`, edit `PUT /hire-requests/:id`, status -> `ACCEPTED` or `PENDING` (`PUT /hire-requests/:id/status`)** | **status -> `DECLINED`, `GET /hire-requests`, `GET /hire-requests/:id`** |

`POST /hire-requests` is the only creation entry point (there is no alternate route or internal handler; the
`HireRequestsService` is exported but only the controller calls it). Declining stays open to both parties, matching
decline/withdraw on offers. There is no frontend for this route and none was added.

## Responses (identical to the offer path)
Same HTTP status, error code, message and body structure as offer-service's `OfferExceptionFilter`:

| Situation | Status | `error` | Notes |
|---|---|---|---|
| Closed gate, acting party is the **client** (create, edit, client-driven status change) | 403 | `TALENT_NOT_HIREABLE` | message "This freelancer isn’t available to hire right now"; nothing about verification, reason or what is missing |
| Closed gate, acting party is the **talent** (talent-driven status change) | 403 | `VERIFICATION_REQUIRED` | message "Verify your account to continue."; carries only the talent's own `missingRequirements` (`identity` / `location` / `both`) |
| Gate could not be evaluated (no broker, RPC error, timeout after 3 s, unusable or self-contradicting reply) | 503 | `IDENTITY_VERIFICATION_UNAVAILABLE` | an unanswered gate is a closed gate; nothing is done |

Body shape: `{ statusCode, error, message, [missingRequirements], timestamp, path, requestId }`. A test renders the offer
path's own exceptions through its real filter and asserts the hire-request responses are equal.

## Ordering and side effects
* Existing authentication, authorization and validation come first and are unchanged: an invalid body (400), an unknown
  talent (404), a target who is not a talent (400), a non-owner editing (403) and a non-participant changing status
  (403) are all decided **before** any gate lookup, so a non-party learns nothing about the gate.
* The gate runs after those checks and **before anything is created, changed or published**. A refusal leaves no hire
  request created or modified (`create`/`save` are never reached).

## Implementation notes
* user-service `hire-requests/hire-request-gate.ts`: `HireRequestGate` (evaluation), the three exceptions and
  `HireRequestGateExceptionFilter` (offer-service's envelope). Applied inside `HireRequestsService` and the
  controller's `@UseFilters`.
* user-service `IdentityVerificationGateClient.checkGate(userId)`: the single-account RPC, a deliberate copy of
  offer-service's client and strict reply parser (services do not import each other's `src`; the codes and wording in
  `hire-request-gate.ts` are likewise a copy and must change together with `offer.exceptions.ts`).
* Tests: `apps/user-service/src/hire-requests/hire-requests.g4-gate.spec.ts`; the existing offer and counter-offer gate
  tests (`apps/offer-service/src/offers/offers.talent-gate.spec.ts`) are unchanged and still pass.
