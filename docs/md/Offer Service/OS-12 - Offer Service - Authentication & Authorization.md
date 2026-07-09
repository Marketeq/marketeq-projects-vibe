**OS-12**

**Offer Service --- Authentication & Authorization**

**Auth scheme:** JWT (RS256) **Issued by:** auth-service **Guards:**
JwtAuthGuard → RolesGuard → OfferPartyGuard (applied in order)

offer-service never issues, refreshes, or stores tokens. All
authentication is stateless --- the JWT is validated on every request
using the RS256 public key from auth-service. Role and identity are
extracted from the verified token payload. No role or identity
information is ever trusted from the request body or query string.

+-----------------------------------------------------------------------+
| **1 JWT Validation Flow**                                             |
|                                                                       |
| Step-by-step flow from request arrival to guard execution             |
+-----------------------------------------------------------------------+

  ---------- --------------------- -------------------------------------------------
  **Step**   **Component**         **What Happens**

  **1**      **HTTP Request**      Request arrives at offer-service. Authorization
                                   header is checked for presence. If missing: 401
                                   returned immediately before reaching any guard.

  **2**      **JwtAuthGuard**      Extracts the Bearer token from Authorization
                                   header. Passes token to JwtStrategy for
                                   validation.

  **3**      **JwtStrategy**       Verifies JWT signature using JWT_PUBLIC_KEY (RSA
                                   public key from auth-service). Verifies token is
                                   not expired (exp claim). Verifies issuer (iss
                                   claim) matches auth-service. Verifies audience
                                   (aud claim) includes offer-service.

  **4**      **Token decode**      Decodes the verified payload. Extracts: sub
                                   (userId), role (CLIENT \| TALENT \| ADMIN),
                                   email, iat, exp.

  **5**      **Request             Attaches decoded payload to request.user: {
             enrichment**          userId, role, email }. Available to all guards
                                   and controllers downstream.

  **6**      **RolesGuard**        If \@Roles() decorator is present on the
                                   endpoint: checks request.user.role against the
                                   allowed roles. If role not permitted: 403
                                   returned.

  **7**      **OfferPartyGuard**   If \@OfferParty() decorator is present: loads the
                                   offer by :id path param. Verifies
                                   request.user.userId === offer.clientId OR
                                   offer.talentId. If not a party: 403 returned.

  **8**      **Controller**        Request reaches the controller method with
                                   request.user fully populated and verified.
  ---------- --------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| **2 JWT Payload Structure**                                           |
|                                                                       |
| Claims extracted from every verified token                            |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // Decoded JWT payload --- issued by auth-service                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"sub\": \"uuid\", // userId --- primary identity claim               |
|                                                                       |
| \"role\": \"CLIENT\", // Platform role: CLIENT \| TALENT \| ADMIN     |
|                                                                       |
| \"email\": \"user@example.com\",                                      |
|                                                                       |
| \"iss\": \"marketeq-auth\", // Issuer --- must match expected value   |
|                                                                       |
| \"aud\": \[\"marketeq-api\"\], // Audience                            |
|                                                                       |
| \"iat\": 1706601600, // Issued at (Unix timestamp)                    |
|                                                                       |
| \"exp\": 1706688000 // Expires at (Unix timestamp)                    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

The role claim is always read from the verified JWT. It is never
accepted from the request body, query string, or any header other than
Authorization. If the role claim is missing from the token, the request
is rejected with 403.

+-----------------------------------------------------------------------+
| **3 Guard Implementations**                                           |
|                                                                       |
| Full code for all three guards used by offer-service                  |
+-----------------------------------------------------------------------+

**JwtAuthGuard**

Wraps NestJS Passport JWT strategy. Applied globally via APP_GUARD ---
all endpoints require authentication unless \@Public() decorator is
present.

