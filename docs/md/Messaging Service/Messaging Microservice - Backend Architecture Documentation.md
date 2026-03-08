**Messaging Microservice - Backend Architecture Documentation**

### **🔍 Overview**

**This microservice enables core inbox and real-time messaging features,
including sending/receiving messages, editing, replying, forwarding,
attachments, GIFs, and search. Based on the uploaded UX designs, the
system will use Ably for real-time communication, PostgreSQL for
persistence, and a REST API served via NestJS.**

### **🌐 Core Features**

1.  **Inbox View\**

    - **Thread previews with last message\**

    - **Starred, Unread, Sent, Archived, Spam, Trash filters\**

    - **Pinned Chats bar\**

2.  **Message Threads\**

    - **Real-time sending and receiving (Ably)\**

    - **Read/delivery status\**

    - **Message editing (inline)\**

    - **Reply to specific message\**

    - **Forward message to up to 5 users\**

    - **File attachments & media previews\**

    - **Emojis and GIF picker\**

3.  **Search & Filtering\**

    - **Search across messages, people, files, and links\**

    - **Filters by content type\**

4.  **Message Actions\**

    - **Pin/Unpin, Star/Unstar\**

    - **Delete, Archive, Restore\**

    - **Block/Report user\**

### **📡 Real-Time Channel Architecture (Ably)**

#### **🔐 Channel Naming Conventions**

- **chat:thread-{threadId} -- one-to-one or group conversation
  channel\**

- **user:{userId} -- private channel for notifications like message
  delivery, read receipts, etc.\**

- **presence:thread-{threadId} -- used for typing indicators and online
  presence\**

#### **🔄 Event Naming Conventions**

+----------------------+----------------------------------+-----------------------+
| > **Event**          | > **Channel**                    | > **Description**     |
+----------------------+----------------------------------+-----------------------+
| > **message:new**    | > **chat:thread-{threadId}**     | > **A new message was |
|                      |                                  | > sent**              |
+----------------------+----------------------------------+-----------------------+
| > **message:edit**   | > **chat:thread-{threadId}**     | > **A message was     |
|                      |                                  | > edited**            |
+----------------------+----------------------------------+-----------------------+
| > **message:delete** | > **chat:thread-{threadId}**     | > **A message was     |
|                      |                                  | > deleted**           |
+----------------------+----------------------------------+-----------------------+
| > **message:read**   | > **user:{userId}**              | > **Sent to sender    |
|                      |                                  | > when recipient      |
|                      |                                  | > reads message**     |
+----------------------+----------------------------------+-----------------------+
| > **typing:start**   | > **presence:thread-{threadId}** | > **Typing started by |
|                      |                                  | > a user**            |
+----------------------+----------------------------------+-----------------------+
| > **typing:stop**    | > **presence:thread-{threadId}** | > **Typing stopped or |
|                      |                                  | > timeout**           |
+----------------------+----------------------------------+-----------------------+
| > **presence:enter** | > **presence:thread-{threadId}** | > **User is online in |
|                      |                                  | > thread**            |
+----------------------+----------------------------------+-----------------------+
| > **presence:leave** | > **presence:thread-{threadId}** | > **User disconnected |
|                      |                                  | > or closed chat**    |
+======================+==================================+=======================+

#### **💬 Publishing Strategy**

- **Backend triggers message:new, message:edit, message:delete,
  message:read\**

- **Frontend emits typing:start, typing:stop\**

- **Presence is handled by Ably presence APIs\**

#### **⚠️ Naming Rule Guidelines**

- **Always lowercase and kebab-case for consistency\**

- **Thread IDs and user IDs must be validated on the backend before
  issuing Ably tokens\**

- **All channels are private or presence type --- require token auth
  (see below)\**

### **🔐 Ably Token Authentication Setup**

**Ably requires secure access to private and presence channels. We use
token-based authentication to allow only authorized users to
subscribe.**

#### **1. NestJS Endpoint Setup**

**Create a route like:**

