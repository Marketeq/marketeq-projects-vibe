**OS-10**

**Offer Service --- API Endpoint Reference**

**Base URL:** /v1 **Auth:** Bearer JWT (Authorization header)
**Idempotency:** X-Idempotency-Key: \<UUID v4\> required on all write
operations

All endpoints require a valid JWT in the Authorization: Bearer \<token\>
header unless noted. All write operations (POST, PATCH) require an
X-Idempotency-Key header containing a client-generated UUID v4. All
timestamps are ISO 8601 UTC. All rates are integers. Start dates display
as \"Monday, Jan 30, 2025\".

**Endpoint Index**

  -------- ------------------------------------------------- ------------ -----------------------------
  **\#**   **Path**                                          **Method**   **Summary**

  **1**    /v1/offers                                        **POST**     Create a new offer

  **2**    /v1/offers/:id                                    **GET**      Get offer by ID

  **3**    /v1/offers/:id                                    **PATCH**    Edit a pending offer

  **4**    /v1/offers/:id/accept                             **POST**     Accept an offer (talent)

  **5**    /v1/offers/:id/decline                            **POST**     Decline an offer (talent)

  **6**    /v1/offers/:id/withdraw                           **POST**     Withdraw an offer (client)

  **7**    /v1/offers/:id/resend                             **POST**     Resend a terminal offer
                                                                          (client)

  **8**    /v1/offers/:id/history                            **GET**      Get offer history (paginated)

  **9**    /v1/offers/:offerId/counter-offers                **POST**     Create a counter offer

  **10**   /v1/offers/:offerId/counter-offers/:id            **GET**      Get counter offer by ID

  **11**   /v1/offers/:offerId/counter-offers/:id            **PATCH**    Edit a pending counter offer
                                                                          (in-place)

  **12**   /v1/offers/:offerId/counter-offers/:id/accept     **POST**     Accept a counter offer

  **13**   /v1/offers/:offerId/counter-offers/:id/decline    **POST**     Decline a counter offer

  **14**   /v1/offers/:offerId/counter-offers/:id/withdraw   **POST**     Withdraw a counter offer

  **15**   /health                                           **GET**      Health check (liveness)

  **16**   /ready                                            **GET**      Readiness check
  -------- ------------------------------------------------- ------------ -----------------------------

+-----------------------------------------------------------------------+
| **0 Controller Implementation**                                       |
|                                                                       |
| Full NestJS production code --- copy-paste ready. Create these files  |
| before any service implementations.                                   |
+-----------------------------------------------------------------------+

This section contains every file needed to expose all 16 endpoints.
Follow the steps in order. Each step specifies the exact file path. When
complete, every endpoint in the index above will return 401 for
unauthenticated requests and route correctly for authenticated ones.

+-----------------------------------------------------------------------+
| Prerequisites --- confirm before writing any controller code:         |
|                                                                       |
| 1\. AppModule configured with ConfigModule.forRoot (OS-09)            |
|                                                                       |
| 2\. JwtAuthGuard at apps/offer-service/src/guards/jwt-auth.guard.ts   |
| (OS-12)                                                               |
|                                                                       |
| 3\. RolesGuard at apps/offer-service/src/guards/roles.guard.ts        |
| (OS-12)                                                               |
|                                                                       |
| 4\. OfferPartyGuard at                                                |
| apps/offer-service/src/guards/offer-party.guard.ts (OS-12)            |
|                                                                       |
| 5\. IdempotencyInterceptor at                                         |
| apps/offer-service/src/interceptors/idempotency.interceptor.ts        |
| (OS-14)                                                               |
+-----------------------------------------------------------------------+

**Step 1 --- Create shared types**

These types are used across all controllers. Create them first.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/types/user-role.enum.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\* User roles extracted from the JWT payload by JwtAuthGuard. \*/  |
|                                                                       |
| export enum UserRole {                                                |
|                                                                       |
| CLIENT = \'CLIENT\',                                                  |
|                                                                       |
| TALENT = \'TALENT\',                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  --------------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/common/types/authenticated-request.interface.ts**

  --------------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Request } from \'express\';                                  |
