**Channel Permissions, Blocking & Moderation Rules with Ably**

This document outlines how to enforce thread permissions, user blocking,
and moderation rules using Ably's capability-based token auth and
channel design. These rules ensure blocked users cannot interact, and
that threads remain secure.

### **🎯 Goals**

- Prevent blocked users from joining channels

- Restrict users to threads they belong to

- Enforce moderation (e.g. prevent banned users from publishing)

### **🔐 Capability Enforcement via Token Auth**

Update getUserCapabilities(userId) dynamically:

function getUserCapabilities(userId: string): Record\<string,
string\[\]\> {

const allowedThreadIds = getThreadsUserCanAccess(userId); // DB lookup

const blockedUserIds = getBlockedUsers(userId); // DB lookup

const capabilities: Record\<string, string\[\]\> = {};

allowedThreadIds.forEach((threadId) =\> {

const channel = \`chat:thread-\${threadId}\`;

const presence = \`presence:thread-\${threadId}\`;

capabilities\[channel\] = \[\'subscribe\', \'publish\'\];

capabilities\[presence\] = \[\'presence\', \'subscribe\'\];

});

capabilities\[\`user:\${userId}\`\] = \[\'subscribe\'\];

return capabilities;

}



### **🙅‍♂️ Blocked User Logic**

- When User A blocks User B:

  - Remove shared thread access if it\'s not a system-mandated group

  - Remove B's capabilities from A's token if B attempts subscription

  - Prevent message delivery, replies, and forwards across block

### **🔄 Channel Join Validation (on Auth)**

When issuing a token:

- Validate userId is part of thread participants

- Ensure the requester has not been blocked by any other member

### **🔕 Moderation Rules**

- Add flags like isBanned to user profiles

- Deny token generation entirely for banned users or limit to readonly:

if (user.isBanned) return { capability: {} }; // No access

- \
  Log denied attempts for audit

- Optionally send system:notice event with ban info

### **🧪 Suggested Tests**

- Blocked users can't connect to mutual thread

- Blocked users' messages do not publish

- Token generation fails when attempting unauthorized access

- Banned users can't receive a token or join presence

### **🛡️ Backend Safeguards (Beyond Ably)**

- Double-check thread permissions before saving messages to DB

- Filter blocked users from any /threads or /messages API responses

- Prevent direct message initiation from blocked users
