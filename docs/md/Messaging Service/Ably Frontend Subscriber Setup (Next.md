**Ably Frontend Subscriber Setup (Next.js / React)**

This document provides step-by-step instructions to integrate Ably's
Realtime client into a Next.js or React frontend, including
subscriptions, reconnection handling, and client-side event listeners.

### **🎯 Purpose**

Enable real-time features like message streaming, typing indicators,
read receipts, and presence detection on the frontend using the Ably
JavaScript SDK.

### **📦 Installation**

****npm install ably



### **🧱 Client Setup (With Token Auth)**

****// ablyClient.ts

import \* as Ably from \'ably\';

export const ably = new Ably.Realtime({

authUrl: \'/api/auth/ably\',

clientId: currentUser.id // Must match server-issued token

});



### **📡 Subscribing to Events**

****// useThreadSubscriptions.ts

import { useEffect } from \'react\';

import { ably } from \'./ablyClient\';

export const useThreadSubscriptions = (threadId: string, onMessage:
Function) =\> {

useEffect(() =\> {

const channel = ably.channels.get(\`chat:thread-\${threadId}\`);

channel.subscribe(\'message:new\', (msg) =\> onMessage(msg.data));

channel.subscribe(\'message:edit\', (msg) =\> {/\* handle edit \*/});

channel.subscribe(\'message:delete\', (msg) =\> {/\* handle delete
\*/});

return () =\> channel.detach();

}, \[threadId\]);

};



### **✍️ Typing Indicator Subscriptions**

****channel.presence.subscribe(\'typing:start\', (msg) =\> {/\* show
typing \*/});

channel.presence.subscribe(\'typing:stop\', (msg) =\> {/\* hide typing
\*/});

To publish typing updates:

channel.presence.update(\'typing:start\');

setTimeout(() =\> channel.presence.update(\'typing:stop\'), 5000);



### **🧑‍🤝‍🧑 Presence Management**

****// After subscribing to presence-enabled channel

channel.presence.enter();

channel.presence.get((err, members) =\> {

// List of users online

});



### **🛑 Error Handling**

- Listen to connection events:

ably.connection.on(\'disconnected\', () =\> {/\* show offline UI \*/});

ably.connection.on(\'connected\', () =\> {/\* restore UI state \*/});



### **💡 Best Practices**

- Use a context provider to manage global Ably client state

- Cleanup subscriptions and presence listeners on unmount

- Don't re-init Ably client on every component load

- Add fallback indicators for offline mode or connection failures
