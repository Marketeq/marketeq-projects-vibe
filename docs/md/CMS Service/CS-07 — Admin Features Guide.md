# CS-07 — Admin Features Guide

**Service:** cms-service | **Audience:** Support Team, Content Editors, Admins

> **Purpose:** Step-by-step workflows for every admin feature in the Payload admin panel. Covers order management, dispute handling, content review queue, featured listing curation, announcement scheduling, feature flag management, and platform configuration.
> **Prerequisites:** CS-03 (collections), CS-06 (permissions).

---

## 1. Order Management

Admins and Developers manage orders from the Orders collection. cms-service records orders for visibility and reporting — all financial transactions are delegated to billing-service and contracts-service.

### 1.1 Finding an Order

1. Open the admin panel and click **Orders** in the left sidebar.
2. Use the filter bar to narrow results: Status, Order Type, Client (relationship search), Date Range.
3. Use the Search bar to find by `orderNumber` directly.
4. Click any row to open the order detail view.

### 1.2 Order Lifecycle — Status Transitions

| Status | Description | Available Actions |
|---|---|---|
| `pending` | Order created. Awaiting payment confirmation from checkout-service. | View details, add notes, cancel if client requests. |
| `active` | Payment confirmed. Engagement in progress. Billing cycle running via billing-service. | Update notes, change billing date/frequency, initiate refund, open dispute. |
| `disputed` | Client or talent raised a dispute. Billing paused by billing-service. | Manage dispute flow, add evidence notes, issue ruling. |
| `completed` | Engagement finished. Final payment settled. Read-only. | View history, process post-completion refund if needed. |
| `cancelled` | Order terminated before completion. | Record cancellation reason, verify refund status. |

### 1.3 Updating Order Status

1. Open the order detail view.
2. Click the status dropdown — only valid next-state options are shown.
3. Add a note in the notes field explaining the status change.
4. Click **Save**. The updated status is immediately visible to all admin and developer users.

### 1.4 Initiating a Refund

1. Open the active or disputed order.
2. Click **Initiate Refund**.
3. In the modal: select Full or Partial. If Partial, enter the refund amount in USD cents.
4. Enter the mandatory **Reason**.
5. Click **Submit Refund**. cms-service emits a `refund.requested` event to billing-service.

### 1.5 Changing Billing Date or Frequency

1. Open an active recurring order.
2. Click **Change Billing Date** or **Change Billing Frequency**.
3. Enter the new date or frequency in the modal and click **Confirm**.
4. Add a note to the order record documenting the change reason.

---

## 2. Dispute Handling

When a client or talent raises a dispute, the order moves to `disputed` status and billing-service automatically pauses the billing cycle.

### 2.1 Dispute Intake

1. Locate the disputed order (filter Orders by `status = disputed`).
2. Open the order. The **Dispute Resolution** panel appears at the bottom of the detail view.
3. In the notes field, record: dispute initiator, dispute reason, and initial evidence.
4. Both parties are notified via notification-service that the dispute is under review.

### 2.2 Evidence Review

1. Each party has a defined window to submit evidence.
2. Log evidence submissions in the notes field with timestamp.
3. Request additional documentation from either party via the platform messaging system if needed.
4. Review deliverables, messages, and screenshots attached by both parties.

### 2.3 Issuing a Ruling

1. In the Dispute Resolution panel, select the ruling outcome:
   - **Resolve in favour of client** — specify full or partial refund amount. billing-service processes the refund. Order moves to `cancelled` or `active`.
   - **Resolve in favour of talent** — billing-service resumes the billing cycle. Order returns to `active`.
   - **Mutual agreement** — enter the negotiated refund amount. Order is closed or continued per agreement.
   - **Escalate to admin** — routes the case to an Admin for review. Use when order value exceeds `orderReviewThresholdCents` in AdminConfig.
2. Record the ruling decision and rationale in the notes field.
3. Click **Submit Ruling**. A confirmation modal appears.
4. cms-service emits a `dispute.resolved` event to notification-service. Both parties receive the outcome.

