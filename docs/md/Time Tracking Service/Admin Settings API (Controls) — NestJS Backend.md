# **Admin Settings API (Controls) --- NestJS Backend**

**Purpose\**
Provide backend support for the administrative controls shown in the
Settings design. These govern what actions freelancers and admins can
take on screenshots, and how billing is calculated when screenshots are
blurred or deleted.

## **Step 1 --- Database Schema**

**Explanation:\**
Settings must be persisted per organization or per contract. This
ensures different clients can apply different policies.

**File:** apps/time-tracking-service/src/settings/settings.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
UpdateDateColumn } from \'typeorm\';

\@Entity(\'settings\')

export class Settings {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

// Link settings to a contract, org, or project

\@Column()

scopeId: string; // could be orgId or contractId

// Allow screenshot deletion

\@Column({ default: true })

allowDelete: boolean;

// Allow screenshot blurring

\@Column({ default: true })

allowBlur: boolean;

// If true, blurred screenshots are auto-approved (no admin review
needed)

\@Column({ default: false })

autoApproveBlur: boolean;

// Allow freelancers to reassign project/task on screenshots

\@Column({ default: true })

allowReassign: boolean;

// Rule: deleted screenshots count as non-billable

\@Column({ default: true })

deletedNonBillable: boolean;

// Rule: blurred screenshots remain billable (true) or not (false)

\@Column({ default: true })

blurredBillable: boolean;

\@CreateDateColumn()

createdAt: Date;

\@UpdateDateColumn()

updatedAt: Date;

}



## **Step 2 --- Guard / Middleware Integration**

**Explanation:\**
These settings need to be enforced at runtime inside screenshot
endpoints (delete, blur, reassign). Middleware checks the settings for
the current contract/org before allowing the action.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts
(example integration)

async deleteScreenshot(id: string, user: any, settings: Settings) {

if (!settings.allowDelete) {

throw new ForbiddenException(\'Screenshot deletion not allowed by admin
settings.\');

}

const screenshot = await this.repo.findOneBy({ id });

if (!screenshot) throw new NotFoundException();

screenshot.isDeleted = true;

await this.repo.save(screenshot);

// If deletion makes time non-billable

if (settings.deletedNonBillable) {

await this.billingService.markAsNonBillable(screenshot.id);

}

return screenshot;

}

**Example guard usage for blurring:**

****async blurScreenshot(id: string, user: any, settings: Settings) {

if (!settings.allowBlur) {

throw new ForbiddenException(\'Blurring not allowed by admin
settings.\');

}

const screenshot = await this.repo.findOneBy({ id });

screenshot.isBlurred = true;

if (settings.autoApproveBlur) {

screenshot.reviewStatus = \'approved\';

} else {

screenshot.reviewStatus = \'pending\';

}

await this.repo.save(screenshot);

// Billing logic

if (!settings.blurredBillable) {

await this.billingService.markAsNonBillable(screenshot.id);

}

return screenshot;

}



## **Step 3 --- Admin Endpoints**

**Explanation:\**
Only admins should be able to update these settings. We create a
SettingsController.

**File:** apps/time-tracking-service/src/settings/settings.controller.ts

import { Controller, Get, Put, Body, Param, UseGuards } from
\'@nestjs/common\';

import { SettingsService } from \'./settings.service\';

import { AdminGuard } from \'../auth/admin.guard\';

\@Controller(\'api/settings\')

\@UseGuards(AdminGuard)

export class SettingsController {

constructor(private readonly settingsService: SettingsService) {}

// Get settings by scope (org/contract)

\@Get(\':scopeId\')

async getSettings(@Param(\'scopeId\') scopeId: string) {

return this.settingsService.getSettings(scopeId);

}

// Update settings

\@Put(\':scopeId\')

async updateSettings(@Param(\'scopeId\') scopeId: string, \@Body() dto:
Partial\<Settings\>) {

return this.settingsService.updateSettings(scopeId, dto);

}

}



## **Step 4 --- Service**

**File:** apps/time-tracking-service/src/settings/settings.service.ts

@Injectable()

export class SettingsService {

constructor(

\@InjectRepository(Settings)

private readonly repo: Repository\<Settings\>,

) {}

async getSettings(scopeId: string) {

let settings = await this.repo.findOneBy({ scopeId });

if (!settings) {

settings = this.repo.create({ scopeId });

await this.repo.save(settings);

}

return settings;

}

async updateSettings(scopeId: string, dto: Partial\<Settings\>) {

let settings = await this.repo.findOneBy({ scopeId });

if (!settings) {

settings = this.repo.create({ scopeId, \...dto });

} else {

Object.assign(settings, dto);

}

return this.repo.save(settings);

}

}



## **Step 5 --- Security Rules**

- Only admins can update settings.

- Screenshot actions (blur, delete, reassign) must check settings before
  execution.

- Billing logic (billable/non-billable) derives directly from settings
  flags.

## **Step 6 --- Example Requests**

**Get current settings**

****GET /api/settings/contract_123

Authorization: Bearer \<admin-token\>

**Response:**

****{

\"scopeId\": \"contract_123\",

\"allowDelete\": true,

\"allowBlur\": true,

\"autoApproveBlur\": false,

\"allowReassign\": true,

\"deletedNonBillable\": true,

\"blurredBillable\": false

}

**Update settings**

****PUT /api/settings/contract_123

Authorization: Bearer \<admin-token\>

Content-Type: application/json

{

\"allowBlur\": false,

\"blurredBillable\": true

}



## **Step 7 --- Frontend Integration Notes**

- UI toggles in **Settings.pdf** map directly to API fields.

- Changes are applied immediately to screenshot endpoints via
  middleware.

- Billing reports must read the same settings to calculate totals.
