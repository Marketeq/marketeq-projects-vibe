**08 - API Endpoints for Notification Retrieval & Mark as Read**

**Purpose**

This document defines the REST API endpoints provided by the
notification-service for accessing user notifications and updating read
status. These endpoints are consumed by the frontend to populate the
notification inbox, badge counters, and manage user interaction. Full
backend implementation examples are provided using NestJS and TypeORM.

**Authentication**

All endpoints require user authentication. Requests must include a valid
JWT access token. Users may only access their own notification records.

**Notification Entity (TypeORM)**

****\@Entity(\'notifications\')

export class Notification {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

title: string;

\@Column()

body: string;

\@Column({ nullable: true })

link: string;

\@Column()

category: string;

\@Column({ default: false })

isRead: boolean;

\@Column({ type: \'timestamp\', nullable: true })

readAt: Date;

\@CreateDateColumn()

createdAt: Date;

\@Column({ default: false })

isArchived: boolean;

}



**GET /notifications\**
Retrieve a paginated list of the user\'s notifications.

@Get()

\@UseGuards(AuthGuard)

async getNotifications(@CurrentUser() user, \@Query() query):
Promise\<any\> {

const { page = 1, limit = 20, category, unread } = query;

return this.notificationService.getPaginatedNotifications(user.id, page,
limit, category, unread);

}

**NotificationService method:**

****async getPaginatedNotifications(userId: string, page: number,
limit: number, category?: string, unread?: boolean) {

const where: any = { userId, isArchived: false };

if (category) where.category = category;

if (unread === \'true\') where.isRead = false;

const \[data, total\] = await this.repo.findAndCount({

where,

order: { createdAt: \'DESC\' },

skip: (page - 1) \* limit,

take: limit

});

return {

data,

meta: { page, limit, total }

};

}



**POST /notifications/:id/read\**
Marks a single notification as read.

@Post(\':id/read\')

\@UseGuards(AuthGuard)

async markAsRead(@CurrentUser() user, \@Param(\'id\') id: string):
Promise\<void\> {

await this.notificationService.markAsRead(user.id, id);

}

**NotificationService method:**

****async markAsRead(userId: string, id: string): Promise\<void\> {

await this.repo.update({ id, userId }, { isRead: true, readAt: new
Date() });

}



**POST /notifications/read-all\**
Marks all of the user\'s notifications as read.

@Post(\'read-all\')

\@UseGuards(AuthGuard)

async markAllAsRead(@CurrentUser() user): Promise\<void\> {

await this.notificationService.markAllAsRead(user.id);

}

**NotificationService method:**

****async markAllAsRead(userId: string): Promise\<void\> {

await this.repo.update({ userId, isRead: false }, { isRead: true,
readAt: new Date() });

}



**GET /notifications/unread-count\**
Returns the current unread notification count for the authenticated
user.

@Get(\'unread-count\')

\@UseGuards(AuthGuard)

async getUnreadCount(@CurrentUser() user): Promise\<{ unreadCount:
number }\> {

const count = await this.notificationService.getUnreadCount(user.id);

return { unreadCount: count };

}

**NotificationService method:**

****async getUnreadCount(userId: string): Promise\<number\> {

return this.repo.count({ where: { userId, isRead: false } });

}



**POST /notifications/:id/archive\**
Archives a single notification (soft delete).

@Post(\':id/archive\')

\@UseGuards(AuthGuard)

async archiveNotification(@CurrentUser() user, \@Param(\'id\') id:
string): Promise\<void\> {

await this.notificationService.archive(user.id, id);

}

**NotificationService method:**

****async archive(userId: string, id: string): Promise\<void\> {

await this.repo.update({ id, userId }, { isArchived: true });

}



**DELETE /notifications/:id\**
Permanently deletes a notification for the user.

@Delete(\':id\')

\@UseGuards(AuthGuard)

async deleteNotification(@CurrentUser() user, \@Param(\'id\') id:
string): Promise\<void\> {

await this.notificationService.delete(user.id, id);

}

**NotificationService method:**

****async delete(userId: string, id: string): Promise\<void\> {

await this.repo.delete({ id, userId });

}



**Admin Endpoints\**
Not implemented in this version. Admin-only routes (e.g., view all user
notifications or broadcast system alerts) can be added in a future
update.

**Notes**

- All database updates use soft match with userId to ensure isolation

- This logic assumes a basic AuthGuard and \@CurrentUser() decorator are
  already configured

- These endpoints do not support admin access or viewing notifications
  for other users
