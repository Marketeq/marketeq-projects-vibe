**OS-13**

**Offer Service --- Error Response Format & Codes**

**Filter:** OfferExceptionFilter (global) **Envelope:** { statusCode,
error, message, details?, timestamp, path, requestId } **Validation:**
422 with field-level details array

This document defines the complete error contract for offer-service.
Every error response --- from validation failures to state machine
conflicts to internal errors --- uses the same envelope shape. A global
exception filter (OfferExceptionFilter) catches all thrown exceptions
and formats them consistently before they reach the client.

**File Map**

  ---------- ------------------------------------------- ------------------------
  **Step**   **File Path**                               **Purpose**

  **1**      src/common/exceptions/offer.exceptions.ts   All typed exception
                                                         classes for
                                                         offer-service

  **2**      src/filters/offer-exception.filter.ts       Global exception filter
                                                         --- formats all errors
                                                         into the standard
                                                         envelope

  **3**      src/main.ts (update)                        Register exception
                                                         filter globally in
                                                         bootstrap

  **4**      (reference)                                 Complete error code
                                                         catalogue --- every
                                                         code, HTTP status,
                                                         trigger, message
  ---------- ------------------------------------------- ------------------------

+-----------------------------------------------------------------------+
| **Overview Standard Error Response Envelope**                         |
|                                                                       |
| Every error from offer-service uses this exact shape                  |
+-----------------------------------------------------------------------+

Every error response from offer-service uses the following JSON
envelope. There are no exceptions. The frontend, other services, and any
integration test must expect this shape for all 4xx and 5xx responses.

+-----------------------------------------------------------------------+
| // Standard error response envelope --- all 4xx and 5xx responses     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 422,                                                  |
|                                                                       |
| \"error\": \"INVALID_RATE\",                                          |
|                                                                       |
| \"message\": \"Rate must be between \$1 and \$9,999.\",               |
|                                                                       |
| \"details\": \[ // OPTIONAL --- only present on 422 validation errors |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"field\": \"rate\",                                                  |
|                                                                       |
| \"constraint\": \"max\",                                              |
|                                                                       |
| \"message\": \"rate cannot exceed 9999\"                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"550e8400-e29b-41d4-a716-446655440000\"               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Fields:                                                            |
|                                                                       |
| // statusCode --- HTTP status code (integer). Mirrors the HTTP        |
| response status.                                                      |
|                                                                       |
| // error --- Machine-readable error code (SCREAMING_SNAKE_CASE).      |
| Stable identifier.                                                    |
|                                                                       |
| // Never changes for the same error type. Consumed by frontend for    |
| error handling.                                                       |
|                                                                       |
| // message --- Human-readable description. May change without notice. |
| Do NOT                                                                |
|                                                                       |
| // parse this string in code --- use \`error\` code instead.          |
|                                                                       |
| // details --- Present only on 422 validation errors. Array of        |
| field-level errors.                                                   |
|                                                                       |
| // Each entry identifies which field failed and which constraint.     |
|                                                                       |
| // timestamp --- ISO 8601 UTC timestamp when the error was generated. |
|                                                                       |
| // path --- The request path that generated this error.               |
|                                                                       |
| // requestId --- UUID. From X-Request-ID header if provided,          |
| otherwise generated.                                                  |
|                                                                       |
| // Use this when reporting errors to support or engineering.          |
+-----------------------------------------------------------------------+

**Validation Error --- 422 with details array**

When class-validator rejects a request body, the exception filter
formats each field failure into the details array. The frontend uses the
field property to show inline errors on the correct input.

+-----------------------------------------------------------------------+
| // Example: POST /v1/offers with rate = 0 and no contractTitle on a   |
| TEAM offer                                                            |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 422,                                                  |
|                                                                       |
| \"error\": \"VALIDATION_ERROR\",                                      |
|                                                                       |
| \"message\": \"The request contains validation errors. See details    |
| for field-level information.\",                                       |
|                                                                       |
| \"details\": \[                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"field\": \"rate\",                                                  |
|                                                                       |
| \"constraint\": \"min\",                                              |
|                                                                       |
| \"message\": \"rate must be at least \$1.\"                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"field\": \"contractTitle\",                                         |
|                                                                       |
| \"constraint\": \"isNotEmpty\",                                       |
|                                                                       |
| \"message\": \"contractTitle is required for TEAM, CONTRACT, and      |
| SERVICE contract types.\"                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Frontend usage pattern:                                            |
|                                                                       |
| // const errors = response.details.reduce((acc, d) =\> {              |
|                                                                       |
| // acc\[d.field\] = d.message;                                        |
|                                                                       |
| // return acc;                                                        |
|                                                                       |
| // }, {});                                                            |
|                                                                       |
| // Set form field error: errors\[\"rate\"\] = \"rate must be at least |
| \$1.\"                                                                |
+-----------------------------------------------------------------------+

**Nested field validation (workSchedule)**

Nested object fields (workSchedule.hoursPerWeek) are reported with
dot-notation in the field property:

+-----------------------------------------------------------------------+
| // 422 for workSchedule.hoursPerWeek missing when type = CUSTOM       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"statusCode\": 422,                                                  |
|                                                                       |
| \"error\": \"VALIDATION_ERROR\",                                      |
|                                                                       |
| \"message\": \"The request contains validation errors.\",             |
|                                                                       |
| \"details\": \[                                                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"field\": \"workSchedule.hoursPerWeek\",                             |
|                                                                       |
| \"constraint\": \"isInt\",                                            |
|                                                                       |
| \"message\": \"workSchedule.hoursPerWeek must be a whole number.\"    |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"timestamp\": \"2025-01-30T10:00:00.000Z\",                          |
|                                                                       |
| \"path\": \"/v1/offers\",                                             |
|                                                                       |
| \"requestId\": \"uuid\"                                               |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 1 Offer Exception Classes**                                    |
|                                                                       |
| All typed exceptions thrown by offer-service                          |
+-----------------------------------------------------------------------+

Instead of throwing raw NestJS HttpExceptions with inline objects, every
error in offer-service is thrown as a named class that extends a base
exception. This gives you type safety, consistent error codes, and a
single place to change messages. The exception filter catches all of
these and formats them into the standard envelope.

