**Manual Time Submission -- API, DB Schema & Permissions\**
\
**Feature Scope:\**
Allow users to manually log time when they were working without
ActivityWatch running. Each manual time entry includes:

- Start Time (UTC)

- End Time (UTC)

- Notes (optional)

- Linked Project or Task (optional for future extension)

**This feature is not supported by ActivityWatch** and must be built
entirely within your NestJS backend.

**Step 1 -- Create ManualTime Entity**

1.  Create a new file: src/manual-time/manual-time.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
ManyToOne } from \'typeorm\';

\@Entity(\'manual_time\')

export class ManualTime {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column({ type: \'timestamptz\' })

startTime: Date;

\@Column({ type: \'timestamptz\' })

endTime: Date;

\@Column({ nullable: true })

notes: string;

\@CreateDateColumn()

createdAt: Date;

}

2.  \
    Register this entity in your module:

TypeOrmModule.forFeature(\[ManualTime\])



**Step 2 -- Create DTO for Submission**

Create src/manual-time/dto/create-manual-time.dto.ts:

import { IsDateString, IsOptional, IsString } from \'class-validator\';

export class CreateManualTimeDto {

\@IsDateString()

startTime: string;

\@IsDateString()

endTime: string;

\@IsOptional()

\@IsString()

notes?: string;

}



**Step 3 -- ManualTimeService Logic**

Create manual-time.service.ts:

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { ManualTime } from \'./manual-time.entity\';

import { Repository } from \'typeorm\';

import { CreateManualTimeDto } from \'./dto/create-manual-time.dto\';

\@Injectable()

export class ManualTimeService {

constructor(

\@InjectRepository(ManualTime)

private readonly repo: Repository\<ManualTime\>,

) {}

async createManualTime(userId: string, dto: CreateManualTimeDto) {

const entry = this.repo.create({

userId,

startTime: new Date(dto.startTime),

endTime: new Date(dto.endTime),

notes: dto.notes,

});

return this.repo.save(entry);

}

async getUserManualTime(userId: string) {

return this.repo.find({

where: { userId },

order: { startTime: \'DESC\' },

});

}

async deleteManualTime(id: string, userId: string) {

return this.repo.delete({ id, userId });

}

}



**Step 4 -- ManualTimeController Routes**

Create manual-time.controller.ts:

import { Controller, Post, Get, Delete, Param, Body, Req, UseGuards }
from \'@nestjs/common\';

import { ManualTimeService } from \'./manual-time.service\';

import { CreateManualTimeDto } from \'./dto/create-manual-time.dto\';

import { AuthGuard } from \'../auth/auth.guard\';

\@Controller(\'manual-time\')

\@UseGuards(AuthGuard)

export class ManualTimeController {

constructor(private readonly service: ManualTimeService) {}

\@Post()

create(@Req() req, \@Body() dto: CreateManualTimeDto) {

return this.service.createManualTime(req.user.id, dto);

}

\@Get()

findAll(@Req() req) {

return this.service.getUserManualTime(req.user.id);

}

\@Delete(\':id\')

remove(@Param(\'id\') id: string, \@Req() req) {

return this.service.deleteManualTime(id, req.user.id);

}

}



**Step 5 -- Security Notes**

- Only authenticated users may submit manual time.

- A user may only access or delete their own entries.

- Admins can view all entries (extendable with guards).

- Entries must be stored in UTC --- frontend will format them based on
  user preferences.

**Step 6 -- Integration Notes**

- Manual time entries do **not** include screenshots or keyboard/mouse
  data.

- Frontend must display these entries in the timeline view with a
  special label or icon.

- Use /manual-time GET endpoint to pull all entries for current user and
  display them.
