**07 - OneSignal Setup (Future Push Notifications)**

**Purpose**

This document outlines the initial setup and structure for integrating
OneSignal as a future provider of push notifications (mobile and
browser). Implementation is postponed until mobile apps or web push
support is introduced on the frontend.

**Planned Use Cases**

Push notifications may eventually support:

- New message alerts

- Project or job updates

- Time-sensitive contract activity

- System status or urgent platform announcements

**Platform Requirements Before Implementation**

- Web frontend or mobile apps must support OneSignal SDK

- Users must be able to grant/deny push permissions

- Notification preferences must include a push toggle

- Push tokens must be collected and stored per device

**OneSignal Setup Checklist (When Ready)**

1.  Create a OneSignal account and project

2.  Register app/platform (iOS, Android, Web Push)

3.  Configure push certificate or Firebase key

4.  Save OneSignal App ID and API Key in environment variables:

    - ONESIGNAL_APP_ID

    - ONESIGNAL_API_KEY

5.  Update frontend to include OneSignal JavaScript SDK (web) or mobile
    SDK

6.  Collect push tokens via frontend and associate with user ID

7.  Store device token and platform in user_devices table

**Suggested user_devices Table**

  ----------------------------------------------
  **Column**   **Type**    **Description**
  ------------ ----------- ---------------------
  user_id      UUID        Associated user

  device_id    string      Unique device
                           identifier

  token        string      OneSignal push token

  platform     string      \'ios\', \'android\',
                           or \'web\'

  is_active    boolean     Whether token is
                           still valid

  updated_at   timestamp   Last updated time
  ----------------------------------------------

**Entity: UserDevice**

****\@Entity(\'user_devices\')

export class UserDevice {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

deviceId: string;

\@Column()

token: string;

\@Column()

platform: string;

\@Column({ default: true })

isActive: boolean;

\@UpdateDateColumn()

updatedAt: Date;

}



**Service: PushService (push.service.ts)**

Install Axios if not already installed:

npm install axios



@Injectable()

export class PushService {

private readonly ONE_SIGNAL_URL =
\'https://onesignal.com/api/v1/notifications\';

constructor(

\@InjectRepository(UserDevice)

private readonly deviceRepo: Repository\<UserDevice\>,

private readonly config: ConfigService

) {}

async sendPush(userId: string, title: string, message: string, url?:
string) {

const tokens = await this.getUserDeviceTokens(userId);

if (!tokens.length) return;

const payload = {

app_id: this.config.get(\'ONESIGNAL_APP_ID\'),

include_player_ids: tokens,

headings: { en: title },

contents: { en: message },

url,

};

const response = await axios.post(this.ONE_SIGNAL_URL, payload, {

headers: {

Authorization: \`Basic \${this.config.get(\'ONESIGNAL_API_KEY\')}\`,

\'Content-Type\': \'application/json\'

}

});

console.log(\'Push sent. Response:\', response.data);

}

async getUserDeviceTokens(userId: string): Promise\<string\[\]\> {

const devices = await this.deviceRepo.find({ where: { userId, isActive:
true } });

return devices.map(device =\> device.token);

}

async saveOrUpdateDevice(userId: string, deviceId: string, token:
string, platform: string) {

const existing = await this.deviceRepo.findOne({ where: { deviceId } });

if (existing) {

await this.deviceRepo.update({ deviceId }, { token, platform, isActive:
true });

} else {

await this.deviceRepo.insert({ userId, deviceId, token, platform,
isActive: true });

}

}

async cleanupInactiveDevices() {

const cutoffDate = new Date(Date.now() - 1000 \* 60 \* 60 \* 24 \* 30);

await this.deviceRepo.update({ updatedAt: LessThan(cutoffDate) }, {
isActive: false });

}

}



**Controller: push.controller.ts**

****\@Controller(\'notifications/push\')

export class PushController {

constructor(private readonly pushService: PushService) {}

\@Post(\'register-device\')

async registerDevice(@Body() body: any) {

const { userId, deviceId, token, platform } = body;

await this.pushService.saveOrUpdateDevice(userId, deviceId, token,
platform);

return { success: true };

}

\@Post(\'test\')

async sendTestPush(@Body() body: any) {

const { userId, title, message, url } = body;

await this.pushService.sendPush(userId, title, message, url);

return { success: true };

}

}



**Send Logic (Planned)**

When enabled, push notifications will follow the same flow as other
channels:

- Notification service receives event

- User preferences include push = true

- Device tokens are retrieved

- OneSignal API is used to deliver message to all active tokens

Example POST to OneSignal:

{

\"app_id\": \"ONESIGNAL_APP_ID\",

\"include_player_ids\": \[\"token1\", \"token2\"\],

\"headings\": {\"en\": \"New Message\"},

\"contents\": {\"en\": \"You have a new message from John.\"},

\"url\": \"https://app.marketeq.com/messages\"

}



**Push Logging & Automation**

- Push responses are logged to the console. You may extend this to a
  push_logs table for analytics.

- A cleanup method is included to deactivate tokens not updated in 30+
  days. This may be expanded into a scheduled cron job.

- Retry logic is not currently implemented. Developers may add retries
  or status code handling (e.g. retry on 500 errors, handle 410 Gone).

- Rate limiting is not enforced in this setup, but can be added to
  prevent accidental message spamming. Consider adding per-user rate
  caps based on event type.

**Frontend Integration (Planned)**

**For Mobile Apps:**

- Use OneSignal's Android/iOS SDKs

- Ask for permission and collect device push token

- POST token to /notifications/push/register-device

**For Browser (Web Push):**

- Web push must be served over HTTPS

- Include OneSignal Web SDK in layout or \_app.tsx

- Initialize SDK with OneSignal App ID

- Register a service worker

- Request user permission for push

- On approval, collect player ID/token and POST to
  /notifications/push/register-device

**Notes**

- OneSignal support is optional and currently not active

- All payloads must follow simplified format for mobile/web delivery

- SMS support is tracked separately and not handled by OneSignal
