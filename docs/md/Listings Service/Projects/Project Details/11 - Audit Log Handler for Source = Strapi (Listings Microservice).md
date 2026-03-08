**Audit Log Handler for Source = Strapi (Listings Microservice)**

This document provides the complete implementation for tracking changes
made through Strapi in your Listings Microservice audit log system. The
purpose is to ensure a single unified audit trail for all updates,
whether they originate from the frontend or the Strapi admin interface.

## **✍️ Step 1: Update the AuditLog Entity (PostgreSQL + TypeORM)**

Add a new field to the audit log entity to record the source of the
update (e.g., strapi, frontend).

// src/audit-log/entities/audit-log.entity.ts

export enum AuditSource {

FRONTEND = \'frontend\',

STRAPI = \'strapi\',

}

\@Entity(\'audit_logs\')

export class AuditLog {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

resource_type: string; // e.g., \"project\"

\@Column()

resource_id: string;

\@Column()

field_changed: string;

\@Column({ nullable: true })

old_value: string;

\@Column({ nullable: true })

new_value: string;

\@Column({ type: \'enum\', enum: AuditSource })

source: AuditSource;

\@Column({ nullable: true })

user_id: string;

\@Column({ nullable: true })

user_email: string;

\@Column({ nullable: true })

user_name: string;

\@CreateDateColumn()

timestamp: Date;

}



## **🔧 Step 2: Create Utility Function for Logging**

****// src/audit-log/utils/log-audit-change.ts

import { AuditLog, AuditSource } from \'../entities/audit-log.entity\';

import { DataSource } from \'typeorm\';

export async function logAuditChange({

resource_type,

resource_id,

field_changed,

old_value,

new_value,

user_id,

user_email,

user_name,

source,

}: {

resource_type: string;

resource_id: string;

field_changed: string;

old_value?: string;

new_value?: string;

user_id?: string;

user_email?: string;

user_name?: string;

source: AuditSource;

}) {

const logRepo = new DataSource().getRepository(AuditLog);

const logEntry = logRepo.create({

resource_type,

resource_id,

field_changed,

old_value,

new_value,

user_id,

user_email,

user_name,

source,

});

await logRepo.save(logEntry);

}



## **📢 Step 3: Add Logging Call to Sync Handler**

Edit the strapi-sync.service.ts to call logAuditChange() after a field
update:

// src/strapi-sync/strapi-sync.service.ts

await logAuditChange({

resource_type: \'project\',

resource_id: project.id,

field_changed: \'title\',

old_value: oldProject.title,

new_value: payload.title,

user_id: \'strapi-admin-id\',

user_email: \'admin@example.com\',

user_name: \'Strapi Admin\',

source: AuditSource.STRAPI,

});

> ⚠️ You can dynamically pull the Strapi user info if included in the
> webhook payload.

## **✅ Notes**

- This same structure supports logging from frontend and Strapi with no
  separate logic branches.

- Use the source field to filter or group audit logs in your admin UI.

- Log entries can be viewed in a dedicated Audit Log tab or downloaded
  for compliance.
