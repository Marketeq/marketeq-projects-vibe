**Typing Indicators & Presence with Ably (NestJS + Client)**

This document outlines how to implement typing indicators and user
presence using Ably\'s built-in Presence API. This feature enables
real-time online/offline status, as well as "user is typing..."
indicators in chat threads.

### **🎯 Purpose**

Allow participants in a chat thread to:

- See who is currently online in a conversation

- See when someone is actively typing

### **🔧 Ably Presence Setup (Client-Side)**

****const channel =
ably.channels.get(\`presence:thread-\${threadId}\`);

// Join presence

channel.presence.enter({ userId: currentUser.id });

// Handle presence updates

channel.presence.subscribe((member) =\> {

console.log(\`\${member.clientId} is \${member.action}\`); // \'enter\',
\'leave\', \'update\'

});

// Leave presence (on unload or unmount)

channel.presence.leave();



### **✍️ Typing Indicator Implementation**

****// Send a typing event

channel.presence.update({ typing: true });

// Automatically stop after 5 seconds

setTimeout(() =\> {

channel.presence.update({ typing: false });

}, 5000);

#### **📥 Receiving Typing Events**

****channel.presence.subscribe(\'update\', (member) =\> {

const { userId, typing } = member.data \|\| {};

if (typing) showTyping(userId);

else hideTyping(userId);

});



### **💡 Best Practices**

- Use presence:thread-{threadId} for typing + online status

- Use channel.presence.enter() when user opens a thread

- Always call leave() on tab close or unmount to clean up properly

- Auto-clear typing after inactivity

- Add debounce or delay before sending typing: true to reduce event
  noise

### **🛡️ Server-Side Validation**

Although presence is handled on the client, your **token auth** must
only allow users to join presence channels for threads they're allowed
to access:

capabilities: {

\[\`presence:thread-\${threadId}\`\]: \[\'subscribe\', \'presence\'\]

}


