# **📄 12 -- Stripe Checkout -- Wire Transfer Handling & Manual Approval**

### **🗺️ Purpose**

This document outlines how wire transfers are processed during Stripe
Checkout in the Marketeq platform. Unlike card or ACH payments, wire
transfers require manual confirmation by the Accounts Receivable team
before the associated project or contract is considered fully paid. This
logic ensures a secure and clear audit trail while allowing users to
proceed with wire instructions immediately upon checkout.

## **💼 Use Case Overview**

- Clients select **Wire Transfer** as their payment method during
  checkout.

- They receive instructions (account number, routing number, amount,
  invoice reference).

- The UI sets the project or contract to **\"Pending Wire Transfer
  Confirmation.\"\**

- The Accounts Receivable team confirms the wire manually using the
  internal Stripe dashboard or external bank tools.

- Once confirmed, the project/contract status is updated to **\"Paid\"**
  and normal post-checkout processes resume.

## **🔹 Frontend Behavior**

### **UI Display (Checkout)**

- Selecting **Wire Transfer** triggers a confirmation page with wire
  instructions.

- Page includes:

  - Total amount due

  - Currency

  - Bank name

  - Account number

  - Routing/Swift code

  - Reference ID or invoice number

  - Client instructions: \"Include reference number when sending wire.\"

### **Post-Checkout UX**

- Displays a screen: \"Your project is pending wire transfer
  confirmation.\"

- Toast + Email + Notification triggered: \"We\'ve received your request
  to pay via wire transfer. Please complete the transfer to begin.\"

## **🚧 Backend Implementation**

### **Status on Checkout**

****project.status = \'pending_wire_transfer\';

contract.status = \'pending_wire_transfer\';

### **Stripe Metadata**

****{

\"payment_method\": \"wire_transfer\",

\"reference_code\": \"INV-2891\",

\"project_id\": \"abc123\",

\"client_id\": \"xyz789\"

}

### **Internal DB Flags**

  ----------------------------------------------------------------------
  **Field Name**          **Type**   **Description**
  ----------------------- ---------- -----------------------------------
  wire_transfer_pending   Boolean    True if wire transfer chosen but
                                     not confirmed

  wire_reference_code     String     Reference/invoice number provided

  wire_confirmed_by       String     Admin email or user ID of approver

  wire_confirmed_at       DateTime   Timestamp of manual confirmation
  ----------------------------------------------------------------------

## **✉️ Notifications**

### **On Checkout**

- Email: \"Instructions to complete your wire transfer.\"

- Notification: \"Wire transfer pending confirmation.\"

### **On Manual Approval**

- Email: \"We've received your wire transfer. Your project is now
  active.\"

- In-app notification: \"Wire transfer confirmed for Project X.\"

## **🔄 Manual Approval Flow (Accounts Receivable Team)**

1.  Log into the bank portal or Stripe dashboard.

2.  Match payment with metadata (reference code, amount, client name).

3.  Log into Admin or internal approval dashboard.

4.  Submit confirmation:

await db.projects.update({

id: projectId,

status: \'active\',

wire_transfer_pending: false,

wire_confirmed_by: adminEmail,

wire_confirmed_at: new Date(),

});

5.  \
    Trigger webhook + post-checkout flows (e.g., kickoff prep, badge,
    invoice sync).

## **👍 Best Practices & Notes**

- Wire instructions are localized by region and currency.

- Reference/invoice number must be unique per checkout.

- Wire transfer confirmation should **never be automated** (security
  risk).

- Wire-based payments must be flagged clearly in all admin logs.

- For future sprints: automation tooling for reconciling bank wires with
  Stripe metadata.

## **🔗 Related Docs**

- 07 -- Webhook Events → manual event trigger upon approval

- 08 -- Payment Methods → supported payment types

- 11 -- Failure & Retry → fallback in case wire is not received in time

- 02 -- Data Dictionary → field definitions for wire_transfer_pending
