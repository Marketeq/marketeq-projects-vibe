# **Invitation Microservice (NestJS, TypeScript) --- Full Build & Integration**

## **Scope (locked)**

- New microservice: invitations-service (NestJS + TypeScript).

- Lives **inside monorepo** at services/invitations-service/.

- Uses **existing main DB** (shared DB). Adds **one table**:
  invitations.

- **Onboarding**: **no changes** (kept as-is). New screens (e.g., **My
  Team**) call this service.

- **Notifications**: use the existing **Notification Service** (HTTP)
  --- no direct email here.

- **One invite = one client account (team)** association.

- **Roles now**: admin, editor, viewer (definitions below). Permissions
  evolve later.

- **Duplicate pending invites** for same teamId + email: return the
  existing invite with a flag (alreadyInvited: true). Allow **Resend**.

- Statuses: pending \| accepted \| canceled \| expired.

- Default expiry: **7 days** (configurable).

## **Directory Layout**

****services/

invitations-service/

src/

app.module.ts

main.ts

health.controller.ts

common/

auth.guard.ts

roles.ts

token.util.ts

typing.ts

invitations/

invitations.module.ts

invitations.controller.ts

invitations.service.ts

invitations.entity.ts

invitations.dto.ts

notifications.client.ts

ormconfig.ts

package.json

tsconfig.json

nest-cli.json

README.md

migrations/

1710000000000-CreateInvitationsTable.ts



## **Environment Variables**

Create services/invitations-service/.env (Render → **Environment** tab
too):

# Postgres

DATABASE_URL=postgres://USER:PASS@HOST:PORT/DBNAME

\# App

PORT=3006

APP_BASE_URL=https://app.marketeqdigital.com \# used to build accept
URLs

INVITE_TOKEN_SECRET=replace-with-32+char-secret

INVITE_EXP_DAYS=7

\# Notification service

NOTIFICATIONS_URL=https://notifications.yourdomain.com

NOTIFICATIONS_API_KEY=replace-with-notify-service-key

\# API Gateway trust

GATEWAY_TRUST_HEADER=x-user-id \# header set by gateway with user id

GATEWAY_TRUST_EMAIL_HEADER=x-user-email \# header set by gateway with
user email

> The **API Gateway** should forward x-user-id and x-user-email from
> the authenticated session/JWT. Acceptance requires auth (so invitee
> signs in first and clicks "Accept").

## **Install & Scripts**

**package.json**

****{

\"name\": \"invitations-service\",

\"version\": \"1.0.0\",

\"private\": true,

\"scripts\": {

\"build\": \"nest build\",

\"start\": \"node dist/main.js\",

\"start:dev\": \"nest start \--watch\",

\"migration:generate\": \"ts-node -r tsconfig-paths/register
./node_modules/typeorm/cli.js migration:generate -d ormconfig.ts
migrations/auto\",

\"migration:run\": \"ts-node -r tsconfig-paths/register
./node_modules/typeorm/cli.js migration:run -d ormconfig.ts\",

\"migration:revert\": \"ts-node -r tsconfig-paths/register
./node_modules/typeorm/cli.js migration:revert -d ormconfig.ts\"

},

\"dependencies\": {

\"@nestjs/axios\": \"\^3.0.0\",

\"@nestjs/common\": \"\^10.0.0\",

\"@nestjs/config\": \"\^3.1.1\",

\"@nestjs/core\": \"\^10.0.0\",

\"@nestjs/platform-express\": \"\^10.0.0\",

\"class-transformer\": \"\^0.5.1\",

\"class-validator\": \"\^0.14.0\",

\"pg\": \"\^8.11.1\",

\"reflect-metadata\": \"\^0.1.13\",

\"rxjs\": \"\^7.8.1\",

\"typeorm\": \"\^0.3.17\"

},

\"devDependencies\": {

\"@nestjs/cli\": \"\^10.0.0\",

\"@nestjs/schematics\": \"\^10.0.0\",

\"@nestjs/testing\": \"\^10.0.0\",

\"@types/node\": \"\^20.11.0\",

\"ts-node\": \"\^10.9.2\",

