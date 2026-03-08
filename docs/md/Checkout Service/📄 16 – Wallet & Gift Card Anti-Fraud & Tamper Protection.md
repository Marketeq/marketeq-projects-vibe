# **📄 16 -- Wallet & Gift Card Anti-Fraud & Tamper Protection**

### **🧭 Purpose**

This document outlines the tamper protection and fraud prevention
mechanisms for wallet balances and gift cards in the Marketeq platform.
All funds are stored in the Mercury company account, and security
enforcement is handled through backend controls, Stripe metadata, and
database restrictions. This applies to both top-up flows and gift card
redemptions.

## **📁 File Structure**

****app/

├── wallet-service/

│ ├── wallet.module.ts

│ ├── wallet.controller.ts

│ ├── wallet.service.ts

│ ├── wallet.guard.ts

│ ├── dto/

│ │ ├── apply-giftcard.dto.ts

│ │ ├── wallet-topup.dto.ts

│ ├── entities/

│ │ ├── wallet-transaction.entity.ts

│ │ ├── wallet-transaction-flag.entity.ts

│ │ ├── giftcard.entity.ts

│ ├── scripts/

│ │ ├── reconcile-wallet.ts



## **🔒 Immutable Transaction Logging**

- All wallet and gift card activity must be recorded in an
  **append-only** wallet_transactions table.

- UPDATE and DELETE operations are **strictly forbidden** on this table.

- Log must include:

  - user_id

  - transaction_type

  - amount

  - created_by (internal service or admin ID)

  - source_ip and user_agent

  - timestamp

### **Postgres Trigger to Prevent Update/Delete**

****CREATE OR REPLACE FUNCTION prevent_wallet_modifications()

RETURNS TRIGGER AS \$\$

BEGIN

RAISE EXCEPTION \'Direct updates/deletes are not allowed on
wallet_transactions\';

END;

\$\$ LANGUAGE plpgsql;

CREATE TRIGGER no_wallet_update

BEFORE UPDATE OR DELETE ON wallet_transactions

FOR EACH ROW EXECUTE FUNCTION prevent_wallet_modifications();



## **👮 Role-Based Access Control (RBAC)**

- Only the wallet-service is authorized to write to wallet and gift card
  tables.

- All internal services must use JWTs with scoped permissions.

- Admin dashboards and other services are **read-only** by default.

### **Wallet Guard**

****\@Injectable()

export class WalletGuard implements CanActivate {

canActivate(context: ExecutionContext): boolean {

const request = context.switchToHttp().getRequest();

const user = request.user;

return user && user.roles?.includes(\'wallet_service\');

}

}



## **🔑 Signed API Payloads**

- All wallet and gift card operations must use signed payloads via HMAC
  or secure JWT.

- Stripe webhook responses must include verification of metadata before
  wallet updates.

- Gift card redemption payloads must include a user session token.

### **Example HMAC Validation (Node.js)**

****import crypto from \'crypto\';

function validatePayloadSignature(payload, secret, signature) {

const hash = crypto.createHmac(\'sha256\',
secret).update(payload).digest(\'hex\');

return hash === signature;

}



## **🧱 Database-Level Guards**

- Use Postgres triggers to block:

  - Direct inserts into wallet_transactions that bypass service logic

  - Manual modifications via external database tools

### **Wallet Transaction Insert Trigger (Optional)**

****CREATE OR REPLACE FUNCTION enforce_wallet_insert()

RETURNS TRIGGER AS \$\$

BEGIN

IF NEW.created_by IS NULL THEN

RAISE EXCEPTION \'Wallet transactions must be inserted via service
layer\';

END IF;

RETURN NEW;

END;

\$\$ LANGUAGE plpgsql;

CREATE TRIGGER check_wallet_insert

BEFORE INSERT ON wallet_transactions

FOR EACH ROW EXECUTE FUNCTION enforce_wallet_insert();



## **✅ Stripe Metadata Verification**

- Every top-up must originate from a Stripe webhook with:

  - metadata.type = wallet_topup

  - metadata.userId = \<user_id\>

- Only status = succeeded PaymentIntents are accepted.

- The amount in the Stripe webhook must match the top-up DTO.

### **Webhook Validation Snippet**

****if (event.type === \'payment_intent.succeeded\') {

const pi = event.data.object;

if (pi.metadata.type !== \'wallet_topup\') throw new Error(\'Invalid
metadata\');

if (!pi.metadata.userId) throw new Error(\'Missing userId in
metadata\');

}



## **🛡️ Rate Limiting & Abuse Prevention**

- Max 3 failed gift card attempts per 24 hours per user

- Cooldown: Lock code entry for 24 hours after 3 failed attempts

- Track redemption attempts by user_id and ip

### **Flag Model Example**

****\@Entity(\'wallet_transaction_flags\')

export class WalletTransactionFlag {

\@PrimaryGeneratedColumn(\'uuid\') id: string;

\@Column() userId: string;

\@Column() reason: string;

\@CreateDateColumn() createdAt: Date;

}



## **🚩 Transaction Flagging**

- Automatically flag transactions for manual review when:

  - Gift card redemption \> \$500

  - More than 3 redemptions within 24 hours

  - Top-up amount mismatch between Stripe and DB

## **🔁 Daily Reconciliation Script**

- Nightly cron job to:

  - Compare total wallet credits in DB vs. funds in Mercury Bank account

  - Validate gift card issuance vs. redemptions

### **Sample Script Outline (Node.js)**

****async function reconcileWalletBalance() {

const dbBalance = await getTotalWalletCredits();

const bankBalance = await mercuryApi.getBalance();

if (Math.abs(dbBalance - bankBalance) \> 50) {

await sendAlert(\'Mismatch exceeds threshold\');

}

}



## **📜 Logging & Monitoring**

- All wallet actions must be logged with:

  - Timestamp

  - Service name

  - Auth token ID

  - IP address

- Logs forwarded to centralized system (e.g., Datadog, Logtail, or Loki)

## **🧠 Future Security Enhancements**

- Add behavior-based fraud scoring

- Integrate ML anomaly detection on redemption and top-up patterns

- Stripe Radar rule sync (if enabled in Stripe settings)

- Connect wallet service to cybersecurity microservice (future sprint)

✅ All fraud protection logic in this document is mandatory for
implementation. Do not modify or bypass these rules without explicit
approval from the CTO.
