**06 - User Preferences & Unread Count Logic**

**Purpose**

This document defines how user preferences are stored and respected when
delivering notifications, and how unread counts are managed to support
badge counters and inbox tracking. It includes full NestJS code examples
for preference persistence, count updates, integration with notification
creation and read actions, and the controller endpoints that expose
them.

**User Notification Preferences**

Each user can manage preferences based on notification categories.
Preferences are stored in a dedicated table that allows
enabling/disabling:

- In-app notifications (Ably)

- Email notifications (SendGrid)

- SMS notifications (future)

**Entity: NotificationPreference**

****\@Entity(\'notification_preferences\')

export class NotificationPreference {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

category: string;

\@Column({ default: true })

inApp: boolean;

\@Column({ default: true })

email: boolean;

\@Column({ default: false })

sms: boolean;

\@UpdateDateColumn()

updatedAt: Date;

}

**Service: PreferenceService**

****\@Injectable()

export class PreferenceService {

constructor(

\@InjectRepository(NotificationPreference)

private readonly repo: Repository\<NotificationPreference\>

) {}

async getUserPreferences(userId: string):
Promise\<NotificationPreference\[\]\> {

return this.repo.find({ where: { userId } });

}

async getPreferenceForCategory(userId: string, category: string):
Promise\<NotificationPreference\> {

return this.repo.findOne({ where: { userId, category } });

}

async updatePreference(userId: string, category: string, updates:
Partial\<NotificationPreference\>) {

const existing = await this.repo.findOne({ where: { userId, category }
});

if (existing) {

await this.repo.update({ userId, category }, updates);

} else {

await this.repo.insert({ userId, category, \...updates });

}

}

async seedDefaultPreferences(userId: string) {

const categories = \[\'messages\', \'projects\', \'reviews\',
\'account\', \'teams\'\];

for (const category of categories) {

await this.repo.insert({

userId,

category,

inApp: true,

email: true,

sms: false,

});

}

}

}

**Controller: PreferenceController**

****\@Controller(\'preferences\')

export class PreferenceController {

constructor(private readonly preferenceService: PreferenceService) {}

\@Get()

async getAll(@Req() req: Request) {

return this.preferenceService.getUserPreferences(req\[\'user\'\].id);

}

\@Patch(\':category\')

async update(

\@Req() req: Request,

\@Param(\'category\') category: string,

\@Body() updates: Partial\<NotificationPreference\>

) {

return this.preferenceService.updatePreference(req\[\'user\'\].id,
category, updates);

}

}



**Unread Count Handling**

Unread notifications are tracked and updated in real time. The system
stores a cached unread count per user in the database for performance.

**Entity: UnreadCount**

****\@Entity(\'unread_counts\')

export class UnreadCount {

\@PrimaryColumn()

userId: string;

\@Column({ default: 0 })

count: number;

\@UpdateDateColumn()

updatedAt: Date;

}

**Service: UnreadCountService**

****\@Injectable()

export class UnreadCountService {

constructor(

\@InjectRepository(UnreadCount)

private readonly repo: Repository\<UnreadCount\>,

private readonly dataSource: DataSource

) {}

async increment(userId: string) {

const existing = await this.repo.findOne({ where: { userId } });

if (!existing) {

await this.repo.insert({ userId, count: 1 });

} else {

await this.repo.increment({ userId }, \'count\', 1);

}

}

async decrement(userId: string) {

await this.repo.decrement({ userId }, \'count\', 1);

}

async reset(userId: string) {

await this.repo.update({ userId }, { count: 0 });

}

async getCount(userId: string): Promise\<number\> {

const record = await this.repo.findOne({ where: { userId } });

return record?.count \|\| 0;

}

async incrementWithNotification(notification: NotificationEntity) {

await this.dataSource.transaction(async manager =\> {

await manager.save(notification);

const repo = manager.getRepository(UnreadCount);

const existing = await repo.findOne({ where: { userId:
notification.userId } });

if (!existing) {

await repo.insert({ userId: notification.userId, count: 1 });

} else {

await repo.increment({ userId: notification.userId }, \'count\', 1);

}

});

}

}

**Controller: UnreadCountController**

****\@Controller(\'notifications/unread\')

export class UnreadCountController {

constructor(private readonly unreadService: UnreadCountService) {}

\@Get()

async getUnreadCount(@Req() req: Request) {

return this.unreadService.getCount(req\[\'user\'\].id);

}

\@Post(\'reset\')

async resetUnreadCount(@Req() req: Request) {

await this.unreadService.reset(req\[\'user\'\].id);

return { success: true };

}

}



**Notifications Table (Relevant Fields)**

Each notification record contains:

- isRead: boolean, initially false

- readAt: timestamp, null until read

These fields help sync with the unread count record and restore totals
if needed.

**Integration Logic**

**When creating a new notification:**

****if (!notification.isRead) {

await unreadCountService.increment(notification.userId);

}

Or use the transactional helper:

await unreadCountService.incrementWithNotification(notification);

**When marking all as read:**

****await unreadCountService.reset(userId);

**Optional for individual read actions:**

****await unreadCountService.decrement(userId);

**Ensure seeding of preferences on registration:**

****await preferenceService.seedDefaultPreferences(newUserId);



**Frontend Behavior (Reference)**

- Badges are driven by the unread count table

- Notification inbox paginates from full notification records

- Read state syncs by calling the notification mark-as-read endpoints
