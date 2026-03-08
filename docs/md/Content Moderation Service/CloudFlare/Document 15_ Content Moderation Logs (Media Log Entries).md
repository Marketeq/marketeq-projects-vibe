### **Document 15: Content Moderation Logs (Media Log Entries)**

#### **Overview**

The **Content Moderation Microservice** logs every media moderation
action to provide a complete audit trail. Logs capture:

- **Media URL** (Cloudflare R2)

- **Action** (approved \| rejected)

- **Reason** for rejection (e.g., explicit content, fetch failure)

- **Timestamp** of the event

- **Error details** if applicable

These logs are stored in a **PostgreSQL** table (moderation_logs)
together with text moderation entries.

#### **1. Log Table Schema**

****CREATE TABLE moderation_logs (

id SERIAL PRIMARY KEY,

timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

project_id UUID NOT NULL,

field_type VARCHAR(50) NOT NULL, \-- e.g. \'media\'

media_url TEXT, \-- Cloudflare R2 URL

action VARCHAR(20) NOT NULL, \-- \'approved\' or \'rejected\'

reason VARCHAR(255), \-- e.g. \'explicit content\', \'unable to fetch
media\'

error_message TEXT \-- full error text if an exception occurred

);



#### **2. Logging Service**

Implement a dedicated logging service that writes media entries:

// src/logging/moderation-logging.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Repository } from \'typeorm\';

import { ModerationLog } from \'./moderation-log.entity\';

\@Injectable()

export class ModerationLoggingService {

constructor(

\@InjectRepository(ModerationLog)

private readonly repo: Repository\<ModerationLog\>,

) {}

async logMediaAction(

projectId: string,

mediaUrl: string,

action: \'approved\' \| \'rejected\',

reason: string,

errorMessage?: string,

) {

const entry = this.repo.create({

projectId,

fieldType: \'media\',

mediaUrl,

action,

reason,

errorMessage: errorMessage \|\| null,

});

await this.repo.save(entry);

}

}

Define the Entity:

// src/logging/moderation-log.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from \'typeorm\';

\@Entity({ name: \'moderation_logs\' })

export class ModerationLog {

\@PrimaryGeneratedColumn(\'increment\')

id: number;

\@Column({ type: \'timestamp\', default: () =\> \'CURRENT_TIMESTAMP\' })

timestamp: Date;

\@Column(\'uuid\')

projectId: string;

\@Column()

fieldType: string; // \'media\' or \'text\'

\@Column({ type: \'text\', nullable: true })

mediaUrl: string;

\@Column()

action: string; // \'approved\' \| \'rejected\'

\@Column({ nullable: true })

reason: string;

\@Column({ type: \'text\', nullable: true })

errorMessage: string;

}



#### **3. Integrate Logging into Media Moderation**

In MediaModerationService, invoke logging on each validation:

// src/media/media-moderation.service.ts

import { Inject, Injectable } from \'@nestjs/common\';

import { S3 } from \'aws-sdk\';

import { HuggingFaceService } from \'./hugging-face.service\';

import { ModerationLoggingService } from
\'../logging/moderation-logging.service\';

\@Injectable()

export class MediaModerationService {

// \... constructor with hfService and loggingService injected

async validateMedia(projectId: string, url: string): Promise\<boolean\>
{

let action: \'approved\' \| \'rejected\';

let reason = \'\';

let errorMessage = \'\';

try {

// verify existence in R2\...

// then moderate

const safe = url.match(/\\.(jpg\|png)\$/)

? await this.hf.moderateImage(url)

: await this.hf.moderateVideo(url);

action = safe ? \'approved\' : \'rejected\';

if (!safe) reason = \'explicit content\';

return safe;

} catch (err) {

action = \'rejected\';

reason = err.message.includes(\'Unable to fetch\')

? \'unable to fetch media\'

: \'moderation error\';

errorMessage = err.stack \|\| err.message;

return false;

} finally {

// log regardless of outcome

await this.loggingService.logMediaAction(

projectId,

url,

action,

reason,

errorMessage,

);

}

}

}



#### **4. Sample Log Entries**

  **id**   **timestamp**         **project_id**                         **field_type**   **media_url**                                    **action**   **reason**              **error_message**
  -------- --------------------- -------------------------------------- ---------------- ------------------------------------------------ ------------ ----------------------- -------------------
  101      2025-08-01 14:22:10   550e8400-e29b-41d4-a716-446655440000   media            https://imagedelivery.net/.../file1.jpg/public   approved                             
  102      2025-08-01 14:23:05   550e8400-e29b-41d4-a716-446655440000   media            https://.../bad.png/public                       rejected     explicit content        
  103      2025-08-01 14:24:20   550e8400-e29b-41d4-a716-446655440000   media            https://.../missing.jpg/public                   rejected     unable to fetch media   403 Forbidden

This ensures every media moderation decision is recorded, enabling
auditability, trend analysis, and debugging for your Cloudflare-backed
media pipeline.