+-----------------------------------------------------------------------+
| Why typed exception classes instead of raw throw new HttpException()? |
|                                                                       |
| 1\. Grep-ability: grep OFFER_ALREADY_EXISTS finds every place it is   |
| thrown.                                                               |
|                                                                       |
| 2\. Consistency: the error code, HTTP status, and message are always  |
| the same.                                                             |
|                                                                       |
| 3\. Type safety: TypeScript catches typos in error codes at compile   |
| time.                                                                 |
|                                                                       |
| 4\. Testability: unit tests can check instanceof                      |
| OfferAlreadyExistsException.                                          |
|                                                                       |
| 5\. No magic strings: error codes are defined once and imported       |
| everywhere.                                                           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/common/exceptions/offer.exceptions.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import { HttpException, HttpStatus } from \'@nestjs/common\';         |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Base exception                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferServiceException --- Base class for all typed exceptions in   |
| offer-service.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* All exceptions thrown by offer-service must extend this class.     |
|                                                                       |
| \* The exception filter reads the errorCode property to populate the  |
|                                                                       |
| \* \"error\" field in the standard response envelope.                 |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage in service:                                                  |
|                                                                       |
| \* throw new OfferAlreadyExistsException();                           |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage in tests:                                                    |
|                                                                       |
| \* expect(() =\>                                                      |
| service.create(\...)).rejects.toThrow(OfferAlreadyExistsException);   |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| export class OfferServiceException extends HttpException {            |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| public readonly errorCode: string,                                    |
|                                                                       |
| message: string,                                                      |
|                                                                       |
| httpStatus: HttpStatus,                                               |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| super({ errorCode, message }, httpStatus);                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 401 --- Unauthorized                                               |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export class InvalidTokenException extends OfferServiceException {    |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'UNAUTHORIZED\',                                                     |
|                                                                       |
| \'A valid token is required. Please sign in.\',                       |
|                                                                       |
| HttpStatus.UNAUTHORIZED,                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 403 --- Forbidden                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export class ForbiddenAccessException extends OfferServiceException { |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'FORBIDDEN\',                                                        |
|                                                                       |
| \'You do not have permission to perform this action.\',               |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class NotOfferPartyException extends OfferServiceException {   |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'FORBIDDEN\',                                                        |
|                                                                       |
| \'You do not have access to this offer.\',                            |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class ClientOnlyActionException extends OfferServiceException  |
| {                                                                     |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'FORBIDDEN\',                                                        |
|                                                                       |
| \'This action is only available to clients.\',                        |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class TalentOnlyActionException extends OfferServiceException  |
| {                                                                     |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'FORBIDDEN\',                                                        |
|                                                                       |
| \'This action is only available to talent.\',                         |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CannotAcceptOwnCounterOfferException extends             |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'CANNOT_ACCEPT_OWN_COUNTER_OFFER\',                                  |
|                                                                       |
| \'You cannot accept your own counter offer.\',                        |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CannotHireSelfException extends OfferServiceException {  |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'CANNOT_HIRE_SELF\',                                                 |
|                                                                       |
| \'You cannot send an offer to yourself.\',                            |
|                                                                       |
| HttpStatus.FORBIDDEN,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 404 --- Not Found                                                  |
|                                                                       |
| // ============================================================       |
|                                                                       |
| export class OfferNotFoundException extends OfferServiceException {   |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_NOT_FOUND\',                                                  |
|                                                                       |
| \'Offer not found.\',                                                 |
|                                                                       |
| HttpStatus.NOT_FOUND,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CounterOfferNotFoundException extends                    |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'COUNTER_OFFER_NOT_FOUND\',                                          |
|                                                                       |
| \'Counter offer not found.\',                                         |
|                                                                       |
| HttpStatus.NOT_FOUND,                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 409 --- Conflict (state machine violations)                        |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // \-\-- Active offer constraint \-\--                                |
|                                                                       |
| export class OfferAlreadyExistsException extends                      |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_ALREADY_EXISTS\',                                             |
|                                                                       |
| \'An active offer already exists for this client and talent. Withdraw |
| the existing offer before sending a new one.\',                       |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-- Offer state violations \-\--                                 |
|                                                                       |
| export class OfferNotActionableException extends                      |
| OfferServiceException {                                               |
|                                                                       |
| constructor(currentStatus: string) {                                  |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_NOT_ACTIONABLE\',                                             |
|                                                                       |
| \`This action is not available because the offer is currently         |
| \${currentStatus.toLowerCase()}.\`,                                   |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class OfferAlreadyAcceptedException extends                    |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_ALREADY_ACCEPTED\',                                           |
|                                                                       |
| \'This offer has already been accepted.\',                            |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class OfferAlreadyDeclinedException extends                    |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_ALREADY_DECLINED\',                                           |
|                                                                       |
| \'This offer has already been declined.\',                            |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class OfferAlreadyWithdrawnException extends                   |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_ALREADY_WITHDRAWN\',                                          |
|                                                                       |
| \'This offer has already been withdrawn.\',                           |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class OfferExpiredException extends OfferServiceException {    |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_EXPIRED\',                                                    |
|                                                                       |
| \'This offer has expired. The client can resend it if you are still   |
| interested.\',                                                        |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class OfferNotResendableException extends                      |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'OFFER_NOT_RESENDABLE\',                                             |
|                                                                       |
| \'Only expired, declined, or withdrawn offers can be resent.\',       |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-- Counter offer state violations \-\--                         |
|                                                                       |
| export class CounterOfferAlreadyPendingException extends              |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'COUNTER_OFFER_ALREADY_PENDING\',                                    |
|                                                                       |
| \'A counter offer is already pending. Withdraw or wait for a response |
| before submitting another.\',                                         |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CounterOfferNotActionableException extends               |
| OfferServiceException {                                               |
|                                                                       |
| constructor(currentStatus: string) {                                  |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'COUNTER_OFFER_NOT_ACTIONABLE\',                                     |
|                                                                       |
| \`This action is not available because the counter offer is currently |
| \${currentStatus.toLowerCase()}.\`,                                   |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CounterOfferWithdrawnException extends                   |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'COUNTER_OFFER_WITHDRAWN\',                                          |
|                                                                       |
| \'This counter offer has been withdrawn and can no longer be          |
| accepted.\',                                                          |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class CounterOfferExpiredException extends                     |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'COUNTER_OFFER_EXPIRED\',                                            |
|                                                                       |
| \'This counter offer has expired and can no longer be accepted.\',    |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \-\-- Talent availability \-\--                                    |
|                                                                       |
| export class TalentNotAvailableException extends                      |
| OfferServiceException {                                               |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'TALENT_NOT_AVAILABLE\',                                             |
|                                                                       |
| \'This talent is no longer available to receive offers.\',            |
|                                                                       |
| HttpStatus.CONFLICT,                                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 422 --- Validation Error                                           |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Note: 422 errors from class-validator are handled automatically by |
|                                                                       |
| // OfferExceptionFilter catching NestJS BadRequestException from      |
| ValidationPipe.                                                       |
|                                                                       |
| // You do not need to throw these manually in services --- the        |
| ValidationPipe                                                        |
|                                                                       |
| // handles them automatically for every DTO-decorated request body.   |
|                                                                       |
| // Use this exception when you need to throw a 422 manually from      |
| service code                                                          |
|                                                                       |
| // (e.g. cross-field validation that cannot be done in a DTO          |
| decorator):                                                           |
|                                                                       |
| export class OfferValidationException extends OfferServiceException { |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| message: string,                                                      |
|                                                                       |
| public readonly field?: string,                                       |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'VALIDATION_ERROR\',                                                 |
|                                                                       |
| message,                                                              |
|                                                                       |
| HttpStatus.UNPROCESSABLE_ENTITY,                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // 500 --- Internal Server Error                                      |
|                                                                       |
| // ============================================================       |
|                                                                       |
| // Note: Do NOT throw these manually. They are generated by the       |
| exception filter                                                      |
|                                                                       |
| // when an unhandled error bubbles up. They exist here as             |
| documentation.                                                        |
|                                                                       |
| export class InternalOfferException extends OfferServiceException {   |
|                                                                       |
| constructor() {                                                       |
|                                                                       |
| super(                                                                |
|                                                                       |
| \'INTERNAL_ERROR\',                                                   |
|                                                                       |
| \'An unexpected error occurred. Please try again. If the issue        |
| persists, contact support.\',                                         |
|                                                                       |
| HttpStatus.INTERNAL_SERVER_ERROR,                                     |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 OfferExceptionFilter**                                       |
|                                                                       |
| Global filter that formats all exceptions into the standard envelope  |
+-----------------------------------------------------------------------+

OfferExceptionFilter is a NestJS exception filter applied globally in
main.ts. It catches every exception that is thrown (or not caught)
inside offer-service and formats it into the standard error envelope. It
handles three cases: typed OfferServiceException, NestJS ValidationPipe
BadRequestException (which contains field-level errors), and all other
unexpected errors (formatted as 500).

+-----------------------------------------------------------------------+
| What OfferExceptionFilter catches:                                    |
|                                                                       |
| 1\. OfferServiceException (and all subclasses): our typed exceptions  |
| from offer.exceptions.ts                                              |
|                                                                       |
| → Uses the errorCode and message from the exception                   |
|                                                                       |
| 2\. NestJS HttpException (including UnauthorizedException,            |
| ForbiddenException)                                                   |
|                                                                       |
| → Wrapped in the standard envelope with correct statusCode            |
|                                                                       |
| 3\. ValidationPipe BadRequestException (thrown when \@Body() DTO      |
| fails validation)                                                     |
|                                                                       |
| → Reformatted as 422 VALIDATION_ERROR with field-level details array  |
|                                                                       |
| 4\. Any other Error (database errors, network timeouts, unhandled     |
| exceptions)                                                           |
|                                                                       |
| → Logged internally, returned as 500 INTERNAL_ERROR (no stack trace   |
| exposed)                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| Never return stack traces or internal error details to clients.       |
|                                                                       |
| The filter explicitly strips stack traces from 500 responses.         |
|                                                                       |
| Log the full error internally (structured log with requestId) but     |
| return only                                                           |
|                                                                       |
| a generic INTERNAL_ERROR message to the caller.                       |
|                                                                       |
| This prevents information leakage that could aid attackers.           |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/filters/offer-exception.filter.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| ArgumentsHost, Catch, ExceptionFilter,                                |
|                                                                       |
| HttpException, HttpStatus, Logger,                                    |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { Request, Response } from \'express\';                        |
|                                                                       |
| import { v4 as uuidv4 } from \'uuid\';                                |
|                                                                       |
| import { OfferServiceException } from                                 |
| \'../common/exceptions/offer.exceptions\';                            |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* OfferExceptionFilter --- Global exception filter for               |
| offer-service.                                                        |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Catches ALL exceptions and formats them into the standard error    |
| envelope.                                                             |
|                                                                       |
| \* Applied globally via app.useGlobalFilters() in main.ts.            |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Three cases handled:                                               |
|                                                                       |
| \* 1. OfferServiceException subclasses --- typed offer-service errors |
|                                                                       |
| \* 2. NestJS HttpException --- guards, pipes, interceptors throwing   |
| standard errors                                                       |
|                                                                       |
| \* 3. Everything else (Error, unknown) --- logged and returned as 500 |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| \@Catch()                                                             |
|                                                                       |
| export class OfferExceptionFilter implements ExceptionFilter {        |
|                                                                       |
| private readonly logger = new Logger(OfferExceptionFilter.name);      |
|                                                                       |
| catch(exception: unknown, host: ArgumentsHost): void {                |
|                                                                       |
| const ctx = host.switchToHttp();                                      |
|                                                                       |
| const response = ctx.getResponse\<Response\>();                       |
|                                                                       |
| const request = ctx.getRequest\<Request\>();                          |
|                                                                       |
| // Generate or extract requestId for tracing.                         |
|                                                                       |
| // If the client sent X-Request-ID, use that. Otherwise generate a    |
| new UUID.                                                             |
|                                                                       |
| const requestId =                                                     |
|                                                                       |
| (request.headers\[\'x-request-id\'\] as string) ?? uuidv4();          |
|                                                                       |
| // Base envelope fields present on every error response.              |
|                                                                       |
| const baseEnvelope = {                                                |
|                                                                       |
| timestamp: new Date().toISOString(),                                  |
|                                                                       |
| path: request.url,                                                    |
|                                                                       |
| requestId,                                                            |
|                                                                       |
| };                                                                    |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Case 1: OfferServiceException (our typed exceptions)               |
|                                                                       |
| // ================================================================   |
|                                                                       |
| if (exception instanceof OfferServiceException) {                     |
|                                                                       |
| const status = exception.getStatus();                                 |
|                                                                       |
| const payload = exception.getResponse() as {                          |
|                                                                       |
| errorCode: string;                                                    |
|                                                                       |
| message: string;                                                      |
|                                                                       |
| };                                                                    |
|                                                                       |
| return void response.status(status).json({                            |
|                                                                       |
| statusCode: status,                                                   |
|                                                                       |
| error: payload.errorCode,                                             |
|                                                                       |
| message: payload.message,                                             |
|                                                                       |
| \...baseEnvelope,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Case 2a: NestJS ValidationPipe errors (BadRequestException from    |
|                                                                       |
| // ValidationPipe when a DTO fails validation)                        |
|                                                                       |
| // ================================================================   |
|                                                                       |
| if (exception instanceof HttpException) {                             |
|                                                                       |
| const status = exception.getStatus();                                 |
|                                                                       |
| const payload = exception.getResponse();                              |
|                                                                       |
| // ValidationPipe throws BadRequestException with this specific       |
| shape.                                                                |
|                                                                       |
| // We reformat it as 422 VALIDATION_ERROR with field-level details.   |
|                                                                       |
| if (                                                                  |
|                                                                       |
| typeof payload === \'object\' &&                                      |
|                                                                       |
| payload !== null &&                                                   |
|                                                                       |
| \'message\' in payload &&                                             |
|                                                                       |
| Array.isArray((payload as { message: unknown }).message)              |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const rawMessages = (payload as { message: string\[\] }).message;     |
|                                                                       |
| // Transform class-validator messages into our field-level detail     |
| format.                                                               |
|                                                                       |
| // class-validator error messages include the field name and          |
| constraint name.                                                      |
|                                                                       |
| const details = rawMessages.map((msg: string) =\> {                   |
|                                                                       |
| // Try to extract field name from the error message.                  |
|                                                                       |
| // class-validator messages typically start with \'fieldName          |
| should\...\'                                                          |
|                                                                       |
| // or \'fieldName must be\...\' so we split on the first space.       |
|                                                                       |
| const spaceIdx = msg.indexOf(\' \');                                  |
|                                                                       |
| const field = spaceIdx \> 0 ? msg.substring(0, spaceIdx) :            |
| \'unknown\';                                                          |
|                                                                       |
| // Derive the constraint name from the message text.                  |
|                                                                       |
| // This is a heuristic --- the DTO decorators provide the messages.   |
|                                                                       |
| const constraint = deriveConstraint(msg);                             |
|                                                                       |
| return { field, constraint, message: msg };                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| return void response                                                  |
|                                                                       |
| .status(HttpStatus.UNPROCESSABLE_ENTITY)                              |
|                                                                       |
| .json({                                                               |
|                                                                       |
| statusCode: HttpStatus.UNPROCESSABLE_ENTITY,                          |
|                                                                       |
| error: \'VALIDATION_ERROR\',                                          |
|                                                                       |
| message: \'The request contains validation errors. See details for    |
| field-level information.\',                                           |
|                                                                       |
| details,                                                              |
|                                                                       |
| \...baseEnvelope,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Case 2b: Other HttpExceptions (guards, interceptors, etc.)         |
|                                                                       |
| // UnauthorizedException (401), ForbiddenException (403),             |
| NotFoundException (404)                                               |
|                                                                       |
| const message =                                                       |
|                                                                       |
| typeof payload === \'string\'                                         |
|                                                                       |
| ? payload                                                             |
|                                                                       |
| : typeof payload === \'object\' && \'message\' in payload             |
|                                                                       |
| ? String((payload as { message: unknown }).message)                   |
|                                                                       |
| : \'An error occurred.\';                                             |
|                                                                       |
| const errorCode =                                                     |
|                                                                       |
| typeof payload === \'object\' && \'error\' in payload                 |
|                                                                       |
| ? String((payload as { error: unknown }).error)                       |
|                                                                       |
| : httpStatusToErrorCode(status);                                      |
|                                                                       |
| return void response.status(status).json({                            |
|                                                                       |
| statusCode: status,                                                   |
|                                                                       |
| error: errorCode,                                                     |
|                                                                       |
| message,                                                              |
|                                                                       |
| \...baseEnvelope,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Case 3: Unhandled errors (database errors, null references, etc.)  |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Log the full error internally for debugging. NEVER send the        |
|                                                                       |
| // stack trace or internal error message to the client.               |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`Unhandled exception on \${request.method} \${request.url}\`,        |
|                                                                       |
| exception instanceof Error ? exception.stack : String(exception),     |
|                                                                       |
| { requestId },                                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| return void response                                                  |
|                                                                       |
| .status(HttpStatus.INTERNAL_SERVER_ERROR)                             |
|                                                                       |
| .json({                                                               |
|                                                                       |
| statusCode: HttpStatus.INTERNAL_SERVER_ERROR,                         |
|                                                                       |
| error: \'INTERNAL_ERROR\',                                            |
|                                                                       |
| message: \'An unexpected error occurred. Please try again. If the     |
| issue persists, contact support with the requestId.\',                |
|                                                                       |
| \...baseEnvelope,                                                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ================================================================   |
|                                                                       |
| // Helpers                                                            |
|                                                                       |
| // ================================================================   |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Derive a human-readable constraint name from a class-validator     |
| error message.                                                        |
|                                                                       |
| \* Used to populate the \"constraint\" field in the details array.    |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| function deriveConstraint(message: string): string {                  |
|                                                                       |
| if (message.includes(\'must be a UUID\')) return \'isUUID\';          |
|                                                                       |
| if (message.includes(\'must be an integer\')) return \'isInt\';       |
|                                                                       |
| if (message.includes(\'whole number\')) return \'isInt\';             |
|                                                                       |
| if (message.includes(\'at least\')) return \'min\';                   |
|                                                                       |
| if (message.includes(\'cannot exceed\')) return \'max\';              |
|                                                                       |
| if (message.includes(\'must not be empty\')) return \'isNotEmpty\';   |
|                                                                       |
| if (message.includes(\'must be a string\')) return \'isString\';      |
|                                                                       |
| if (message.includes(\'must be one of\')) return \'isEnum\';          |
|                                                                       |
| if (message.includes(\'must be exactly\')) return \'length\';         |
|                                                                       |
| if (message.includes(\'must be uppercase\')) return \'isUppercase\';  |
|                                                                       |
| if (message.includes(\'YYYY-MM-DD\')) return \'isIso8601DateString\'; |
|                                                                       |
| if (message.includes(\'past\')) return \'isFutureDate\';              |
|                                                                       |
| if (message.includes(\'years in the future\')) return                 |
| \'isNotTooFarFuture\';                                                |
|                                                                       |
| if (message.includes(\'valid schedule\')) return \'isValidSchedule\'; |
|                                                                       |
| return \'invalid\';                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| /\*\*                                                                 |
|                                                                       |
| \* Map HTTP status codes to default error code strings.               |
|                                                                       |
| \* Used as fallback when the exception does not provide an explicit   |
| error code.                                                           |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| function httpStatusToErrorCode(status: number): string {              |
|                                                                       |
| const map: Record\<number, string\> = {                               |
|                                                                       |
| 400: \'BAD_REQUEST\',                                                 |
|                                                                       |
| 401: \'UNAUTHORIZED\',                                                |
|                                                                       |
| 403: \'FORBIDDEN\',                                                   |
|                                                                       |
| 404: \'NOT_FOUND\',                                                   |
|                                                                       |
| 409: \'CONFLICT\',                                                    |
|                                                                       |
| 422: \'VALIDATION_ERROR\',                                            |
|                                                                       |
| 429: \'RATE_LIMITED\',                                                |
|                                                                       |
| 500: \'INTERNAL_ERROR\',                                              |
|                                                                       |
| 503: \'SERVICE_UNAVAILABLE\',                                         |
|                                                                       |
| };                                                                    |
|                                                                       |
| return map\[status\] ?? \'UNKNOWN_ERROR\';                            |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 Register the Filter Globally in main.ts**                    |
|                                                                       |
| One line added to the bootstrap function                              |
+-----------------------------------------------------------------------+

The exception filter must be registered globally in main.ts using
app.useGlobalFilters(). This must be done BEFORE app.listen(). A
globally registered filter receives every exception thrown anywhere in
the application, including from guards, interceptors, and pipes.

+-----------------------------------------------------------------------+
| Order matters in main.ts.                                             |
|                                                                       |
| Register the exception filter BEFORE registering the global           |
| ValidationPipe.                                                       |
|                                                                       |
| If the ValidationPipe is registered first and throws before the       |
| filter is ready,                                                      |
|                                                                       |
| you will get NestJS default error format instead of the offer-service |
| envelope.                                                             |
|                                                                       |
| The correct order: setGlobalPrefix → useGlobalFilters →               |
| useGlobalPipes → listen.                                              |
+-----------------------------------------------------------------------+

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
| import { OfferExceptionFilter } from                                  |
| \'./filters/offer-exception.filter\';                                 |
|                                                                       |
| async function bootstrap() {                                          |
|                                                                       |
| const app = await NestFactory.create(AppModule);                      |
|                                                                       |
| // 1. Set global route prefix (excludes health probe paths).          |
|                                                                       |
| app.setGlobalPrefix(\'v1\', { exclude: \[\'health\', \'ready\'\] });  |
|                                                                       |
| // 2. Register exception filter GLOBALLY.                             |
|                                                                       |
| // This must be registered before ValidationPipe so it can catch      |
|                                                                       |
| // ValidationPipe exceptions and format them into the error envelope. |
|                                                                       |
| app.useGlobalFilters(new OfferExceptionFilter());                     |
|                                                                       |
| // 3. Register global validation pipe.                                |
|                                                                       |
| // When DTO validation fails, ValidationPipe throws                   |
| BadRequestException.                                                  |
|                                                                       |
| // OfferExceptionFilter catches this and reformats it as 422          |
| VALIDATION_ERROR.                                                     |
|                                                                       |
| app.useGlobalPipes(new ValidationPipe({                               |
|                                                                       |
| whitelist: true, // Strip unknown properties from request bodies      |
|                                                                       |
| forbidNonWhitelisted: true, // 400 if unknown properties are sent     |
|                                                                       |
| transform: true, // Auto-coerce types (string → number)               |
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

+-----------------------------------------------------------------------+
| **Step 4 Complete Error Code Catalogue**                              |
|                                                                       |
| Every error code offer-service can return                             |
+-----------------------------------------------------------------------+

This table is the authoritative reference for every error code
offer-service emits. The error code (column 2) is the stable
machine-readable identifier. Clients and integration tests should match
on this field --- not on the message string, which may change.

**Group 1 --- Authentication (401)**

  ---------- ------------------- ----------- ------------------- -----------------
  **HTTP**   **Error Code**      **Field**   **Message**         **Trigger**

  **401**    **UNAUTHORIZED**    ---         A valid token is    Missing, expired,
                                             required. Please    or malformed JWT
                                             sign in.            in Authorization
                                                                 header
  ---------- ------------------- ----------- ------------------- -----------------

**Group 2 --- Authorization (403)**

  ---------- ------------------------------------- ----------- ------------------- -------------------
  **HTTP**   **Error Code**                        **Field**   **Message**         **Trigger**

  **403**    **FORBIDDEN**                         ---         You do not have     User is not
                                                               access to this      offer.clientId or
                                                               offer.              offer.talentId
                                                                                   (OfferPartyGuard)

  **403**    **FORBIDDEN**                         ---         This action is only TALENT attempts a
                                                               available to        CLIENT-only
                                                               clients.            endpoint

  **403**    **FORBIDDEN**                         ---         This action is only CLIENT attempts a
                                                               available to        TALENT-only
                                                               talent.             endpoint

  **403**    **CANNOT_HIRE_SELF**                  ---         You cannot send an  clientId ===
                                                               offer to yourself.  talentId on POST
                                                                                   /v1/offers

  **403**    **CANNOT_ACCEPT_OWN_COUNTER_OFFER**   ---         You cannot accept   CO submitter
                                                               your own counter    attempts to accept
                                                               offer.              their own CO
  ---------- ------------------------------------- ----------- ------------------- -------------------

**Group 3 --- Not Found (404)**

Note: OfferPartyGuard returns 403 (not 404) when an offer does not
exist, to prevent enumeration. 404 is only returned when the offer is
confirmed to exist but a nested resource does not.

  ---------- ----------------------------- ----------- ------------------- --------------------------
  **HTTP**   **Error Code**                **Field**   **Message**         **Trigger**

  **404**    **OFFER_NOT_FOUND**           ---         Offer not found.    Returned only by
                                                                           OffersService.findById()
                                                                           when called after
                                                                           OfferPartyGuard

  **404**    **COUNTER_OFFER_NOT_FOUND**   ---         Counter offer not   Counter offer :id does not
                                                       found.              exist on the parent offer
  ---------- ----------------------------- ----------- ------------------- --------------------------

**Group 4 --- Conflict / State Machine Violations (409)**

409 Conflict is used exclusively for state machine violations --- when
the requested action is not permitted given the current status of the
offer or counter offer.

  ---------- ----------------------------------- ----------- ------------------- ------------------------------
  **HTTP**   **Error Code**                      **Field**   **Message**         **Trigger**

  **409**    **OFFER_ALREADY_EXISTS**            ---         An active offer     POST /v1/offers when an active
                                                             already exists for  offer already exists for the
                                                             this client and     client-talent pair
                                                             talent. Withdraw    
                                                             the existing offer  
                                                             before sending a    
                                                             new one.            

  **409**    **OFFER_NOT_ACTIONABLE**            ---         This action is not  Attempt to
                                                             available because   edit/accept/decline/withdraw
                                                             the offer is        an offer not in PENDING status
                                                             currently           
                                                             \[status\].         

  **409**    **OFFER_ALREADY_ACCEPTED**          ---         This offer has      Attempt to accept, decline, or
                                                             already been        withdraw an ACCEPTED offer
                                                             accepted.           

  **409**    **OFFER_ALREADY_DECLINED**          ---         This offer has      Attempt to act on a DECLINED
                                                             already been        offer
                                                             declined.           

  **409**    **OFFER_ALREADY_WITHDRAWN**         ---         This offer has      Attempt to act on a WITHDRAWN
                                                             already been        offer
                                                             withdrawn.          

  **409**    **OFFER_EXPIRED**                   ---         This offer has      Attempt to accept, decline, or
                                                             expired. The client create CO on an EXPIRED offer
                                                             can resend it if    
                                                             you are still       
                                                             interested.         

  **409**    **OFFER_NOT_RESENDABLE**            ---         Only expired,       Attempt to resend a PENDING or
                                                             declined, or        ACCEPTED offer
                                                             withdrawn offers    
                                                             can be resent.      

  **409**    **COUNTER_OFFER_ALREADY_PENDING**   ---         A counter offer is  POST counter-offer when one is
                                                             already pending.    already PENDING
                                                             Withdraw or wait    
                                                             for a response      
                                                             before submitting   
                                                             another.            

  **409**    **COUNTER_OFFER_NOT_ACTIONABLE**    ---         This action is not  Attempt to
                                                             available because   edit/accept/decline/withdraw a
                                                             the counter offer   CO not in PENDING status
                                                             is currently        
                                                             \[status\].         

  **409**    **COUNTER_OFFER_WITHDRAWN**         ---         This counter offer  Attempt to accept a WITHDRAWN
                                                             has been withdrawn  counter offer (race condition)
                                                             and can no longer   
                                                             be accepted.        

  **409**    **COUNTER_OFFER_EXPIRED**           ---         This counter offer  Attempt to accept an EXPIRED
                                                             has expired and can counter offer
                                                             no longer be        
                                                             accepted.           

  **409**    **TALENT_NOT_AVAILABLE**            ---         This talent is no   Resend to a talent whose
                                                             longer available to account has been deactivated
                                                             receive offers.     
  ---------- ----------------------------------- ----------- ------------------- ------------------------------

**Group 5 --- Validation Errors (422)**

422 errors always include a details array with field-level errors. The
details array may contain multiple entries if multiple fields failed
validation simultaneously. The frontend renders these as inline field
errors on the form.

  ---------- ---------------------- --------------------------- ------------------- ------------------------
  **HTTP**   **Error Code**         **Field**                   **Message**         **Trigger**

  **422**    **VALIDATION_ERROR**   (see details)               The request         class-validator finds
                                                                contains validation one or more DTO field
                                                                errors. See details violations
                                                                for field-level     
                                                                information.        

  **422**    **VALIDATION_ERROR**   rate                        Rate must be        rate \< 1 or \> 9999, or
                                                                between \$1 and     rate has decimal places
                                                                \$9,999.            

  **422**    **VALIDATION_ERROR**   rate                        Rate must be a      rate = 45.5 (decimal not
                                                                whole number with   accepted)
                                                                no decimal places.  

  **422**    **VALIDATION_ERROR**   currencyCode                currencyCode must   currencyCode wrong
                                                                be exactly 3        length or lowercase
                                                                uppercase           
                                                                characters (e.g.    
                                                                USD, EUR, GBP).     

  **422**    **VALIDATION_ERROR**   durationMonths              Duration must be    durationMonths \< 1 or
                                                                between 1 and 60    \> 60
                                                                months.             

  **422**    **VALIDATION_ERROR**   workSchedule.type           workSchedule.type   type is not a valid
                                                                must be one of:     WorkScheduleType value
                                                                PART_TIME,          
                                                                FULL_TIME, CUSTOM.  

  **422**    **VALIDATION_ERROR**   workSchedule.hoursPerWeek   Hours per week must type = CUSTOM but
                                                                be between 1 and 80 hoursPerWeek missing, or
                                                                when schedule type  outside 1-80
                                                                is CUSTOM.          

  **422**    **VALIDATION_ERROR**   startDate                   startDate must be a startDate fails ISO 8601
                                                                valid date in       date format check or is
                                                                YYYY-MM-DD format   an invalid calendar date
                                                                (e.g. 2025-01-30).  

  **422**    **VALIDATION_ERROR**   startDate                   startDate must not  startDate is before
                                                                be in the past.     today
                                                                Please select today 
                                                                or a future date.   

  **422**    **VALIDATION_ERROR**   startDate                   startDate cannot be startDate is more than 5
                                                                more than 5 years   years from today
                                                                in the future.      

  **422**    **VALIDATION_ERROR**   contractTitle               contractTitle is    contractType requires
                                                                required for TEAM,  title but contractTitle
                                                                CONTRACT, and       was not provided
                                                                SERVICE contract    
                                                                types.              

  **422**    **VALIDATION_ERROR**   contractTitle               contractTitle       contractTitle length \>
                                                                cannot exceed 200   200
                                                                characters.         

  **422**    **VALIDATION_ERROR**   message                     message cannot      Any message field
                                                                exceed 500          exceeds 500 chars
                                                                characters.         

  **422**    **VALIDATION_ERROR**   reason                      A decline reason is DeclineOfferDto.reason
                                                                required.           is missing or empty

  **422**    **VALIDATION_ERROR**   reason                      reason cannot       reason length \> 500
                                                                exceed 500          
                                                                characters.         

  **422**    **VALIDATION_ERROR**   chip                        chip must be a      chip value is not one of
                                                                valid DeclineChip   the 6 valid decline
                                                                value.              chips

  **422**    **VALIDATION_ERROR**   talentId                    talentId must be a  talentId is not a valid
                                                                valid UUID v4.      UUID

  **422**    **VALIDATION_ERROR**   jobListingId                jobListingId must   jobListingId is not a
                                                                be a valid UUID v4. valid UUID

  **422**    **VALIDATION_ERROR**   contractType                contractType must   contractType is not a
                                                                be one of: PROJECT, valid ContractType value
                                                                SERVICE, TEAM,      
                                                                CONTRACT.           
  ---------- ---------------------- --------------------------- ------------------- ------------------------

**Group 6 --- Internal Errors (500)**

500 errors are never thrown intentionally. They occur when an unhandled
exception bubbles up to the filter. The full error is logged internally
with the requestId for debugging. Only the generic message is returned
to the client.

  ---------- -------------------- ----------- ------------------- -----------------
  **HTTP**   **Error Code**       **Field**   **Message**         **Trigger**

  **500**    **INTERNAL_ERROR**   ---         An unexpected error Any unhandled
                                              occurred. Please    exception:
                                              try again. If the   database errors,
                                              issue persists,     null references,
                                              contact support     network timeouts,
                                              with the requestId. etc.
  ---------- -------------------- ----------- ------------------- -----------------

**Group 7 --- Service Unavailable (503)**

  ---------- ------------------------- ----------- ------------------- -----------------
  **HTTP**   **Error Code**            **Field**   **Message**         **Trigger**

  **503**    **SERVICE_UNAVAILABLE**   ---         offer-service is    Returned by
                                                   temporarily         /ready when
                                                   unavailable. Please dependencies are
                                                   try again.          unreachable (DB,
                                                                       Redis, RabbitMQ,
                                                                       Ably)
  ---------- ------------------------- ----------- ------------------- -----------------

+-----------------------------------------------------------------------+
| **Reference How to Throw Exceptions from Service Methods**            |
|                                                                       |
| Copy these patterns exactly                                           |
+-----------------------------------------------------------------------+

Service methods throw typed exceptions directly. The exception filter
catches them automatically. Never construct the error envelope manually
in a service --- that is the filter\'s job.

**Pattern A --- State machine violation (409)**

+-----------------------------------------------------------------------+
| // In OffersService.accept():                                         |
|                                                                       |
| import { OfferAlreadyAcceptedException, OfferExpiredException } from  |
| \'../common/exceptions/offer.exceptions\';                            |
|                                                                       |
| async accept(offerId: string, requesterId: string, dto:               |
| AcceptOfferDto) {                                                     |
|                                                                       |
| const offer = await this.offerRepo.findOne({ where: { id: offerId }   |
| });                                                                   |
|                                                                       |
| if (offer.status === OfferStatus.ACCEPTED) {                          |
|                                                                       |
| throw new OfferAlreadyAcceptedException();                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (offer.status === OfferStatus.EXPIRED) {                           |
|                                                                       |
| throw new OfferExpiredException();                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING) {                           |
|                                                                       |
| throw new OfferNotActionableException(offer.status);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \... continue with acceptance logic                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Result when talent tries to accept an already-accepted offer:      |
|                                                                       |
| // HTTP 409                                                           |
|                                                                       |
| // {                                                                  |
|                                                                       |
| // \"statusCode\": 409,                                               |
|                                                                       |
| // \"error\": \"OFFER_ALREADY_ACCEPTED\",                             |
|                                                                       |
| // \"message\": \"This offer has already been accepted.\",            |
|                                                                       |
| // \"timestamp\": \"\...\",                                           |
|                                                                       |
| // \"path\": \"/v1/offers/:id/accept\",                               |
|                                                                       |
| // \"requestId\": \"uuid\"                                            |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

**Pattern B --- Active offer constraint (409)**

+-----------------------------------------------------------------------+
| // In OffersService.create():                                         |
|                                                                       |
| import { OfferAlreadyExistsException, CannotHireSelfException } from  |
| \'../common/exceptions/offer.exceptions\';                            |
|                                                                       |
| async create(clientId: string, dto: CreateOfferDto) {                 |
|                                                                       |
| // Check: client cannot hire themselves                               |
|                                                                       |
| if (clientId === dto.talentId) {                                      |
|                                                                       |
| throw new CannotHireSelfException();                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Check: one active offer per client-talent pair                     |
|                                                                       |
| const existing = await this.offerRepo.findOne({                       |
|                                                                       |
| where: {                                                              |
|                                                                       |
| clientId,                                                             |
|                                                                       |
| talentId: dto.talentId,                                               |
|                                                                       |
| status: In(\[OfferStatus.PENDING, OfferStatus.COUNTERED\]),           |
|                                                                       |
| },                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (existing) {                                                       |
|                                                                       |
| throw new OfferAlreadyExistsException();                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // \... continue with offer creation                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**Pattern C --- Dynamic message with status context (409)**

+-----------------------------------------------------------------------+
| // In OffersService.edit():                                           |
|                                                                       |
| import { OfferNotActionableException } from                           |
| \'../common/exceptions/offer.exceptions\';                            |
|                                                                       |
| async edit(offerId: string, requesterId: string, dto: EditOfferDto) { |
|                                                                       |
| const offer = await this.findById(offerId);                           |
|                                                                       |
| // The current status is included in the error message.               |
|                                                                       |
| // \"This action is not available because the offer is currently      |
| countered.\"                                                          |
|                                                                       |
| if (offer.status !== OfferStatus.PENDING) {                           |
|                                                                       |
| throw new OfferNotActionableException(offer.status); // e.g.          |
| \"COUNTERED\"                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Result:                                                            |
|                                                                       |
| // HTTP 409                                                           |
|                                                                       |
| // {                                                                  |
|                                                                       |
| // \"statusCode\": 409,                                               |
|                                                                       |
| // \"error\": \"OFFER_NOT_ACTIONABLE\",                               |
|                                                                       |
| // \"message\": \"This action is not available because the offer is   |
| currently countered.\",                                               |
|                                                                       |
| // \"timestamp\": \"\...\",                                           |
|                                                                       |
| // \"path\": \"/v1/offers/:id\",                                      |
|                                                                       |
| // \"requestId\": \"uuid\"                                            |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

**Pattern D --- Catching and re-throwing database errors**

+-----------------------------------------------------------------------+
| // Database errors should be caught and re-thrown as typed            |
| exceptions.                                                           |
|                                                                       |
| // Never let raw TypeORM errors reach the client.                     |
|                                                                       |
| async create(clientId: string, dto: CreateOfferDto) {                 |
|                                                                       |
| try {                                                                 |
|                                                                       |
| return await this.offerRepo.save(newOffer);                           |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // TypeORM unique constraint violation --- e.g. from a DB-level       |
| unique index                                                          |
|                                                                       |
| if (err?.code === \'23505\') { // PostgreSQL unique violation code    |
|                                                                       |
| throw new OfferAlreadyExistsException();                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // All other DB errors bubble up to the filter as 500 INTERNAL_ERROR. |
|                                                                       |
| // Log is generated automatically by the filter.                      |
|                                                                       |
| throw err;                                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Verification --- Confirm the Error Envelope**                |
|                                                                       |
| Test every error category                                             |
+-----------------------------------------------------------------------+

Run these tests after starting the service. Each confirms a different
part of the error handling pipeline. Every response should match the
standard envelope shape.

**Test 1 --- Confirm 401 uses the envelope**

+-----------------------------------------------------------------------+
| \# No token --- JwtAuthGuard throws UnauthorizedException             |
|                                                                       |
| \# OfferExceptionFilter catches it and formats it                     |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -d \'{}\' \| jq .                                                     |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# {                                                                  |
|                                                                       |
| \# \"statusCode\": 401,                                               |
|                                                                       |
| \# \"error\": \"UNAUTHORIZED\",                                       |
|                                                                       |
| \# \"message\": \"A valid token is required. Please sign in.\",       |
|                                                                       |
| \# \"timestamp\": \"\...\",                                           |
|                                                                       |
| \# \"path\": \"/v1/offers\",                                          |
|                                                                       |
| \# \"requestId\": \"uuid\"                                            |
|                                                                       |
| \# }                                                                  |
+-----------------------------------------------------------------------+

**Test 2 --- Confirm 422 with field-level details**

+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| \# Send invalid rate (0) and missing contractTitle for TEAM                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                 |
| curl -s -X POST http://localhost:3005/v1/offers \\                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                 |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                                                                                                                                                                                                                                  |
|                                                                                                                                                                                                                                                                                 |
| -H \"Content-Type: application/json\" \\                                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                 |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                                                                                                                                                                                                                                        |
|                                                                                                                                                                                                                                                                                 |
| -d                                                                                                                                                                                                                                                                              |
| \'{\"talentId\":\"00000000-0000-0000-0000-000000000001\",\"jobListingId\":\"00000000-0000-0000-0000-000000000002\",\"contractType\":\"TEAM\",\"rate\":0,\"currencyCode\":\"USD\",\"durationMonths\":3,\"workSchedule\":{\"type\":\"FULL_TIME\"},\"startDate\":\"2099-01-01\"}\' |
| \| jq .                                                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                 |
| \# Expected:                                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                 |
| \# {                                                                                                                                                                                                                                                                            |
|                                                                                                                                                                                                                                                                                 |
| \# \"statusCode\": 422,                                                                                                                                                                                                                                                         |
|                                                                                                                                                                                                                                                                                 |
| \# \"error\": \"VALIDATION_ERROR\",                                                                                                                                                                                                                                             |
|                                                                                                                                                                                                                                                                                 |
| \# \"message\": \"The request contains validation errors\...\",                                                                                                                                                                                                                 |
|                                                                                                                                                                                                                                                                                 |
| \# \"details\": \[                                                                                                                                                                                                                                                              |
|                                                                                                                                                                                                                                                                                 |
| \# { \"field\": \"contractTitle\", \"constraint\": \"isNotEmpty\", \"message\": \"\...\" },                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                 |
| \# { \"field\": \"rate\", \"constraint\": \"min\", \"message\": \"\...\" }                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                 |
| \# \],                                                                                                                                                                                                                                                                          |
|                                                                                                                                                                                                                                                                                 |
| \# \"timestamp\": \"\...\",                                                                                                                                                                                                                                                     |
|                                                                                                                                                                                                                                                                                 |
| \# \"path\": \"/v1/offers\",                                                                                                                                                                                                                                                    |
|                                                                                                                                                                                                                                                                                 |
| \# \"requestId\": \"uuid\"                                                                                                                                                                                                                                                      |
|                                                                                                                                                                                                                                                                                 |
| \# }                                                                                                                                                                                                                                                                            |
+---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

**Test 3 --- Confirm 409 OFFER_ALREADY_EXISTS**

+-----------------------------------------------------------------------+
| \# Create an offer, then try to create another for the same           |
| client-talent pair                                                    |
|                                                                       |
| \# First offer:                                                       |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                              |
|                                                                       |
| -d \'\<valid offer body\>\' \| jq .id                                 |
|                                                                       |
| \# Second offer (same client, same talent):                           |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Authorization: Bearer \<CLIENT_JWT\>\" \\                        |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Idempotency-Key: \$(uuidgen)\" \\                              |
|                                                                       |
| -d \'\<same client, same talent, different terms\>\' \| jq .          |
|                                                                       |
| \# Expected:                                                          |
|                                                                       |
| \# {                                                                  |
|                                                                       |
| \# \"statusCode\": 409,                                               |
|                                                                       |
| \# \"error\": \"OFFER_ALREADY_EXISTS\",                               |
|                                                                       |
| \# \"message\": \"An active offer already exists\...\",               |
|                                                                       |
| \# \"timestamp\": \"\...\",                                           |
|                                                                       |
| \# \"path\": \"/v1/offers\",                                          |
|                                                                       |
| \# \"requestId\": \"uuid\"                                            |
|                                                                       |
| \# }                                                                  |
+-----------------------------------------------------------------------+

**Test 4 --- Confirm X-Request-ID is echoed in requestId**

+-----------------------------------------------------------------------+
| \# Send a request with X-Request-ID header                            |
|                                                                       |
| TRACE_ID=\"my-trace-id-12345\"                                        |
|                                                                       |
| curl -s -X POST http://localhost:3005/v1/offers \\                    |
|                                                                       |
| -H \"Content-Type: application/json\" \\                              |
|                                                                       |
| -H \"X-Request-ID: \${TRACE_ID}\" \\                                  |
|                                                                       |
| -d \'{}\' \| jq .requestId                                            |
|                                                                       |
| \# Expected: \"my-trace-id-12345\"                                    |
|                                                                       |
| \# The filter echoes X-Request-ID back in the requestId field         |
|                                                                       |
| \# This is critical for production debugging --- the client can       |
| correlate                                                             |
|                                                                       |
| \# their request to a server-side log entry using this ID             |
+-----------------------------------------------------------------------+

**Test 5 --- Confirm no stack traces in 500 responses**

+-----------------------------------------------------------------------+
| \# Force a 500 by temporarily making the DB unreachable (or break a   |
| service method)                                                       |
|                                                                       |
| \# The response must NOT include:                                     |
|                                                                       |
| \# - stack traces                                                     |
|                                                                       |
| \# - SQL query text                                                   |
|                                                                       |
| \# - Internal variable names                                          |
|                                                                       |
| \# - Database connection strings                                      |
|                                                                       |
| \# Expected 500 response shape:                                       |
|                                                                       |
| \# {                                                                  |
|                                                                       |
| \# \"statusCode\": 500,                                               |
|                                                                       |
| \# \"error\": \"INTERNAL_ERROR\",                                     |
|                                                                       |
| \# \"message\": \"An unexpected error occurred. Please try            |
| again\...\",                                                          |
|                                                                       |
| \# \"timestamp\": \"\...\",                                           |
|                                                                       |
| \# \"path\": \"\...\",                                                |
|                                                                       |
| \# \"requestId\": \"uuid\"                                            |
|                                                                       |
| \# }                                                                  |
|                                                                       |
| \# No \"stack\", \"query\", \"detail\", or \"cause\" fields should be |
| present                                                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| If errors come back in NestJS default format                          |
| ({\"statusCode\":400,\"message\":\"\...\"}) instead of                |
|                                                                       |
| the offer-service envelope: OfferExceptionFilter is not registered    |
| globally.                                                             |
|                                                                       |
| Check that app.useGlobalFilters(new OfferExceptionFilter()) is in     |
| main.ts.                                                              |
|                                                                       |
| If ValidationPipe errors return 400 instead of 422: the filter is     |
| catching the                                                          |
|                                                                       |
| BadRequestException but not detecting the array message format. Check |
| the                                                                   |
|                                                                       |
| Array.isArray((payload as any).message) condition in the filter.      |
|                                                                       |
| If 500 errors include stack traces: the logger.error call runs but    |
| the response                                                          |
|                                                                       |
| still exposes internals. Check that Case 3 in the filter does NOT     |
| spread                                                                |
|                                                                       |
| the exception object into the response. Only send the fixed message   |
| string.                                                               |
+-----------------------------------------------------------------------+
