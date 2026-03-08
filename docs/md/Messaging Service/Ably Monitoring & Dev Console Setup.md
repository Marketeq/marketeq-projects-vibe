**Ably Monitoring & Dev Console Setup**

This document outlines how to monitor Ably usage, debug real-time
traffic, and configure the Dev Console for visibility into active
channels, connections, and messages.

### **🎯 Purpose**

Ensure engineers can:

- View real-time events as they're published

- Monitor connection health and presence state

- Debug token errors, connection issues, and delivery failures

### **🧭 Ably Dashboard Access**

1.  Go to [[https://ably.com/accounts\]{.underline}
    ](https://ably.com/accounts)

2.  Select your project \> **App** (dev, staging, or prod)

3.  Use tabs:

    - **Metrics** for throughput and usage

    - **Status** for service health

    - **API Keys** for rotation and access config

    - **Inspect** for live channel traffic

### **📺 Dev Console: Live Debugging**

1.  Navigate to **Dev Console \> Inspect\**

2.  Choose a channel (e.g. chat:thread-123)

3.  View:

    - Subscribed users

    - Published events and payloads

    - Presence members and statuses

4.  Use search bar to filter by thread or user channel

### **🚦 Connection Monitoring (Frontend)**

****ably.connection.on(\'connected\', () =\> setOnline(true));

ably.connection.on(\'disconnected\', () =\> setOnline(false));

ably.connection.on(\'failed\', (err) =\> handleFatalError(err));

### **🔄 Token Debugging**

- Use Dev Console \> Auth tab to confirm successful token requests

- Inspect clientId, capabilities, and TTL

- Log failed token requests on backend with context

### **📊 Usage Analytics**

Under **Metrics**, track:

- Messages per day/hour

- Peak concurrent connections

- Peak message rate (per channel)

- Presence events and data usage

Set alerts if usage spikes unexpectedly (e.g. abuse or load test)

### **📥 Retention & Message Status**

- **Inspect \> Channel \> Message History** to view recent messages (if
  retention is enabled)

- Replay failed or duplicate events manually for testing

- Check idempotentPublishing setting if messages are delivered more than
  once

### **🔐 Admin Recommendations**

- Create separate **API keys** for dev, staging, and prod

- Enable **role-based access control** for dashboard users

- Review dashboard access logs monthly
