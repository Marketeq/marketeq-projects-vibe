**Ably Token Authentication Setup (NestJS + Microservices)**

This document outlines how to implement secure, token-based
authentication for Ably private and presence channels in a NestJS
backend environment.

### **🎯 Purpose**

To restrict access to Ably channels so that only authenticated users can
subscribe or publish based on their permissions (e.g., thread
membership).

### **🔐 Backend Endpoint (NestJS)**

Create a new controller route:

// ably.controller.ts

\@Get(\'/auth/ably\')

\@UseGuards(JwtAuthGuard)

async getAblyToken(@Request() req) {

const tokenParams = await ably.auth.createTokenRequest({

clientId: req.user.id.toString(),

capability: getUserCapabilities(req.user.id)

});

return tokenParams;

}



### **🔧 Capability Scopes**

Generate per-user channel access control:

function getUserCapabilities(userId: string) {

return {

\[\`chat:thread-\*\`\]: \[\'publish\', \'subscribe\', \'presence\'\],

\[\`user:\${userId}\`\]: \[\'subscribe\'\],

\[\`presence:thread-\*\`\]: \[\'subscribe\', \'presence\'\]

};

}

You may optionally scope each thread individually using stored thread
participation data.

### **🧪 Frontend Auth Integration**

In your frontend app (Next.js, React, etc.):

const ably = new Ably.Realtime({

authUrl: \'/api/auth/ably\',

clientId: currentUser.id

});

This will fetch a time-limited token from your server with the user's
capabilities.

### **⚙️ Ably Dashboard Settings**

- Enable **Token Authentication Only\**

- Disable API key-based direct connection for the frontend

- Rotate your API keys and store in .env securely:

ABLY_API_KEY=xxx:yyy

ABLY_API_CLIENT_ID=system



### **🛡️ Security Notes**

- Use JwtAuthGuard or similar to ensure only verified users request Ably
  tokens

- Validate that the requesting user has rights to any threads they're
  attempting to join

- Limit token TTL (default: 1 hour)
