**Time-Zone Integration Overview**

Embed automatic IANA time-zone detection and real-time syncing directly
into your Next.js/NextAuth user service---no extra microservices, zero
recurring costs, and global coverage out of the box.

### **Purpose**

Automatically infer and persist each user's IANA time zone based on
their IP address, keeping it up-to-date on every login, during
onboarding, and as they travel ("travel mode"), so all timestamps,
scheduled events, and UI clocks align with their actual location.

### **Why You Need the User's Time Zone**

1.  **Accurate Timestamps Everywhere\**

    - UI clocks, dashboards, and audit logs need to know which "3 PM"
      you mean---NYC vs. Tokyo vs. London.

2.  **Scheduling & Reminders\**

    - Booking calls or sending "Deadline tomorrow at 5 PM" notifications
      only works if you send at the right local moment.

3.  **Travel-Mode & Mobility\**

    - Users who travel or use VPNs see their app adjust automatically,
      without manual dropdowns.

4.  **Consistent UX & Compliance\**

    - Prevents user errors on signup, avoids support tickets, and
      ensures legal/contract timestamps carry correct zone info.

### **Where to Implement Time-Zone Detection & Persistence**

1.  **Registration / Onboarding\**

    - On first sign-up, infer IP → IANA zone and save it in the new user
      record.

    - Surface the detected zone in the profile form (readonly) for
      transparency.

2.  **Login / Authentication Callback\**

    - In NextAuth's authorize (or NestJS auth guard), re-detect IP →
      zone and update the user if it's changed.

3.  **Session Payload\**

    - Store timeZone in your JWT/session (session.user.timeZone) so
      every page and component has easy access.

4.  **Background "Travel Mode" Sync\**

    - Add a client-side hook that calls a PATCH
      /api/user/update-timezone endpoint on initial load and at regular
      intervals (e.g. every 5 min), persisting any mid-session moves.

5.  **Date/Time Formatting Layers\**

    - Whenever you format dates on the server (emails, reports,
      webhooks) or client (UI), pass the user's timeZone into your
      formatter (e.g. date-fns-tz, luxon, or Intl.DateTimeFormat).

### **High-Level Flow**

1.  **Schema**: Add timeZone String? to your Prisma (or TypeORM) User
    model; run a migration.

2.  **Auth Hook**: In NextAuth's \[\...nextauth\].ts, look up req.ip,
    infer zone via geoip-lite + geoip-timezone, and prisma.user.update({
    timeZone }) if changed.

3.  **Session**: Propagate timeZone into the JWT and expose it on
    session.user.timeZone.

4.  **Refresh Endpoint**: Create /api/user/update-timezone to repeat the
    IP → zone lookup and persist.

5.  **Client Sync**: In \_app.tsx, mount a TZSync component that invokes
    the refresh endpoint on load and every X minutes.

6.  **Formatting**: Everywhere you render or send dates, use the stored
    timeZone to ensure correctness.

### **Developer Checklist**

- **Prisma Migration**: Add timeZone field and run prisma migrate.

- **Dependencies**: Install geoip-lite, geoip-timezone, next-auth, your
  ORM adapter.

- **NextAuth Config**: Wire IP lookup, zone inference, and persistence
  in authorize + callbacks.

- **Refresh API**: Implement PATCH /api/user/update-timezone.

- **Client Hook**: Build TZSync in Next.js to trigger the refresh on
  load and interval.

- **Testing**: Validate with various IPs, on login, during simulated
  "travel," and in scheduled emails.
