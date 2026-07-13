**OS-36**

**Offer Service --- Security & RBAC**

**Roles:** CLIENT • TALENT • SYSTEM (scheduler) **Auth:** JWT Bearer
(RS256) **Party enforcement:** OfferPartyGuard on every endpoint

This document defines the complete security and access control model for
offer-service. It covers every role, every permitted action per role,
the full guard stack (JwtAuthGuard → OfferPartyGuard →
OfferActionGuard), PII field identification across all entities, how PII
is masked in logs, and how account deletion is handled without breaking
historical records.

**File Map**

  ---------- ------------------------------------------- ----------------------
  **Step**   **File Path**                               **Purpose**

  **1**      (reference)                                 Role definitions and
                                                         JWT payload contract

  **2**      src/auth/strategies/jwt.strategy.ts         JwtStrategy ---
                                                         validates signature,
                                                         extracts userId + role

  **3**      src/auth/guards/jwt-auth.guard.ts           JwtAuthGuard ---
                                                         global guard, skipped
                                                         via \@Public()

  **4**      src/auth/decorators/public.decorator.ts     \@Public() decorator
                                                         for health endpoints

  **5**      src/offers/guards/offer-party.guard.ts      OfferPartyGuard ---
                                                         verifies requester is
                                                         client or talent on
                                                         offer

  **6**      src/offers/guards/offer-action.guard.ts     OfferActionGuard ---
             (reference)                                 role + status
                                                         combination check
                                                         (defined in OS-25)

  **7**      (reference)                                 Role-action matrix:
                                                         every endpoint × every
                                                         role

  **8**      (reference)                                 PII field registry:
                                                         entity, field, stored,
                                                         logged, masked

  **9**      src/users/user-deletion.handler.ts          Account deletion:
                                                         terminate active
                                                         offers, preserve
                                                         history
  ---------- ------------------------------------------- ----------------------

+-----------------------------------------------------------------------+
| **Step 1 Roles & JWT Payload Contract**                               |
|                                                                       |
| The three roles and what the JWT must contain                         |
+-----------------------------------------------------------------------+

  --------------------- -------------------------------------------------
  **CLIENT role**       A company or individual who creates job listings
                        and sends offers. Identified by role=CLIENT in
                        the JWT. Can create, edit, withdraw, resend
                        offers. Can accept or decline counter offers.

  **TALENT role**       A freelancer or contractor who receives offers.
                        Identified by role=TALENT in the JWT. Can accept,
                        decline, or counter offer. Cannot create offers.

  **SYSTEM (no JWT)**   The expiry scheduler and outbox processor. These
                        run as internal cron jobs with no HTTP request
                        and no JWT. They call service methods directly.
                        Their actor field in history is logged as
                        \"SYSTEM\" with actorId=null.

  **No admin role**     offer-service has no admin role. Backoffice
                        access to offer data goes through a separate
                        internal API or direct DB access with audit
                        logging. No privileged HTTP endpoint bypasses the
                        party guard.
  --------------------- -------------------------------------------------

**JWT payload (decoded)**

