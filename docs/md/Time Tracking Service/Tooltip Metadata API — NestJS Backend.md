# **Tooltip Metadata API --- NestJS Backend**

**Purpose\**
Provide consistent tooltip text for UI pop-ups. Tooltips that depend on
**admin settings** (blurred/deleted billing) or **system configuration**
(timezone, activity tracking) are dynamically generated. All others can
be stored as static text in the database or JSON.

## **Step 1 --- Database Schema**

**Explanation:\**
We store static tooltips in a tooltips table. Dynamic tooltips (billing
rules, timezone) are generated on the fly.

**File:** apps/time-tracking-service/src/tooltips/tooltip.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from \'typeorm\';

\@Entity(\'tooltips\')

export class Tooltip {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column({ unique: true })

key: string; // e.g., \"timeCalculation\", \"deleteReason\"

\@Column(\'text\')

text: string; // Tooltip explanatory text

}



## **Step 2 --- Service**

**Explanation:\**
Service pulls static tooltips from DB and injects dynamic tooltips from
**Admin Settings** and **User Settings**.

**File:** apps/time-tracking-service/src/tooltips/tooltips.service.ts

@Injectable()

export class TooltipsService {

constructor(

\@InjectRepository(Tooltip)

private readonly repo: Repository\<Tooltip\>,

private readonly settingsService: SettingsService,

private readonly userService: UserService,

) {}

async getAll(scopeId: string, userId: string) {

const baseTooltips = await this.repo.find();

const map: Record\<string, string\> = {};

baseTooltips.forEach(t =\> {

map\[t.key\] = t.text;

});

// Load admin settings for dynamic billing tooltips

const settings = await this.settingsService.getSettings(scopeId);

map\[\'blurredBilling\'\] = settings.blurredBillable

? \'Blurred screenshots are billable.\'

: \'Blurred screenshots are not billable.\';

map\[\'deletedBilling\'\] = settings.deletedNonBillable

? \'Deleted screenshots are not billable.\'

: \'Deleted screenshots remain billable.\';

// Timezone info from user preferences

const user = await this.userService.getUserById(userId);

map\[\'timezoneInfo\'\] = \`Current timezone: \${user.timezone}\`;

// Static keys mapped from design

map\[\'timeCalculation\'\] = map\[\'timeCalculation\'\] \|\| \'We
calculate your activity using mouse and keyboard input during tracked
hours. Screenshots are taken every 10 minutes to match the activity
score.\';

map\[\'deleteReason\'\] = map\[\'deleteReason\'\] \|\| \'This helps us
understand why screenshots are being deleted.\';

map\[\'noActivity\'\] = map\[\'noActivity\'\] \|\| \'No mouse or
keyboard activity was detected during this period.\';

map\[\'manualTime\'\] = map\[\'manualTime\'\] \|\| \'This time was
manually added and not tracked via the app.\';

return map;

}

}



## **Step 3 --- Controller**

**Explanation:\**
Expose tooltips for a given contract (scopeId) and user. This ensures
settings (billing + timezone) are applied.

**File:** apps/time-tracking-service/src/tooltips/tooltips.controller.ts

@Controller(\'api/tooltips\')

export class TooltipsController {

constructor(private readonly tooltipsService: TooltipsService) {}

// Public endpoint: returns tooltip dictionary

\@Get(\':scopeId\')

async getAll(@Param(\'scopeId\') scopeId: string, \@Req() req) {

return this.tooltipsService.getAll(scopeId, req.user.id);

}

}



## **Step 4 --- Example Response**

****GET /api/tooltips/contract_123

Authorization: Bearer \<token\>

Response:

{

\"timeCalculation\": \"We calculate your activity using mouse and
keyboard input during tracked hours. Screenshots are taken every 10
minutes to match the activity score.\",

\"deleteReason\": \"This helps us understand why screenshots are being
deleted.\",

\"blurredBilling\": \"Blurred screenshots are billable.\",

\"deletedBilling\": \"Deleted screenshots are not billable.\",

\"timezoneInfo\": \"Current timezone: UTC−4 New York\",

\"noActivity\": \"No mouse or keyboard activity was detected during this
period.\",

\"manualTime\": \"This time was manually added and not tracked via the
app.\"

}



## **Step 5 --- Security Rules**

- Public/read-only endpoint, accessible to authenticated users.

- Admin-only editing endpoint can be added for updating static tooltips.

- Dynamic tooltips are enforced server-side to prevent mismatch with
  billing logic.

## **Step 6 --- Frontend Integration Notes**

- UI maps each tooltip icon directly to a key in the dictionary.

- Dynamic tooltips (billing, timezone) are guaranteed to reflect backend
  rules.

- Static tooltips (e.g., "Reason for deleting screenshot") can be edited
  in DB without redeploying frontend.
