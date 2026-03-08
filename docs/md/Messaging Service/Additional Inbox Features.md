**Additional Inbox Features**

## **🧩 Developer Ticket 1: Typing Indicators**

### **🎯 Goal**

Implement real-time typing indicators using Ably Presence for all active
threads.

### **✅ Tasks**

- Use presence:thread-{threadId} for each open thread

- Call presence.enter({ userId }) on thread open

- Call presence.update({ typing: true }) when user types

- Call presence.update({ typing: false }) after 5s of no activity

- Subscribe to presence updates from Ably client

- Track typing users in frontend state

- On disconnect or tab close, call presence.leave()

### **📦 Ably Events**

- Channel: presence:thread-{threadId}

- Payload: { userId, typing: true \| false }

## **🧩 Developer Ticket 2: Read Receipts**

### **🎯 Goal**

Send and track read receipts for messages as users view them in a
thread.

### **✅ Tasks**

- Emit Ably event message:read from frontend when user scrolls to latest
  message

- Channel: user:{senderUserId} (private channel)

- Payload: { threadId, messageId, readerId, readAt }

- Backend should store readAt in a read_receipts table

- On frontend, show \"Seen\" badge under messages the recipient has
  viewed

- Show tooltip on hover or avatar stack for group receipts

## **🧩 Developer Ticket 3: Message Reactions**

### **🎯 Goal**

Let users react to messages with emojis and broadcast reaction updates
in real time.

### **✅ Tasks**

- Create a reactions table (or message metadata JSONB)

  - id, message_id, user_id, emoji, created_at

- Add POST /messages/:id/reactions endpoint

- Emit message:reaction via Ably on success

- Subscribe to message:reaction on frontend

- Merge into message state to show inline emoji counts

### **📦 Ably Events**

- Channel: chat:thread-{threadId}

- Event: message:reaction

- Payload: { messageId, emoji, userId }

## **🧩 Developer Ticket 4: Block / Report Controls**

### **🎯 Goal**

Prevent blocked users from contacting each other, and support reporting
for moderation.

### **✅ Tasks**

- Create blocked_users table:

  - blocker_id, blocked_id, created_at

- Prevent token issuance for blocked users in getUserCapabilities()

- On frontend, add stub actions for Block + Report

- Add POST /users/:id/block and POST /users/:id/report

- Add Ably-side check to deny subscription if blocked

- Optional: flag messages sent just before a block for review

## **🧩 Developer Ticket 5: Inbox Filtering Tabs (Backend)**

### **🎯 Goal**

Support backend logic for inbox filters (Unread, Starred, Archived,
etc.)

### **✅ Tasks**

- Add boolean flags to threads or thread_participants table:

  - is_archived, is_starred, is_read, is_spam, is_trashed

- Add filters to GET /threads endpoint:

  - ?filter=unread, ?filter=archived, etc.

- Add ability to patch thread flags:

  - PATCH /threads/:id/star or archive, etc.

- Frontend can begin wiring dropdown filters to test API

Let me know when you're ready for the **API endpoint specs**, and I'll
break each one down by route, method, request body, and response.
