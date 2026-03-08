### **📄 Document 05 -- Installment Plan -- Failed Payment Retry Behavior & Pausing Projects**

This document will define how failed payments are handled under
installment plans and how project/contract status is affected.

#### **🧭 Purpose**

This document explains the behavior triggered when installment payments
fail. It defines retry logic, pause rules, and how installment payment
failures impact project or contract status.

### **🔁 Retry Logic for Failed Installments**

- Stripe's default retry behavior is not used. Retry logic is handled
  **internally via platform logic**.

- Platform sets up a **custom retry strategy**, configured in the
  installment-subscription service or via a dedicated job worker.

#### **Suggested Retry Configuration (can be adjusted per sprint scope):**

  -------------------------
  **Attempt**   **Retry
                Delay**
  ------------- -----------
  1st           +12 hours

  2nd           +24 hours

  3rd           +36 hours
  -------------------------

- **Total Retry Window**: 72 hours

- Retry attempts are tracked using a **retry log table**.

### **🛑 Pausing the Project or Contract**

- If **all retry attempts fail**, the associated **project or contract
  is paused**.

- Pausing behavior:

  - Project timeline is frozen

  - Talent access to project tools (Jira, GitHub, Figma, etc.) is
    revoked

  - Client loses ability to message team unless payment is resolved

- This happens **immediately after the final retry fails** (not at the
  first failure).

> Note: This behavior references logic defined in the Accounts
> Receivable service blueprint. Logic may evolve in future
> billing-related sprints.

### **🟨 Grace Period (Optional, Not in Sprint)**

A grace period is **not implemented** in this sprint. If added later, it
should be tied to platform-wide payment policy.

### **🔄 Resume After Payment**

- If the user completes payment during the retry window, or after the
  project is paused:

  - Resume job is triggered

  - Timeline is adjusted (if possible)

  - All tool access is restored

  - "Payment Verified" badge is reissued

**TypeScript code snippet for handling failed installment payment
retries, to be placed inside:**

**/app/installment-service/payment-retry-handler.ts**

### **🔧 payment-retry-handler.ts**

****import { Injectable, Logger } from \'@nestjs/common\';

import { Stripe } from \'stripe\';

import { PaymentsService } from \'./payments.service\';

import { SubscriptionService } from \'./subscription.service\';

\@Injectable()

export class PaymentRetryHandler {

private readonly logger = new Logger(PaymentRetryHandler.name);

private readonly MAX_RETRIES = 3;

private readonly COOLDOWN_HOURS = 72;

constructor(

private readonly paymentsService: PaymentsService,

private readonly subscriptionService: SubscriptionService,

) {}

async handleFailedPayment(subscriptionId: string, userId: string,
attemptCount: number) {

if (attemptCount \>= this.MAX_RETRIES) {

await this.subscriptionService.pauseSubscription(subscriptionId);

await this.paymentsService.initiateCooldown(userId,
this.COOLDOWN_HOURS);

this.logger.warn(\`Subscription paused and cooldown started for user
\${userId}\`);

} else {

await this.subscriptionService.retryPayment(subscriptionId);

this.logger.log(\`Retrying payment attempt \${attemptCount + 1} for user
\${userId}\`);

}

}

}


