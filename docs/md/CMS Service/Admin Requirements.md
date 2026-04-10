# Admin Requirements

**Service:** cms-service | **Powered by:** Payload CMS | **Audience:** Admin Role, Support Team

> Admin panel feature requirements for user management, order management, project management, talent management, and team management. All features are available through the Payload admin panel. For step-by-step workflows, see CS-07 Admin Features Guide.

---

## 1. User Management Requirements

### Viewing & Searching
- View all platform users (clients, talent, admins) in a sortable, filterable list — Admin and Developer roles only.
- Filter users by: `userType` (client / talent / admin), `role` (admin / developer / content_editor / author), `status` (active / suspended / deleted).
- Search users by email and full name.
- View user detail: `sourceId`, `name`, `email`, `userType`, `role`, `avatar`, `status`, `verifiedAt`, and internal notes.

### Account Actions (Admin only)
- Create new user records with role assignment for admin-type users.
- Suspend a user account (`status = suspended`). Suspended users cannot log in to the admin panel.
- Reactivate a suspended account (`status = active`).
- Mark a user as deleted (`status = deleted`). Deleted users are hidden from default list view.
- Add internal notes to any user record. Notes are never surfaced to the user.
- Change a user's CMS admin panel role (Admin, Developer, Content Editor, Author) for admin-type users.
- Delete a user record permanently — confirmation required.

### Talent-Specific
- View talent profile detail: username, availability, location, timezone, skills, industry expertise, overview, certifications, languages, education, and work experience.
- Edit admin-accessible talent profile fields.
- Browse and filter talent by skill, availability, and location.

---

## 2. Order Management Requirements

### Viewing & Filtering
- View all orders with list columns: orderNumber, client name, listing title, orderType, status, createdAt.
- Filter orders by: status, orderType, client, talent, date range.
- Search by orderNumber.
- View order detail: full client and talent profiles (linked), associated listing, orderType, totalAmount (displayed in USD), currency, startDate, endDate, status, and notes log.

### Order Actions (Admin and Developer)
- Update order status through the lifecycle: `pending → active → completed / disputed / cancelled`.
- Append internal notes to an order record with timestamp.
- Initiate a full or partial refund via billing-service with a mandatory reason.
- Change billing date for an active recurring order.
- Change billing frequency for an active recurring order.
- View complete transaction history: all charges, refunds, and adjustments chronologically.

### Dispute Handling (Admin)
- Manage the full dispute lifecycle from the order record: intake, evidence review, ruling.
- Issue one of four rulings: resolve for client, resolve for talent, mutual agreement, escalate to admin.
- All dispute actions and the final ruling are appended to the order notes for audit.
- Dispute resolution is communicated to both parties via notification-service.
- Orders above `orderReviewThresholdCents` are automatically escalated to admin review.

---

## 3. Project Management Requirements

### Listing & Catalog Management
- View all project listings with filters: status (draft / published / archived), featured, editorialLabel.
- Search project listings by title and slug.
- Create new CMS project listing records linked to listings-service via `sourceId`.
- Edit editorial metadata: title, slug, excerpt, featured status, featuredOrder, editorialLabel, category, coverImage, status.
- Publish, unpublish, or archive project listings.
- Delete project listing CMS records — Admin only.

### Featured Curation
- Mark a project listing as featured and set its `featuredOrder` for homepage/marketplace placement.
- Assign editorial labels to project listings: `top_pick`, `new`, `trending`, `staff_pick`, `none`.
- The `featuredListingsLimit` in AdminConfig controls the maximum featured projects shown.

---

## 4. Talent Management Requirements

### Talent Listing Management
- View all talent listings with filters: status, featured, editorialLabel.
- Create, edit, and manage CMS talent listing records (`sourceId` links to listings-service talent records).
- Mark talent listings as featured with `featuredOrder` and editorial labels.
- Publish, unpublish, or archive talent listings.

### Talent Profile Detail
- Access full talent profile from the Users collection (`userType = talent`): username, availability, location, timezone, skills, industry expertise, overview, certifications, languages, education, work experience.
- View talent's linked order history.
- Edit admin-accessible profile fields.
- View application details for talent who applied to projects.

---

## 5. Team Management Requirements

### Team Listing Management
- View all team listings with filters: status, featured, editorialLabel.
- Create, edit, and manage CMS team listing records.
- Mark team listings as featured with `featuredOrder` and editorial labels.
- Publish, unpublish, or archive team listings.

### Team Membership Visibility
- View team assignment and membership from the user account screen.
- Team members are visible alongside their individual user profile data.
- Admins can update team assignments for platform users where applicable.

---

## 6. Content Administration Requirements

### Content Review Queue
- Filter BlogPosts and HelpArticles by `status = draft` to see all pending Author submissions.
- Publish, reject, or edit draft content as Content Editor or Admin.
- All content status changes are reflected in the shared DB and frontend within 60 seconds.

### Announcement Management
- Create and schedule platform announcements with audience targeting, start/end dates, CTA, and priority.
- Only Admins can publish announcements. Content Editors draft.

### Media Library
- Centralised media management for all CMS-managed assets (stored in Cloudflare R2).
- Upload, tag (alt, caption, credit), and organise images and documents.
- Reference media from any collection via the relationship picker.

---

## 7. Platform Administration Requirements

### Feature Flags
- Toggle feature flags without a code deploy — Admin and Developer.
- Set `rolloutPercentage` for gradual rollouts.
- Changes propagate to all services within 60 seconds.

### Site Settings
- Manage platform name, support email, social links, SEO defaults, legal URLs.
- Changes sync to shared DB immediately — consumed by Next.js frontend on every render.

### Homepage Banner
- Enable/disable promotional banner with message, CTA, expiry, and type (info / promo / warning).
- Cache is purged immediately on change.

### Admin Config (Admin only)
- Toggle maintenance mode with user-facing message.
- Set `featuredListingsLimit`, `orderReviewThresholdCents`, and `flagThreshold`.
- Changes take effect in all consuming services within 60 seconds.
