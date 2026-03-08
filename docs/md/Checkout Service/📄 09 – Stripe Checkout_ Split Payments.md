**09 -- Stripe Checkout: Split Payments**

### **Overview**

This document defines the logic for handling **single checkout
payments** split across multiple payment methods. It applies to cases
where a user wants to pay their total balance at once but distribute the
payment across two or more sources (e.g., credit card + wallet, gift
card + bank transfer).

This does **not** include recurring or installment billing.

### **Supported Payment Combinations**

- **Credit Card + Wallet Balance\**

- **Gift Card + Credit Card\**

- **Gift Card + Bank Transfer (ACH)\**

- **Wallet + Bank Transfer\**

- **Credit Card + Apple Pay / Google Pay** (if card is not maxed)

### **Step-by-Step Integration Instructions**

#### **1. Install Stripe SDK**

****npm install \--save stripe

#### **2. Configure Stripe Client**

****// app/checkout-service/stripe/stripe.service.ts

import Stripe from \'stripe\';

\@Injectable()

export class StripeService {

private stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {

apiVersion: \'2023-08-16\',

});

async createSplitPaymentIntent(dto: CreateSplitPaymentDto) {

const intent = await this.stripe.paymentIntents.create({

amount: dto.totalAmount \* 100, // in cents

currency: \'usd\',

metadata: {

checkout_type: \'split_payment\',

methods_used: dto.payments.map((p) =\> p.method).join(\',\'),

project_id: dto.projectId,

},

});

return intent;

}

}

#### **3. Create Checkout Controller**

****// app/checkout-service/controllers/checkout.controller.ts

\@Post(\'split\')

async createSplitPayment(@Body() dto: CreateSplitPaymentDto) {

const total = dto.payments.reduce((acc, p) =\> acc + p.amount, 0);

if (total !== dto.totalAmount) {

throw new BadRequestException(\'Total does not match breakdown\');

}

const paymentIntent = await
this.stripeService.createSplitPaymentIntent(dto);

return { paymentIntentId: paymentIntent.id };

}

#### **4. Validate and Lock Funds**

- For **wallet balance**, deduct the funds and mark as pending.

- For **gift card**, validate and apply code value.

- For **bank transfer**, initiate ACH and hold status.

- Use PostgreSQL transactions to lock wallet/gift card balances.

#### **5. Frontend Submission Payload**

****{

totalAmount: 40000,

projectId: \'abc123\',

payments: \[

{ method: \'wallet\', amount: 10000, details: {} },

{ method: \'credit_card\', amount: 30000, details: { token: \'tok_visa\'
} }

\]

}



### **DTO Example**

****// app/checkout-service/dto/create-split-payment.dto.ts

export class CreateSplitPaymentDto {

\@IsNumber()

totalAmount: number;

\@IsArray()

\@ValidateNested({ each: true })

payments: {

method: \'credit_card\' \| \'wallet\' \| \'gift_card\' \|
\'bank_transfer\';

amount: number;

details: any;

}\[\];

\@IsUUID()

projectId: string;

}



### **Stripe Metadata (Example)**

****metadata: {

checkout_type: \'split_payment\',

methods_used: \[\'credit_card\', \'gift_card\'\],

project_id: \'abc123\',

},



### **Frontend Behavior**

- Allow user to select multiple methods before checkout.

- Validate full amount covered before enabling confirm button.

- Show each method with editable amount.

- Display final confirmation screen summarizing sources.

### **Edge Cases & Handling**

- **Partial failure**: roll back wallet/gift card and cancel
  PaymentIntent.

- **Timeouts**: if a payment method stalls, expire session and retry.

- **Gift card expired or invalid**: show frontend error.

- **ACH delay**: hold status until funds received.

### **Related Features**

- Wallet balance deduction and lock logic

- Gift card code validation with expiry and balance checks

- Stripe PaymentIntent creation with metadata

- Frontend breakdown view with method toggles

- PostgreSQL transactional locks for wallet/gift cards
