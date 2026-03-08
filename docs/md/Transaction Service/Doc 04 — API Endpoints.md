**[MARKETEQ BACKEND]{.smallcaps}**

**transaction-service**

**Doc 04 --- API Endpoints**

  -----------------------------------------------------------------------
  **Field**          **Value**
  ------------------ ----------------------------------------------------
  Service Name       transaction-service

  Doc Number         Doc 04

  Prerequisites      Doc 00, Doc 01, Doc 02, Doc 03

  API Prefix         /v1

  Auth               Bearer JWT (all endpoints except /health, /ready)

  Scope              Client-facing only --- this sprint

  Total Endpoints    7 (5 GET, 2 POST)

  Pagination         Cursor-style via page + limit query params
  -----------------------------------------------------------------------

# **1. Purpose**

This document defines all HTTP API endpoints exposed by
transaction-service. Each endpoint section includes the full route
definition, authentication requirements, query parameter specifications,
request body schema where applicable, success response shape, pagination
envelope, and all error responses mapped directly from the error
messages specification.

This document does not cover RabbitMQ consumers, Stripe integration, or
Ably publishing. Those are covered in Doc 05. The endpoints here are the
HTTP surface that the frontend and api-gateway interact with directly.

+-----------------------------------------------------------------------+
| **Prerequisites**                                                     |
|                                                                       |
| The DTOs, entities, and enums defined in Doc 03 are used throughout   |
| this document. All route handlers reference those types directly.     |
| Ensure Doc 03 is fully implemented before building any endpoint in    |
| this document.                                                        |
+=======================================================================+

# **2. Global API Conventions**

## **2.1 Authentication**

All endpoints require a valid JWT bearer token except /health and
/ready. The JWT is issued by auth-service and validated by the
JwtAuthGuard defined below. The userId is extracted from the JWT payload
and used to scope all database queries --- users can only see their own
transactions and invoices.

**/apps/transaction-service/src/guards/jwt-auth.guard.ts**