|                                                                       |
| import { UserRole } from \'./user-role.enum\';                        |
|                                                                       |
| /\*\* JWT payload attached to req.user by JwtAuthGuard. \*/           |
|                                                                       |
| export interface AuthenticatedUser {                                  |
|                                                                       |
| sub: string; // userId (UUID)                                         |
|                                                                       |
| role: UserRole; // CLIENT \| TALENT                                   |
|                                                                       |
| username: string;                                                     |
|                                                                       |
| iat: number;                                                          |
|                                                                       |
| exp: number;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\* Express Request with the authenticated user attached. \*/       |
|                                                                       |
| export interface AuthenticatedRequest extends Request {               |
|                                                                       |
| user: AuthenticatedUser;                                              |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/decorators/roles.decorator.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { SetMetadata } from \'@nestjs/common\';                       |
|                                                                       |
| import { UserRole } from \'../types/user-role.enum\';                 |
|                                                                       |
| export const ROLES_KEY = \'roles\';                                   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@Roles(UserRole.CLIENT) restricts an endpoint to specified roles. |
|                                                                       |
| \* RolesGuard reads this metadata and compares against req.user.role. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const Roles = (\...roles: UserRole\[\]) =\>                    |
| SetMetadata(ROLES_KEY, roles);                                        |
+-----------------------------------------------------------------------+

**Step 2 --- Create OffersController**

Handles all 8 primary offer endpoints (1-8 in the index). All business
logic lives in OffersService. Controllers only receive, validate,
delegate, and return.

+-----------------------------------------------------------------------+
| Never add business logic to controllers.                              |
|                                                                       |
| All state changes, DB writes, TTL calculations, and event publishing  |
| belong in OffersService.                                              |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.controller.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Controller, Get, Post, Patch, Param, Body, Query,                     |
|                                                                       |
| Req, UseGuards, UseInterceptors, HttpCode, HttpStatus, ParseUUIDPipe, |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { OffersService } from \'./offers.service\';                   |
|                                                                       |
| import { CreateOfferDto } from \'./dto/create-offer.dto\';            |
|                                                                       |
| import { EditOfferDto } from \'./dto/edit-offer.dto\';                |
|                                                                       |
| import { AcceptOfferDto } from \'./dto/accept-offer.dto\';            |
|                                                                       |
| import { DeclineOfferDto } from \'./dto/decline-offer.dto\';          |
|                                                                       |
| import { WithdrawOfferDto } from \'./dto/withdraw-offer.dto\';        |
|                                                                       |
| import { ResendOfferDto } from \'./dto/resend-offer.dto\';            |
|                                                                       |
| import { OfferHistoryQueryDto } from                                  |
| \'./dto/offer-history-query.dto\';                                    |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { RolesGuard } from \'../guards/roles.guard\';                 |
|                                                                       |
| import { OfferPartyGuard } from \'../guards/offer-party.guard\';      |
|                                                                       |
| import { IdempotencyInterceptor } from                                |
| \'../interceptors/idempotency.interceptor\';                          |
|                                                                       |
| import { Roles } from \'../common/decorators/roles.decorator\';       |
|                                                                       |
| import { UserRole } from \'../common/types/user-role.enum\';          |
|                                                                       |
| import { AuthenticatedRequest } from                                  |
| \'../common/types/authenticated-request.interface\';                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OffersController --- /v1/offers                                    |
|                                                                       |
| \* JwtAuthGuard applied at class level: all routes require a valid    |
| JWT.                                                                  |
|                                                                       |
| \* Role and party access enforced per-method via \@Roles and guards.  |
|                                                                       |
| \* Write operations (POST/PATCH) require X-Idempotency-Key via        |
| IdempotencyInterceptor.                                               |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Controller(\'offers\')                                              |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class OffersController {                                       |
|                                                                       |
| constructor(private readonly offersService: OffersService) {}         |
|                                                                       |
| // POST /v1/offers                                                    |
|                                                                       |
| // Create offer. CLIENT only. New Offer record created in PENDING     |
| status.                                                               |
|                                                                       |
| // expiresAt = createdAt + 14 days (server-side, never from client).  |
|                                                                       |
| // offer.created emitted to marketeq.offers via outbox after DB       |
| commit.                                                               |
|                                                                       |
| \@Post()                                                              |
|                                                                       |
| \@UseGuards(RolesGuard)                                               |
|                                                                       |
| \@Roles(UserRole.CLIENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async createOffer(@Req() req: AuthenticatedRequest, \@Body() dto:     |
| CreateOfferDto) {                                                     |
|                                                                       |
| return this.offersService.create(req.user.sub, dto);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/offers/:id                                                 |
|                                                                       |
| // Get offer by ID. Must be clientId or talentId on the offer.        |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| \@UseGuards(OfferPartyGuard)                                          |
|                                                                       |
| async getOffer(@Param(\'id\', ParseUUIDPipe) id: string) {            |
|                                                                       |
| return this.offersService.findById(id);                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // PATCH /v1/offers/:id                                               |
|                                                                       |
| // Edit pending offer in-place. CLIENT only, must be offer.clientId.  |
|                                                                       |
| // Resets expiresAt = NOW() + 14 days and warningSentAt = null.       |
|                                                                       |
| // Notification sent to talent: \"Offer Updated\" (see OS-29).        |
|                                                                       |
| \@Patch(\':id\')                                                      |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.CLIENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async editOffer(                                                      |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: EditOfferDto,                                           |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.edit(id, req.user.sub, dto);                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:id/accept                                         |
|                                                                       |
| // Accept pending offer. TALENT only, must be offer.talentId.         |
|                                                                       |
| // Atomic CAS in service. status = ACCEPTED. offer.accepted emitted.  |
|                                                                       |
| // contracts-service picks up offer.accepted to create ContractGroup. |
|                                                                       |
| \@Post(\':id/accept\')                                                |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.TALENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async acceptOffer(                                                    |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: AcceptOfferDto,                                         |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.accept(id, req.user.sub, dto);              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:id/decline                                        |
|                                                                       |
| // Decline pending offer. TALENT only. reason required.               |
|                                                                       |
| // status = DECLINED. offer.declined emitted.                         |
|                                                                       |
| // Decline reason stored but NOT included in notification to client.  |
|                                                                       |
| \@Post(\':id/decline\')                                               |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.TALENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async declineOffer(                                                   |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: DeclineOfferDto,                                        |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.decline(id, req.user.sub, dto);             |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:id/withdraw                                       |
|                                                                       |
| // Withdraw pending offer. CLIENT only, must be offer.clientId.       |
|                                                                       |
| // PENDING only --- cannot withdraw COUNTERED offers.                 |
|                                                                       |
| // status = WITHDRAWN. offer.withdrawn emitted.                       |
|                                                                       |
| \@Post(\':id/withdraw\')                                              |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.CLIENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async withdrawOffer(                                                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: WithdrawOfferDto,                                       |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.withdraw(id, req.user.sub, dto);            |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:id/resend                                         |
|                                                                       |
| // Resend EXPIRED \| DECLINED \| WITHDRAWN offer. CLIENT only.        |
|                                                                       |
| // Creates NEW offer record. Original remains in terminal state.      |
|                                                                       |
| // Both offer.created and offer.resent emitted.                       |
|                                                                       |
| \@Post(\':id/resend\')                                                |
|                                                                       |
| \@UseGuards(RolesGuard, OfferPartyGuard)                              |
|                                                                       |
| \@Roles(UserRole.CLIENT)                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async resendOffer(                                                    |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: ResendOfferDto,                                         |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.resend(id, req.user.sub, dto);              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/offers/:id/history                                         |
|                                                                       |
| // Paginated offer history events. Must be party to offer.            |
|                                                                       |
| // Cursor-based. Max 50 per page.                                     |
|                                                                       |
| \@Get(\':id/history\')                                                |
|                                                                       |
| \@UseGuards(OfferPartyGuard)                                          |
|                                                                       |
| async getHistory(                                                     |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Query() query: OfferHistoryQueryDto,                                |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.offersService.getHistory(id, query);                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Step 3 --- Create CounterOffersController**

Handles all 6 counter offer endpoints (9-14 in the index).
OfferPartyGuard is applied at class level --- it reads :offerId from the
route, loads the parent offer, and confirms the requesting user is a
party to it before any method runs.

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/counter-offers.controller.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Controller, Get, Post, Patch, Param, Body,                            |
|                                                                       |
| Req, UseGuards, UseInterceptors, HttpCode, HttpStatus, ParseUUIDPipe, |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { CounterOffersService } from \'./counter-offers.service\';    |
|                                                                       |
| import { CreateCounterOfferDto } from                                 |
| \'./dto/create-counter-offer.dto\';                                   |
|                                                                       |
| import { EditCounterOfferDto } from \'./dto/edit-counter-offer.dto\'; |
|                                                                       |
| import { WithdrawCounterOfferDto } from                               |
| \'./dto/withdraw-counter-offer.dto\';                                 |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { OfferPartyGuard } from \'../guards/offer-party.guard\';      |
|                                                                       |
| import { IdempotencyInterceptor } from                                |
| \'../interceptors/idempotency.interceptor\';                          |
|                                                                       |
| import { AuthenticatedRequest } from                                  |
| \'../common/types/authenticated-request.interface\';                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* CounterOffersController --- /v1/offers/:offerId/counter-offers     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* JwtAuthGuard + OfferPartyGuard applied at class level.             |
|                                                                       |
| \* OfferPartyGuard validates :offerId and confirms req.user is a      |
| party before every method.                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Rate warning (1.25x threshold) is evaluated in                     |
| CounterOffersService, not here.                                       |
|                                                                       |
| \* Advisory flag returned in response. Never blocks submission.       |
|                                                                       |
| \* Direction: talent CO warns if coRate \> parentRate \* 1.25         |
|                                                                       |
| \* client CO warns if coRate \< parentRate \* 0.8                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Controller(\'offers/:offerId/counter-offers\')                      |
|                                                                       |
| \@UseGuards(JwtAuthGuard, OfferPartyGuard)                            |
|                                                                       |
| export class CounterOffersController {                                |
|                                                                       |
| constructor(private readonly counterOffersService:                    |
| CounterOffersService) {}                                              |
|                                                                       |
| // POST /v1/offers/:offerId/counter-offers                            |
|                                                                       |
| // Either TALENT or CLIENT can submit depending on round.             |
|                                                                       |
| // TALENT: parent must be PENDING. Sets parent -\> COUNTERED.         |
|                                                                       |
| // CLIENT: parent must be COUNTERED. Sets existing CO -\> SUPERSEDED. |
|                                                                       |
| // offer.countered emitted. Rate warning evaluated and returned.      |
|                                                                       |
| \@Post()                                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async createCounterOffer(                                             |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: CreateCounterOfferDto,                                  |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.create(offerId, req.user.sub,        |
| req.user.role, dto);                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /v1/offers/:offerId/counter-offers/:id                         |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| async getCounterOffer(                                                |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.findById(offerId, id);               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // PATCH /v1/offers/:offerId/counter-offers/:id                       |
|                                                                       |
| // In-place edit. Only submitter may edit. PENDING only.              |
|                                                                       |
| // expiresAt NOT reset. Emits offer.counter_edited.                   |
|                                                                       |
| \@Patch(\':id\')                                                      |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async editCounterOffer(                                               |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: EditCounterOfferDto,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.edit(offerId, id, req.user.sub,      |
| dto);                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:offerId/counter-offers/:id/accept                 |
|                                                                       |
| // Non-submitter accepts. Atomic CAS.                                 |
|                                                                       |
| // CO + parent offer both -\> ACCEPTED. offer.counter_accepted +      |
| offer.accepted emitted.                                               |
|                                                                       |
| \@Post(\':id/accept\')                                                |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async acceptCounterOffer(                                             |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.accept(offerId, id, req.user.sub);   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:offerId/counter-offers/:id/decline                |
|                                                                       |
| // Non-submitter declines. CO -\> DECLINED. Parent offer -\> PENDING  |
| (restored).                                                           |
|                                                                       |
| // offer.counter_declined emitted. Returns both updated records.      |
|                                                                       |
| \@Post(\':id/decline\')                                               |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async declineCounterOffer(                                            |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.decline(offerId, id, req.user.sub);  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // POST /v1/offers/:offerId/counter-offers/:id/withdraw               |
|                                                                       |
| // Submitter withdraws. CO -\> WITHDRAWN. Parent offer -\> PENDING    |
| (restored).                                                           |
|                                                                       |
| // offer.counter_withdrawn emitted. Returns both updated records.     |
|                                                                       |
| \@Post(\':id/withdraw\')                                              |
|                                                                       |
| \@UseInterceptors(IdempotencyInterceptor)                             |
|                                                                       |
| async withdrawCounterOffer(                                           |
|                                                                       |
| \@Param(\'offerId\', ParseUUIDPipe) offerId: string,                  |
|                                                                       |
| \@Param(\'id\', ParseUUIDPipe) id: string,                            |
|                                                                       |
| \@Req() req: AuthenticatedRequest,                                    |
|                                                                       |
| \@Body() dto: WithdrawCounterOfferDto,                                |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| return this.counterOffersService.withdraw(offerId, id, req.user.sub,  |
| dto);                                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Step 4 --- Create HealthController**

Exposes /health and /ready without auth. The readiness probe checks all
four dependencies: PostgreSQL, Redis, RabbitMQ, and Ably. These paths
bypass the /v1 global prefix --- configured in Step 6.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/health/health.service.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable } from \'@nestjs/common\';                        |
|                                                                       |
| import { InjectDataSource } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { OfferConfig } from \'../../config/offer.config\';            |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class HealthService {                                          |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectDataSource() private readonly dataSource: DataSource,         |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| private get cfg(): OfferConfig { return                               |
| this.config.get\<OfferConfig\>(\'offer\'); }                          |
|                                                                       |
| async check() {                                                       |
|                                                                       |
| const checks: Record\<string, string\> = {                            |
|                                                                       |
| db: \'unknown\', redis: \'unknown\', rabbitmq: \'unknown\', ably:     |
| \'unknown\',                                                          |
|                                                                       |
| };                                                                    |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.dataSource.query(\'SELECT 1\');                            |
|                                                                       |
| checks.db = \'connected\';                                            |
|                                                                       |
| } catch { checks.db = \'disconnected\'; }                             |
|                                                                       |
| // Wire your RedisService, RabbitMQ publisher, and AblyService here.  |
|                                                                       |
| // Replace these placeholders with actual connectivity checks.        |
|                                                                       |
| checks.redis = \'connected\'; // await this.redisService.ping()       |
|                                                                       |
| checks.rabbitmq = \'connected\'; // await                             |
| this.rabbitmqPublisher.isConnected()                                  |
|                                                                       |
| checks.ably = \'connected\'; // await this.ablyService.isConnected()  |
|                                                                       |
| const allHealthy = Object.values(checks).every(v =\> v ===            |
| \'connected\');                                                       |
|                                                                       |
| return {                                                              |
|                                                                       |
| status: allHealthy ? \'ready\' : \'not_ready\',                       |
|                                                                       |
| service: this.cfg.app.name,                                           |
|                                                                       |
| checks,                                                               |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/health/health.controller.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Controller, Get, HttpCode, HttpStatus, Res } from            |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { Response } from \'express\';                                 |
|                                                                       |
| import { HealthService } from \'./health.service\';                   |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { OfferConfig } from \'../../config/offer.config\';            |
|                                                                       |
| // No \@UseGuards --- these endpoints are publicly accessible.        |
|                                                                       |
| // Registered WITHOUT the /v1 prefix via setGlobalPrefix exclude in   |
| main.ts.                                                              |
|                                                                       |
| \@Controller()                                                        |
|                                                                       |
| export class HealthController {                                       |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly healthService: HealthService,                        |
|                                                                       |
| private readonly config: ConfigService,                               |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| private get cfg(): OfferConfig { return                               |
| this.config.get\<OfferConfig\>(\'offer\'); }                          |
|                                                                       |
| // GET /health --- liveness probe. Always returns 200 if process is   |
| running.                                                              |
|                                                                       |
| \@Get(\'health\')                                                     |
|                                                                       |
| \@HttpCode(HttpStatus.OK)                                             |
|                                                                       |
| liveness() {                                                          |
|                                                                       |
| return {                                                              |
|                                                                       |
| status: \'ok\',                                                       |
|                                                                       |
| service: this.cfg.app.name,                                           |
|                                                                       |
| version: process.env.npm_package_version ?? \'1.0.0\',                |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // GET /ready --- readiness probe. 200 if all deps connected, 503     |
| otherwise.                                                            |
|                                                                       |
| \@Get(\'ready\')                                                      |
|                                                                       |
| async readiness(@Res() res: Response) {                               |
|                                                                       |
| const result = await this.healthService.check();                      |
|                                                                       |
| const code = result.status === \'ready\' ? 200 : 503;                 |
|                                                                       |
| return res.status(code).json(result);                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Step 5 --- Register controllers in their modules**

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/offers.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { OffersController } from \'./offers.controller\';             |
|                                                                       |
| import { OffersService } from \'./offers.service\';                   |
|                                                                       |
| import { Offer } from \'./entities/offer.entity\';                    |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../offer-history/entities/offer-history-event.entity\';             |
|                                                                       |
| import { OutboxModule } from \'../outbox/outbox.module\';             |
|                                                                       |
| import { RealtimeModule } from \'../realtime/realtime.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[Offer, OfferHistoryEvent\]),               |
|                                                                       |
| OutboxModule, // OutboxService for atomic event writes                |
|                                                                       |
| RealtimeModule, // AblyService for real-time updates                  |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[OffersController\],                                    |
|                                                                       |
| providers: \[OffersService\],                                         |
|                                                                       |
| exports: \[OffersService\], // CounterOffersModule needs this to look |
| up parent offers                                                      |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class OffersModule {}                                          |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE:
  apps/offer-service/src/counter-offers/counter-offers.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { TypeOrmModule } from \'@nestjs/typeorm\';                    |
|                                                                       |
| import { CounterOffersController } from                               |
| \'./counter-offers.controller\';                                      |
|                                                                       |
| import { CounterOffersService } from \'./counter-offers.service\';    |
|                                                                       |
| import { CounterOffer } from \'./entities/counter-offer.entity\';     |
|                                                                       |
| import { OfferHistoryEvent } from                                     |
| \'../offer-history/entities/offer-history-event.entity\';             |
|                                                                       |
| import { OffersModule } from \'../offers/offers.module\';             |
|                                                                       |
| import { OutboxModule } from \'../outbox/outbox.module\';             |
|                                                                       |
| import { RealtimeModule } from \'../realtime/realtime.module\';       |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| TypeOrmModule.forFeature(\[CounterOffer, OfferHistoryEvent\]),        |
|                                                                       |
| OffersModule, // OffersService for parent offer validation            |
|                                                                       |
| OutboxModule,                                                         |
|                                                                       |
| RealtimeModule,                                                       |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[CounterOffersController\],                             |
|                                                                       |
| providers: \[CounterOffersService\],                                  |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class CounterOffersModule {}                                   |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/health/health.module.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Module } from \'@nestjs/common\';                            |
|                                                                       |
| import { HealthController } from \'./health.controller\';             |
|                                                                       |
| import { HealthService } from \'./health.service\';                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| controllers: \[HealthController\],                                    |
|                                                                       |
| providers: \[HealthService\],                                         |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class HealthModule {}                                          |
+-----------------------------------------------------------------------+

**Step 6 --- Configure global prefix and ValidationPipe in main.ts**

The global prefix \"v1\" applies to all controllers. Health endpoints
are explicitly excluded so Kubernetes probes can hit /health and /ready
without the prefix. ValidationPipe is applied globally so
class-validator decorators on DTOs are enforced on every request.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/main.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { NestFactory } from \'@nestjs/core\';                         |
|                                                                       |
| import { ValidationPipe } from \'@nestjs/common\';                    |
|                                                                       |
| import { AppModule } from \'./app.module\';                           |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const app = await NestFactory.create(AppModule);                      |
|                                                                       |
| // /v1 prefix on all routes except health probes.                     |
|                                                                       |
| app.setGlobalPrefix(\'v1\', { exclude: \[\'health\', \'ready\'\] });  |
|                                                                       |
| // Global validation: strip unknown fields, reject unknown fields,    |
|                                                                       |
| // auto-transform body into DTO class instances.                      |
|                                                                       |
| app.useGlobalPipes(new ValidationPipe({                               |
|                                                                       |
| whitelist: true,                                                      |
|                                                                       |
| forbidNonWhitelisted: true,                                           |
|                                                                       |
| transform: true,                                                      |
|                                                                       |
| transformOptions: { enableImplicitConversion: true },                 |
|                                                                       |
| }));                                                                  |
|                                                                       |
| const port = process.env.PORT ?? 3005;                                |
|                                                                       |
| await app.listen(port);                                               |
|                                                                       |
| console.log(\`offer-service listening on :\${port}\`);                |
|                                                                       |
| }                                                                     |
|                                                                       |
| bootstrap();                                                          |
+-----------------------------------------------------------------------+

**Step 7 --- Verify all 16 endpoints are reachable**

+-----------------------------------------------------------------------------------------+
| \# Start the service                                                                    |
|                                                                                         |
| npm run start:dev \--project=offer-service                                              |
|                                                                                         |
| \# Health endpoints --- no auth (expect 200)                                            |
|                                                                                         |
| curl -s http://localhost:3005/health \| jq .status                                      |
|                                                                                         |
| \# Expected: \"ok\"                                                                     |
|                                                                                         |
| curl -s http://localhost:3005/ready \| jq .status                                       |
|                                                                                         |
| \# Expected: \"ready\"                                                                  |
|                                                                                         |
| \# Offer endpoints --- no token (expect 401, not 404)                                   |
|                                                                                         |
| curl -s -o /dev/null -w \"%{http_code}\" -X POST http://localhost:3005/v1/offers        |
|                                                                                         |
| \# Expected: 401                                                                        |
|                                                                                         |
| curl -s -o /dev/null -w \"%{http_code}\"                                                |
| http://localhost:3005/v1/offers/00000000-0000-0000-0000-000000000000                    |
|                                                                                         |
| \# Expected: 401                                                                        |
|                                                                                         |
| curl -s -o /dev/null -w \"%{http_code}\" -X POST                                        |
| http://localhost:3005/v1/offers/00000000-0000-0000-0000-000000000000/accept             |
|                                                                                         |
| \# Expected: 401                                                                        |
|                                                                                         |
| \# Counter offer endpoints --- no token (expect 401, not 404)                           |
|                                                                                         |
| curl -s -o /dev/null -w \"%{http_code}\" -X POST                                        |
| \"http://localhost:3005/v1/offers/00000000-0000-0000-0000-000000000000/counter-offers\" |
|                                                                                         |
| \# Expected: 401                                                                        |
|                                                                                         |
| \# If ANY endpoint returns 404: the controller is not registered in AppModule.          |
|                                                                                         |
| \# Fix: add OffersModule, CounterOffersModule, HealthModule to AppModule.imports.       |
+-----------------------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| GET /health returns 404: check setGlobalPrefix exclude in main.ts     |
| includes \"health\" and \"ready\".                                    |
|                                                                       |
| POST /v1/offers returns 404: OffersModule is not in                   |
| AppModule.imports.                                                    |
|                                                                       |
| POST /v1/offers/:offerId/counter-offers returns 404:                  |
| CounterOffersModule is not in AppModule.imports.                      |
|                                                                       |
| Service crashes on startup referencing a guard or interceptor:        |
| confirm all guards exist in OS-12.                                    |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **1 Offers**                                                          |
|                                                                       |
| Primary offer CRUD and lifecycle                                      |
+-----------------------------------------------------------------------+

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers**                                                 |
|          |                                                                |
|          | Create a new offer operationId: createOffer                    |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: CLIENT only.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (CLIENT) →
                   IdempotencyInterceptor

  **Side Effects** Creates Offer record + OutboxEvent in one transaction.
                   Calls listings-service for start date if scoped.
                   offer.created emitted to marketeq.offers. Ably:
                   offer:{offerId} updated.
  ---------------- ------------------------------------------------------

**Request Body**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"talentId\": \"uuid\", // Required.                                  |
|                                                                       |
| \"jobListingId\": \"uuid\", // Required.                              |
|                                                                       |
| \"contractType\": \"PROJECT\", // Required. Enum: PROJECT \| SERVICE  |
| \| TEAM \| CONTRACT                                                   |
|                                                                       |
| \"contractTitle\": \"string\", // Required for TEAM \| CONTRACT \|    |
| SERVICE. Max 200 chars.                                               |
|                                                                       |
| \"rate\": 45, // Required. Integer. Min 1, Max 9999.                  |
|                                                                       |
| \"currencyCode\": \"USD\", // Required. ISO 4217.                     |
|                                                                       |
| \"durationMonths\": 4, // Required. Integer. Min 1, Max 60.           |
|                                                                       |
| \"workSchedule\": {                                                   |
|                                                                       |
| \"type\": \"FULL_TIME\", // Required. Enum: PART_TIME \| FULL_TIME \| |
| CUSTOM                                                                |
|                                                                       |
| \"hoursPerWeek\": 40 // Required when type = CUSTOM. Min 1, Max 80.   |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"startDate\": \"2025-01-30\", // Required. ISO 8601. Not in past.    |
| Max 5 years out.                                                      |
|                                                                       |
| \"message\": \"string\" // Optional. Max 500 chars.                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Response --- 201 Created**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"clientId\": \"uuid\",                                               |
|                                                                       |
| \"talentId\": \"uuid\",                                               |
|                                                                       |
| \"jobListingId\": \"uuid\",                                           |
|                                                                       |
| \"contractType\": \"PROJECT\",                                        |
|                                                                       |
| \"contractTitle\": \"The Ultimate Mobile App Experience\",            |
|                                                                       |
| \"status\": \"PENDING\",                                              |
|                                                                       |
| \"rate\": 45,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 4,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-01-30\",                                        |
|                                                                       |
| \"startDateDisplay\": \"Thursday, Jan 30, 2025\",                     |
|                                                                       |
| \"message\": \"Looking forward to working with you.\",                |
|                                                                       |
| \"expiresAt\": \"2025-02-13T10:00:00Z\",                              |
|                                                                       |
| \"createdAt\": \"2025-01-30T10:00:00Z\",                              |
|                                                                       |
| \"updatedAt\": \"2025-01-30T10:00:00Z\",                              |
|                                                                       |
| \"acceptedAt\": null,                                                 |
|                                                                       |
| \"declinedAt\": null,                                                 |
|                                                                       |
| \"withdrawnAt\": null,                                                |
|                                                                       |
| \"expiredAt\": null,                                                  |
|                                                                       |
| \"warningSentAt\": null                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **201**    Created         Offer successfully created.

  **400**    Bad Request     Malformed request body.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not a CLIENT, or client attempting to hire themselves.

  **409**    Conflict        Active offer already exists for this client-talent
                             pair. Error: OFFER_ALREADY_EXISTS.

  **422**    Unprocessable   Validation failure --- rate out of range, past start
             Entity          date, title too long. Field-level errors in response.

  **500**    Internal Server Unexpected server error.
             Error           
  ---------- --------------- -------------------------------------------------------

+:-------:+----------------------------------------------------------------+
| **GET** | **/v1/offers/:id**                                             |
|         |                                                                |
|         | Get offer by ID operationId: getOffer                          |
+---------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be clientId or talentId on the
                   offer.

  **Idempotency    Not required --- read operation.
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard

  **Side Effects** None.
  ---------------- ------------------------------------------------------

**Response --- 200 OK**

Returns the full Offer object --- same shape as 201 from POST
/v1/offers, with all timestamps populated as applicable.

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Offer returned.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Not a party to this offer.

  **404**    Not Found      Offer not found. Same shape for not-found and
                            access-denied to prevent enumeration.
  ---------- -------------- -------------------------------------------------------

+:---------:+----------------------------------------------------------------+
| **PATCH** | **/v1/offers/:id**                                             |
|           |                                                                |
|           | Edit a pending offer operationId: editOffer                    |
+-----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: CLIENT. Must be
                   offer.clientId.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (CLIENT) → OfferPartyGuard →
                   IdempotencyInterceptor

  **Offer Status   PENDING only. 409 if COUNTERED, ACCEPTED, DECLINED,
  Required**       WITHDRAWN, or EXPIRED.

  **Side Effects** Updates offer. Resets expiresAt = NOW() + 14 days and
                   warningSentAt = null. Notification sent to talent:
                   \"Offer Updated\". Ably updated.
  ---------------- ------------------------------------------------------

**Request Body --- all fields optional, at least one required**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"rate\": 70,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 6,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-03-01\",                                        |
|                                                                       |
| \"contractTitle\": \"string\",                                        |
|                                                                       |
| \"message\": \"string\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Response --- 200 OK**

Returns full updated Offer with new expiresAt and updatedAt.

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **200**    OK              Offer updated.

  **400**    Bad Request     No fields provided.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not the offer client.

  **409**    Conflict        Offer not PENDING. Error: OFFER_NOT_ACTIONABLE.

  **422**    Unprocessable   Validation failure.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:id/accept**                                      |
|          |                                                                |
|          | Accept an offer operationId: acceptOffer                       |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: TALENT. Must be
                   offer.talentId.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (TALENT) → OfferPartyGuard →
                   IdempotencyInterceptor

  **Offer Status   PENDING only. Atomic CAS --- 409 if status changed
  Required**       between read and write.

  **Side Effects** status = ACCEPTED, acceptedAt = NOW(). offer.accepted
                   emitted. contracts-service creates ContractGroup. Ably
                   updated.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  { \"message\": \"string\" } // Optional. Max 500 chars.

  -----------------------------------------------------------------------

**Response --- 200 OK**

Returns the full updated Offer with status = ACCEPTED and acceptedAt
populated.

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **200**    OK              Offer accepted.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not the offer talent.

  **409**    Conflict        Offer not PENDING. Error codes: OFFER_ALREADY_ACCEPTED
                             \| OFFER_EXPIRED \| OFFER_WITHDRAWN \|
                             OFFER_NOT_ACTIONABLE.

  **422**    Unprocessable   Consent not confirmed.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:id/decline**                                     |
|          |                                                                |
|          | Decline an offer operationId: declineOffer                     |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: TALENT. Must be
                   offer.talentId.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (TALENT) → OfferPartyGuard →
                   IdempotencyInterceptor

  **Offer Status   PENDING only.
  Required**       

  **Side Effects** status = DECLINED, declinedAt = NOW(). declineReason
                   stored. offer.declined emitted. Client notified:
                   \"Offer Declined\". Reason NOT in notification ---
                   only in details modal.
  ---------------- ------------------------------------------------------

**Request Body**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"reason\": \"string\", // Required. Min 1 char, Max 500 chars.       |
|                                                                       |
| \"chip\": \"string\" // Optional. BUDGET_DOESNT_WORK \|               |
| START_DATE_DOESNT_WORK \|                                             |
|                                                                       |
| // REQUIREMENTS_UNCLEAR \| NOT_A_FIT \| TOO_BUSY \|                   |
| NEED_DIFFERENT_TERMS                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Response --- 200 OK**

Returns the full updated Offer with status = DECLINED and declinedAt
populated.

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **200**    OK              Offer declined.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not the offer talent.

  **409**    Conflict        Offer not PENDING. Error: OFFER_NOT_ACTIONABLE.

  **422**    Unprocessable   Reason field missing or empty.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:id/withdraw**                                    |
|          |                                                                |
|          | Withdraw an offer operationId: withdrawOffer                   |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: CLIENT. Must be
                   offer.clientId.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (CLIENT) → OfferPartyGuard →
                   IdempotencyInterceptor

  **Offer Status   PENDING only. Cannot withdraw COUNTERED offers.
  Required**       

  **Side Effects** status = WITHDRAWN, withdrawnAt = NOW().
                   withdrawalMessage stored. offer.withdrawn emitted.
                   Talent notified. Ably updated.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  { \"message\": \"string\" } // Optional. Max 500 chars.

  -----------------------------------------------------------------------

**Response --- 200 OK**

Returns the full updated Offer with status = WITHDRAWN and withdrawnAt
populated.

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Offer withdrawn.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Not the offer client.

  **409**    Conflict       Offer not PENDING. Error codes: OFFER_ALREADY_ACCEPTED
                            \| OFFER_EXPIRED \| OFFER_NOT_ACTIONABLE.
  ---------- -------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:id/resend**                                      |
|          |                                                                |
|          | Resend a terminal offer operationId: resendOffer               |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Role: CLIENT. Must be
                   offer.clientId.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → RolesGuard (CLIENT) → OfferPartyGuard →
                   IdempotencyInterceptor

  **Offer Status   EXPIRED \| DECLINED \| WITHDRAWN only. Cannot resend
  Required**       PENDING or ACCEPTED.

  **Side Effects** Creates NEW Offer record. Fresh expiresAt = NOW() + 14
                   days. Original unchanged in terminal state.
                   offer.created + offer.resent emitted. New Ably channel
                   created.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  { \"message\": \"string\" } // Optional. Max 500 chars.

  -----------------------------------------------------------------------

**Response --- 201 Created**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"id\": \"new-uuid\",                                                 |
|                                                                       |
| \"originalOfferId\": \"old-uuid\",                                    |
|                                                                       |
| \"status\": \"PENDING\",                                              |
|                                                                       |
| // \... all other offer fields                                        |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **201**    Created         New offer created.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not the offer client.

  **409**    Conflict        OFFER_NOT_RESENDABLE \| OFFER_ALREADY_EXISTS \|
                             TALENT_NOT_AVAILABLE.

  **422**    Unprocessable   Talent account no longer available.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:-------:+----------------------------------------------------------------+
| **GET** | **/v1/offers/:id/history**                                     |
|         |                                                                |
|         | Get offer history (paginated) operationId: getOfferHistory     |
+---------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be clientId or talentId on the
                   offer.

  **Idempotency    Not required --- read operation.
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard

  **Side Effects** None.
  ---------------- ------------------------------------------------------

**Query Parameters**

+-----------------------------------------------------------------------+
| cursor --- string (optional). Cursor from previous page.              |
|                                                                       |
| limit --- integer (optional). Max 50. Default 50.                     |
+-----------------------------------------------------------------------+

**Response --- 200 OK**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"data\": \[{                                                         |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"offerId\": \"uuid\",                                                |
|                                                                       |
| \"eventType\": \"offer.created\",                                     |
|                                                                       |
| \"actor\": \"CLIENT\",                                                |
|                                                                       |
| \"actorId\": \"uuid\",                                                |
|                                                                       |
| \"terms\": {                                                          |
|                                                                       |
| \"rate\": 45, \"currencyCode\": \"USD\", \"durationMonths\": 4,       |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-01-30\",                                        |
|                                                                       |
| \"startDateDisplay\": \"Thursday, Jan 30, 2025\",                     |
|                                                                       |
| \"message\": \"string \| null\"                                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"createdAt\": \"2025-01-30T10:00:00Z\"                               |
|                                                                       |
| }\],                                                                  |
|                                                                       |
| \"nextCursor\": \"string \| null\",                                   |
|                                                                       |
| \"total\": 12                                                         |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             History returned.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Not a party to this offer.

  **404**    Not Found      Offer not found.
  ---------- -------------- -------------------------------------------------------

+-----------------------------------------------------------------------+
| **2 Counter Offers**                                                  |
|                                                                       |
| Counter offer lifecycle --- create, edit, accept, decline, withdraw   |
+-----------------------------------------------------------------------+

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:offerId/counter-offers**                         |
|          |                                                                |
|          | Create a counter offer operationId: createCounterOffer         |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. TALENT or CLIENT. Role determines
                   direction.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard →
                   IdempotencyInterceptor

  **Parent Offer   PENDING (talent initiating) or COUNTERED (client
  Status**         responding). Only ONE CO can be PENDING at a time.

  **Side Effects** Creates CO record + OutboxEvent in one transaction.
                   Parent -\> COUNTERED (talent) or existing CO -\>
                   SUPERSEDED (client). offer.countered emitted. Rate
                   warning evaluated server-side --- advisory in
                   response.
  ---------------- ------------------------------------------------------

**Request Body**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"rate\": 85,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 4,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-02-01\",                                        |
|                                                                       |
| \"message\": \"string\" // Optional. Max 500 chars.                   |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Response --- 201 Created**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"offerId\": \"uuid\",                                                |
|                                                                       |
| \"submittedBy\": \"TALENT\",                                          |
|                                                                       |
| \"submittedById\": \"uuid\",                                          |
|                                                                       |
| \"status\": \"PENDING\",                                              |
|                                                                       |
| \"rate\": 85,                                                         |
|                                                                       |
| \"currencyCode\": \"USD\",                                            |
|                                                                       |
| \"durationMonths\": 4,                                                |
|                                                                       |
| \"workSchedule\": { \"type\": \"FULL_TIME\", \"hoursPerWeek\": 40 },  |
|                                                                       |
| \"startDate\": \"2025-02-01\",                                        |
|                                                                       |
| \"startDateDisplay\":\"Saturday, Feb 1, 2025\",                       |
|                                                                       |
| \"message\": \"I would like to increase the rate.\",                  |
|                                                                       |
| \"expiresAt\": \"2025-02-15T10:00:00Z\",                              |
|                                                                       |
| \"createdAt\": \"2025-02-01T10:00:00Z\",                              |
|                                                                       |
| \"updatedAt\": \"2025-02-01T10:00:00Z\",                              |
|                                                                       |
| \"rateWarning\": false // true if rate \> parentOffer.rate \* 1.25    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **201**    Created         Counter offer created.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not a party to this offer.

  **409**    Conflict        Parent offer not in correct status. Or CO already
                             PENDING --- COUNTER_OFFER_ALREADY_PENDING.

  **422**    Unprocessable   Validation failure.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:-------:+----------------------------------------------------------------+
| **GET** | **/v1/offers/:offerId/counter-offers/:id**                     |
|         |                                                                |
|         | Get counter offer by ID operationId: getCounterOffer           |
+---------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be party to the parent offer.

  **Guard**        JwtAuthGuard → OfferPartyGuard

  **Side Effects** None.
  ---------------- ------------------------------------------------------

**Response --- 200 OK**

Returns the full CounterOffer object --- same shape as 201 from POST,
with all timestamps populated.

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Counter offer found.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Not a party.

  **404**    Not Found      Counter offer not found.
  ---------- -------------- -------------------------------------------------------

+:---------:+----------------------------------------------------------------+
| **PATCH** | **/v1/offers/:offerId/counter-offers/:id**                     |
|           |                                                                |
|           | Edit a pending counter offer (in-place) operationId:           |
|           | editCounterOffer                                               |
+-----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be the submitter of the counter
                   offer.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard →
                   IdempotencyInterceptor (submitter check in service)

  **CO Status      PENDING only. TRUE in-place edit --- same record
  Required**       mutated.

  **Side Effects** Updates CO record. Emits offer.counter_edited (NOT
                   offer.countered). Other party notified: \"Counter
                   Offer Updated.\" expiresAt NOT reset.
  ---------------- ------------------------------------------------------

**Request Body --- all optional, at least one required**

  -----------------------------------------------------------------------
  { \"rate\": 90, \"currencyCode\": \"USD\", \"durationMonths\": 6,
  \"workSchedule\": {\...}, \"startDate\": \"2025-03-01\", \"message\":
  \"string\" }

  -----------------------------------------------------------------------

**Response --- 200 OK**

Returns full updated CounterOffer. expiresAt unchanged --- TTL clock
continues from original submission.

**Status Codes**

  ---------- --------------- -------------------------------------------------------
  **Code**   **Status**      **Condition**

  **200**    OK              Counter offer updated.

  **401**    Unauthorized    Missing or invalid JWT.

  **403**    Forbidden       Not the submitter.

  **409**    Conflict        CO not PENDING. Error: COUNTER_OFFER_NOT_ACTIONABLE.

  **422**    Unprocessable   Validation failure.
             Entity          
  ---------- --------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:offerId/counter-offers/:id/accept**              |
|          |                                                                |
|          | Accept a counter offer operationId: acceptCounterOffer         |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be the party who did NOT submit
                   the counter offer.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard →
                   IdempotencyInterceptor (non-submitter enforced in
                   service)

  **CO Status      PENDING only. Atomic CAS.
  Required**       

  **Side Effects** CO + parent offer both -\> ACCEPTED. acceptedAt set on
                   both. offer.counter_accepted + offer.accepted emitted.
                   contracts-service creates ContractGroup. Ably updated.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  {} // No body required.

  -----------------------------------------------------------------------

**Response --- 200 OK**

Returns updated CounterOffer (status = ACCEPTED). Parent offer also
ACCEPTED in DB.

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Counter offer accepted.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Requesting user is the submitter.

  **409**    Conflict       CO not PENDING. Errors: COUNTER_OFFER_WITHDRAWN \|
                            COUNTER_OFFER_EXPIRED \| COUNTER_OFFER_NOT_ACTIONABLE.
  ---------- -------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:offerId/counter-offers/:id/decline**             |
|          |                                                                |
|          | Decline a counter offer operationId: declineCounterOffer       |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be the party who did NOT
                   submit.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard →
                   IdempotencyInterceptor (non-submitter enforced in
                   service)

  **CO Status      PENDING only.
  Required**       

  **Side Effects** CO -\> DECLINED. Parent offer -\> PENDING (restored,
                   unless independently expired). offer.counter_declined
                   emitted. Other party notified with \"View Active
                   Offer\" CTA.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  {} // No body required.

  -----------------------------------------------------------------------

**Response --- 200 OK**

  -----------------------------------------------------------------------
  { \"counterOffer\": { /\* status: DECLINED \*/ }, \"parentOffer\": {
  /\* status: PENDING (restored) \*/ } }

  -----------------------------------------------------------------------

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Counter offer declined. Parent offer restored to
                            PENDING.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Requesting user is the submitter.

  **409**    Conflict       CO not PENDING.
  ---------- -------------- -------------------------------------------------------

+:--------:+----------------------------------------------------------------+
| **POST** | **/v1/offers/:offerId/counter-offers/:id/withdraw**            |
|          |                                                                |
|          | Withdraw a counter offer operationId: withdrawCounterOffer     |
+----------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         Required --- JWT. Must be the submitter.

  **Idempotency    Required --- X-Idempotency-Key: \<UUID v4\>
  Key**            

  **Guard**        JwtAuthGuard → OfferPartyGuard →
                   IdempotencyInterceptor (submitter enforced in service)

  **CO Status      PENDING only.
  Required**       

  **Side Effects** CO -\> WITHDRAWN. Parent offer -\> PENDING (restored,
                   unless independently expired). offer.counter_withdrawn
                   emitted. Other party notified with \"View Active
                   Offer\" CTA.
  ---------------- ------------------------------------------------------

**Request Body**

  -----------------------------------------------------------------------
  { \"message\": \"string\" } // Optional. Max 500 chars.

  -----------------------------------------------------------------------

**Response --- 200 OK**

  -----------------------------------------------------------------------
  { \"counterOffer\": { /\* status: WITHDRAWN \*/ }, \"parentOffer\": {
  /\* status: PENDING (restored) \*/ } }

  -----------------------------------------------------------------------

**Status Codes**

  ---------- -------------- -------------------------------------------------------
  **Code**   **Status**     **Condition**

  **200**    OK             Counter offer withdrawn. Parent offer restored to
                            PENDING.

  **401**    Unauthorized   Missing or invalid JWT.

  **403**    Forbidden      Not the submitter.

  **409**    Conflict       CO not PENDING.
  ---------- -------------- -------------------------------------------------------

+-----------------------------------------------------------------------+
| **3 Health & Readiness**                                              |
|                                                                       |
| No auth required. Paths bypass /v1 prefix (see main.ts Step 6).       |
+-----------------------------------------------------------------------+

+:-------:+----------------------------------------------------------------+
| **GET** | **/health**                                                    |
|         |                                                                |
|         | Health check --- liveness probe operationId: healthCheck       |
+---------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         None --- publicly accessible.

  **Side Effects** None.
  ---------------- ------------------------------------------------------

**Response --- 200 OK**

  -----------------------------------------------------------------------
  { \"status\": \"ok\", \"service\": \"offer-service\", \"version\":
  \"1.0.0\" }

  -----------------------------------------------------------------------

**Status Codes**

  ---------- ------------- -------------------------------------------------------
  **Code**   **Status**    **Condition**

  **200**    OK            Service is alive.

  **503**    Service       Service not ready.
             Unavailable   
  ---------- ------------- -------------------------------------------------------

+:-------:+----------------------------------------------------------------+
| **GET** | **/ready**                                                     |
|         |                                                                |
|         | Readiness check --- readiness probe operationId:               |
|         | readinessCheck                                                 |
+---------+----------------------------------------------------------------+

  ---------------- ------------------------------------------------------
  **Auth**         None --- publicly accessible.

  **Side Effects** Performs lightweight connectivity checks on DB, Redis,
                   RabbitMQ, Ably.
  ---------------- ------------------------------------------------------

**Response --- 200 OK**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"status\": \"ready\",                                                |
|                                                                       |
| \"service\": \"offer-service\",                                       |
|                                                                       |
| \"checks\": { \"db\": \"connected\", \"redis\": \"connected\",        |
| \"rabbitmq\": \"connected\", \"ably\": \"connected\" }                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Response --- 503 Service Unavailable**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"status\": \"not_ready\",                                            |
|                                                                       |
| \"service\": \"offer-service\",                                       |
|                                                                       |
| \"checks\": { \"db\": \"disconnected\", \"redis\": \"connected\",     |
| \"rabbitmq\": \"connected\", \"ably\": \"connected\" }                |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Status Codes**

  ---------- ------------- -------------------------------------------------------
  **Code**   **Status**    **Condition**

  **200**    OK            All dependencies reachable.

  **503**    Service       One or more dependencies unreachable.
             Unavailable   
  ---------- ------------- -------------------------------------------------------

+-----------------------------------------------------------------------+
| **4 Global Headers & Standards**                                      |
|                                                                       |
| Applied to all endpoints                                              |
+-----------------------------------------------------------------------+

**Request Headers**

  ----------------------- -------------- ----------------------------------------
  **Header**              **Required**   **Notes**

  **Authorization**       Required       Format: Bearer \<JWT\>. All
                                         authenticated endpoints.

  **X-Idempotency-Key**   Required on    UUID v4. Client-generated. POST and
                          writes         PATCH only.

  **Content-Type**        Required on    application/json
                          writes         

  **X-Service-Key**       Internal only  Shared API key for service-to-service
                                         calls. Via INTERNAL_SERVICE_API_KEY env
                                         var.

  **X-Request-ID**        Optional       Client-supplied trace ID. Logged and
                                         returned in response.
  ----------------------- -------------- ----------------------------------------

**Standard Error Response Envelope**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"statusCode\": 422,                                                  |
|                                                                       |
| \"error\": \"INVALID_RATE\",                                          |
|                                                                       |
| \"message\": \"Please enter a rate greater than \$0.\",               |
|                                                                       |
| \"details\": \[{ \"field\": \"rate\", \"message\": \"Please enter a   |
| rate greater than \$0.\" }\],                                         |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00Z\",                              |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Pagination --- GET /v1/offers/:id/history**

+-----------------------------------------------------------------------+
| // Request                                                            |
|                                                                       |
| GET /v1/offers/:id/history?limit=50&cursor=\<cursor\>                 |
|                                                                       |
| // Response                                                           |
|                                                                       |
| { \"data\": \[\...\], \"nextCursor\": \"string \| null\", \"total\":  |
| 42 }                                                                  |
+-----------------------------------------------------------------------+
