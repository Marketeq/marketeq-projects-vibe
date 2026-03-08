# **📄 07 -- Stripe Checkout -- Gift Cards & Wallet Balance Rules**

### **🧭 Purpose**

This document outlines the handling of **gift cards** and **wallet
balances** in the Stripe Checkout microservice for the Marketeq
platform. It defines logic for applying credits, managing balances, and
fallback behavior for failed transactions.

## **🎟️ Gift Cards**

### **1. Manual Entry**

- Gift cards must be entered **manually** during checkout.

- No auto-apply, even if previously used or stored.

### **2. Validation Rules**

- Check against valid, unused gift card codes stored in the database.

- Expiration dates must be enforced.

- Denomination must be \> 0.

### **3. Application Logic**

- A valid gift card deducts its value from the total checkout price.

- If the gift card exceeds the total, the remainder is saved to the
  wallet.

- If it is insufficient, the remaining amount must be covered by another
  payment method.

### **4. Storage & Tracking**

- Gift card redemption logs are stored per user.

- Remaining balances (if any) are converted into wallet credit.

## **💰 Wallet Balance**

### **1. Wallet Top-Ups**

- Wallet top-ups are not part of this sprint.

- Credits come from gift card remainders or time tracking overages
  (future sprint).

### **2. Usage Priority**

- Wallet balance is applied **before** payment method.

- Cannot split wallet credit across multiple projects (single-use per
  transaction only).

### **3. Deduction Flow**

- Deduct wallet balance from total due.

- If balance is sufficient, checkout completes without charging a card.

- If insufficient, fallback to card/ACH/Klarna.

### **4. Storage & Sync**

- Wallet balance is stored in the **user-service** under the
  creditBalance field.

- All deductions and top-ups are logged with a reason code and linked
  project ID.

## **🔄 Fallback & Errors**

- If both wallet and gift card fail (expired, invalid), checkout cannot
  proceed.

- Users receive clear error messaging and retry options.

- A Stripe Checkout session is only created after gift card and wallet
  deductions are finalized.

## **📦 Related Endpoints**

- POST /api/checkout/apply-giftcard

- POST /api/checkout/use-wallet

- GET /api/user/credit-balance

## **🔐 Security & Fraud Prevention**

- Gift card usage is limited to 1 account per card.

- Logs include IP, session ID, and user ID.

- Multiple failed attempts trigger cooldown.

Let me know if you want to trigger notifications for gift card
application success/failure or wallet threshold alerts. These can be
routed through the notification-service in a future update.
