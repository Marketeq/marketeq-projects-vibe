# **📄 20 -- Wire Transfer Business Logic  🧭 Purpose**

This document defines how the platform should handle **wire transfer
payments** from the point of invoice generation through to payment
confirmation, accounting reconciliation, and integration with
QuickBooks.

Wire transfers **require manual approval** after funds are received in
the company's Mercury business account. Invoices are generated
internally by the platform but must be **mirrored in QuickBooks** for
reconciliation and financial reporting.

## **🔁 High-Level Flow**

****Invoice Generated ➝ Client Chooses Wire ➝ Receives Transfer
Instructions ➝ Transfers Funds ➝

Mercury Confirms Deposit ➝ Admin Marks Payment Received ➝ Platform +
QuickBooks Updated



## **🧱 Folder Structure**

The wire logic will live under the checkout-service as it\'s part of the
payment intake flow, but will require coordination with admin-service
for approval:

apps/

checkout-service/

src/

modules/

wire-transfer/

wire-transfer.module.ts

wire-transfer.service.ts

wire-transfer.controller.ts

entities/

wire-transfer.entity.ts



## **🛠️ Required Entities**

### **wire_transfer.entity.ts**

****\@Entity(\'wire_transfers\')

export class WireTransferEntity {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

invoiceId: string;

\@Column()

clientId: string;

\@Column({ type: \'decimal\', precision: 10, scale: 2 })

expectedAmount: number;

\@Column()

currency: string;

\@Column()

status: \'pending\' \| \'confirmed\' \| \'failed\';

\@Column({ nullable: true })

receivedAt: Date;

\@Column({ nullable: true })

confirmedBy: string;

\@CreateDateColumn()

createdAt: Date;

\@UpdateDateColumn()

updatedAt: Date;

}



## **🔐 Admin-Only Route**

Once the wire is confirmed in Mercury, an admin manually approves it:

@Patch(\'admin/confirm-wire\')

\@UseGuards(AuthGuard, RolesGuard)

\@Roles(\'admin\')

async confirmWireTransfer(@Body() dto: ConfirmWireDto) {

return this.wireTransferService.markAsConfirmed(dto);

}



## **📦 Confirm DTO**

****export class ConfirmWireDto {

\@IsUUID()

transferId: string;

\@IsISO8601()

receivedAt: string;

\@IsString()

confirmedBy: string;

}



## **✅ Business Logic: markAsConfirmed**

****async markAsConfirmed(dto: ConfirmWireDto) {

const transfer = await this.repo.findOne({ where: { id: dto.transferId }
});

if (!transfer \|\| transfer.status !== \'pending\') {

throw new BadRequestException(\'Invalid or already confirmed wire.\');

}

transfer.status = \'confirmed\';

transfer.receivedAt = new Date(dto.receivedAt);

transfer.confirmedBy = dto.confirmedBy;

await this.repo.save(transfer);

// Update invoice + metadata

await this.checkoutService.markInvoiceAsPaid(transfer.invoiceId);

// Trigger QuickBooks sync

await this.quickbooksService.markInvoicePaid(transfer.invoiceId);

return { success: true };

}



## **🧾 Invoice Status Update**

Within checkoutService.markInvoiceAsPaid():

async markInvoiceAsPaid(invoiceId: string) {

await this.invoiceRepo.update(

{ id: invoiceId },

{

status: \'paid\',

paidAt: new Date(),

paymentMethod: \'wire\',

},

);

await this.notificationService.send({

type: \'invoice_paid\',

userId: invoice.clientId,

data: { invoiceId },

});

}



## **🔄 QuickBooks Integration**

You must sync the invoice manually into QuickBooks (this can be done via
Zapier or QuickBooks API):

async markInvoicePaid(invoiceId: string) {

const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId
} });

await this.qbClient.markAsPaid({

qbInvoiceId: invoice.qbReferenceId,

datePaid: new Date(),

method: \'Wire Transfer\',

});

}

> If qbReferenceId is not yet set, create the invoice in QuickBooks
> during invoice generation and store the external ID.

## **📩 Client-Facing Email Template (Triggered)**

When wire instructions are sent:

> Subject: Wire Transfer Instructions for Your Marketeq Payment\
> Body: Please send the full amount (\$X,XXX.XX USD) to the following
> account:

- Account Name: Marketeq Digital LLC

- Bank: Mercury

- Routing Number: XXXXXXX

- Account Number: XXXXXXXX

- Memo/Reference: INV-######\
  Funds must be sent within 3 business days to avoid delay or
  cancellation.

## **⚠️ Error Handling & Edge Cases**

  -----------------------------------------------------
  **Scenario**              **Behavior**
  ------------------------- ---------------------------
  Transfer never received   Auto-expire after 5
                            business days

  Underpaid transfer        Mark failed + notify
                            finance team

  Duplicate wire for same   Ignore if already confirmed
  invoice                   

  QuickBooks API fails      Retry via background queue
  -----------------------------------------------------

## **🔐 Access Control Summary**

  -------------------------------
  **Role**     **Action**
  ------------ ------------------
  Admin        Confirm wire, view
               logs

  Client       Only receives
               instructions

  System       Handles
               invoice/payment
               sync
  -------------------------------

## **✅ Summary**

- All wire payments must be **manually confirmed** in the admin
  dashboard.

- Confirmation updates invoice and triggers a sync to QuickBooks.

- Platform continues managing invoice generation; QuickBooks is only
  used for financial books and payment reconciliation.
