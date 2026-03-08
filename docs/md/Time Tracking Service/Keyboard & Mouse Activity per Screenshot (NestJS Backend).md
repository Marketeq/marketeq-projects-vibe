# **Keyboard & Mouse Activity per Screenshot (NestJS Backend)**

**Purpose\**
Expose productivity/activity indicators by attaching keyboard and mouse
activity statistics to each screenshot. Data is parsed from
ActivityWatch events, normalized into percentages, and stored in the
database for use in timeline and detail views.

## **Step 1 -- Extend Screenshot Entity**

**Explanation:\**
Add keyboard and mouse fields to the screenshots table if they are not
already present. These fields store normalized activity values (e.g., %
of activity in the minute when screenshot was taken).

**File:**
apps/time-tracking-service/src/screenshots/screenshot.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from \'typeorm\';

\@Entity(\'screenshots\')

export class Screenshot {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column({ type: \'timestamptz\' })

timestamp: Date;

// Percentage of keyboard activity at this timestamp (0--100)

\@Column({ type: \'int\', default: 0 })

keyboard: number;

// Percentage of mouse activity at this timestamp (0--100)

\@Column({ type: \'int\', default: 0 })

mouse: number;

\@Column()

imageUrl: string;

\@Column({ default: false })

isBlurred: boolean;

\@Column({ default: false })

isDeleted: boolean;

}



## **Step 2 -- Collect Events from ActivityWatch**

**Explanation:\**
ActivityWatch agents send raw event data (key presses, mouse movements)
to the backend. We store these temporarily in an activity_events table
to calculate per-screenshot metrics.

**File:**
apps/time-tracking-service/src/activity/activity-event.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from \'typeorm\';

\@Entity(\'activity_events\')

export class ActivityEvent {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

type: \'keyboard\' \| \'mouse\';

// Timestamp of the raw activity event

\@Column({ type: \'timestamptz\' })

timestamp: Date;

}



## **Step 3 -- Calculation Method**

**Explanation:\**
For each screenshot timestamp, we count keyboard and mouse events within
a surrounding time window (e.g., ±30 seconds). The percentage is
calculated relative to a threshold (e.g., maximum activity = 100%).

**Formula:**

****keyboard% = (keyboardEventsInWindow / maxKeyboardEventsPerMinute)
\* 100

mouse% = (mouseEventsInWindow / maxMouseEventsPerMinute) \* 100

Where maxKeyboardEventsPerMinute and maxMouseEventsPerMinute are
configurable normalization constants (e.g., 300 keystrokes/minute, 600
mouse events/minute).

## **Step 4 -- Service Logic to Attach Stats**

**Explanation:\**
The service calculates keyboard/mouse stats when screenshots are
processed and stores them in the screenshot entity.

**File:**
apps/time-tracking-service/src/screenshots/screenshots.service.ts

import { Injectable } from \'@nestjs/common\';

import { InjectRepository } from \'@nestjs/typeorm\';

import { Between, Repository } from \'typeorm\';

import { Screenshot } from \'./screenshot.entity\';

import { ActivityEvent } from \'../activity/activity-event.entity\';

\@Injectable()

export class ScreenshotsService {

constructor(

\@InjectRepository(Screenshot)

private readonly screenshotRepo: Repository\<Screenshot\>,

\@InjectRepository(ActivityEvent)

private readonly eventRepo: Repository\<ActivityEvent\>,

) {}

// Process activity stats for a screenshot

async attachActivityMetrics(screenshot: Screenshot) {

const windowStart = new Date(screenshot.timestamp.getTime() - 30 \*
1000);

const windowEnd = new Date(screenshot.timestamp.getTime() + 30 \* 1000);

const keyboardEvents = await this.eventRepo.count({

where: {

userId: screenshot.userId,

type: \'keyboard\',

timestamp: Between(windowStart, windowEnd),

},

});

const mouseEvents = await this.eventRepo.count({

where: {

userId: screenshot.userId,

type: \'mouse\',

timestamp: Between(windowStart, windowEnd),

},

});

// Normalize counts into percentages

const maxKeyboardEvents = 300; // configurable constant

const maxMouseEvents = 600; // configurable constant

screenshot.keyboard = Math.min(

Math.round((keyboardEvents / maxKeyboardEvents) \* 100),

100,

);

screenshot.mouse = Math.min(

Math.round((mouseEvents / maxMouseEvents) \* 100),

100,

);

return this.screenshotRepo.save(screenshot);

}

}



## **Step 5 -- API Exposure**

**Explanation:\**
Keyboard and mouse percentages are included in the API responses for
both **timeline** and **detail view**.

Example in getScreenshotDetail response (already implemented):

{

\"id\": \"scr_123\",

\"timestamp\": \"2025-08-15T14:32:10.000Z\",

\"userId\": \"user_1\",

\"keyboard\": 61,

\"mouse\": 38,

\"isBlurred\": false,

\"isDeleted\": false,

\"signedUrl\": \"https://cdn.cloudflare.com/signed/screenshots/123.png\"

}



## **Step 6 -- Security Rules**

**Explanation:\**
We must ensure that activity metrics are only visible to authorized
users.

- Non-admins can see only their own activity data.

- Admins may view data for any user.

- Deleted screenshots (isDeleted = true) do not expose metrics.

## **Step 7 -- Frontend Integration**

**Explanation:\**
How the frontend should use these fields:

- In **screenshot cards**, display keyboard/mouse percentages as
  activity bars.

- In the **screenshot detail modal**, show exact percentages (e.g., 61%
  keyboard, 38% mouse).

- For timeline summaries, the backend can optionally average activity
  across groups of screenshots.
