**Message History & Replay with Ably (NestJS + Client Fetch)**

This document outlines how to implement message history and replay
support using Ably's built-in persistence. It enables your app to fetch
missed or historical messages when users join a conversation or
reconnect after being offline.

### **🎯 Purpose**

Ensure that message history can be fetched from Ably's servers to
populate conversation history and support offline replays.

### **🔧 Enabling Message History in Ably**

1.  Go to the **Ably Dashboard\**

2.  Open your app \> **Settings\**

3.  Enable the **Message Retention** toggle (e.g., 24 hours, 72 hours,
    or up to 72 hours on free tier)

4.  Apply the setting to chat:thread-\* channels

### **🧾 Backend (Optional Ably Fetch from NestJS)**

****// ably.service.ts

async fetchHistory(channelName: string, limit = 50): Promise\<any\[\]\>
{

return new Promise((resolve, reject) =\> {

this.ably.channels.get(channelName).history({ limit }, (err, result) =\>
{

if (err) return reject(err);

resolve(result.items.map(i =\> i.data));

});

});

}

You may expose this via an internal route like:

GET /messages/thread/:id/history

Or use the main database for long-term history if you exceed Ably's
retention.

### **🧠 Client-Side Fetch (JS SDK)**

****const channel = ably.channels.get(\`chat:thread-\${threadId}\`);

channel.history({ limit: 50 }, (err, resultPage) =\> {

if (!err) {

const messages = resultPage.items.map(msg =\> msg.data);

// Prepend to conversation state

}

});

Use cursor-based pagination for older messages:

resultPage.next((err, nextPage) =\> { /\* \... \*/ });



### **📋 Notes**

- History only includes messages **published through Ably**, not
  directly stored in your DB

- Use this for **replay**, reconnect fetch, and **resilience fallback\**

- Consider syncing to your DB for full retention

### **🛡️ Best Practices**

- Use Ably history for short-term caching (up to 72 hours)

- Always sync critical messages to your PostgreSQL DB for durability

- Show loading indicators when replaying

- If DB fails, Ably history can act as a temporary failover cache