+-----------------------------------------------------------------------+
| **src/guards/jwt-auth.guard.ts**                                      |
+-----------------------------------------------------------------------+
| import { Injectable, UnauthorizedException } from \'@nestjs/common\'; |
|                                                                       |
| import { AuthGuard } from \'@nestjs/passport\';                       |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class JwtAuthGuard extends AuthGuard(\'jwt\') {                |
|                                                                       |
| handleRequest(err: any, user: any) {                                  |
|                                                                       |
| if (err \|\| !user) {                                                 |
|                                                                       |
| throw new UnauthorizedException({                                     |
|                                                                       |
| code: \'UNAUTHORIZED\',                                               |
|                                                                       |
| message: \'Your session has expired. Please log in again to           |
| continue.\',                                                          |
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
|                                                                       |
| // JWT strategy --- validates token against JWT_SECRET from           |
| ConfigService                                                         |
|                                                                       |
| import { Injectable as Inj } from \'@nestjs/common\';                 |
|                                                                       |
| import { PassportStrategy } from \'@nestjs/passport\';                |
|                                                                       |
| import { ExtractJwt, Strategy } from \'passport-jwt\';                |
|                                                                       |
| import { ConfigService } from \'@nestjs/config\';                     |
|                                                                       |
| \@Inj()                                                               |
|                                                                       |
| export class JwtStrategy extends PassportStrategy(Strategy) {         |
|                                                                       |
| constructor(config: ConfigService) {                                  |
|                                                                       |
| super({                                                               |
|                                                                       |
| jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),             |
|                                                                       |
| ignoreExpiration: false,                                              |
|                                                                       |
| secretOrKey: config.get\<string\>(\'JWT_SECRET\'),                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| async validate(payload: { sub: string; email: string }) {             |
|                                                                       |
| return { userId: payload.sub, email: payload.email };                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.2 Standard Error Response Shape**

All error responses follow this envelope. The code field maps to the
error type and can be used by the frontend to display the correct
user-facing message from the error messages specification.

+-----------------------------------------------------------------------+
| **Error response envelope**                                           |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"code\": \"ERROR_CODE\", // Machine-readable error identifier        |
|                                                                       |
| \"message\": \"User-facing message from error spec\",                 |
|                                                                       |
| \"statusCode\": 400, // HTTP status code                              |
|                                                                       |
| \"details\": {} // Optional --- field-level validation errors         |
|                                                                       |
| }                                                                     |
+=======================================================================+

  ----------------------------------------------------------------------------------
  **HTTP Status** **code**                  **When Used**
  --------------- ------------------------- ----------------------------------------
  400 Bad Request VALIDATION_ERROR          DTO validation failed --- query params
                                            or request body invalid

  401             UNAUTHORIZED              Missing, expired, or invalid JWT token
  Unauthorized                              

  403 Forbidden   FORBIDDEN                 Valid token but insufficient permissions
                                            for this resource

  404 Not Found   NOT_FOUND                 Transaction or invoice ID does not exist
                                            for this user

  409 Conflict    IMMUTABLE_RECORD          Attempt to update a
                                            paid/succeeded/refunded transaction

  422             BUSINESS_RULE_VIOLATION   Valid request but violates a business
  Unprocessable                             rule (e.g., export with zero records)
  Entity                                    

  429 Too Many    RATE_LIMITED              Report a problem submitted too
  Requests                                  frequently (max 3 per transaction)

  500 Internal    INTERNAL_ERROR            Unexpected server error --- details
  Server Error                              omitted in production

  503 Service     SERVICE_UNAVAILABLE       Dependency (DB, Stripe) is unreachable
  Unavailable                               
  ----------------------------------------------------------------------------------

## **2.3 Global Exception Filter**

**/apps/transaction-service/src/filters/http-exception.filter.ts**

+-----------------------------------------------------------------------+
| **src/filters/http-exception.filter.ts**                              |
+-----------------------------------------------------------------------+
| import {                                                              |
|                                                                       |
| ExceptionFilter, Catch, ArgumentsHost,                                |
|                                                                       |
| HttpException, HttpStatus, Logger,                                    |
|                                                                       |
| } from \'@nestjs/common\';                                            |
|                                                                       |
| import { Request, Response } from \'express\';                        |
|                                                                       |
| \@Catch()                                                             |
|                                                                       |
| export class GlobalExceptionFilter implements ExceptionFilter {       |
|                                                                       |
| private readonly logger = new Logger(\'GlobalExceptionFilter\');      |
|                                                                       |
| catch(exception: unknown, host: ArgumentsHost) {                      |
|                                                                       |
| const ctx = host.switchToHttp();                                      |
|                                                                       |
| const response = ctx.getResponse\<Response\>();                       |
|                                                                       |
| const request = ctx.getRequest\<Request\>();                          |
|                                                                       |
| const status = exception instanceof HttpException                     |
|                                                                       |
| ? exception.getStatus()                                               |
|                                                                       |
| : HttpStatus.INTERNAL_SERVER_ERROR;                                   |
|                                                                       |
| const exceptionResponse = exception instanceof HttpException          |
|                                                                       |
| ? exception.getResponse()                                             |
|                                                                       |
| : null;                                                               |
|                                                                       |
| // Never leak stack traces or internal details in production          |
|                                                                       |
| const isProd = process.env.NODE_ENV === \'production\';               |
|                                                                       |
| this.logger.error(                                                    |
|                                                                       |
| \`\${request.method} \${request.url} --- \${status}\`,                |
|                                                                       |
| isProd ? \'\' : (exception instanceof Error ? exception.stack :       |
| String(exception))                                                    |
|                                                                       |
| );                                                                    |
|                                                                       |
| response.status(status).json({                                        |
|                                                                       |
| statusCode: status,                                                   |
|                                                                       |
| code: typeof exceptionResponse === \'object\'                         |
|                                                                       |
| ? (exceptionResponse as any).code ?? \'INTERNAL_ERROR\'               |
|                                                                       |
| : \'INTERNAL_ERROR\',                                                 |
|                                                                       |
| message: typeof exceptionResponse === \'object\'                      |
|                                                                       |
| ? (exceptionResponse as any).message ?? \'An unexpected error         |
| occurred.\'                                                           |
|                                                                       |
| : isProd ? \'An unexpected error occurred.\' : String(exception),     |
|                                                                       |
| details: typeof exceptionResponse === \'object\'                      |
|                                                                       |
| ? (exceptionResponse as any).details ?? undefined                     |
|                                                                       |
| : undefined,                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **2.4 Pagination Response Envelope**

All list endpoints return data wrapped in this pagination envelope. The
frontend uses meta to render page controls.

+-----------------------------------------------------------------------+
| **Pagination envelope**                                               |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"data\": \[\...\], // Array of transaction or invoice objects        |
|                                                                       |
| \"meta\": {                                                           |
|                                                                       |
| \"total\": 247, // Total records matching current filters             |
|                                                                       |
| \"page\": 1, // Current page number                                   |
|                                                                       |
| \"limit\": 10, // Records per page                                    |
|                                                                       |
| \"totalPages\": 25, // Math.ceil(total / limit)                       |
|                                                                       |
| \"hasNextPage\": true, // page \< totalPages                          |
|                                                                       |
| \"hasPreviousPage\": false // page \> 1                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

**/apps/transaction-service/src/dto/pagination.dto.ts**

+-----------------------------------------------------------------------+
| **src/dto/pagination.dto.ts**                                         |
+-----------------------------------------------------------------------+
| export class PaginationMeta {                                         |
|                                                                       |
| total: number;                                                        |
|                                                                       |
| page: number;                                                         |
|                                                                       |
| limit: number;                                                        |
|                                                                       |
| totalPages: number;                                                   |
|                                                                       |
| hasNextPage: boolean;                                                 |
|                                                                       |
| hasPreviousPage: boolean;                                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| export class PaginatedResponseDto\<T\> {                              |
|                                                                       |
| data: T\[\];                                                          |
|                                                                       |
| meta: PaginationMeta;                                                 |
|                                                                       |
| static of\<T\>(data: T\[\], total: number, page: number, limit:       |
| number): PaginatedResponseDto\<T\> {                                  |
|                                                                       |
| const totalPages = Math.ceil(total / limit);                          |
|                                                                       |
| return {                                                              |
|                                                                       |
| data,                                                                 |
|                                                                       |
| meta: {                                                               |
|                                                                       |
| total,                                                                |
|                                                                       |
| page,                                                                 |
|                                                                       |
| limit,                                                                |
|                                                                       |
| totalPages,                                                           |
|                                                                       |
| hasNextPage: page \< totalPages,                                      |
|                                                                       |
| hasPreviousPage: page \> 1,                                           |
|                                                                       |
| },                                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **3. Endpoint Reference**

  ---------------------------------------------------------------------------------------------
  **\#**   **Method**   **Path**                       **Summary**                 **Auth**
  -------- ------------ ------------------------------ --------------------------- ------------
  3.1      GET          /v1/transactions               Paginated, filtered,        Bearer JWT
                                                       searchable transaction list 

  3.2      GET          /v1/transactions/:id           Single transaction with     Bearer JWT
                                                       full detail                 

  3.3      GET          /v1/transactions/:id/receipt   Download transaction        Bearer JWT
                                                       receipt as PDF              

  3.4      GET          /v1/invoices                   Paginated, filtered invoice Bearer JWT
                                                       list                        

  3.5      GET          /v1/invoices/:id               Single invoice detail with  Bearer JWT
                                                       Stripe hosted URL           

  3.6      POST         /v1/transactions/export        Trigger CSV or PDF export   Bearer JWT
                                                       of filtered transactions or 
                                                       invoices                    

  3.7      POST         /v1/transactions/:id/report    Submit a Report a Problem   Bearer JWT
                                                       against a transaction       
  ---------------------------------------------------------------------------------------------

# **3.1 GET /v1/transactions**

+-----------------------------------------------------------------------+
| **GET /v1/transactions**                                              |
|                                                                       |
| *Returns a paginated, filterable, searchable list of transactions for |
| the authenticated user. All filters use AND logic.*                   |
+=======================================================================+

## **Query Parameters**

  -------------------------------------------------------------------------------------------------------
  **Parameter**       **Type**   **Required**   **Default**   **Validation**      **Description**
  ------------------- ---------- -------------- ------------- ------------------- -----------------------
  page                integer    No             1             Min: 1              Page number to return

  limit               integer    No             10            Min: 1, Max: 100    Records per page

  dateFrom            string     No             ---           ISO date YYYY-MM-DD Filter start date
                                                                                  (inclusive)

  dateTo              string     No             ---           ISO date YYYY-MM-DD Filter end date
                                                                                  (inclusive)

  type                string     No             ---           TransactionType     Filter by transaction
                                                              enum                type

  contractId          string     No             ---           Valid UUID          Filter by contract ID
                      (UUID)                                                      

  paymentMethodType   string     No             ---           PaymentMethodType   Filter by payment
                                                              enum                method type

  search              string     No             ---           MinLength: 2,       Full-text search across
                                                              trimmed             description, invoice
                                                                                  number, amount,
                                                                                  contractor handle
  -------------------------------------------------------------------------------------------------------

## **Controller**

**/apps/transaction-service/src/controllers/transaction.controller.ts**

+-----------------------------------------------------------------------+
| **src/controllers/transaction.controller.ts**                         |
+-----------------------------------------------------------------------+
| import { Controller, Get, Param, Query, UseGuards, Req,               |
|                                                                       |
| Post, Body, Res, HttpCode, HttpStatus } from \'@nestjs/common\';      |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { TransactionService } from                                    |
| \'../services/transaction.service\';                                  |
|                                                                       |
| import { TransactionFilterDto, ReportTransactionDto } from            |
| \'../dto/transaction.dto\';                                           |
|                                                                       |
| import { Request, Response } from \'express\';                        |
|                                                                       |
| \@Controller(\'transactions\')                                        |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class TransactionController {                                  |
|                                                                       |
| constructor(private readonly transactionService: TransactionService)  |
| {}                                                                    |
|                                                                       |
| // ── 3.1 List transactions                                           |
| ──────────────────────────────────────────                            |
|                                                                       |
| \@Get()                                                               |
|                                                                       |
| async list(                                                           |
|                                                                       |
| \@Query() filters: TransactionFilterDto,                              |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.transactionService.findAll(userId, filters);              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── 3.2 Single transaction detail                                   |
| ──────────────────────────────────                                    |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| async detail(                                                         |
|                                                                       |
| \@Param(\'id\') id: string,                                           |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.transactionService.findOne(id, userId);                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── 3.3 Download receipt                                            |
| ───────────────────────────────────────────                           |
|                                                                       |
| \@Get(\':id/receipt\')                                                |
|                                                                       |
| async receipt(                                                        |
|                                                                       |
| \@Param(\'id\') id: string,                                           |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| \@Res() res: Response,                                                |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| const { buffer, filename } = await                                    |
| this.transactionService.getReceipt(id, userId);                       |
|                                                                       |
| res.set({                                                             |
|                                                                       |
| \'Content-Type\': \'application/pdf\',                                |
|                                                                       |
| \'Content-Disposition\': \`attachment; filename=\"\${filename}\"\`,   |
|                                                                       |
| });                                                                   |
|                                                                       |
| res.send(buffer);                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── 3.6 Export                                                      |
| ─────────────────────────────────────────────────────                 |
|                                                                       |
| \@Post(\'export\')                                                    |
|                                                                       |
| \@HttpCode(HttpStatus.ACCEPTED)                                       |
|                                                                       |
| async export(                                                         |
|                                                                       |
| \@Body() dto: ExportRequestDto,                                       |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.exportService.triggerExport(userId, dto);                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| // ── 3.7 Report a problem                                            |
| ───────────────────────────────────────────                           |
|                                                                       |
| \@Post(\':id/report\')                                                |
|                                                                       |
| \@HttpCode(HttpStatus.CREATED)                                        |
|                                                                       |
| async report(                                                         |
|                                                                       |
| \@Param(\'id\') id: string,                                           |
|                                                                       |
| \@Body() dto: ReportTransactionDto,                                   |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.transactionService.submitReport(id, userId, dto);         |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Service --- findAll**

**/apps/transaction-service/src/services/transaction.service.ts
(findAll)**

+-----------------------------------------------------------------------+
| **src/services/transaction.service.ts --- findAll**                   |
+-----------------------------------------------------------------------+
| import { Injectable, NotFoundException, BadRequestException,          |
|                                                                       |
| UnprocessableEntityException, ForbiddenException } from               |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository, SelectQueryBuilder } from \'typeorm\';           |
|                                                                       |
| import { plainToInstance } from \'class-transformer\';                |
|                                                                       |
| import { Transaction } from \'../entities/transaction.entity\';       |
|                                                                       |
| import { TransactionFilterDto, TransactionResponseDto,                |
|                                                                       |
| ReportTransactionDto } from \'../dto/transaction.dto\';               |
|                                                                       |
| import { PaginatedResponseDto } from \'../dto/pagination.dto\';       |
|                                                                       |
| import { IMMUTABLE_STATUSES } from \'../entities/enums\';             |
|                                                                       |
| import { AuditService } from \'./audit.service\';                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class TransactionService {                                     |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(Transaction)                                       |
|                                                                       |
| private readonly repo: Repository\<Transaction\>,                     |
|                                                                       |
| private readonly auditService: AuditService,                          |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async findAll(                                                        |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| filters: TransactionFilterDto,                                        |
|                                                                       |
| ): Promise\<PaginatedResponseDto\<TransactionResponseDto\>\> {        |
|                                                                       |
| // Validate date range cross-field constraints                        |
|                                                                       |
| if (filters.dateFrom && filters.dateTo) {                             |
|                                                                       |
| if (new Date(filters.dateFrom) \> new Date(filters.dateTo)) {         |
|                                                                       |
| throw new BadRequestException({                                       |
|                                                                       |
| code: \'VALIDATION_ERROR\',                                           |
|                                                                       |
| message: \'Your start date cannot be after your end date. Please      |
| adjust your selection.\',                                             |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (filters.dateFrom && new Date(filters.dateFrom) \> new Date()) {   |
|                                                                       |
| throw new BadRequestException({                                       |
|                                                                       |
| code: \'VALIDATION_ERROR\',                                           |
|                                                                       |
| message: \'Start date cannot be in the future.\',                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| const qb = this.repo.createQueryBuilder(\'t\')                        |
|                                                                       |
| .where(\'t.user_id = :userId\', { userId })                           |
|                                                                       |
| .orderBy(\'t.date\', \'DESC\')                                        |
|                                                                       |
| .addOrderBy(\'t.created_at\', \'DESC\');                              |
|                                                                       |
| // Apply all filters --- AND logic (each filter narrows the result    |
| set)                                                                  |
|                                                                       |
| if (filters.dateFrom) {                                               |
|                                                                       |
| qb.andWhere(\'t.date \>= :dateFrom\', { dateFrom: filters.dateFrom    |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (filters.dateTo) {                                                 |
|                                                                       |
| qb.andWhere(\'t.date \<= :dateTo\', { dateTo: filters.dateTo });      |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (filters.type) {                                                   |
|                                                                       |
| qb.andWhere(\'t.description_type = :type\', { type: filters.type });  |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (filters.contractId) {                                             |
|                                                                       |
| qb.andWhere(\'t.contract_id = :contractId\', { contractId:            |
| filters.contractId });                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| if (filters.paymentMethodType) {                                      |
|                                                                       |
| qb.andWhere(\'t.payment_method_type = :pmt\', { pmt:                  |
| filters.paymentMethodType });                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Full-text search across all visible fields                         |
|                                                                       |
| if (filters.search) {                                                 |
|                                                                       |
| const term = \`%\${filters.search.toLowerCase()}%\`;                  |
|                                                                       |
| qb.andWhere(                                                          |
|                                                                       |
| \`(LOWER(t.description_project_name) LIKE :term                       |
|                                                                       |
| OR LOWER(t.description_contractor_handle) LIKE :term                  |
|                                                                       |
| OR LOWER(t.invoice_number) LIKE :term                                 |
|                                                                       |
| OR CAST(t.amount AS TEXT) LIKE :term                                  |
|                                                                       |
| OR LOWER(t.transaction_id) LIKE :term)\`,                             |
|                                                                       |
| { term }                                                              |
|                                                                       |
| );                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| const page = filters.page ?? 1;                                       |
|                                                                       |
| const limit = filters.limit ?? 10;                                    |
|                                                                       |
| qb.skip((page - 1) \* limit).take(limit);                             |
|                                                                       |
| const \[items, total\] = await qb.getManyAndCount();                  |
|                                                                       |
| const dtos = items.map(item =\>                                       |
|                                                                       |
| plainToInstance(TransactionResponseDto, item, {                       |
| excludeExtraneousValues: true })                                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| return PaginatedResponseDto.of(dtos, total, page, limit);             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Response --- 200 OK**

+-----------------------------------------------------------------------+
| **200 OK --- GET /v1/transactions**                                   |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"data\": \[                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"transactionId\": \"1234567890\",                                    |
|                                                                       |
| \"date\": \"2025-04-02\",                                             |
|                                                                       |
| \"descriptionType\": \"monthly_installment\",                         |
|                                                                       |
| \"descriptionProjectName\": \"UX Audit Project\",                     |
|                                                                       |
| \"descriptionContractorHandle\": null,                                |
|                                                                       |
| \"descriptionBillingPeriod\": \"November 2025\",                      |
|                                                                       |
| \"descriptionHours\": null,                                           |
|                                                                       |
| \"descriptionMonths\": null,                                          |
|                                                                       |
| \"invoiceNumber\": \"#34567\",                                        |
|                                                                       |
| \"amount\": 515.00,                                                   |
|                                                                       |
| \"amountDirection\": \"debit\",                                       |
|                                                                       |
| \"status\": \"paid\",                                                 |
|                                                                       |
| \"paymentMethodType\": \"bank_ach\",                                  |
|                                                                       |
| \"paymentMethodLabel\": \"Chase Bank\",                               |
|                                                                       |
| \"paymentMethodIdentifier\": \"4553\",                                |
|                                                                       |
| \"contractType\": \"project\",                                        |
|                                                                       |
| \"billingFrequency\": \"monthly\",                                    |
|                                                                       |
| \"membershipTier\": null,                                             |
|                                                                       |
| \"paidAt\": \"2025-04-02T10:30:00.000Z\",                             |
|                                                                       |
| \"parentTransactionId\": null                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"meta\": {                                                           |
|                                                                       |
| \"total\": 47,                                                        |
|                                                                       |
| \"page\": 1,                                                          |
|                                                                       |
| \"limit\": 10,                                                        |
|                                                                       |
| \"totalPages\": 5,                                                    |
|                                                                       |
| \"hasNextPage\": true,                                                |
|                                                                       |
| \"hasPreviousPage\": false                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Error Responses --- GET /v1/transactions**

  --------------------------------------------------------------------------------
  **Status**   **code**           **Condition**       **User-Facing Message**
  ------------ ------------------ ------------------- ----------------------------
  400          VALIDATION_ERROR   search \< 2         Please enter a valid search
                                  characters or       term.
                                  whitespace only     

  400          VALIDATION_ERROR   dateFrom after      Your start date cannot be
                                  dateTo              after your end date. Please
                                                      adjust your selection.

  400          VALIDATION_ERROR   dateTo before       Your end date cannot be
                                  dateFrom            before your start date.
                                                      Please adjust your
                                                      selection.

  400          VALIDATION_ERROR   dateFrom is a       Start date cannot be in the
                                  future date         future.

  400          VALIDATION_ERROR   Invalid enum value  Invalid transaction type
                                  for type or         filter value.
                                  paymentMethodType   

  400          VALIDATION_ERROR   contractId is not a Invalid contract identifier.
                                  valid UUID          

  400          VALIDATION_ERROR   page or limit       Page number must be a
                                  outside allowed     positive integer.
                                  range               

  401          UNAUTHORIZED       Missing or expired  Your session has expired.
                                  JWT                 Please log in again to
                                                      continue.

  500          INTERNAL_ERROR     Database or query   We are having trouble
                                  failure             loading your transactions.
                                                      Please refresh the page.
  --------------------------------------------------------------------------------

# **3.2 GET /v1/transactions/:id**

+-----------------------------------------------------------------------+
| **GET /v1/transactions/:id**                                          |
|                                                                       |
| *Returns a single transaction with its full detail record for the     |
| Transaction Detail modal. Logs an audit entry on every call.*         |
+=======================================================================+

## **Path Parameters**

  ---------------------------------------------------------------------------------
  **Parameter**   **Type**     **Required**   **Description**
  --------------- ------------ -------------- -------------------------------------
  id              string       Yes            The UUID primary key of the
                  (UUID)                      transaction record

  ---------------------------------------------------------------------------------

## **Service --- findOne**

+-----------------------------------------------------------------------+
| **transaction.service.ts --- findOne**                                |
+-----------------------------------------------------------------------+
| async findOne(id: string, userId: string):                            |
| Promise\<TransactionDetailResponseDto\> {                             |
|                                                                       |
| const transaction = await this.repo.findOne({                         |
|                                                                       |
| where: { id, userId },                                                |
|                                                                       |
| relations: \[\'detail\', \'contract\'\],                              |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!transaction) {                                                   |
|                                                                       |
| throw new NotFoundException({                                         |
|                                                                       |
| code: \'NOT_FOUND\',                                                  |
|                                                                       |
| message: \'We could not load the details for this transaction. Please |
| try again.\',                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Log audit entry --- every transaction detail view is recorded      |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| action: \'VIEW_TRANSACTION_DETAIL\',                                  |
|                                                                       |
| transactionId: id,                                                    |
|                                                                       |
| userId,                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| return plainToInstance(TransactionDetailResponseDto, transaction, {   |
|                                                                       |
| excludeExtraneousValues: true,                                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Response --- 200 OK**

+-----------------------------------------------------------------------+
| **200 OK --- GET /v1/transactions/:id**                               |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"transactionId\": \"1234567890\",                                    |
|                                                                       |
| \"date\": \"2025-04-02\",                                             |
|                                                                       |
| \"descriptionType\": \"monthly_installment\",                         |
|                                                                       |
| \"descriptionProjectName\": \"UX Audit Project\",                     |
|                                                                       |
| \"descriptionBillingPeriod\": \"November 2025\",                      |
|                                                                       |
| \"invoiceNumber\": \"#34567\",                                        |
|                                                                       |
| \"amount\": 515.00,                                                   |
|                                                                       |
| \"amountDirection\": \"debit\",                                       |
|                                                                       |
| \"status\": \"paid\",                                                 |
|                                                                       |
| \"paymentMethodType\": \"bank_ach\",                                  |
|                                                                       |
| \"paymentMethodLabel\": \"Chase Bank\",                               |
|                                                                       |
| \"paymentMethodIdentifier\": \"4553\",                                |
|                                                                       |
| \"contractType\": \"project\",                                        |
|                                                                       |
| \"paidAt\": \"2025-07-20T10:30:00.000Z\",                             |
|                                                                       |
| \"parentTransactionId\": null,                                        |
|                                                                       |
| \"detail\": {                                                         |
|                                                                       |
| \"accountLabel\": \"Chase Bank \...4553\",                            |
|                                                                       |
| \"transactionTypeLabel\": \"Installment Payment\",                    |
|                                                                       |
| \"amount\": 515.00,                                                   |
|                                                                       |
| \"paidAt\": \"2025-07-20T10:30:00.000Z\",                             |
|                                                                       |
| \"installmentLabel\": \"Monthly installment\",                        |
|                                                                       |
| \"descriptionFull\": \"Monthly installment for UX Audit Project       |
| November 2025 Invoice #34567\",                                       |
|                                                                       |
| \"disclaimerText\": \"Transaction details are provided for reference  |
| and may be preliminary\...\"                                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Error Responses --- GET /v1/transactions/:id**

  -------------------------------------------------------------------------------
  **Status**   **code**         **Condition**        **User-Facing Message**
  ------------ ---------------- -------------------- ----------------------------
  401          UNAUTHORIZED     Missing or expired   Your session has expired.
                                JWT                  Please log in again to
                                                     continue.

  404          NOT_FOUND        ID not found or      We could not load the
                                belongs to different details for this
                                user                 transaction. Please try
                                                     again.

  500          INTERNAL_ERROR   Database failure     We could not load the
                                                     details for this
                                                     transaction. Please try
                                                     again.
  -------------------------------------------------------------------------------

# **3.3 GET /v1/transactions/:id/receipt**

+-----------------------------------------------------------------------+
| **GET /v1/transactions/:id/receipt**                                  |
|                                                                       |
| *Downloads a PDF receipt for the transaction. Disabled for            |
| transactions in Processing or Pending status.*                        |
+=======================================================================+

## **Path Parameters**

  ---------------------------------------------------------------------------------
  **Parameter**   **Type**     **Required**   **Description**
  --------------- ------------ -------------- -------------------------------------
  id              string       Yes            UUID of the transaction for which to
                  (UUID)                      generate a receipt

  ---------------------------------------------------------------------------------

## **Service --- getReceipt**

+-----------------------------------------------------------------------+
| **transaction.service.ts --- getReceipt**                             |
+-----------------------------------------------------------------------+
| async getReceipt(id: string, userId: string): Promise\<{ buffer:      |
| Buffer; filename: string }\> {                                        |
|                                                                       |
| const transaction = await this.repo.findOne({                         |
|                                                                       |
| where: { id, userId },                                                |
|                                                                       |
| relations: \[\'detail\'\],                                            |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!transaction) {                                                   |
|                                                                       |
| throw new NotFoundException({                                         |
|                                                                       |
| code: \'NOT_FOUND\',                                                  |
|                                                                       |
| message: \'We could not load the details for this transaction. Please |
| try again.\',                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Receipt not available for non-terminal statuses                    |
|                                                                       |
| const receiptBlockedStatuses = \[\'processing\', \'pending\',         |
| \'payment_pending\', \'scheduled\'\];                                 |
|                                                                       |
| if (receiptBlockedStatuses.includes(transaction.status)) {            |
|                                                                       |
| throw new UnprocessableEntityException({                              |
|                                                                       |
| code: \'BUSINESS_RULE_VIOLATION\',                                    |
|                                                                       |
| message: \'Your receipt will be available once this payment is        |
| complete.\',                                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // PDF generation --- implementation uses pdfkit or similar           |
|                                                                       |
| // Full PDF template implementation is in Doc 05                      |
|                                                                       |
| const buffer = await this.generateReceiptPdf(transaction);            |
|                                                                       |
| const filename =                                                      |
| \`receipt-\${transaction.transactionId}-\${transaction.date}.pdf\`;   |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| action: \'DOWNLOAD_RECEIPT\',                                         |
|                                                                       |
| transactionId: id,                                                    |
|                                                                       |
| userId,                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| return { buffer, filename };                                          |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Response --- 200 OK**

Returns a binary PDF file stream with the following headers:

+-----------------------------------------------------------------------+
| **Response headers**                                                  |
+-----------------------------------------------------------------------+
| Content-Type: application/pdf                                         |
|                                                                       |
| Content-Disposition: attachment;                                      |
| filename=\"receipt-1234567890-2025-04-02.pdf\"                        |
+=======================================================================+

## **Error Responses --- GET /v1/transactions/:id/receipt**

  ----------------------------------------------------------------------------------------
  **Status**   **code**                  **Condition**        **User-Facing Message**
  ------------ ------------------------- -------------------- ----------------------------
  401          UNAUTHORIZED              Missing or expired   Your session has expired.
                                         JWT                  Please log in again to
                                                              continue.

  404          NOT_FOUND                 Transaction not      We could not load the
                                         found for this user  details for this
                                                              transaction. Please try
                                                              again.

  422          BUSINESS_RULE_VIOLATION   Transaction status   Your receipt will be
                                         is processing,       available once this payment
                                         pending, or          is complete.
                                         payment_pending      

  500          INTERNAL_ERROR            PDF generation       We could not generate your
                                         failure              receipt. Please try again.
  ----------------------------------------------------------------------------------------

# **3.4 GET /v1/invoices**

+-----------------------------------------------------------------------+
| **GET /v1/invoices**                                                  |
|                                                                       |
| *Returns a paginated, filterable list of invoices for the             |
| authenticated user. Filters by status, contract, and date range.*     |
+=======================================================================+

## **Query Parameters**

  ------------------------------------------------------------------------------------------------
  **Parameter**   **Type**   **Required**   **Default**   **Validation**   **Description**
  --------------- ---------- -------------- ------------- ---------------- -----------------------
  page            integer    No             1             Min: 1           Page number

  limit           integer    No             10            Min: 1, Max: 100 Records per page

  dateFrom        string     No             ---           ISO date         Filter start date
                                                          YYYY-MM-DD       (date_issued)

  dateTo          string     No             ---           ISO date         Filter end date
                                                          YYYY-MM-DD       (date_issued)

  status          string     No             ---           InvoiceStatus    Filter by invoice
                                                          enum             status

  contractId      string     No             ---           Valid UUID       Filter by contract
                  (UUID)                                                   

  search          string     No             ---           MinLength: 2     Search invoice ID,
                                                                           description, billing
                                                                           period
  ------------------------------------------------------------------------------------------------

## **Controller**

**/apps/transaction-service/src/controllers/invoice.controller.ts**

+-----------------------------------------------------------------------+
| **src/controllers/invoice.controller.ts**                             |
+-----------------------------------------------------------------------+
| import { Controller, Get, Param, Query, UseGuards, Req } from         |
| \'@nestjs/common\';                                                   |
|                                                                       |
| import { JwtAuthGuard } from \'../guards/jwt-auth.guard\';            |
|                                                                       |
| import { InvoiceService } from \'../services/invoice.service\';       |
|                                                                       |
| import { InvoiceFilterDto } from \'../dto/filter.dto\';               |
|                                                                       |
| import { Request } from \'express\';                                  |
|                                                                       |
| \@Controller(\'invoices\')                                            |
|                                                                       |
| \@UseGuards(JwtAuthGuard)                                             |
|                                                                       |
| export class InvoiceController {                                      |
|                                                                       |
| constructor(private readonly invoiceService: InvoiceService) {}       |
|                                                                       |
| \@Get()                                                               |
|                                                                       |
| async list(                                                           |
|                                                                       |
| \@Query() filters: InvoiceFilterDto,                                  |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.invoiceService.findAll(userId, filters);                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Get(\':id\')                                                        |
|                                                                       |
| async detail(                                                         |
|                                                                       |
| \@Param(\'id\') id: string,                                           |
|                                                                       |
| \@Req() req: Request,                                                 |
|                                                                       |
| ) {                                                                   |
|                                                                       |
| const userId = (req.user as any).userId;                              |
|                                                                       |
| return this.invoiceService.findOne(id, userId);                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Overdue Invoice Auto-Escalation**

When the invoices list is queried, any invoice with due_date \< today
and status NOT IN (paid, partially_paid, cancelled) is automatically
surfaced as overdue in the response. The database status is updated by a
nightly scheduled job (defined in Doc 06). The query applies an override
at read time to catch any invoices the nightly job has not yet
processed:

+-----------------------------------------------------------------------+
| **Overdue status override at read time**                              |
+-----------------------------------------------------------------------+
| // In InvoiceService.findAll --- applied before returning results     |
|                                                                       |
| // Overrides status to \'overdue\' in the response for past-due       |
| unpaid invoices                                                       |
|                                                                       |
| // Database update happens via nightly cron --- see Doc 06            |
|                                                                       |
| const today = new Date().toISOString().split(\'T\')\[0\];             |
|                                                                       |
| qb.addSelect(                                                         |
|                                                                       |
| \`CASE WHEN i.due_date \< \'\${today}\'                               |
|                                                                       |
| AND i.status NOT IN (\'paid\',\'partially_paid\',\'cancelled\')       |
|                                                                       |
| THEN \'overdue\' ELSE i.status END\`,                                 |
|                                                                       |
| \'effective_status\'                                                  |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **Success Response --- 200 OK**

+-----------------------------------------------------------------------+
| **200 OK --- GET /v1/invoices**                                       |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"data\": \[                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"invoiceId\": \"INV-2023-001\",                                      |
|                                                                       |
| \"dateIssued\": \"2025-04-02\",                                       |
|                                                                       |
| \"descriptionType\": \"Monthly installment for UX Audit Project\",    |
|                                                                       |
| \"descriptionBillingPeriod\": \"November 2025\",                      |
|                                                                       |
| \"dueDate\": \"2025-01-09\",                                          |
|                                                                       |
| \"status\": \"paid\",                                                 |
|                                                                       |
| \"amount\": 55000.00                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"meta\": {                                                           |
|                                                                       |
| \"total\": 7,                                                         |
|                                                                       |
| \"page\": 1,                                                          |
|                                                                       |
| \"limit\": 10,                                                        |
|                                                                       |
| \"totalPages\": 1,                                                    |
|                                                                       |
| \"hasNextPage\": false,                                               |
|                                                                       |
| \"hasPreviousPage\": false                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Error Responses --- GET /v1/invoices**

  ----------------------------------------------------------------------------------
  **Status**   **code**           **Condition**         **User-Facing Message**
  ------------ ------------------ --------------------- ----------------------------
  400          VALIDATION_ERROR   search \< 2           Please enter a valid search
                                  characters            term.

  400          VALIDATION_ERROR   dateFrom after dateTo Your start date cannot be
                                                        after your end date. Please
                                                        adjust your selection.

  400          VALIDATION_ERROR   Invalid InvoiceStatus Invalid status filter value.
                                  enum value            

  401          UNAUTHORIZED       Missing or expired    Your session has expired.
                                  JWT                   Please log in again to
                                                        continue.

  500          INTERNAL_ERROR     Database failure      We are having trouble
                                                        loading your invoices.
                                                        Please refresh the page.
  ----------------------------------------------------------------------------------

# **3.5 GET /v1/invoices/:id**

+-----------------------------------------------------------------------+
| **GET /v1/invoices/:id**                                              |
|                                                                       |
| *Returns a single invoice with Stripe hosted invoice URL and PDF URL  |
| for the Invoice Detail modal.*                                        |
+=======================================================================+

## **Service --- findOne**

+-----------------------------------------------------------------------+
| **invoice.service.ts --- findOne**                                    |
+-----------------------------------------------------------------------+
| // InvoiceService.findOne                                             |
|                                                                       |
| async findOne(id: string, userId: string):                            |
| Promise\<InvoiceDetailResponseDto\> {                                 |
|                                                                       |
| const invoice = await this.repo.findOne({                             |
|                                                                       |
| where: { id, userId },                                                |
|                                                                       |
| relations: \[\'contract\'\],                                          |
|                                                                       |
| });                                                                   |
|                                                                       |
| if (!invoice) {                                                       |
|                                                                       |
| throw new NotFoundException({                                         |
|                                                                       |
| code: \'NOT_FOUND\',                                                  |
|                                                                       |
| message: \'This invoice ID appears to be invalid. Please contact      |
| support if you believe this is an error.\',                           |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Retrieve Stripe hosted invoice URLs if stripe_invoice_id is        |
| present                                                               |
|                                                                       |
| let stripeHostedUrl: string \| null = null;                           |
|                                                                       |
| let stripePdfUrl: string \| null = null;                              |
|                                                                       |
| if (invoice.stripeInvoiceId) {                                        |
|                                                                       |
| try {                                                                 |
|                                                                       |
| const stripeInvoice = await this.stripeClient.get(                    |
|                                                                       |
| \`https://api.stripe.com/v1/invoices/\${invoice.stripeInvoiceId}\`,   |
|                                                                       |
| { headers: { Authorization: \`Bearer                                  |
| \${this.config.get(\'STRIPE_SECRET_KEY\')}\` } }                      |
|                                                                       |
| );                                                                    |
|                                                                       |
| stripeHostedUrl = stripeInvoice.data.hosted_invoice_url;              |
|                                                                       |
| stripePdfUrl = stripeInvoice.data.invoice_pdf;                        |
|                                                                       |
| } catch {                                                             |
|                                                                       |
| // Non-fatal --- invoice detail returns without Stripe URLs           |
|                                                                       |
| // Frontend renders available data and omits download button          |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| action: \'VIEW_INVOICE_DETAIL\',                                      |
|                                                                       |
| invoiceId: id,                                                        |
|                                                                       |
| userId,                                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| return plainToInstance(InvoiceResponseDto, {                          |
|                                                                       |
| \...invoice,                                                          |
|                                                                       |
| stripeHostedUrl,                                                      |
|                                                                       |
| stripePdfUrl,                                                         |
|                                                                       |
| }, { excludeExtraneousValues: true });                                |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Response --- 200 OK**

+-----------------------------------------------------------------------+
| **200 OK --- GET /v1/invoices/:id**                                   |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"id\": \"uuid\",                                                     |
|                                                                       |
| \"invoiceId\": \"INV-2023-001\",                                      |
|                                                                       |
| \"dateIssued\": \"2025-04-02\",                                       |
|                                                                       |
| \"descriptionType\": \"Monthly installment for UX Audit Project\",    |
|                                                                       |
| \"descriptionBillingPeriod\": \"November 2025\",                      |
|                                                                       |
| \"dueDate\": \"2025-01-09\",                                          |
|                                                                       |
| \"status\": \"paid\",                                                 |
|                                                                       |
| \"amount\": 55000.00,                                                 |
|                                                                       |
| \"stripeHostedUrl\":                                                  |
| \"https://invoice.stripe.com/i/acct_xxx/live_xxx\",                   |
|                                                                       |
| \"stripePdfUrl\":                                                     |
| \"https://pay.stripe.com/invoice/acct_xxx/live_xxx/pdf\"              |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Stripe URL Availability**                                           |
|                                                                       |
| stripeHostedUrl and stripePdfUrl will be null if the invoice was not  |
| created via Stripe (e.g., wire transfer invoices confirmed via        |
| Airtable). The frontend must handle null gracefully by hiding the     |
| download and view buttons rather than showing broken links.           |
+=======================================================================+

## **Error Responses --- GET /v1/invoices/:id**

  -------------------------------------------------------------------------------------
  **Status**   **code**              **Condition**         **User-Facing Message**
  ------------ --------------------- --------------------- ----------------------------
  401          UNAUTHORIZED          Missing or expired    Your session has expired.
                                     JWT                   Please log in again to
                                                           continue.

  404          NOT_FOUND             Invoice not found for This invoice ID appears to
                                     this user             be invalid. Please contact
                                                           support if you believe this
                                                           is an error.

  503          SERVICE_UNAVAILABLE   Stripe API            Invoice details loaded.
                                     unreachable ---       Download link temporarily
                                     invoice still         unavailable.
                                     returned without URLs 
  -------------------------------------------------------------------------------------

# **3.6 POST /v1/transactions/export**

+-----------------------------------------------------------------------+
| **POST /v1/transactions/export**                                      |
|                                                                       |
| *Triggers a CSV or PDF export of transactions or invoices matching    |
| the provided filters. Returns 202 Accepted immediately. Small exports |
| are synchronous; large exports queue and deliver via email.*          |
+=======================================================================+

## **Request Body**

+-----------------------------------------------------------------------+
| **POST /v1/transactions/export --- request body**                     |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"format\": \"csv\", // Required --- \'csv\' or \'pdf\'               |
|                                                                       |
| \"scope\": \"transactions\", // Required --- \'transactions\' or      |
| \'invoices\'                                                          |
|                                                                       |
| \"dateFrom\": \"2025-01-01\", // Optional --- same filters as list    |
| endpoints                                                             |
|                                                                       |
| \"dateTo\": \"2025-12-31\",                                           |
|                                                                       |
| \"type\": \"monthly_installment\",                                    |
|                                                                       |
| \"contractId\": \"uuid\",                                             |
|                                                                       |
| \"paymentMethodType\": \"bank_ach\",                                  |
|                                                                       |
| \"search\": \"UX Audit\"                                              |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Service --- triggerExport**

+-----------------------------------------------------------------------+
| **export.service.ts --- triggerExport**                               |
+-----------------------------------------------------------------------+
| // ExportService.triggerExport                                        |
|                                                                       |
| async triggerExport(userId: string, dto: ExportRequestDto) {          |
|                                                                       |
| // Count records matching filters before generating                   |
|                                                                       |
| const count = dto.scope === \'transactions\'                          |
|                                                                       |
| ? await this.transactionService.countFiltered(userId, dto)            |
|                                                                       |
| : await this.invoiceService.countFiltered(userId, dto);               |
|                                                                       |
| if (count === 0) {                                                    |
|                                                                       |
| throw new UnprocessableEntityException({                              |
|                                                                       |
| code: \'BUSINESS_RULE_VIOLATION\',                                    |
|                                                                       |
| message: \'There is nothing to export. Try adjusting your filters to  |
| include more transactions.\',                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Synchronous export for small datasets                              |
|                                                                       |
| const SYNC_THRESHOLD = 1000;                                          |
|                                                                       |
| if (count \<= SYNC_THRESHOLD) {                                       |
|                                                                       |
| return this.generateSyncExport(userId, dto);                          |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Async export --- queue job, notify user via email when ready       |
|                                                                       |
| await this.queueAsyncExport(userId, dto, count);                      |
|                                                                       |
| return {                                                              |
|                                                                       |
| queued: true,                                                         |
|                                                                       |
| message: \`Your export is too large to download instantly. We will    |
| email it to you when it is ready.\`,                                  |
|                                                                       |
| estimatedRecords: count,                                              |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| private async generateSyncExport(userId: string, dto:                 |
| ExportRequestDto) {                                                   |
|                                                                       |
| const filename = \`\${dto.scope}-export-\${new                        |
| Date().toISOString().split(\'T\')\[0\]}.\${dto.format}\`;             |
|                                                                       |
| // CSV and PDF generation implementation covered in Doc 05            |
|                                                                       |
| const buffer = dto.format === \'csv\'                                 |
|                                                                       |
| ? await this.generateCsv(userId, dto)                                 |
|                                                                       |
| : await this.generatePdf(userId, dto);                                |
|                                                                       |
| await this.auditService.log({ action: \'EXPORT\', userId, scope:      |
| dto.scope, format: dto.format });                                     |
|                                                                       |
| return { buffer, filename, queued: false };                           |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Responses**

+-----------------------------------------------------------------------+
| **202 Accepted --- POST /v1/transactions/export**                     |
+-----------------------------------------------------------------------+
| // Synchronous export (\<=1000 records) --- 202 Accepted              |
|                                                                       |
| // Returns file buffer directly --- frontend triggers download        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"queued\": false,                                                    |
|                                                                       |
| \"filename\": \"transactions-export-2025-04-02.csv\"                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Async export (\>1000 records) --- 202 Accepted                     |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"queued\": true,                                                     |
|                                                                       |
| \"message\": \"Your export is too large to download instantly. We     |
| will email it to you when it is ready.\",                             |
|                                                                       |
| \"estimatedRecords\": 4823                                            |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Error Responses --- POST /v1/transactions/export**

  -----------------------------------------------------------------------------------------
  **Status**   **code**                  **Condition**         **User-Facing Message**
  ------------ ------------------------- --------------------- ----------------------------
  400          VALIDATION_ERROR          format or scope not a Invalid export format. Use
                                         valid enum value      csv or pdf.

  401          UNAUTHORIZED              Missing or expired    Your session has expired.
                                         JWT                   Please log in again to
                                                               continue.

  422          BUSINESS_RULE_VIOLATION   Zero records match    There is nothing to export.
                                         the current filters   Try adjusting your filters
                                                               to include more
                                                               transactions.

  500          INTERNAL_ERROR            Export generation     We could not generate your
                                         failure               export. Please try again. If
                                                               the issue continues, contact
                                                               support.
  -----------------------------------------------------------------------------------------

# **3.7 POST /v1/transactions/:id/report**

+-----------------------------------------------------------------------+
| **POST /v1/transactions/:id/report**                                  |
|                                                                       |
| *Submits a Report a Problem against a specific transaction.           |
| Rate-limited to 3 reports per transaction. Creates an internal report |
| record and publishes an event for the ticketing system integration.*  |
+=======================================================================+

## **Path Parameters**

  ---------------------------------------------------------------------------------
  **Parameter**   **Type**     **Required**   **Description**
  --------------- ------------ -------------- -------------------------------------
  id              string       Yes            UUID of the transaction being
                  (UUID)                      reported

  ---------------------------------------------------------------------------------

## **Request Body**

+-----------------------------------------------------------------------+
| **POST /v1/transactions/:id/report --- request body**                 |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"category\": \"incorrect_amount\", // Required --- see allowed       |
| values below                                                          |
|                                                                       |
| \"description\": \"The amount charged was \$515 but my contract shows |
| \$490.\" // Required, max 500 chars                                   |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Allowed Category Values**

  -----------------------------------------------------------------------
  **Value**              **Display Label**
  ---------------------- ------------------------------------------------
  incorrect_amount       Incorrect amount

  duplicate_charge       Duplicate charge

  payment_not_received   Payment not received

  unauthorized           Unauthorized transaction

  other                  Other
  -----------------------------------------------------------------------

## **Service --- submitReport**

+-----------------------------------------------------------------------+
| **transaction.service.ts --- submitReport**                           |
+-----------------------------------------------------------------------+
| // TransactionService.submitReport                                    |
|                                                                       |
| async submitReport(                                                   |
|                                                                       |
| id: string,                                                           |
|                                                                       |
| userId: string,                                                       |
|                                                                       |
| dto: ReportTransactionDto,                                            |
|                                                                       |
| ): Promise\<{ caseReference: string; message: string }\> {            |
|                                                                       |
| const transaction = await this.repo.findOne({ where: { id, userId }   |
| });                                                                   |
|                                                                       |
| if (!transaction) {                                                   |
|                                                                       |
| throw new NotFoundException({                                         |
|                                                                       |
| code: \'NOT_FOUND\',                                                  |
|                                                                       |
| message: \'We could not load the details for this transaction. Please |
| try again.\',                                                         |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Rate limit: max 3 reports per transaction                          |
|                                                                       |
| const existingReports = await this.reportRepo.count({ where: {        |
| transactionId: id } });                                               |
|                                                                       |
| if (existingReports \>= 3) {                                          |
|                                                                       |
| throw new TooManyRequestsException({                                  |
|                                                                       |
| code: \'RATE_LIMITED\',                                               |
|                                                                       |
| message: \'The maximum number of reports for this transaction has     |
| been reached. Please contact support directly.\',                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Create internal report record                                      |
|                                                                       |
| const report = await this.reportRepo.save({                           |
|                                                                       |
| transactionId: id,                                                    |
|                                                                       |
| userId,                                                               |
|                                                                       |
| category: dto.category,                                               |
|                                                                       |
| description: dto.description,                                         |
|                                                                       |
| // transactionId pre-populated from path param                        |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Publish event for ticketing system integration (separate epic)     |
|                                                                       |
| // Ticketing system consumes this event asynchronously                |
|                                                                       |
| await this.eventEmitter.emit(\'transaction.report.submitted\', {      |
|                                                                       |
| reportId: report.id,                                                  |
|                                                                       |
| transactionId: id,                                                    |
|                                                                       |
| userId,                                                               |
|                                                                       |
| category: dto.category,                                               |
|                                                                       |
| });                                                                   |
|                                                                       |
| await this.auditService.log({                                         |
|                                                                       |
| action: \'REPORT_TRANSACTION\',                                       |
|                                                                       |
| transactionId: id,                                                    |
|                                                                       |
| userId,                                                               |
|                                                                       |
| metadata: { reportId: report.id, category: dto.category },            |
|                                                                       |
| });                                                                   |
|                                                                       |
| return {                                                              |
|                                                                       |
| caseReference: report.id,                                             |
|                                                                       |
| message: \'Your report has been submitted. Our team will review it    |
| and follow up with you shortly.\',                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Success Response --- 201 Created**

+-----------------------------------------------------------------------+
| **201 Created --- POST /v1/transactions/:id/report**                  |
+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"caseReference\": \"uuid\",                                          |
|                                                                       |
| \"message\": \"Your report has been submitted. Our team will review   |
| it and follow up with you shortly.\"                                  |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **Error Responses --- POST /v1/transactions/:id/report**

  ------------------------------------------------------------------------------
  **Status**   **code**           **Condition**     **User-Facing Message**
  ------------ ------------------ ----------------- ----------------------------
  400          VALIDATION_ERROR   category is empty Please select a problem
                                                    category.

  400          VALIDATION_ERROR   description is    Please describe the problem.
                                  empty             

  400          VALIDATION_ERROR   description \>    Description must be 500
                                  500 characters    characters or less.

  401          UNAUTHORIZED       Missing or        Your session has expired.
                                  expired JWT       Please log in again to
                                                    continue.

  404          NOT_FOUND          Transaction not   We could not load the
                                  found for this    details for this
                                  user              transaction. Please try
                                                    again.

  429          RATE_LIMITED       More than 3       The maximum number of
                                  reports submitted reports for this transaction
                                  for this          has been reached. Please
                                  transaction       contact support directly.

  500          INTERNAL_ERROR     Report save or    We could not submit your
                                  event publish     report. Please try again or
                                  failure           contact support directly.
  ------------------------------------------------------------------------------

# **4. AuditService**

AuditService is marked \@Global() and injected into TransactionService,
InvoiceService, and ExportService. It records every transaction view,
invoice view, receipt download, export, and problem report submission to
the backend audit log.

**/apps/transaction-service/src/services/audit.service.ts**

+-----------------------------------------------------------------------+
| **src/services/audit.service.ts**                                     |
+-----------------------------------------------------------------------+
| import { Injectable, Logger } from \'@nestjs/common\';                |
|                                                                       |
| import { InjectRepository } from \'@nestjs/typeorm\';                 |
|                                                                       |
| import { Repository } from \'typeorm\';                               |
|                                                                       |
| import { AuditLog } from \'../entities/audit-log.entity\';            |
|                                                                       |
| export interface AuditLogEntry {                                      |
|                                                                       |
| action: \'VIEW_TRANSACTION_DETAIL\' \| \'VIEW_INVOICE_DETAIL\' \|     |
|                                                                       |
| \'DOWNLOAD_RECEIPT\' \| \'EXPORT\' \| \'REPORT_TRANSACTION\';         |
|                                                                       |
| userId: string;                                                       |
|                                                                       |
| transactionId?: string;                                               |
|                                                                       |
| invoiceId?: string;                                                   |
|                                                                       |
| scope?: string;                                                       |
|                                                                       |
| format?: string;                                                      |
|                                                                       |
| metadata?: Record\<string, unknown\>;                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Injectable()                                                        |
|                                                                       |
| export class AuditService {                                           |
|                                                                       |
| private readonly logger = new Logger(\'AuditService\');               |
|                                                                       |
| constructor(                                                          |
|                                                                       |
| \@InjectRepository(AuditLog)                                          |
|                                                                       |
| private readonly auditRepo: Repository\<AuditLog\>,                   |
|                                                                       |
| ) {}                                                                  |
|                                                                       |
| async log(entry: AuditLogEntry): Promise\<void\> {                    |
|                                                                       |
| try {                                                                 |
|                                                                       |
| await this.auditRepo.save({                                           |
|                                                                       |
| \...entry,                                                            |
|                                                                       |
| timestamp: new Date(),                                                |
|                                                                       |
| });                                                                   |
|                                                                       |
| } catch (err) {                                                       |
|                                                                       |
| // Audit failures must never crash the primary request                |
|                                                                       |
| this.logger.error(\'Audit log write failed\', err);                   |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+=======================================================================+

+-----------------------------------------------------------------------+
| **Audit Failures Are Non-Fatal**                                      |
|                                                                       |
| The audit log write is wrapped in a try-catch that swallows errors. A |
| failure to write an audit entry must never cause the primary API      |
| request to fail. The audit log is for compliance and monitoring ---   |
| it is not part of the critical request path.                          |
+=======================================================================+

# **5. Complete Error Code Reference**

All error codes used across all endpoints in this service, with their
HTTP status and the corresponding user-facing message from the error
messages specification.

  -----------------------------------------------------------------------------
  **code**                  **HTTP     **User-Facing Message**
                            Status**   
  ------------------------- ---------- ----------------------------------------
  UNAUTHORIZED              401        Your session has expired. Please log in
                                       again to continue.

  FORBIDDEN                 403        You do not have permission to access
                                       this resource.

  NOT_FOUND                 404        We could not load the details for this
                                       transaction. Please try again.

  NOT_FOUND (invoice)       404        This invoice ID appears to be invalid.
                                       Please contact support if you believe
                                       this is an error.

  VALIDATION_ERROR (search) 400        Please enter a valid search term.

  VALIDATION_ERROR (date    400        Your start date cannot be after your end
  range)                               date. Please adjust your selection.

  VALIDATION_ERROR (future  400        Start date cannot be in the future.
  date)                                

  VALIDATION_ERROR          400        Please select a problem category.
  (category)                           

  VALIDATION_ERROR          400        Please describe the problem.
  (description empty)                  

  VALIDATION_ERROR          400        Description must be 500 characters or
  (description length)                 less.

  BUSINESS_RULE_VIOLATION   422        Your receipt will be available once this
  (receipt)                            payment is complete.

  BUSINESS_RULE_VIOLATION   422        There is nothing to export. Try
  (export empty)                       adjusting your filters to include more
                                       transactions.

  IMMUTABLE_RECORD          409        This transaction cannot be modified.

  RATE_LIMITED              429        The maximum number of reports for this
                                       transaction has been reached. Please
                                       contact support directly.

  SERVICE_UNAVAILABLE       503        Invoice details loaded. Download link
  (Stripe)                             temporarily unavailable.

  INTERNAL_ERROR            500        We are having trouble loading your
  (transactions)                       transactions. Please refresh the page.

  INTERNAL_ERROR (invoices) 500        We are having trouble loading your
                                       invoices. Please refresh the page.

  INTERNAL_ERROR (export)   500        We could not generate your export.
                                       Please try again. If the issue
                                       continues, contact support.

  INTERNAL_ERROR (report)   500        We could not submit your report. Please
                                       try again or contact support directly.
  -----------------------------------------------------------------------------

# **6. Next Steps**

With all HTTP endpoints defined and implemented, proceed to Doc 05 to
wire the event consumers and integrations that populate the transaction
and invoice records these endpoints serve:

  ----------------------------------------------------------------------------
  **Document**   **Title**         **What It Covers**
  -------------- ----------------- -------------------------------------------
  Doc 05         Integrations &    RabbitMQ consumer setup for all 11 upstream
                 Events            events from billing-service,
                                   time-tracking-service, and payout-service.
                                   Stripe invoice URL retrieval. Ably
                                   real-time status publishing. Redis cache
                                   strategy for list endpoints. Share context
                                   payload for invitations-service.

  Doc 06         Observability &   Extended /ready check covering RabbitMQ and
                 Health            Redis connectivity. Structured logging for
                                   all endpoint calls. Metric definitions for
                                   failure rates and latency. Nightly cron for
                                   overdue invoice escalation.

  Doc 07         QA & Test Data    Full test case list for all 7 endpoints.
                                   Seed scripts for all transaction types and
                                   status combinations. Postman collection
                                   with all filter combinations.
  ----------------------------------------------------------------------------
