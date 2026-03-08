# **📄 19 -- Stripe Elements -- Wallet & Gift Card Field Integration**

### **🎯 Purpose**

This document provides complete frontend implementation guidance for
integrating wallet and gift card fields into the Stripe Checkout flow
using Stripe Elements and the Marketeq wallet-service.

## **🖼️ Where & How to Display Wallet and Gift Card Fields**

These fields are injected into the **payment step** of the Stripe
Checkout UI:

  -----------------------------------------------
  **Field**      **Placement Location**
  -------------- --------------------------------
  **Wallet       Directly above payment method
  Balance**      selection

  **Gift Card    Below Wallet Balance section
  Input**        
  -----------------------------------------------

> Wallet and gift card fields should not be nested within the Stripe
> iframe. They must be rendered in your own Next.js component, outside
> the Stripe Elements wrapper, but within the same form.

## **✅ Frontend Validation Logic**

  -----------------------------------------------------------------------
  **Field**     **Validation Rule**
  ------------- ---------------------------------------------------------
  Gift Card     Must match regex: \^\[A-Z0-9\]{8,20}\$ (configurable via
                backend)

  Wallet        Must not exceed user\'s available wallet balance

  Gift Card     Backend confirms status: valid, redeemed, expired, or
                invalid

  Fallback      If both wallet and gift card are empty → continue with
                full Stripe charge

  Combination   If partially covered by wallet/gift card, deduct balance
                and charge remainder
  -----------------------------------------------------------------------

> All validation is enforced on both frontend and backend. Do not rely
> on frontend-only validation for security.

## **⚙️ Applying Wallet or Gift Card to Checkout Total**

1.  **Calculate preliminary checkout total** (subtotal + taxes + fees)

2.  **Apply wallet balance (if selected)\**

    - Deduct from top

    - Update remaining balance

3.  **Apply gift card (if entered and valid)\**

    - Deduct from remaining balance

4.  **Send final payment amount to Stripe via clientSecret session\**

If wallet + gift card covers full amount:\
→ Skip Stripe payment method section.

If partial:\
→ Display Stripe payment method section with updated amount.

## **🔄 API Request Structure: Gift Card Validation**

**Endpoint:** POST /wallet/gift-card/validate

**Body Payload:**

****{

\"code\": \"MARKET2024\",

\"user_id\": \"abc123\"

}

**Response Example:**

****{

\"status\": \"valid\",

\"amount\": 100,

\"currency\": \"USD\",

\"expires_at\": \"2025-12-31T00:00:00Z\"

}

If expired or used:

{

\"status\": \"redeemed\",

\"amount\": 0

}



## **💳 API Request Structure: Checkout Payment Submission**

**Endpoint:** POST /checkout/submit

**Body Payload:**

****{

\"user_id\": \"abc123\",

\"project_id\": \"proj789\",

\"gift_card_code\": \"MARKET2024\",

\"use_wallet_balance\": true,

\"payment_method_id\": \"pm_123456\",

\"client_secret\": \"sk_test\_\...\"

}



## **💻 Code Snippets: Field Integration (React / Next.js)**

### **1. Wallet Balance Display**

****\<WalletBalance amount={user.walletBalance}
onApply={handleWalletToggle} /\>

### **2. Gift Card Entry Field**

****\<TextField

label=\"Gift Card Code\"

value={giftCardCode}

onChange={(e) =\> setGiftCardCode(e.target.value.toUpperCase())}

error={giftCardStatus === \'invalid\' \|\| giftCardStatus ===
\'redeemed\'}

helperText={

giftCardStatus === \'redeemed\'

? \'This gift card has already been used.\'

: giftCardStatus === \'invalid\'

? \'Invalid gift card format or code.\'

: \'\'

}

/\>

\<Button onClick={validateGiftCard}\>Apply\</Button\>

### **3. Remaining Total Calculation**

****const remainingAmount = total - appliedWallet - appliedGiftCard;



## **🔄 Backend Integration Points**

  -----------------------------------------------------------
  **Action**         **Service**        **Endpoint**
  ------------------ ------------------ ---------------------
  Gift Card          wallet-service     /gift-card/validate
  Validation                            

  Gift Card          wallet-service     /gift-card/redeem
  Redemption                            

  Wallet Balance     wallet-service     /wallet/balance
  Fetch                                 

  Checkout           checkout-service   /checkout/submit
  Submission                            
  -----------------------------------------------------------

> These must be integrated **before** finalizing the Stripe
> PaymentIntent session.

## **🛑 Error Handling**

  --------------------------------------------------------
  **Scenario**             **UI Feedback**
  ------------------------ -------------------------------
  Invalid gift card        Display inline error below the
                           field

  Redeemed or expired gift Block submission with warning
  card                     message

  Insufficient wallet      Display toast: "Wallet balance
  balance                  too low"

  Combined coverage        Show updated Stripe charge
  insufficient             amount
  --------------------------------------------------------

## **✅ Final Result**

- If wallet + gift card covers 100%: no card entry required

- If partially covered: Stripe Elements shows updated amount

- All backend requests routed through secured microservices

- Wallet/gift card redemption logged with transaction ID
