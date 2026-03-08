# **📄 15 -- Stripe Checkout -- Wallet Balance & Gift Card Integration**

### **🧭 Purpose**

This document outlines the exact implementation process for integrating
wallet balance and gift card functionality into the Marketeq Stripe
Checkout system. It covers backend data models, frontend logic, database
synchronization, and Stripe interaction.

## **⚙️ Storage and Bank Account Routing**

- All wallet and gift card funds are stored in the **Marketeq Mercury
  Bank Account**.

- Stripe is used **only** to handle incoming payments and transaction
  tracking.

- Gift card redemptions and wallet top-ups are recorded in the internal
  Postgres database and mirrored via Stripe metadata for traceability.

## **📦 Backend Implementation (NestJS)**

### **📁 File Structure**

****app/

├── wallet/

│ ├── wallet.module.ts

│ ├── wallet.controller.ts

│ ├── wallet.service.ts

│ ├── dto/

│ │ ├── apply-giftcard.dto.ts

│ │ ├── wallet-topup.dto.ts

│ ├── entities/

│ │ ├── wallet-transaction.entity.ts

│ │ ├── giftcard.entity.ts

### **🧱 Entity: WalletTransaction**

****\@Entity(\'wallet_transactions\')

export class WalletTransaction {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

userId: string;

\@Column()

type: \'topup\' \| \'giftcard\' \| \'payment\';

\@Column(\'decimal\')

amount: number;

\@Column({ default: \'completed\' })

status: \'pending\' \| \'completed\';

\@CreateDateColumn()

createdAt: Date;

}

### **🧱 Entity: GiftCard**

****\@Entity(\'giftcards\')

export class GiftCard {

\@PrimaryGeneratedColumn(\'uuid\')

id: string;

\@Column()

code: string;

\@Column(\'decimal\')

amount: number;

\@Column({ default: false })

redeemed: boolean;

\@Column({ nullable: true })

redeemedBy: string;

\@Column({ nullable: true })

redeemedAt: Date;

\@CreateDateColumn()

createdAt: Date;

}

### **🧩 DTOs**

****// apply-giftcard.dto.ts

export class ApplyGiftCardDto {

\@IsString()

code: string;

\@IsUUID()

userId: string;

}

// wallet-topup.dto.ts

export class WalletTopUpDto {

\@IsUUID()

userId: string;

\@IsNumber()

amount: number;

}



## **🔄 Wallet Service Logic**

### **🎁 Apply Gift Card**

****async applyGiftCard(dto: ApplyGiftCardDto) {

const card = await this.giftCardRepo.findOne({ where: { code: dto.code,
redeemed: false } });

if (!card) throw new NotFoundException(\'Invalid or already redeemed\');

await this.walletTransactionRepo.save({

userId: dto.userId,

amount: card.amount,

type: \'giftcard\',

status: \'completed\',

});

card.redeemed = true;

card.redeemedBy = dto.userId;

card.redeemedAt = new Date();

await this.giftCardRepo.save(card);

}

### **💳 Top-Up Wallet (Stripe Payment Intent)**

****async createWalletTopUpIntent(dto: WalletTopUpDto) {

const paymentIntent = await this.stripe.paymentIntents.create({

amount: Math.round(dto.amount \* 100),

currency: \'usd\',

metadata: {

type: \'wallet_topup\',

userId: dto.userId,

},

});

return paymentIntent.client_secret;

}

async confirmWalletTopUp(stripeEvent: Stripe.PaymentIntent) {

const userId = stripeEvent.metadata.userId;

const amount = stripeEvent.amount / 100;

await this.walletTransactionRepo.save({

userId,

amount,

type: \'topup\',

status: \'completed\',

});

}



## **🧾 Frontend Integration (Next.js)**

### **💡 Top-Up**

- Show \"Add to Wallet\" button on client dashboard.

- POST to /api/wallet/topup-intent with amount.

- Use returned client_secret with Stripe JS to complete the top-up.

### **🎁 Gift Card Entry**

- Show \"Apply Gift Card\" field during checkout.

- POST code to /api/wallet/apply-giftcard.

- If successful, balance updates and is deducted on next payment.

## **🔁 Deduction Logic During Checkout**

- At checkout time, check wallet_transactions for userId.

- If wallet balance or giftcard credit \> 0:

  - Deduct partial or full amount from credit before sending remaining
    amount to Stripe.

  - Log deduction as a wallet_transaction with type payment.

## **🔒 Security**

- All wallet and gift card operations are authenticated with JWT.

- Stripe metadata used to trace every wallet/gift card top-up.

- Daily audit of balances against Mercury account.