+-----------------------------------------------------------------------+
| // apps/offer-service/src/guards/jwt-auth.guard.ts                    |
|                                                                       |
| import { ExecutionContext, Injectable, UnauthorizedException } from   |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { Reflector } from \'@nestjs/core\';                           |
|                                                                       |
| import { AuthGuard } from \'@nestjs/passport\';                       |
|                                                                       |
| import { IS_PUBLIC_KEY } from                                         |
| \'../common/decorators/public.decorator\';                            |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtAuthGuard extends AuthGuard(\'jwt\') {                |
|                                                                       |
| constructor(private reflector: Reflector) {                           |
|                                                                       |
| super();                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| canActivate(context: ExecutionContext) {                              |
|                                                                       |
| // Allow \@Public() endpoints to bypass JWT validation                |
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
| if (isPublic) return true;                                            |
|                                                                       |
| return super.canActivate(context);                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| handleRequest(err: Error, user: any) {                                |
|                                                                       |
| if (err \|\| !user) {                                                 |
|                                                                       |
| throw new UnauthorizedException({                                     |
|                                                                       |
| statusCode: 401,                                                      |
|                                                                       |
| error: \'UNAUTHORIZED\',                                              |
|                                                                       |
| message: \'Please sign in to continue.\',                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return user;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**RolesGuard**

Checks the role claim from the verified JWT against roles declared via
\@Roles() on the endpoint. Applied after JwtAuthGuard.

+-----------------------------------------------------------------------+
| // apps/offer-service/src/guards/roles.guard.ts                       |
|                                                                       |
| import { Injectable, CanActivate, ExecutionContext,                   |
| ForbiddenException } from \'@nestjs/common\';                         |
|                                                                       |
| import { Reflector } from \'@nestjs/core\';                           |
|                                                                       |
| import { ROLES_KEY } from \'../common/decorators/roles.decorator\';   |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class RolesGuard implements CanActivate {                      |
|                                                                       |
| constructor(private reflector: Reflector) {}                          |
|                                                                       |
| canActivate(context: ExecutionContext): boolean {                     |
|                                                                       |
| const requiredRoles =                                                 |
| this.reflector.getAllAndOverride\<string\[\]\>(ROLES_KEY, \[          |
|                                                                       |
| context.getHandler(),                                                 |
|                                                                       |
| context.getClass(),                                                   |
|                                                                       |
| \]);                                                                  |
|                                                                       |
| // No \@Roles() decorator --- all authenticated roles permitted       |
|                                                                       |
| if (!requiredRoles \|\| requiredRoles.length === 0) return true;      |
|                                                                       |
| const { user } = context.switchToHttp().getRequest();                 |
|                                                                       |
| if (!user?.role) {                                                    |
|                                                                       |
| throw new ForbiddenException({                                        |
|                                                                       |
| statusCode: 403,                                                      |
|                                                                       |
| error: \'FORBIDDEN_FOR_ROLE\',                                        |
|                                                                       |
| message: \'You don\\\'t have permission to do that.\',                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| const hasRole = requiredRoles.includes(user.role);                    |
|                                                                       |
| if (!hasRole) {                                                       |
|                                                                       |
| throw new ForbiddenException({                                        |
|                                                                       |
| statusCode: 403,                                                      |
|                                                                       |
| error: \'FORBIDDEN_FOR_ROLE\',                                        |
|                                                                       |
| message: \'You don\\\'t have permission to do that.\',                |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**OfferPartyGuard**

Verifies that the requesting user is either the clientId or the talentId
on the offer being accessed. Applied on endpoints that require party
membership. Loads the offer from the database using the :id path param.
Returns the same 403 for \"not found\" and \"not a party\" to prevent
enumeration.

+-----------------------------------------------------------------------+
| // apps/offer-service/src/guards/offer-party.guard.ts                 |
|                                                                       |
| import { Injectable, CanActivate, ExecutionContext,                   |
| ForbiddenException } from \'@nestjs/common\';                         |
|                                                                       |
| import { OffersRepository } from \'../offers/offers.repository\';     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class OfferPartyGuard implements CanActivate {                 |
|                                                                       |
| constructor(private readonly offersRepository: OffersRepository) {}   |
|                                                                       |
| async canActivate(context: ExecutionContext): Promise\<boolean\> {    |
|                                                                       |
| const request = context.switchToHttp().getRequest();                  |
|                                                                       |
| const { userId } = request.user;                                      |
|                                                                       |
| // Support both /v1/offers/:id and                                    |
| /v1/offers/:offerId/counter-offers/:id                                |
|                                                                       |
| const offerId = request.params.offerId ?? request.params.id;          |
|                                                                       |
| const offer = await this.offersRepository.findById(offerId);          |
|                                                                       |
| // Same 403 for not found and not a party --- prevents enumeration    |
|                                                                       |
| if (!offer \|\| (offer.clientId !== userId && offer.talentId !==      |
| userId)) {                                                            |
|                                                                       |
| throw new ForbiddenException({                                        |
|                                                                       |
| statusCode: 403,                                                      |
|                                                                       |
| error: \'OFFER_ACCESS_DENIED\',                                       |
|                                                                       |
| message: \'You don\\\'t have access to this offer.\',                 |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Attach offer to request for downstream use --- avoids second DB    |
| load                                                                  |
|                                                                       |
| request.offer = offer;                                                |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **4 Auth Decorators**                                                 |
|                                                                       |
| Custom decorators used alongside guards                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // apps/offer-service/src/common/decorators/public.decorator.ts       |
|                                                                       |
| // Marks an endpoint as publicly accessible --- bypasses JwtAuthGuard |
|                                                                       |
| import { SetMetadata } from \'@nestjs/common\';                       |
|                                                                       |
| export const IS_PUBLIC_KEY = \'isPublic\';                            |
|                                                                       |
| export const Public = () =\> SetMetadata(IS_PUBLIC_KEY, true);        |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| // \@Public()                                                         |
|                                                                       |
| // \@Get(\'health\')                                                  |
|                                                                       |
| // healthCheck() { \... }                                             |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // apps/offer-service/src/common/decorators/roles.decorator.ts        |
|                                                                       |
| // Declares which roles are permitted on an endpoint                  |
|                                                                       |
| import { SetMetadata } from \'@nestjs/common\';                       |
|                                                                       |
| export const ROLES_KEY = \'roles\';                                   |
|                                                                       |
| export const Roles = (\...roles: string\[\]) =\>                      |
| SetMetadata(ROLES_KEY, roles);                                        |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| // \@Roles(\'CLIENT\')                                                |
|                                                                       |
| // \@Post()                                                           |
|                                                                       |
| // createOffer(@Body() dto: CreateOfferDto) { \... }                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // apps/offer-service/src/common/decorators/current-user.decorator.ts |
|                                                                       |
| // Extracts the verified user from request inside controller methods  |
|                                                                       |
| import { createParamDecorator, ExecutionContext } from                |
| \'@nestjs/common\';                                                   |
|                                                                       |
| export const CurrentUser = createParamDecorator(                      |
|                                                                       |
| (\_: unknown, ctx: ExecutionContext) =\> {                            |
|                                                                       |
| const request = ctx.switchToHttp().getRequest();                      |
|                                                                       |
| return request.user; // { userId, role, email }                       |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| // createOffer(@CurrentUser() user: RequestUser, \@Body() dto:        |
| CreateOfferDto) { \... }                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| //                                                                    |
| apps/offer-service/src/common/decorators/current-offer.decorator.ts   |
|                                                                       |
| // Extracts the offer pre-loaded by OfferPartyGuard from request      |
|                                                                       |
| import { createParamDecorator, ExecutionContext } from                |
| \'@nestjs/common\';                                                   |
|                                                                       |
| export const CurrentOffer = createParamDecorator(                     |
|                                                                       |
| (\_: unknown, ctx: ExecutionContext) =\> {                            |
|                                                                       |
| const request = ctx.switchToHttp().getRequest();                      |
|                                                                       |
| return request.offer; // Pre-loaded by OfferPartyGuard --- no second  |
| DB call                                                               |
|                                                                       |
| },                                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| // Usage:                                                             |
|                                                                       |
| // acceptOffer(@CurrentOffer() offer: Offer, \@CurrentUser() user:    |
| RequestUser) { \... }                                                 |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **5 RBAC Matrix**                                                     |
|                                                                       |
| Every endpoint --- which roles are permitted and what additional      |
| guard applies                                                         |
+-----------------------------------------------------------------------+

Legend: ✅ Permitted ❌ Forbidden (403) 🔒 Permitted only if party to
the offer --- Not applicable

  ------------------------------------ ------------ ------------ ----------- -------------------
  **Endpoint / Action**                **CLIENT**   **TALENT**   **ADMIN**   **Additional
                                                                             Guard**

  **POST /v1/offers**                  **✅**       **❌**       **❌**      Must not be hiring
                                                                             themselves
                                                                             (clientId ≠
                                                                             talentId)

  **GET /v1/offers/:id**               **🔒**       **🔒**       **❌**      OfferPartyGuard ---
                                                                             must be clientId or
                                                                             talentId

  **PATCH /v1/offers/:id**             **🔒**       **❌**       **❌**      OfferPartyGuard +
                                                                             must be clientId +
                                                                             status = PENDING

  **POST /v1/offers/:id/accept**       **❌**       **🔒**       **❌**      OfferPartyGuard +
                                                                             must be talentId

  **POST /v1/offers/:id/decline**      **❌**       **🔒**       **❌**      OfferPartyGuard +
                                                                             must be talentId

  **POST /v1/offers/:id/withdraw**     **🔒**       **❌**       **❌**      OfferPartyGuard +
                                                                             must be clientId

  **POST /v1/offers/:id/resend**       **🔒**       **❌**       **❌**      OfferPartyGuard +
                                                                             must be clientId +
                                                                             terminal status

  **GET /v1/offers/:id/history**       **🔒**       **🔒**       **❌**      OfferPartyGuard ---
                                                                             must be clientId or
                                                                             talentId

  **POST \.../counter-offers**         **🔒**       **🔒**       **❌**      OfferPartyGuard.
                                                                             Direction (client
                                                                             vs talent) inferred
                                                                             from role.

  **GET \.../counter-offers/:id**      **🔒**       **🔒**       **❌**      OfferPartyGuard on
                                                                             parent offer

  **PATCH \.../counter-offers/:id**    **🔒**       **🔒**       **❌**      Must be
                                                                             submittedById on
                                                                             the counter offer

  **POST                               **🔒**       **🔒**       **❌**      Must NOT be
  \.../counter-offers/:id/accept**                                           submittedById
                                                                             (cannot accept own
                                                                             CO)

  **POST                               **🔒**       **🔒**       **❌**      Must NOT be
  \.../counter-offers/:id/decline**                                          submittedById

  **POST                               **🔒**       **🔒**       **❌**      Must be
  \.../counter-offers/:id/withdraw**                                         submittedById

  **GET /v1/health**                   **---**      **---**      **---**     \@Public() --- no
                                                                             auth required

  **GET /v1/ready**                    **---**      **---**      **---**     \@Public() --- no
                                                                             auth required
  ------------------------------------ ------------ ------------ ----------- -------------------

ADMIN role is explicitly denied on all offer endpoints. Admin read
access to offer data is handled through a separate internal admin API
not documented here. This prevents any admin account from accidentally
or maliciously performing offer actions on behalf of parties.

+-----------------------------------------------------------------------+
| **6 Counter Offer Submitter Check**                                   |
|                                                                       |
| Additional identity check on counter offer write operations           |
+-----------------------------------------------------------------------+

Several counter offer endpoints require checking not just party
membership but whether the requesting user is the submitter of the
counter offer. This check is performed inside the service layer (not as
a separate guard) after OfferPartyGuard has already confirmed party
membership.

  ------------------------------------ ------------------------------------------------
  **Endpoint**                         **Check**

  **PATCH \.../counter-offers/:id**    request.user.userId ===
                                       counterOffer.submittedById. Only the submitter
                                       can edit their own counter offer. Returns 403
                                       FORBIDDEN_FOR_ROLE if not the submitter.

  **POST                               request.user.userId ===
  \.../counter-offers/:id/withdraw**   counterOffer.submittedById. Only the submitter
                                       can withdraw their own counter offer.

  **POST                               request.user.userId !==
  \.../counter-offers/:id/accept**     counterOffer.submittedById. Cannot accept your
                                       own counter offer. Returns 403 if the requester
                                       is the submitter.

  **POST                               request.user.userId !==
  \.../counter-offers/:id/decline**    counterOffer.submittedById. Cannot decline your
                                       own counter offer.
  ------------------------------------ ------------------------------------------------

+-----------------------------------------------------------------------+
| **7 Service-to-Service Authentication**                               |
|                                                                       |
| How internal calls from other services are authenticated              |
+-----------------------------------------------------------------------+

When other platform services (e.g. contracts-service,
notification-service) need to call offer-service REST endpoints, they
authenticate using the shared X-Service-Key header. This is separate
from the user-facing JWT flow.

+-----------------------------------------------------------------------+
| // Service-to-service request header                                  |
|                                                                       |
| X-Service-Key: \<INTERNAL_SERVICE_API_KEY\>                           |
|                                                                       |
| // Validated by ServiceKeyGuard --- applied only to internal-only     |
| endpoints                                                             |
|                                                                       |
| // User-facing endpoints use JwtAuthGuard, not ServiceKeyGuard        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| // apps/offer-service/src/guards/service-key.guard.ts                 |
|                                                                       |
| import { Injectable, CanActivate, ExecutionContext,                   |
| UnauthorizedException } from \'@nestjs/common\';                      |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class ServiceKeyGuard implements CanActivate {                 |
|                                                                       |
| constructor(private configService: ConfigService) {}                  |
|                                                                       |
| canActivate(context: ExecutionContext): boolean {                     |
|                                                                       |
| const request = context.switchToHttp().getRequest();                  |
|                                                                       |
| const key = request.headers\[\'x-service-key\'\];                     |
|                                                                       |
| const expected = this.configService.get(\'offer.services.apiKey\');   |
|                                                                       |
| if (!key \|\| key !== expected) {                                     |
|                                                                       |
| throw new UnauthorizedException({                                     |
|                                                                       |
| statusCode: 401,                                                      |
|                                                                       |
| error: \'INVALID_SERVICE_KEY\',                                       |
|                                                                       |
| message: \'Unauthorized.\',                                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| return true;                                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **8 Token Expiry & Refresh Handling**                                 |
|                                                                       |
| How offer-service handles expired JWTs                                |
+-----------------------------------------------------------------------+

offer-service does not handle token refresh. It validates tokens and
returns 401 if the token is expired. The frontend is responsible for the
refresh flow.

  ---------------------- ------------------------------------------------
  **Scenario**           **What Happens**

  **Token missing**      JwtAuthGuard returns 401 UNAUTHORIZED
                         immediately.

  **Token invalid        JwtStrategy validation fails. JwtAuthGuard
  signature**            returns 401.

  **Token expired (exp   JwtStrategy validation fails. JwtAuthGuard
  claim in past)**       returns 401. Frontend intercepts 401, attempts
                         silent refresh via auth-service refresh
                         endpoint. If refresh succeeds: original request
                         retried transparently. If refresh fails: user
                         redirected to login.

  **Token valid but      JwtAuthGuard passes. OfferPartyGuard fails with
  offer not accessible** 403 OFFER_ACCESS_DENIED. No refresh attempted
                         --- this is an authorization failure, not an
                         authentication failure.
  ---------------------- ------------------------------------------------