+-----------------------------------------------------------------------+
| // JWT payload --- issued by auth-service, verified by offer-service  |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"sub\": \"f47ac10b-58cc-4372-a567-0e02b2c3d479\", // userId (UUID)   |
|                                                                       |
| \"role\": \"CLIENT\", // or \"TALENT\"                                |
|                                                                       |
| \"iat\": 1706742000, // Issued at (Unix timestamp)                    |
|                                                                       |
| \"exp\": 1706828400, // Expires at (Unix timestamp, 24h)              |
|                                                                       |
| \"iss\": \"marketeq-auth\", // Issuer matches EXPECTED_ISSUER env var |
|                                                                       |
| }                                                                     |
|                                                                       |
| // What offer-service does NOT put in the JWT:                        |
|                                                                       |
| // - Email address (unnecessary, stored in user-service)              |
|                                                                       |
| // - Name, profile photo, etc. (unnecessary for offer operations)     |
|                                                                       |
| // - Permissions list (role-based, not permission-based)              |
|                                                                       |
| // AuthenticatedUser interface (used in controllers and guards):      |
|                                                                       |
| export interface AuthenticatedUser {                                  |
|                                                                       |
| sub: string; // userId --- matches Offer.clientId or Offer.talentId   |
|                                                                       |
| role: \'CLIENT\' \| \'TALENT\';                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // How to access the authenticated user in a controller:              |
|                                                                       |
| // \@Post(\':id/accept\')                                             |
|                                                                       |
| // async accept(@Req() req: Request) {                                |
|                                                                       |
| // const user = req.user as AuthenticatedUser;                        |
|                                                                       |
| // return this.offersService.accept(offerId, user.sub);               |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 JwtStrategy --- jwt.strategy.ts**                            |
|                                                                       |
| Verifies JWT signature and extracts the user payload                  |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/auth/strategies/jwt.strategy.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, UnauthorizedException } from \'@nestjs/common\'; |
|                                                                       |
| import { PassportStrategy } from \'@nestjs/passport\';                |
|                                                                       |
| import { ExtractJwt, Strategy } from \'passport-jwt\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| import { AuthenticatedUser } from                                     |
| \'../types/authenticated-user.interface\';                            |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* JwtStrategy --- validates the JWT signature on every authenticated |
| request.                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Configuration:                                                     |
|                                                                       |
| \* JWT_PUBLIC_KEY: RSA public key (RS256) from auth-service.          |
|                                                                       |
| \* JWT_EXPECTED_ISSUER: must match the \"iss\" claim in the JWT.      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* The strategy extracts the JWT from the Authorization: Bearer       |
| header.                                                               |
|                                                                       |
| \* It verifies the signature, expiry, and issuer.                     |
|                                                                       |
| \* On success it returns the AuthenticatedUser payload which NestJS   |
|                                                                       |
| \* attaches to req.user.                                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtStrategy extends PassportStrategy(Strategy, \'jwt\')  |
| {                                                                     |
|                                                                       |
| constructor(private readonly config: ConfigService) {                 |
|                                                                       |
| super({                                                               |
|                                                                       |
| jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),             |
|                                                                       |
| ignoreExpiration: false,                                              |
|                                                                       |
| // RS256: use the public key from auth-service.                       |
|                                                                       |
| // The private key never leaves auth-service.                         |
|                                                                       |
| secretOrKey: config.get\<string\>(\'offer.auth.jwtPublicKey\')!,      |
|                                                                       |
| algorithms: \[\'RS256\'\],                                            |
|                                                                       |
| // Enforce issuer claim --- rejects JWTs from other services.         |
|                                                                       |
| issuer: config.get\<string\>(\'offer.auth.expectedIssuer\')!,         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* validate() is called by Passport after the JWT signature is        |
| verified.                                                             |
|                                                                       |
| \* Return value becomes req.user.                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* We validate that the role field contains an expected value.        |
|                                                                       |
| \* This prevents forged JWTs with invalid roles from reaching guards. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async validate(payload: Record\<string, unknown\>):                   |
| Promise\<AuthenticatedUser\> {                                        |
|                                                                       |
| const { sub, role } = payload;                                        |
|                                                                       |
| if (typeof sub !== \'string\' \|\| !sub) {                            |
|                                                                       |
| throw new UnauthorizedException(\'JWT payload missing sub field.\');  |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (role !== \'CLIENT\' && role !== \'TALENT\') {                     |
|                                                                       |
| throw new UnauthorizedException(                                      |
|                                                                       |
| \`JWT payload contains unexpected role: \${String(role)}\`,           |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return { sub, role: role as \'CLIENT\' \| \'TALENT\' };               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Environment variables required:                                    |
|                                                                       |
| // JWT_PUBLIC_KEY=\<RSA public key in PEM format\>                    |
|                                                                       |
| // JWT_EXPECTED_ISSUER=marketeq-auth                                  |
|                                                                       |
| // In offer.config.ts:                                                |
|                                                                       |
| // auth: {                                                            |
|                                                                       |
| // jwtPublicKey: process.env.JWT_PUBLIC_KEY!,                         |
|                                                                       |
| // expectedIssuer: process.env.JWT_EXPECTED_ISSUER ??                 |
| \'marketeq-auth\',                                                    |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 JwtAuthGuard --- jwt-auth.guard.ts**                         |
|                                                                       |
| Global guard that protects every endpoint except \@Public()           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/auth/guards/jwt-auth.guard.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Injectable, ExecutionContext, UnauthorizedException                   |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { AuthGuard } from \'@nestjs/passport\';                       |
|                                                                       |
| import { Reflector } from \'@nestjs/core\';                           |
|                                                                       |
| import { IS_PUBLIC_KEY } from \'../decorators/public.decorator\';     |
|                                                                       |
| import { Observable } from \'rxjs\';                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* JwtAuthGuard --- Applied globally in AppModule.                    |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* How it works:                                                      |
|                                                                       |
| \* 1. Checks if the route is marked \@Public().                       |
|                                                                       |
| \* If yes: skips auth entirely (used for /health, /ready).            |
|                                                                       |
| \* 2. Calls passport-jwt to validate the Authorization: Bearer token. |
|                                                                       |
| \* 3. On success: attaches the decoded user to req.user.              |
|                                                                       |
| \* 4. On failure: throws UnauthorizedException (HTTP 401).            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Apply globally in AppModule:                                       |
|                                                                       |
| \* { provide: APP_GUARD, useClass: JwtAuthGuard }                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtAuthGuard extends AuthGuard(\'jwt\') {                |
|                                                                       |
| constructor(private readonly reflector: Reflector) {                  |
|                                                                       |
| super();                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| canActivate(context: ExecutionContext): boolean \| Promise\<boolean\> |
| \| Observable\<boolean\> {                                            |
|                                                                       |
| // Check if the route is marked as \@Public().                        |
|                                                                       |
| const isPublic =                                                      |
| this.reflector.getAllAndOverride\<boolean\>(IS_PUBLIC_KEY, \[         |
|                                                                       |
| context.getHandler(),                                                 |
|                                                                       |
| context.getClass(),                                                   |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| if (isPublic) return true; // Skip JWT validation for public routes.  |
|                                                                       |
| return super.canActivate(context);                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| handleRequest\<T = unknown\>(err: unknown, user: T): T {              |
|                                                                       |
| if (err \|\| !user) {                                                 |
|                                                                       |
| throw new UnauthorizedException(                                      |
|                                                                       |
| \'Invalid or missing authentication token. Provide a valid JWT in the |
| Authorization: Bearer header.\',                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| return user;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Register in AppModule as a global guard:                           |
|                                                                       |
| // import { APP_GUARD } from \'@nestjs/core\';                        |
|                                                                       |
| // \@Module({                                                         |
|                                                                       |
| // providers: \[                                                      |
|                                                                       |
| // { provide: APP_GUARD, useClass: JwtAuthGuard },                    |
|                                                                       |
| // \],                                                                |
|                                                                       |
| // })                                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 \@Public() Decorator --- public.decorator.ts**               |
|                                                                       |
| Marks endpoints that skip JWT validation                              |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/auth/decorators/public.decorator.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { SetMetadata } from \'@nestjs/common\';                       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* IS_PUBLIC_KEY is the metadata key checked by JwtAuthGuard.         |
|                                                                       |
| \* Any route decorated with \@Public() is exempt from JWT validation. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const IS_PUBLIC_KEY = \'isPublic\';                            |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* \@Public() decorator.                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Apply to any route or controller that should be publicly           |
| accessible                                                            |
|                                                                       |
| \* without a JWT token.                                               |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Only use on:                                                       |
|                                                                       |
| \* - GET /health (liveness probe)                                     |
|                                                                       |
| \* - GET /ready (readiness probe)                                     |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* NEVER apply \@Public() to any offer operation endpoint.            |
|                                                                       |
| \* Every offer endpoint must validate the JWT.                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@example                                                          |
|                                                                       |
| \* \@Get(\'health\')                                                  |
|                                                                       |
| \* \@Public()                                                         |
|                                                                       |
| \* health() { return { status: \"ok\" }; }                            |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const Public = () =\> SetMetadata(IS_PUBLIC_KEY, true);        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 OfferPartyGuard --- offer-party.guard.ts**                   |
|                                                                       |
| Enforces that the requester is a party to the offer                   |
+-----------------------------------------------------------------------+

OfferPartyGuard is the second guard in the stack. It loads the offer
from the database and verifies that the authenticated user
(req.user.sub) is either the client or the talent on that offer. It also
attaches the offer to the request so that downstream guards
(OfferActionGuard) and service methods can use it without a second DB
query.

+-----------------------------------------------------------------------+
| Guard execution order for offer endpoints:                            |
|                                                                       |
| 1\. JwtAuthGuard (global): validates JWT, attaches req.user           |
|                                                                       |
| 2\. OfferPartyGuard: loads offer, checks user is a party, attaches    |
| req.offer                                                             |
|                                                                       |
| 3\. OfferActionGuard: checks role + offer status for the specific     |
| action                                                                |
|                                                                       |
| 4\. Controller handler: calls service method                          |
|                                                                       |
| If any guard throws, the request never reaches the handler.           |
|                                                                       |
| Guards run in the order they are listed in \@UseGuards().             |
|                                                                       |
| Example: \@UseGuards(OfferPartyGuard, OfferActionGuard)               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/offers/guards/offer-party.guard.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| Injectable, CanActivate, ExecutionContext,                            |
|                                                                       |
| ForbiddenException, NotFoundException, BadRequestException,           |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { Offer } from \'../entities/offer.entity\';                   |
|                                                                       |
| import { AuthenticatedUser } from                                     |
| \'../../auth/types/authenticated-user.interface\';                    |
|                                                                       |
| import type { Request } from \'express\';                             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferPartyGuard --- Second guard in the stack for all offer        |
| endpoints.                                                            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* 1. Extracts the offer ID from req.params.id.                       |
|                                                                       |
| \* 2. Loads the offer from the database.                              |
|                                                                       |
| \* 3. Verifies the authenticated user is the client or talent on this |
| offer.                                                                |
|                                                                       |
| \* 4. Attaches the offer to req.offer so downstream guards and        |
| service                                                               |
|                                                                       |
| \* methods can use it without a second query.                         |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Apply on every offer endpoint:                                     |
|                                                                       |
| \* \@UseGuards(OfferPartyGuard) // or \@UseGuards(OfferPartyGuard,    |
| OfferActionGuard)                                                     |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OfferPartyGuard implements CanActivate {                 |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Offer)                                             |
|                                                                       |
| private readonly offerRepo: Repository\<Offer\>,                      |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async canActivate(context: ExecutionContext): Promise\<boolean\> {    |
|                                                                       |
| const req = context.switchToHttp().getRequest\<Request & { offer?:    |
| Offer }\>();                                                          |
|                                                                       |
| const user = req.user as AuthenticatedUser;                           |
|                                                                       |
| // Extract the offer ID from the route parameter.                     |
|                                                                       |
| // All offer routes use :id for the offer ID.                         |
|                                                                       |
| // Counter offer routes use :offerId for the parent offer ID.         |
|                                                                       |
| const offerId = req.params.id ?? req.params.offerId;                  |
|                                                                       |
| if (!offerId) {                                                       |
|                                                                       |
| throw new BadRequestException(\'Offer ID is required in the route     |
| parameter.\');                                                        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Load the offer with minimal fields (no joins needed for the        |
| guard).                                                               |
|                                                                       |
| const offer = await this.offerRepo.findOne({                          |
|                                                                       |
| where: { id: offerId },                                               |
|                                                                       |
| select: \[\'id\', \'clientId\', \'talentId\', \'status\'\],           |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!offer) {                                                         |
|                                                                       |
| throw new NotFoundException(\`Offer \${offerId} not found.\`);        |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Verify the requester is a party to this offer.                     |
|                                                                       |
| if (offer.clientId !== user.sub && offer.talentId !== user.sub) {     |
|                                                                       |
| throw new ForbiddenException(                                         |
|                                                                       |
| \'You are not a party to this offer. Access denied.\',                |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Attach the offer to the request for downstream guards and          |
| handlers.                                                             |
|                                                                       |
| // This avoids a second DB query in the service method.               |
|                                                                       |
| req.offer = offer;                                                    |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Extend the Express Request type to include req.offer:              |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // In apps/offer-service/src/types/express.d.ts (create this file):   |
|                                                                       |
| // import { Offer } from \'../offers/entities/offer.entity\';         |
|                                                                       |
| // declare module \'express\' {                                       |
|                                                                       |
| // interface Request {                                                |
|                                                                       |
| // offer?: Offer;                                                     |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // }                                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Counter offer routes: use :offerId for OfferPartyGuard:            |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // \@Post(\':offerId/counter-offers\')                                |
|                                                                       |
| // \@UseGuards(OfferPartyGuard)                                       |
|                                                                       |
| // async createCO(@Param(\"offerId\") offerId: string, \@Req() req) { |
|                                                                       |
| // // req.offer is the parent offer, loaded by OfferPartyGuard        |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 (Reference) Role-Action Matrix**                             |
|                                                                       |
| Every endpoint × every role                                           |
+-----------------------------------------------------------------------+

Y = allowed. N = denied (403). Party = allowed only if requester is the
specific party (client or talent). SYSTEM = internal cron job with no
HTTP request.

  ---------------------------------- ------------ ------------ ------------ ------------------------------------------
  **Endpoint / Action**              **CLIENT**   **TALENT**   **SYSTEM**   **Notes**

  POST /v1/offers (create)           **YES**      **NO**       **NO**       CLIENT is the sender. talentId must be the
                                                                            other party.

  GET /v1/offers/:id                 **YES**      **YES**      **NO**       Both parties can view. OfferPartyGuard
                                                                            enforces this.

  PATCH /v1/offers/:id (edit)        **YES**      **NO**       **NO**       Only CLIENT can edit. Offer must be
                                                                            PENDING.

  POST \.../accept                   **NO**       **YES**      **NO**       Only TALENT accepts the primary offer.
                                                                            Must be PENDING (not COUNTERED).

  POST \.../decline                  **NO**       **YES**      **NO**       Only TALENT declines. Must be PENDING (not
                                                                            COUNTERED).

  POST \.../withdraw                 **YES**      **NO**       **NO**       Only CLIENT withdraws. Works on PENDING or
                                                                            COUNTERED offer.

  POST \.../resend                   **YES**      **NO**       **NO**       Only CLIENT resends a terminal offer.

  GET \.../history                   **YES**      **YES**      **NO**       Both parties can view the full negotiation
                                                                            history.

  GET \.../ably-token                **YES**      **YES**      **NO**       Both parties can subscribe to real-time
                                                                            updates for their offer.

  POST \.../counter-offers (create   **YES**      **YES**      **NO**       Either party can submit a counter offer.
  CO)                                                                       Role tracked in submittedBy field.

  PATCH \.../counter-offers/:id      **YES**      **YES**      **NO**       Only the SUBMITTER of the CO can edit it.
  (edit CO)                                                                 OfferStateMachine.assertIsSubmitter()
                                                                            enforces this.

  POST                               **YES**      **YES**      **NO**       Only the NON-SUBMITTER can accept.
  \.../counter-offers/:id/accept                                            OfferStateMachine.assertIsNonSubmitter()
                                                                            enforces this.

  POST                               **YES**      **YES**      **NO**       Only the NON-SUBMITTER can decline.
  \.../counter-offers/:id/decline                                           

  POST                               **YES**      **YES**      **NO**       Only the SUBMITTER can withdraw their own
  \.../counter-offers/:id/withdraw                                          CO.

  GET /health                        **YES**      **YES**      **YES**      \@Public() --- no JWT required.

  GET /ready                         **YES**      **YES**      **YES**      \@Public() --- no JWT required.

  Offer expiry (cron)                **NO**       **NO**       **YES**      ExpiryProcessor only. No HTTP endpoint.
                                                                            SYSTEM actor.

  Warning send (cron)                **NO**       **NO**       **YES**      WarningProcessor only. No HTTP endpoint.

  Outbox publish (cron)              **NO**       **NO**       **YES**      OutboxProcessor only. No HTTP endpoint.
  ---------------------------------- ------------ ------------ ------------ ------------------------------------------

+-----------------------------------------------------------------------+
| The submitter/non-submitter distinction for counter offer actions:    |
|                                                                       |
| When TALENT submits a CO: CLIENT is the non-submitter and can         |
| accept/decline.                                                       |
|                                                                       |
| TALENT is the submitter and can only withdraw or edit their own CO.   |
|                                                                       |
| When CLIENT submits a CO: TALENT is the non-submitter and can         |
| accept/decline.                                                       |
|                                                                       |
| CLIENT is the submitter and can only withdraw or edit their own CO.   |
|                                                                       |
| This is enforced in the service layer by                              |
| OfferStateMachine.assertIsNonSubmitter()                              |
|                                                                       |
| and OfferStateMachine.assertIsSubmitter(), NOT by the role field      |
| alone.                                                                |
|                                                                       |
| A CLIENT cannot accept a CO that they themselves submitted.           |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 8 (Reference) PII Field Registry**                             |
|                                                                       |
| Every field that contains personal data, where it is stored, and how  |
| it is handled                                                         |
+-----------------------------------------------------------------------+

PII in offer-service is limited because the service deliberately avoids
storing user profile data. It only stores the UUIDs that link to user
records in user-service. However, some free-text fields can contain
personal information written by users.

  -------------------- ------------------------ -------------- ------------- ------------- --------------- -----------
  **Entity**           **Field**                **Category**   **Stored?**   **Logged?**   **Masked?**     **Notes**

  **offers**           **client_id**            Pseudonymous   **YES**       **NO**        **N/A**         
                                                ID                                                         

  **offers**           **talent_id**            Pseudonymous   **YES**       **NO**        **N/A**         
                                                ID                                                         

  **offers**           **contract_title**       User content   **YES**       **NO**        **N/A**         

  **offers**           **message**              User content   **YES**       **NO**        **N/A**         

  **offers**           **declined_reason**      Sensitive      **YES**       **NO**        **YES**         
                                                content                                                    

  **offers**           **withdrawal_message**   User content   **YES**       **NO**        **N/A**         

  **counter_offers**   **message**              User content   **YES**       **NO**        **N/A**         

  **offer_history**    **actor_id**             Pseudonymous   **YES**       **NO**        **N/A**         
                                                ID                                                         

  **outbox**           **payload**              Event payload  **YES**       **NO**        **N/A**         

  **logs**             **userId                 Pseudonymous   **NO (log     **YES**       **N/A**         
                       (req.user.sub)**         ID             only)**                                     

  **logs**             **Authorization header** JWT (signed)   **NO**        **NO**        **YES**         

  **logs**             **idempotencyKey**       Request        **NO (prefix  **YES**       **Truncated**   
                                                metadata       only)**                                     
  -------------------- ------------------------ -------------- ------------- ------------- --------------- -----------

+-----------------------------------------------------------------------+
| PII handling rules:                                                   |
|                                                                       |
| clientId and talentId are pseudonymous identifiers (UUIDs, not names  |
| or emails).                                                           |
|                                                                       |
| They link to user-service records but do not contain profile data.    |
|                                                                       |
| They are stored in the DB (required for all lookups) but never logged |
| in request logs.                                                      |
|                                                                       |
| declined_reason: This field is intentionally masked in all log        |
| output.                                                               |
|                                                                       |
| Reasons can contain personal statements from the talent (e.g.         |
| \"salary too low                                                      |
|                                                                       |
| for my family commitments\"). This field is stored in the DB for the  |
| client to see                                                         |
|                                                                       |
| in the offer details modal, but never appears in log output.          |
|                                                                       |
| The SENSITIVE_KEYS set in OS-35 includes \"declinedReason\" and       |
| \"declined_reason\".                                                  |
|                                                                       |
| Free-text user content (message, contractTitle, withdrawalMessage):   |
|                                                                       |
| Stored in DB. Never logged in standard log output.                    |
|                                                                       |
| The request body is never logged (OS-35 RequestLoggerInterceptor).    |
|                                                                       |
| Data retention: Offer records are retained indefinitely unless        |
|                                                                       |
| a GDPR right-to-erasure request is processed (see Step 9).            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 9 Account Deletion Handler --- user-deletion.handler.ts**      |
|                                                                       |
| What happens when a user deletes their Marketeq account               |
+-----------------------------------------------------------------------+

When a user deletes their account, offer-service receives a
user.account_deleted RabbitMQ event from user-service. The handler must:
terminate any active offers where the deleted user is a party, and
pseudonymize the userId in historical records so the records remain
coherent for the other party.

  --------------------- -------------------------------------------------
  **Active offers       Withdrawn immediately with
  (PENDING or           withdrawalMessage=null. The other party receives
  COUNTERED)**          the offer.withdrawn event via RabbitMQ. Reason:
                        the offer cannot be acted on if one party no
                        longer exists.

  **Pending counter     Withdrawn in the same transaction as the parent
  offers**              offer. COs cannot exist without an actionable
                        party.

  **Historical records  Preserved. The offerId, terms, and timestamps
  (terminal states)**   remain. The userId fields are pseudonymized to a
                        sentinel value (DELETED_USER_SENTINEL) so queries
                        on clientId or talentId do not resolve to a
                        deleted user.

  **Outbox events**     Any queued events for the deleted user\'s offers
                        are published before deletion. Events already in
                        the outbox are not deleted --- they reference
                        offerId, not userId.

  **Pseudonymization    A fixed UUID used in place of the deleted userId:
  sentinel**            \"00000000-0000-0000-0000-000000000000\". Queries
                        on this UUID return no user-service record,
                        making it clear the account was deleted.
  --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| Data retention for the other party:                                   |
|                                                                       |
| If CLIENT A sent an offer to TALENT X and TALENT X deletes their      |
| account:                                                              |
|                                                                       |
| CLIENT A can still see the offer history (the negotiation took        |
| place).                                                               |
|                                                                       |
| TALENT X\'s talentId in the offer record is replaced with the         |
| sentinel UUID.                                                        |
|                                                                       |
| The offer status shows the final state at time of account deletion.   |
|                                                                       |
| This is consistent with the principle of minimum data retention:      |
|                                                                       |
| the business record (that an offer was made and what terms) is        |
| preserved,                                                            |
|                                                                       |
| but the link to the deleted user\'s profile is severed.               |
|                                                                       |
| contractTitle and message fields: these are user-generated content.   |
|                                                                       |
| Per GDPR Article 17 (right to erasure), these should be cleared if    |
| the                                                                   |
|                                                                       |
| deleted user submitted them. Consult legal counsel on the correct     |
| approach.                                                             |
|                                                                       |
| The handler below clears message fields submitted by the deleted      |
| user.                                                                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/users/user-deletion.handler.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { OutboxService } from \'../outbox/outbox.service\';           |
|                                                                       |
| import { OFFER_EXCHANGE } from                                        |
| \'../messaging/constants/rabbitmq.constants\';                        |
|                                                                       |
| import { OFFER_EVENTS } from \'../messaging/events/offer-events\';    |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Sentinel UUID placed in userId fields after account deletion.      |
|                                                                       |
| \* Queries on this UUID will not resolve in user-service.             |
|                                                                       |
| \* It is recognisable as a deleted account marker.                    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export const DELETED_USER_SENTINEL =                                  |
| \'00000000-0000-0000-0000-000000000000\';                             |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* UserDeletionHandler --- Processes the user.account_deleted         |
| RabbitMQ event.                                                       |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Called by the messaging consumer when user-service publishes       |
|                                                                       |
| \* a user.account_deleted event.                                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All operations run in a single database transaction to ensure      |
|                                                                       |
| \* atomicity: either the full deletion is processed or none of it is. |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class UserDeletionHandler {                                    |
|                                                                       |
| private readonly logger = new Logger(UserDeletionHandler.name);       |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| private readonly dataSource: DataSource,                              |
|                                                                       |
| private readonly outboxService: OutboxService,                        |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* handle(deletedUserId)                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Processes account deletion for a single user.                      |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Steps:                                                             |
|                                                                       |
| \* 1. Withdraw all PENDING/COUNTERED offers where user is the client. |
|                                                                       |
| \* 2. Withdraw all PENDING/COUNTERED offers where user is the talent. |
|                                                                       |
| \* (Offer is withdrawn on behalf of the other party.)                 |
|                                                                       |
| \* 3. Withdraw any PENDING counter offers submitted by the deleted    |
| user.                                                                 |
|                                                                       |
| \* 4. Pseudonymize the userId in all offer records.                   |
|                                                                       |
| \* 5. Write withdrawal outbox events for all withdrawn offers.        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* \@param deletedUserId The UUID of the account being deleted.       |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| async handle(deletedUserId: string): Promise\<void\> {                |
|                                                                       |
| this.logger.log(\`Processing account deletion for user                |
| \${deletedUserId}\`);                                                 |
|                                                                       |
| await this.dataSource.transaction(async (em) =\> {                    |
|                                                                       |
| // \-\-\-- Step 1: Withdraw all active offers (PENDING or COUNTERED)  |
| \-\-\--                                                               |
|                                                                       |
| // where the deleted user is the CLIENT.                              |
|                                                                       |
| const clientOffers: { id: string }\[\] = await em.query(\`            |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'WITHDRAWN\',                                           |
|                                                                       |
| withdrawn_at = NOW(),                                                 |
|                                                                       |
| withdrawal_message = NULL                                             |
|                                                                       |
| WHERE client_id = \$1 AND status IN (\'PENDING\', \'COUNTERED\')      |
|                                                                       |
| RETURNING id                                                          |
|                                                                       |
| \`, \[deletedUserId\]);                                               |
|                                                                       |
| // \-\-\-- Step 2: Withdraw all active offers where user is the       |
| TALENT \-\-\--                                                        |
|                                                                       |
| const talentOffers: { id: string }\[\] = await em.query(\`            |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET status = \'WITHDRAWN\',                                           |
|                                                                       |
| withdrawn_at = NOW(),                                                 |
|                                                                       |
| withdrawal_message = NULL                                             |
|                                                                       |
| WHERE talent_id = \$1 AND status IN (\'PENDING\', \'COUNTERED\')      |
|                                                                       |
| RETURNING id                                                          |
|                                                                       |
| \`, \[deletedUserId\]);                                               |
|                                                                       |
| const allWithdrawnIds = \[                                            |
|                                                                       |
| \...clientOffers.map(r =\> r.id),                                     |
|                                                                       |
| \...talentOffers.map(r =\> r.id),                                     |
|                                                                       |
| \];                                                                   |
|                                                                       |
| // \-\-\-- Step 3: Withdraw any PENDING COs submitted by the deleted  |
| user \-\-\--                                                          |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET status = \'WITHDRAWN\',                                           |
|                                                                       |
| withdrawn_at = NOW()                                                  |
|                                                                       |
| WHERE submitted_by_id = \$1 AND status = \'PENDING\'                  |
|                                                                       |
| \`, \[deletedUserId\]);                                               |
|                                                                       |
| // \-\-\-- Step 4: Pseudonymize userId in ALL offer records \-\-\--   |
|                                                                       |
| // (both active and historical)                                       |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE offer_service.offers                                           |
|                                                                       |
| SET client_id = CASE WHEN client_id = \$1 THEN \$2 ELSE client_id     |
| END,                                                                  |
|                                                                       |
| talent_id = CASE WHEN talent_id = \$1 THEN \$2 ELSE talent_id END,    |
|                                                                       |
| \-- Clear message fields submitted by the deleted user.               |
|                                                                       |
| \-- For offers where the deleted user is the client: clear message.   |
|                                                                       |
| message = CASE WHEN client_id = \$1 THEN NULL ELSE message END        |
|                                                                       |
| WHERE client_id = \$1 OR talent_id = \$1                              |
|                                                                       |
| \`, \[deletedUserId, DELETED_USER_SENTINEL\]);                        |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE offer_service.counter_offers                                   |
|                                                                       |
| SET submitted_by_id = \$2,                                            |
|                                                                       |
| message = CASE WHEN submitted_by_id = \$1 THEN NULL ELSE message END  |
|                                                                       |
| WHERE submitted_by_id = \$1                                           |
|                                                                       |
| \`, \[deletedUserId, DELETED_USER_SENTINEL\]);                        |
|                                                                       |
| await em.query(\`                                                     |
|                                                                       |
| UPDATE offer_service.offer_history                                    |
|                                                                       |
| SET actor_id = \$2                                                    |
|                                                                       |
| WHERE actor_id = \$1                                                  |
|                                                                       |
| \`, \[deletedUserId, DELETED_USER_SENTINEL\]);                        |
|                                                                       |
| // \-\-\-- Step 5: Write outbox events for withdrawn offers \-\-\--   |
|                                                                       |
| for (const offerId of allWithdrawnIds) {                              |
|                                                                       |
| await this.outboxService.create(em, {                                 |
|                                                                       |
| aggregateId: offerId,                                                 |
|                                                                       |
| eventType: OFFER_EVENTS.WITHDRAWN,                                    |
|                                                                       |
| routingKey: OFFER_EVENTS.WITHDRAWN,                                   |
|                                                                       |
| exchange: OFFER_EXCHANGE,                                             |
|                                                                       |
| payload: {                                                            |
|                                                                       |
| offerId,                                                              |
|                                                                       |
| reason: \'ACCOUNT_DELETED\',                                          |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| this.logger.log(                                                      |
|                                                                       |
| \`Account deletion complete: user=\${deletedUserId} \` +              |
|                                                                       |
| \`withdrawn=\${allWithdrawnIds.length} offers\`,                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Wiring: consume user.account_deleted from RabbitMQ                 |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // In the messaging consumer module (src/messaging/consumers/),       |
|                                                                       |
| // subscribe to the user.account_deleted routing key:                 |
|                                                                       |
| //                                                                    |
|                                                                       |
| // \@RabbitSubscribe({                                                |
|                                                                       |
| // exchange: \'marketeq.users\',                                      |
|                                                                       |
| // routingKey: \'user.account_deleted\',                              |
|                                                                       |
| // queue: \'offer-service.user-deleted\',                             |
|                                                                       |
| // })                                                                 |
|                                                                       |
| // async onUserDeleted(msg: { userId: string }) {                     |
|                                                                       |
| // await this.userDeletionHandler.handle(msg.userId);                 |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+