\"tsconfig-paths\": \"\^4.2.0\",

\"typescript\": \"\^5.4.0\"

}

}

**tsconfig.json**

****{

\"compilerOptions\": {

\"module\": \"commonjs\",

\"declaration\": false,

\"removeComments\": true,

\"emitDecoratorMetadata\": true,

\"experimentalDecorators\": true,

\"allowSyntheticDefaultImports\": true,

\"target\": \"ES2020\",

\"sourceMap\": true,

\"outDir\": \"./dist\",

\"baseUrl\": \"./\",

\"incremental\": true

},

\"include\": \[\"src/\*\*/\*\"\]

}

**nest-cli.json**

****{

\"collection\": \"@nestjs/schematics\",

\"sourceRoot\": \"src\"

}

**ormconfig.ts**

****import \'reflect-metadata\';

import { DataSource } from \'typeorm\';

import { Invitation } from \'./src/invitations/invitations.entity\';

import \* as dotenv from \'dotenv\';

dotenv.config();

export default new DataSource({

type: \'postgres\',

url: process.env.DATABASE_URL,

entities: \[Invitation\],

migrations: \[\'migrations/\*.ts\'\],

synchronize: false, // never true in prod

ssl: process.env.DATABASE_SSL === \'true\' ? { rejectUnauthorized: false
} : false

});



## **DB Schema (TypeORM migration + entity)**

**migrations/1710000000000-CreateInvitationsTable.ts**

****import { MigrationInterface, QueryRunner } from \"typeorm\";