- **@Get(\'/auth/ably\')**

- **\@UseGuards(JwtAuthGuard)**

- **async getAblyToken(@Request() req) {**

- **const tokenParams = await ably.auth.createTokenRequest({**

- **clientId: req.user.id.toString(),**

- **capability: getUserCapabilities(req.user.id)**

- **});**

- **return tokenParams;**

- **}**

#### **2. getUserCapabilities()**

- **function getUserCapabilities(userId: string) {**

- **return {**

- **\[\`chat:thread-\*\`\]: \[\'publish\', \'subscribe\',
  \'presence\'\],**

- **\[\`user:\${userId}\`\]: \[\'subscribe\'\],**

- **\[\`presence:thread-\*\`\]: \[\'subscribe\', \'presence\'\]**

- **};**

- **}**

> **You may refine this to allow access only to specific thread IDs the
> user is part of.**

#### **3. Frontend Ably Auth Setup (Next.js/React)**

- **const ably = new Ably.Realtime({**

- **authUrl: \'/api/auth/ably\',**

- **clientId: currentUser.id**

- **});**

#### **4. Securing Routes with Guards**

**Use JwtAuthGuard or your preferred strategy to ensure only
authenticated users can request tokens.**

#### **5. Ably Dashboard Setup**

- **Enable token auth only\**

- **Disable API key-based connection for frontend\**

- **Monitor usage per app environment (dev/staging/prod)\**

#### **6. Security Considerations**

- **Validate that the user is allowed to access each thread before
  granting token capability\**

- **Rotate Ably API keys regularly and store them securely in .env\**

<!-- -->

- **ABLY_API_KEY=xxx:yyy**

- **ABLY_API_CLIENT_ID=system**

> ****

### **🗃️ Key Models (PostgreSQL)**

#### **User**

- **id (UUID)\**

- **username\**

- **display_name\**

- **avatar_url\**

#### **Thread**

- **id (UUID)\**

- **participants: UUID\[\]\**

- **is_group (boolean)\**

- **created_at, updated_at\**

#### **Message**

- **id (UUID)\**

- **thread_id (FK)\**

- **sender_id (FK)\**

- **content (text)\**

- **reply_to_message_id (UUID, nullable)\**

- **forwarded_from_id (UUID, nullable)\**

- **status: \[\"sent\", \"delivered\", \"read\"\]\**

- **message_type: \[\"text\", \"file\", \"gif\"\]\**

- **edited (boolean)\**

- **created_at, updated_at\**

#### **Attachment**

- **id (UUID)\**

- **message_id (FK)\**

- **file_url\**

- **file_type\**

- **file_size\**

#### **PinnedMessage**

- **id (UUID)\**

- **user_id (FK)\**

- **message_id (FK)\**

- **created_at\**

#### **BlockedUser**

- **blocker_id (FK)\**

- **blocked_id (FK)\**

### **🛠️ Backend Services (NestJS APIs)**

#### **/messages**

- **POST / - send message (text, file, gif)\**

- **GET /thread/:id - fetch messages for a thread\**

- **PATCH /:id - edit message\**

- **DELETE /:id - delete message\**

#### **/threads**

- **GET / - fetch all threads for user\**

- **POST / - create new thread (if not exist)\**

- **GET /:id - get thread metadata\**

#### **/search**

- **GET /?q=term&type=\[all\|people\|files\|links\|messages\]\**

#### **/reactions *(optional)***

- **POST /emoji\**

- **POST /gif\**

#### **/pinned**

- **POST / - pin message\**

- **DELETE /:id - unpin\**

#### **/forward**

- **POST / - forward message to up to 5 users\**

### **🔒 Authentication & Permissions**

- **All Ably channels are private or presence-based.\**

- **Server-side token auth endpoint must validate user access to the
  thread.\**

- **Blocked users cannot join or publish to threads.\**

### **⚡ Real-Time Rules**

- **Messages appear instantly in UI (via Ably)\**

- **Backend stores message and triggers publish\**

- **Typing indicators expire after 5 seconds unless refreshed\**

- **Limit forwarding to 5 users per message\**
