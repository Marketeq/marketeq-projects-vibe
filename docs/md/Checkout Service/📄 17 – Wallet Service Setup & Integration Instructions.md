# **📄 17 -- Wallet Service Setup & Integration Instructions**

### **🧭 Purpose**

This document provides detailed implementation steps, folder structure,
code, and configuration required to set up the wallet-service
microservice in the Marketeq platform. This service is responsible for
managing wallet top-ups, gift card redemptions, and transaction logging.

## **📁 Final Folder Path**

****app/wallet-service/



## **⚙️ Required Environment Variables**

Ensure the following environment variables are added to your .env file:

DATABASE_URL=postgres://\...

JWT_SECRET=\...

STRIPE_SECRET_KEY=\...

WALLET_HMAC_SECRET=\...

MERCURY_API_KEY=\...



## **🧱 Folder Structure**

****wallet-service/

├── dto/

│ ├── apply-giftcard.dto.ts

│ ├── wallet-topup.dto.ts

├── entities/

│ ├── wallet-transaction.entity.ts

│ ├── wallet-transaction-flag.entity.ts

│ ├── giftcard.entity.ts

├── guards/

│ └── wallet.guard.ts

├── scripts/

│ └── reconcile-wallet.ts

├── wallet.controller.ts

├── wallet.service.ts

├── wallet.module.ts



## **🧪 Installation Steps**

1.  **Create service folder:** marketeq-projects-nestjs repo:
    app/wallet-service && cd app/wallet-service

2.  **Generate module/controller/service:\**

****nest g module wallet && nest g controller wallet && nest g service
wallet

3.  \
    **Add DTOs and Entities** using the provided folder structure.

4.  **Configure Database Models** using \@nestjs/typeorm and \@Entity()
    decorators.

5.  **Add JWT Auth Middleware** to guard routes and enforce microservice
    access scope.

6.  **Set up Stripe SDK**:

npm install stripe



## **🔐 Wallet Guard Example**

****\@Injectable()

export class WalletGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const request = context.switchToHttp().getRequest();

const user = request.user;

return user && user.roles?.includes(\'wallet_service\');

}

}



## **💳 Stripe Integration -- Wallet Top-Up**

****\@Post(\'wallet/topup\')

\@UseGuards(WalletGuard)

async topUpWallet(@Body() dto: WalletTopupDto) {

const paymentIntent = await this.stripe.paymentIntents.create({

amount: dto.amount,

currency: \'usd\',

metadata: {

type: \'wallet_topup\',

userId: dto.userId,

},

});

return paymentIntent.client_secret;

}



## **🎟️ Gift Card Redemption**

****\@Post(\'wallet/redeem\')

\@UseGuards(WalletGuard)

async redeemGiftCard(@Body() dto: ApplyGiftcardDto) {

const valid = await this.giftcardService.validate(dto.code);

if (!valid) throw new ForbiddenException(\'Invalid or expired gift
card\');

await this.walletService.applyGiftcard(dto.userId, valid.amount);

return { success: true };

}



## **🔁 Reconciliation Cron Script**

****async function reconcileWalletBalance() {

const dbBalance = await getTotalWalletCredits();

const bankBalance = await mercuryApi.getBalance();

if (Math.abs(dbBalance - bankBalance) \> 50) {

await sendAlert(\'Mismatch exceeds threshold\');

}

}



## **🔄 Stripe Webhook Handling**

****\@Post(\'webhook\')

async handleStripeWebhook(@Req() req: Request) {

const event = this.stripe.webhooks.constructEvent(

req.body,

req.headers\[\'stripe-signature\'\],

process.env.STRIPE_WEBHOOK_SECRET,

);

if (event.type === \'payment_intent.succeeded\') {

const pi = event.data.object;

if (pi.metadata.type === \'wallet_topup\') {

await this.walletService.creditWallet(pi.metadata.userId, pi.amount);

}

}

return { received: true };

}



## **💼 How Wallet & Gift Card Funds Are Tracked**

> Stripe does **not** support internal wallet balances or gift card
> storage. All balance logic is custom and must be stored in our
> Postgres database. This section explains how the funds are stored and
> enforced.

### **🔐 Storage Location**

- Wallet and gift card balances are stored in the **Postgres database**
  (wallet_transactions and giftcard tables).

- Stripe only facilitates the **payment** (e.g., top-up or initial gift
  card purchase).

- All metadata from Stripe is verified before any balance update occurs.

### **🧮 Balance Enforcement**

- When a top-up occurs:

  1.  A Stripe PaymentIntent is created.

  2.  Upon successful payment, the webhook updates the
      wallet_transactions table.

  3.  Balance is **never derived from Stripe**, only from our internal
      DB.

- When a gift card is redeemed:

  1.  The code is validated using the giftcard.entity.ts.

  2.  A credit is added to wallet_transactions with a transaction_type =
      giftcard.

  3.  Gift cards cannot be reused or manipulated after redemption.

### **🔄 Reconciliation & Validation**

- The reconcile-wallet.ts script compares the **total of all wallet
  credits** in the database to the **actual balance in Mercury Bank**.

- Stripe metadata (type, userId, etc.) is mandatory and must be
  validated on webhook receipt.
