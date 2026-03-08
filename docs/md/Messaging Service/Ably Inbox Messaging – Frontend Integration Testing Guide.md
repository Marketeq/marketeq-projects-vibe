**Ably Inbox Messaging -- Frontend Integration Testing Guide**

### **Overview**

This document provides a detailed QA and developer checklist for testing
the **Ably-powered messaging features** on the frontend. These tests
cover **real-time communication**, **message state handling**, **Ably
channel subscriptions**, and **user event triggers**.

This applies to all inbox views: Main Inbox, Reply, Edit, Forward, and
Search.

### **Prerequisites**

- Ably API key is correctly loaded from .env

- User is authenticated and has a valid user_id

- Ably client is initialized and connected via WebSocket

- Project is running locally or in staging environment

### **Ably Client Setup**

Ensure the client is initialized correctly:

// utils/ably.ts

import Ably from \'ably/promises\';

export const ablyClient = new Ably.Realtime.Promise({ key:
process.env.NEXT_PUBLIC_ABLY_KEY });



### **Testing Scenarios**

#### **✅ 1. Channel Subscription**

- On login, user should subscribe to their private channel:

const channel = ablyClient.channels.get(\`inbox:\${userId}\`);

channel.subscribe(\'new-message\', callback);

- \
  Validate that the user only receives messages intended for them.

#### **✅ 2. Sending a Message**

- Type a message and hit send.

- Verify:

  - Message appears in the thread immediately (optimistic update).

  - sendMessage() calls API and triggers Ably publish.

  - Recipient sees the message in \<1s.

#### **✅ 3. Editing a Message**

- Click \'edit\' on a message.

- Update content and submit.

- Verify:

  - Message content updates in place.

  - An edit-message event is broadcasted.

#### **✅ 4. Forwarding a Message**

- Click \'forward\' on a message.

- Select new recipient and send.

- Verify:

  - Original message is duplicated into a new conversation.

  - New recipient receives it via inbox:{recipientId} Ably channel.

#### **✅ 5. Replying to a Message**

- Open a message thread and reply.

- Verify:

  - Message shows as a reply under correct message.

  - Event is emitted as reply-message.

#### **✅ 6. File Attachments**

- Upload PDF, image, or GIF.

- Verify:

  - Upload is successful (mock file upload if needed).

  - Message sends with reference to file.

  - File preview renders in thread.

#### **✅ 7. Search Behavior**

- Type a keyword in search.

- Validate:

  - Ably is **not** triggered (search is local or from DB).

  - UI filters results correctly.

### **UI Feedback Testing**

- ✅ Real-time status for message sent/delivered

- ✅ Retry state for failed messages

- ✅ Loading spinner for sending

- ✅ Emoji/GIF renders

- ✅ Edited label appears after message update

### **Error Testing**

- Disconnect WebSocket and attempt to send

  - Expect: UI error + retry logic

- Send message over invalid channel

  - Expect: No broadcast, safe failure

- Try sending with missing auth token

  - Expect: 401 error from backend

### **Manual Triggering (Dev Utilities)**

Use browser console:

ablyClient.channels.get(\'inbox:test-user-id\').publish(\'new-message\',
{

from: \'admin\',

message: \'Manual test message\',

});



### **Done When**

- All message events work in real time (send, edit, reply, forward)

- Users see correct UI updates with no duplicate events

- No unhandled socket errors occur

- Message state syncs properly across browser tabs
