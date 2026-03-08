**Manual Time Review/Approval API --- NestJS Backend**

**Purpose\**
Extend manual time tracking with an admin workflow for review and
approval. Pending manual time entries appear in the admin queue, and
only approved entries appear in the user's timeline as billable.
Rejected entries remain flagged with a reason.

## **Step 1 --- Database Schema**

**Explanation:\**
We extend the manual_time table to track review workflow fields.

**File:**
apps/time-tracking-service/src/manual-time/manual-time.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
UpdateDateColumn } from \'typeorm\';

\@Entity(\'manual_time\')

export class ManualTime {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string; // Who submitted the entry

\@Column()

projectId: string;

\@Column({ nullable: true })

taskId: string;

\@Column({ type: \'timestamptz\' })

startTime: Date;

\@Column({ type: \'timestamptz\' })

endTime: Date;

\@Column(\'text\', { nullable: true })

notes: string;

// Review workflow fields

\@Column({ type: \'enum\', enum: \[\'pending\', \'approved\',
\'rejected\'\], default: \'pending\' })

status: \'pending\' \| \'approved\' \| \'rejected\';

\@Column({ nullable: true })

reviewedBy: string; // adminId

\@Column({ type: \'text\', nullable: true })

reviewComment: string;

\@CreateDateColumn()

createdAt: Date;

\@UpdateDateColumn()

updatedAt: Date;

}



## **Step 2 --- DTOs**

**Explanation:\**
We define DTOs for reviewing manual time entries.

**File:**
apps/time-tracking-service/src/manual-time/dto/review-manual-time.dto.ts

import { IsEnum, IsOptional, IsString } from \'class-validator\';

export class ReviewManualTimeDto {

\@IsEnum(\[\'approved\', \'rejected\'\])

status: \'approved\' \| \'rejected\';

\@IsOptional()

\@IsString()

comment?: string;

}



## **Step 3 --- Service Logic**

**Explanation:\**
Service provides methods to query pending entries and approve/reject
entries.

**File:**
apps/time-tracking-service/src/manual-time/manual-time.service.ts

@Injectable()

export class ManualTimeService {

constructor(

\@InjectRepository(ManualTime)

private readonly repo: Repository\<ManualTime\>,

) {}

// Get all pending manual time entries

async getPending() {

return this.repo.find({ where: { status: \'pending\' } });

}

// Review a manual time entry

async review(id: string, status: \'approved\' \| \'rejected\', comment:
string, adminId: string) {

const entry = await this.repo.findOneBy({ id });

if (!entry) throw new NotFoundException(\'Manual time entry not
found\');

entry.status = status;

entry.reviewComment = comment;

entry.reviewedBy = adminId;

return this.repo.save(entry);

}

}



## **Step 4 --- Controller**

**Explanation:\**
Admin-only endpoints for reviewing manual time entries.

**File:**
apps/time-tracking-service/src/manual-time/manual-time.controller.ts

import { Controller, Get, Put, Param, Body, UseGuards, Req } from
\'@nestjs/common\';

import { ManualTimeService } from \'./manual-time.service\';

import { ReviewManualTimeDto } from \'./dto/review-manual-time.dto\';

import { AdminGuard } from \'../auth/admin.guard\';

\@Controller(\'api/manual-time\')

\@UseGuards(AdminGuard)

export class ManualTimeController {

constructor(private readonly manualTimeService: ManualTimeService) {}

// Admin view: list pending manual time entries

\@Get(\'pending\')

async getPending() {

return this.manualTimeService.getPending();

}

// Admin action: approve/reject a manual time entry

\@Put(\':id/review\')

async review(@Param(\'id\') id: string, \@Body() dto:
ReviewManualTimeDto, \@Req() req) {

return this.manualTimeService.review(id, dto.status, dto.comment,
req.user.id);

}

}



## **Step 5 --- Security**

- **Only admins** can access /pending and /review.

- Users cannot approve/reject their own manual time.

- Non-admins can only see their own manual time entries (with status
  field visible).

## **Step 6 --- Integration with Timeline**

- Approved manual time entries are displayed in the user's timeline with
  total hours.

- Rejected entries are flagged with a visible reason/comment.

- Pending entries are hidden from billing totals until approved.

## **Step 7 --- Example Requests**

**Admin: Get pending entries**

****GET /api/manual-time/pending

Authorization: Bearer \<admin-token\>

**Response:**

****\[

{

\"id\": \"mt_123\",

\"userId\": \"user_5\",

\"projectId\": \"proj_2\",

\"taskId\": \"task_7\",

\"startTime\": \"2025-07-02T11:11:00Z\",

\"endTime\": \"2025-07-02T11:58:00Z\",

\"notes\": \"Editing layouts\",

\"status\": \"pending\",

\"reviewedBy\": null,

\"reviewComment\": null

}

\]

**Admin: Approve entry**

****PUT /api/manual-time/mt_123/review

Authorization: Bearer \<admin-token\>

Content-Type: application/json

{

\"status\": \"approved\"

}



## **Step 8 --- Frontend Integration Notes**

- Timeline should show manual entries with status badges: Pending,
  Approved, Rejected.

- Admin dashboard lists pending entries for review.

- Rejection reasons (reviewComment) must be displayed to the user.