---

## 3. Content Review Queue

Blog posts and help articles authored by Author-role users are created in `draft` status. Content Editors and Admins review and publish them.

### 3.1 Reviewing Drafts

1. Click **Blog Posts** (or **Help Articles**) in the left sidebar.
2. Filter by `status = draft` to see the review queue.
3. Click any draft to open it.
4. Review the content — body text, SEO fields, cover image, tags, and author attribution.
5. To publish: change status to `published` and click **Save**.
6. To reject: leave status as `draft`, add a note, and save.

---

## 4. Featured Listing Curation

Admins curate the featured section on the homepage and marketplace via the Listings collection.

1. Click **Listings** in the left sidebar.
2. Filter by `status = published` to see live listings.
3. Click the listing you want to feature.
4. Check the **featured** checkbox.
5. Set **featuredOrder** (lower numbers appear first in the featured section).
6. Set **editorialLabel** to `top_pick`, `trending`, `staff_pick`, `new`, or `none`.
7. Click **Save**. The featured section updates within 60 seconds (Redis cache TTL).

> The maximum number of featured listings is controlled by `featuredListingsLimit` in AdminConfig.

---

## 5. Announcement Scheduling

1. Click **Announcements** in the left sidebar. Click **Create New**.
2. Enter the title, message (rich text), `ctaLabel`, and `ctaUrl`.
3. Set **audience** to one of: `all`, `clients`, `talent`, `admins`.
4. Set **startDate** and **endDate**. The announcement is automatically active within this window.
5. Set **priority** (higher numbers surface the announcement first).
6. Click Save as draft (Content Editor) or set `status = published` (Admin only).
7. Announcements are consumed by notification-service and pushed via Ably to authenticated users.
8. On expiry (`endDate` passed), the announcement is excluded from active queries automatically.

---

## 6. Feature Flag Management

1. Click **Feature Flags** in the left sidebar (Admin and Developer only).
2. Locate the flag by key name using the search bar.
3. Click the **enabled** toggle directly in the list view.
4. A confirmation modal appears: *"Enabling/disabling [key] will affect all services within 60 seconds. Continue?"*
5. Confirm. The flag change propagates via Redis TTL expiry within 60 seconds.
6. For gradual rollouts: open the flag detail, set **rolloutPercentage** (0–100), save.

---

## 7. Platform Configuration (AdminConfig)

Admin only. Accessible at **Globals > Admin Config**. Changes take effect immediately.

### Maintenance Mode
- Toggle `maintenanceMode` **on** to take the platform offline with a user-facing message.
- Set `maintenanceMessage` to the text shown to users during the window.
- Toggle **off** when maintenance is complete. The platform returns to normal within 60 seconds.

### Featured Listings Limit
- Set `featuredListingsLimit` to control the maximum featured listings shown on the homepage.
- Default is 6. Adjust based on the homepage layout capacity.

### Order Review Threshold
- Set `orderReviewThresholdCents` (in USD cents) to define when disputes are auto-escalated to admin review.
- Example: `50000` = $500.00.

### Flag Threshold
- Set `flagThreshold` to the number of content flags that trigger automatic admin review.

---

## 8. Media Library Management

1. Click **Media** in the left sidebar.
2. Click **Upload** to drag-and-drop or select files. Accepted types: jpg, png, gif, webp, svg, pdf.
3. After upload, add alt text, caption, and credit in the asset detail panel.
4. Use the grid view search to find assets by alt text or filename.
5. To delete: open the asset, click **Delete**, confirm. Warning: deleting a referenced asset breaks all content that uses it.

---

## 9. User Management

1. Click **Users** in the left sidebar (Admin and Developer only).
2. Filter by `userType`, `role`, or `status` to find specific accounts.
3. To **suspend** a user: open the record, change status to `suspended`, add a note, save.
4. To **reactivate**: change status to `active`, add a note, save.
5. To **assign or change a CMS panel role**: open an admin-type user record, change the role field, save.
6. To **delete**: open the record, click Delete (Admin only), confirm the modal.
