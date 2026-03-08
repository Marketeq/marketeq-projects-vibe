## **🧭 Ably Integration Roadmap (Order + Tasks)**

### **1. Ably Token Authentication Setup**

**Doc:** Ably-token-auth

**Tasks:**

- Create /auth/ably endpoint in NestJS

- Authenticate user via JwtAuthGuard

- Generate token request using ably.auth.createTokenRequest()

- Scope token capabilities by thread and user

- Return token with correct TTL

- Disable API key auth in Ably dashboard

- Store keys in .env

- Write unit tests for token auth flow

### **2. Ably Publishing Service (NestJS Adapter)**

**Doc:** Ably-publishing-service

**Tasks:**

- Create reusable AblyService class in NestJS

- Implement publish(channel, event, data) method

- Support message:new, edit, delete, read, typing:start, typing:stop

- Add internal error logging and retry logic

- Wrap in RealTimeAdapter interface for future Socket.IO use

- Register as injectable provider

### **3. Ably Frontend Subscriber Setup**

**Doc:** Ably-frontend-subscriber

**Tasks:**

- Install Ably JS SDK

- Configure ablyClient.ts with token auth and client ID

- Create useThreadSubscriptions hook

- Subscribe to all message events

- Handle connection lifecycle (connected, disconnected, failed)

- Cleanup subscriptions on unmount

- Debounce typing events

- Use a global context or singleton for Ably client

### **4. Message History & Replay with Ably**

**Doc:** Ably-message-history

**Tasks:**

- Enable message retention in Ably dashboard (24--72 hrs)

- Use channel.history() on frontend to fetch past messages

- Support pagination with resultPage.next()

- Optionally expose backend API to fetch Ably history

- Merge history with local state

- Add fallback logic to use DB if needed

### **5. Typing Indicators & Presence**

**Doc:** Ably-typing-and-presence

**Tasks:**

- Use presence:thread-{threadId} for online/typing tracking

- Call presence.enter() and leave() on mount/unmount

- Update presence with typing: true and false

- Auto-clear typing with a 5s timeout

- Subscribe to presence.update to show who is typing

- Track presence status for member list or avatars

### **6. Channel Permissions, Blocking & Moderation**

**Doc:** Ably-permissions-blocking

**Tasks:**

- Scope capabilities per user using thread membership

- Exclude channels involving blocked users

- Prevent token generation for banned users

- Log blocked access attempts

- Enforce publishing restrictions via capabilities

- Add backend filters to prevent blocked users from sending/receiving
  messages

### **7. Monitoring & Dev Console Setup**

**Doc:** Ably-monitoring-devconsole

**Tasks:**

- Use Ably dashboard to inspect active channels and connections

- View live presence and messages in Inspect tab

- Add connection event listeners in frontend

- Monitor token auth logs

- Track usage metrics and set up alerts

- Create separate API keys per environment

- Review dashboard access and rotate keys regularly