export class CreateInvitationsTable1710000000000 implements
MigrationInterface {

name = \'CreateInvitationsTable1710000000000\'

public async up(queryRunner: QueryRunner): Promise\<void\> {

await queryRunner.query(\`

DO \$\$

BEGIN

IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname =
\'invitation_status\') THEN

CREATE TYPE invitation_status AS ENUM (\'pending\', \'accepted\',
\'canceled\', \'expired\');

END IF;

END\$\$;

\`);

await queryRunner.query(\`

CREATE TABLE IF NOT EXISTS invitations (

id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

team_id uuid NOT NULL,

invited_email text NOT NULL,

role text NOT NULL CHECK (role IN (\'admin\',\'editor\',\'viewer\')),

status invitation_status NOT NULL DEFAULT \'pending\',

token text NOT NULL,

expires_at timestamptz NOT NULL,

created_by_user_id uuid NOT NULL,

created_at timestamptz NOT NULL DEFAULT now(),

updated_at timestamptz NOT NULL DEFAULT now(),

accepted_at timestamptz,

canceled_at timestamptz,

resent_count integer NOT NULL DEFAULT 0,

UNIQUE(team_id, invited_email, status) DEFERRABLE INITIALLY IMMEDIATE

);

\`);

// helpful index

await queryRunner.query(\`CREATE INDEX IF NOT EXISTS
idx_invitations_team ON invitations(team_id);\`);

await queryRunner.query(\`CREATE INDEX IF NOT EXISTS
idx_invitations_email ON invitations(invited_email);\`);

await queryRunner.query(\`CREATE INDEX IF NOT EXISTS
idx_invitations_token ON invitations(token);\`);

}

public async down(queryRunner: QueryRunner): Promise\<void\> {

await queryRunner.query(\`DROP TABLE IF EXISTS invitations;\`);

await queryRunner.query(\`DO \$\$ BEGIN

IF EXISTS (SELECT 1 FROM pg_type WHERE typname = \'invitation_status\')
THEN

DROP TYPE invitation_status;

END IF; END\$\$;\`);

}

}

> Run migrations: npm run migration:run

**src/invitations/invitations.entity.ts**

****import { Column, Entity, PrimaryGeneratedColumn, Index,
CreateDateColumn, UpdateDateColumn } from \'typeorm\';

export type InvitationStatus = \'pending\' \| \'accepted\' \|
\'canceled\' \| \'expired\';

export type InvitationRole = \'admin\' \| \'editor\' \| \'viewer\';

\@Entity(\'invitations\')

export class Invitation {

\@PrimaryGeneratedColumn(\'uuid\')

id!: string;

\@Index()

\@Column({ name: \'team_id\', type: \'uuid\' })

teamId!: string;

\@Index()

\@Column({ name: \'invited_email\', type: \'text\' })

invitedEmail!: string;

\@Column({ type: \'text\' })

role!: InvitationRole;

\@Column({ type: \'enum\', enum:
\[\'pending\',\'accepted\',\'canceled\',\'expired\'\], default:
\'pending\' })

status!: InvitationStatus;

\@Index()

\@Column({ type: \'text\' })

token!: string;

\@Column({ name: \'expires_at\', type: \'timestamptz\' })

expiresAt!: Date;

\@Column({ name: \'created_by_user_id\', type: \'uuid\' })

createdByUserId!: string;

\@CreateDateColumn({ name: \'created_at\', type: \'timestamptz\' })

createdAt!: Date;

\@UpdateDateColumn({ name: \'updated_at\', type: \'timestamptz\' })

updatedAt!: Date;

\@Column({ name: \'accepted_at\', type: \'timestamptz\', nullable: true
})

acceptedAt?: Date;

\@Column({ name: \'canceled_at\', type: \'timestamptz\', nullable: true
})

canceledAt?: Date;

\@Column({ name: \'resent_count\', type: \'int\', default: 0 })

resentCount!: number;

}



## **Common (auth, roles, token)**

**src/common/roles.ts**

****export type TeamRole = \'admin\' \| \'editor\' \| \'viewer\';

export const ROLE_LABELS: Record\<TeamRole,string\> = {

admin: \'Admin\',

editor: \'Editor\',

viewer: \'Viewer\'

};

**src/common/typing.ts**

****export interface RequestUser {

id: string;

email: string;

}

export interface GatewayHeaders {

userIdHeader: string; // e.g. x-user-id

userEmailHeader: string; // e.g. x-user-email

}

**src/common/auth.guard.ts**

****import { CanActivate, ExecutionContext, Injectable,
UnauthorizedException } from \"@nestjs/common\";

import { Request } from \'express\';

\@Injectable()

export class GatewayAuthGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const req = context.switchToHttp().getRequest\<Request\>();

const uidH = process.env.GATEWAY_TRUST_HEADER \|\| \'x-user-id\';

const emailH = process.env.GATEWAY_TRUST_EMAIL_HEADER \|\|
\'x-user-email\';

const userId = req.header(uidH);

const email = req.header(emailH);

if (!userId \|\| !email) throw new UnauthorizedException(\'Missing
gateway auth headers\');

(req as any).user = { id: userId, email };

return true;

}

}

**src/common/token.util.ts**

****import \* as crypto from \'crypto\';

export function generateInviteToken(): string {

return crypto.randomBytes(24).toString(\'hex\');

}

export function nowPlusDays(days: number): Date {

const d = new Date();

d.setUTCDate(d.getUTCDate() + days);

return d;

}



## **DTOs**

**src/invitations/invitations.dto.ts**

****import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional,
IsString, IsUUID, ArrayNotEmpty, ArrayUnique, MinLength } from
\'class-validator\';

import { Type } from \'class-transformer\';

export class CreateInvitationsDto {

\@IsUUID()

teamId!: string;

\@IsEnum(\[\'admin\',\'editor\',\'viewer\'\])

role!: \'admin\' \| \'editor\' \| \'viewer\';

\@IsArray()

\@ArrayNotEmpty()

\@ArrayUnique()

\@Type(() =\> String)

\@IsEmail({}, { each: true })

emails!: string\[\];

\@IsOptional()

\@IsString()

\@MinLength(0)

note?: string;

}

export class ResendInvitationDto {

\@IsUUID()

id!: string;

}

export class CancelInvitationDto {

\@IsUUID()

id!: string;

}

export class AcceptInvitationDto {

\@IsString()

\@IsNotEmpty()

token!: string;

}

export class ListInvitationsQuery {

\@IsOptional()

\@IsUUID()

teamId?: string;

\@IsOptional()

\@IsEnum(\[\'pending\',\'accepted\',\'canceled\',\'expired\'\])

status?: \'pending\'\|\'accepted\'\|\'canceled\'\|\'expired\';

\@IsOptional()

\@IsString()

cursor?: string;

\@IsOptional()

limit?: number;

}



## **Notifications client**

**src/invitations/notifications.client.ts**

****import { Injectable } from \"@nestjs/common\";

import { HttpService } from \"@nestjs/axios\";

import { lastValueFrom } from \"rxjs\";

\@Injectable()

export class NotificationsClient {

constructor(private readonly http: HttpService) {}

async sendTeamInvite(params: {

to: string;

senderName: string;

teamName: string;

acceptUrl: string;

expiresInDays: number;

note?: string;

}): Promise\<void\> {

const url = \`\${process.env.NOTIFICATIONS_URL}/notifications/send\`;

await lastValueFrom(this.http.post(url, {

template: \'team-invite\',

to: params.to,

vars: {

senderName: params.senderName,

teamName: params.teamName,

acceptUrl: params.acceptUrl,

expiresInDays: params.expiresInDays,

note: params.note ?? \'\'

}

}, {

headers: { \'x-api-key\': process.env.NOTIFICATIONS_API_KEY \|\| \'\' }

}));

}

}



## **Service**

**src/invitations/invitations.service.ts**

****import { BadRequestException, Injectable, NotFoundException } from
\"@nestjs/common\";

import { InjectDataSource } from \"@nestjs/typeorm\";

import { DataSource, Repository } from \"typeorm\";

import { Invitation } from \"./invitations.entity\";

import { CreateInvitationsDto, AcceptInvitationDto } from
\"./invitations.dto\";

import { NotificationsClient } from \"./notifications.client\";

import { generateInviteToken, nowPlusDays } from
\"../common/token.util\";

\@Injectable()

export class InvitationsService {

private repo: Repository\<Invitation\>;

constructor(

\@InjectDataSource() private readonly ds: DataSource,

private readonly notify: NotificationsClient

) {

this.repo = this.ds.getRepository(Invitation);

}

private getExpiry(): Date {

const days = Number(process.env.INVITE_EXP_DAYS \|\| 7);

return nowPlusDays(days);

}

async createInvites(dto: CreateInvitationsDto, creator: { id: string;
email: string; name?: string }, team: { id: string; name: string }) {

const results: Array\<{ invitation: Invitation; alreadyInvited: boolean
}\> = \[\];

for (const email of dto.emails) {

// If a pending invite exists for team + email, return it (idempotent)

let existing = await this.repo.findOne({ where: { teamId: dto.teamId,
invitedEmail: email, status: \'pending\' as any } });

if (existing) {

results.push({ invitation: existing, alreadyInvited: true });

continue;

}

const token = generateInviteToken();

const inv = this.repo.create({

teamId: dto.teamId,

invitedEmail: email.toLowerCase(),

role: dto.role,

status: \'pending\',

token,

expiresAt: this.getExpiry(),

createdByUserId: creator.id

});

const saved = await this.repo.save(inv);

const acceptUrl =
\`\${process.env.APP_BASE_URL}/invite/accept?token=\${encodeURIComponent(token)}\`;

await this.notify.sendTeamInvite({

to: email,

senderName: creator.name \|\| creator.email,

teamName: team.name,

acceptUrl,

expiresInDays: Number(process.env.INVITE_EXP_DAYS \|\| 7),

note: dto.note

});

results.push({ invitation: saved, alreadyInvited: false });

}

return results;

}

async list(params: { teamId?: string; status?: Invitation\[\'status\'\];
limit?: number; cursor?: string }) {

const qb = this.repo.createQueryBuilder(\'i\')

.orderBy(\'i.created_at\', \'DESC\')

.limit(Math.min(Number(params.limit \|\| 25), 100));

if (params.teamId) qb.andWhere(\'i.team_id = :teamId\', { teamId:
params.teamId });

if (params.status) qb.andWhere(\'i.status = :status\', { status:
params.status });

if (params.cursor) qb.andWhere(\'i.created_at \< :cursor\', { cursor:
new Date(params.cursor) });

const data = await qb.getMany();

const nextCursor = data.length ? data\[data.length -
1\].createdAt.toISOString() : null;

return { data, nextCursor };

}

async resend(id: string, actor: { id: string; email: string }, team: {
name: string }) {

const inv = await this.repo.findOne({ where: { id } });

if (!inv) throw new NotFoundException(\'Invitation not found\');

if (inv.status !== \'pending\') throw new BadRequestException(\'Only
pending invites can be resent\');

const acceptUrl =
\`\${process.env.APP_BASE_URL}/invite/accept?token=\${encodeURIComponent(inv.token)}\`;

await this.notify.sendTeamInvite({

to: inv.invitedEmail,

senderName: actor.email,

teamName: team.name,

acceptUrl,

expiresInDays: Number(process.env.INVITE_EXP_DAYS \|\| 7)

});

inv.resentCount += 1;

await this.repo.save(inv);

return inv;

}

async cancel(id: string, actorId: string) {

const inv = await this.repo.findOne({ where: { id } });

if (!inv) throw new NotFoundException(\'Invitation not found\');

if (inv.status !== \'pending\') throw new BadRequestException(\'Only
pending invites can be canceled\');

inv.status = \'canceled\' as any;

inv.canceledAt = new Date();

await this.repo.save(inv);

return inv;

}

async accept(dto: AcceptInvitationDto, authUser: { id: string; email:
string }) {

const inv = await this.repo.findOne({ where: { token: dto.token } });

if (!inv) throw new NotFoundException(\'Invalid token\');

const now = new Date();

if (inv.status !== \'pending\') throw new
BadRequestException(\'Invitation is not pending\');

if (inv.expiresAt \<= now) {

inv.status = \'expired\' as any;

await this.repo.save(inv);

throw new BadRequestException(\'Invitation has expired\');

}

// The email on the invitation must match the authenticated user\'s
email.

if (inv.invitedEmail.toLowerCase() !== (authUser.email \|\|
\'\').toLowerCase()) {

throw new BadRequestException(\'Invitation email does not match your
account\');

}

// Add to team_members if not already member

await this.ds.query(\`

INSERT INTO team_members (team_id, user_id, role, created_at)

VALUES (\$1, \$2, \$3, now())

ON CONFLICT (team_id, user_id) DO NOTHING

\`, \[inv.teamId, authUser.id, inv.role\]);

inv.status = \'accepted\' as any;

inv.acceptedAt = now;

await this.repo.save(inv);

return inv;

}

async getOne(id: string) {

const inv = await this.repo.findOne({ where: { id } });

if (!inv) throw new NotFoundException(\'Invitation not found\');

return inv;

}

}

> **Assumption:** team_members(team_id uuid, user_id uuid, role text,
> created_at timestamptz) exists. The ON CONFLICT clause ensures
> idempotent membership.

## **Controller & Module**

**src/invitations/invitations.controller.ts**

****import { Body, Controller, Delete, Get, Param, Patch, Post, Query,
UseGuards } from \"@nestjs/common\";

import { InvitationsService } from \"./invitations.service\";

import { AcceptInvitationDto, CreateInvitationsDto, ListInvitationsQuery
} from \"./invitations.dto\";

import { GatewayAuthGuard } from \"../common/auth.guard\";

\@UseGuards(GatewayAuthGuard)

\@Controller(\'invitations\')

export class InvitationsController {

constructor(private readonly svc: InvitationsService) {}

\@Post()

async create(@Body() dto: CreateInvitationsDto, req: any) {

const user = req.user as { id: string; email: string };

// TODO: fetch team name from Team Service or DB; for now, placeholder:

const team = { id: dto.teamId, name: \'Client Team\' };

const result = await this.svc.createInvites(dto, { id: user.id, email:
user.email }, team);

return result.map(r =\> ({

id: r.invitation.id,

email: r.invitation.invitedEmail,

status: r.invitation.status,

expiresAt: r.invitation.expiresAt,

alreadyInvited: r.alreadyInvited

}));

}

\@Get()

async list(@Query() q: ListInvitationsQuery) {

return this.svc.list({

teamId: q.teamId,

status: q.status,

limit: q.limit,

cursor: q.cursor

});

}

\@Get(\':id\')

async getOne(@Param(\'id\') id: string) {

return this.svc.getOne(id);

}

\@Post(\':id/resend\')

async resend(@Param(\'id\') id: string, req: any) {

const user = req.user as { id: string; email: string };

const inv = await this.svc.getOne(id);

const team = { name: \'Client Team\' }; // fetch real team name if
needed

return this.svc.resend(inv.id, user, team);

}

\@Delete(\':id/cancel\')

async cancel(@Param(\'id\') id: string, req: any) {

const user = req.user as { id: string };

return this.svc.cancel(id, user.id);

}

\@Post(\'accept\')

async accept(@Body() dto: AcceptInvitationDto, req: any) {

const user = req.user as { id: string; email: string };

return this.svc.accept(dto, user);

}

}

**src/invitations/invitations.module.ts**

****import { Module } from \"@nestjs/common\";

import { TypeOrmModule } from \"@nestjs/typeorm\";

import { HttpModule } from \"@nestjs/axios\";

import { Invitation } from \"./invitations.entity\";

import { InvitationsController } from \"./invitations.controller\";

import { InvitationsService } from \"./invitations.service\";

import { NotificationsClient } from \"./notifications.client\";

\@Module({

imports: \[TypeOrmModule.forFeature(\[Invitation\]), HttpModule\],

controllers: \[InvitationsController\],

providers: \[InvitationsService, NotificationsClient\],

exports: \[\]

})

export class InvitationsModule {}



## **App bootstrap & health**

**src/health.controller.ts**

****import { Controller, Get } from \"@nestjs/common\";

\@Controller(\'health\')

export class HealthController {

\@Get()

ping() {

return { ok: true };

}

}

**src/app.module.ts**

****import { Module } from \"@nestjs/common\";

import { ConfigModule } from \"@nestjs/config\";

import { TypeOrmModule } from \"@nestjs/typeorm\";

import dataSource from \'../ormconfig\';

import { InvitationsModule } from \"./invitations/invitations.module\";

import { HealthController } from \"./health.controller\";

\@Module({

imports: \[

ConfigModule.forRoot({ isGlobal: true }),

TypeOrmModule.forRootAsync({

useFactory: async () =\> (dataSource.options as any),

}),

InvitationsModule

\],

controllers: \[HealthController\],

providers: \[\]

})

export class AppModule {}

**src/main.ts**

****import { NestFactory } from \"@nestjs/core\";

import { AppModule } from \"./app.module\";

async function bootstrap() {

const app = await NestFactory.create(AppModule, { bufferLogs: true });

app.enableCors({ origin: true, credentials: true });

const port = Number(process.env.PORT \|\| 3006);

await app.listen(port);

// eslint-disable-next-line no-console

console.log(\`Invitations service listening on :\${port}\`);

}

bootstrap();



## **API Contract (final)**

### **Create invites**

****POST /invitations

Headers:

x-user-id: \<uuid\>

x-user-email: \<email\>

Body:

{

\"teamId\": \"uuid\",

\"role\": \"admin\" \| \"editor\" \| \"viewer\",

\"emails\": \[\"a@b.com\",\"c@d.com\"\],

\"note\": \"Optional note\"

}

Response: \[

{ \"id\":\"\...\", \"email\":\"a@b.com\", \"status\":\"pending\",
\"expiresAt\":\"\...\", \"alreadyInvited\": false },

{ \"id\":\"\...\", \"email\":\"c@d.com\", \"status\":\"pending\",
\"expiresAt\":\"\...\", \"alreadyInvited\": true }

\]

### **List invites**

****GET /invitations?teamId=uuid&status=pending&limit=25&cursor=ISO

### **Get one**

****GET /invitations/:id

### **Resend pending**

****POST /invitations/:id/resend

### **Cancel pending**

****DELETE /invitations/:id/cancel

### **Accept (Invitee must be authenticated; email must match invite)**

****POST /invitations/accept

Headers:

x-user-id: \<uuid\>

x-user-email: invitee@example.com

Body:

{ \"token\": \"\<token from email\>\" }



## **Render Deployment**

1.  Push the service folder to your repo (monorepo).

2.  In **Render Dashboard → New → Web Service\**

    - **Root Directory:** services/invitations-service

    - **Build Command:** npm install && npm run build && npm run
      migration:run

    - **Start Command:** npm run start

    - **Environment:** add all variables listed above

    - **Health Check Path:** /health

## **"My Team" frontend wiring (Next.js + TypeScript)**

**API helpers** (use gateway origin; path shown as example):

// lib/invitations.ts

export type InviteRole = \'admin\'\|\'editor\'\|\'viewer\';

const API_BASE = process.env.NEXT_PUBLIC_API_GATEWAY_BASE!; // e.g.,
https://api.marketeqdigital.com

export async function createInvites(input: { teamId: string; role:
InviteRole; emails: string\[\]; note?: string }) {

const res = await fetch(\`\${API_BASE}/invitations\`, {

method: \'POST\',

credentials: \'include\',

headers: { \'Content-Type\': \'application/json\' },

body: JSON.stringify(input)

});

if (!res.ok) throw new Error(\'Failed to create invites\');

return res.json() as Promise\<Array\<{id:string; email:string;
status:string; expiresAt:string; alreadyInvited:boolean}\>\>;

}

export async function listInvites(q: { teamId: string; status?: string;
cursor?: string; limit?: number }) {

const params = new URLSearchParams();

params.set(\'teamId\', q.teamId);

if (q.status) params.set(\'status\', q.status);

if (q.cursor) params.set(\'cursor\', q.cursor);

if (q.limit) params.set(\'limit\', String(q.limit));

const res = await
fetch(\`\${API_BASE}/invitations?\${params.toString()}\`, { credentials:
\'include\' });

if (!res.ok) throw new Error(\'Failed to list invites\');

return res.json() as Promise\<{ data: any\[\]; nextCursor: string \|
null }\>;

}

export async function resendInvite(id: string) {

const res = await fetch(\`\${API_BASE}/invitations/\${id}/resend\`, {
method: \'POST\', credentials: \'include\' });

if (!res.ok) throw new Error(\'Failed to resend invite\');

return res.json();

}

export async function cancelInvite(id: string) {

const res = await fetch(\`\${API_BASE}/invitations/\${id}/cancel\`, {
method: \'DELETE\', credentials: \'include\' });

if (!res.ok) throw new Error(\'Failed to cancel invite\');

return res.json();

}

**Options menu actions** (Internal Team cards):

- **Resend invite** → resendInvite(id)

- **Cancel invite** → cancelInvite(id)

- **Change role** → (separate team-members endpoint; not in this doc)

- **Remove from team** → (team-members DELETE; not in this doc)

- **Manage permissions** → (future)

- **Add to project...** → (future)

- **View profile** → route to profile page

**Invite modal submit**:

import { createInvites } from \'@/lib/invitations\';

async function onInviteSubmit({ emails, role, note, teamId }: { emails:
string\[\]; role: \'admin\'\|\'editor\'\|\'viewer\'; note?: string;
teamId: string }) {

const results = await createInvites({ teamId, role, emails, note });

// results\[i\].alreadyInvited === true =\> show \"already invited\"
with \"Resend\" CTA

}



## **Role Definitions (current)**

- **admin**: invite/resend/cancel, change roles, remove members; full
  read across the client.

- **editor**: read all, can modify project resources (no team admin).

- **viewer**: read-only.

> These are placeholders to unblock onboarding of internal team; we'll
> refine with a dedicated permissions service later.

## **Health, Logging, and Idempotency**

- Health: GET /health returns { ok: true }.

- Idempotent invite creation for **pending** duplicates (same
  email+team) returns existing with alreadyInvited: true.

- Accept flow enforces: token valid, not expired, **invitee email ==
  authenticated email**.

## **What stays unchanged right now**

- **Onboarding** continues to use its existing invite logic & endpoints.

- This microservice will be used by **My Team** (and any new flows).

- When you're ready, we can reroute onboarding to this service with no
  functional changes.
