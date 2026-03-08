# **📄 02 -- Stripe Checkout -- Data Dictionary**

### **🧭 Purpose**

This document serves as the master data dictionary for all Stripe
Checkout-related fields in the Marketeq platform. It defines and
organizes every field used throughout the entire client payment process
--- grouped by screen --- and specifies backend data types, Stripe usage
(if applicable), and linked microservices.

Each screen/tab includes:

- Field Label (UI)

- Field Name (Backend variable)

- Data Type

- Validation Rules (if applicable)

- Required (Y/N)

- Linked Microservice (if any)

- Stored in Stripe Metadata (Y/N)

## **💳 Tab 1: Project Summary (Checkout Overview)**

  **Field Label**         **Field Name**        **Data Type**   **Required**   **Validation Rules**        **Linked Microservice**   **Stripe Metadata**
  ----------------------- --------------------- --------------- -------------- --------------------------- ------------------------- ---------------------
  Project Title           projectTitle          string          Yes            Max 100 chars               listing-service           No
  Project ID              projectId             string          Yes            UUID format                 listing-service           Yes
  Project Scope Summary   projectScopeSummary   string          No             Max 300 chars               listing-service           No
  Estimated Budget        estimatedBudget       number          Yes            Positive currency format    listing-service           Yes
  Team Members Involved   teamMembers           array           No             List of usernames/userIDs   user-service              Yes
  Contract ID             contractId            string          Yes            UUID format                 contract-service          Yes

## **💳 Tab 2: Payment Methods**

  **Field Label**       **Field Name**      **Data Type**   **Required**   **Validation Rules**      **Linked Microservice**   **Stripe Metadata**
  --------------------- ------------------- --------------- -------------- ------------------------- ------------------------- ---------------------
  Payment Method Type   paymentMethodType   string          Yes            Enum: card, ach, wire     checkout-service          Yes
  Card Details          cardDetails         object          No             Stripe tokenized object   ---                       Yes
  ACH Account Info      achAccountInfo      object          No             Stripe tokenized object   ---                       Yes
  Wire Instructions     wireInstructions    string          No             Max 300 chars             ---                       No

## **💳 Tab 3: Gift Card & Wallet**

  **Field Label**       **Field Name**      **Data Type**   **Required**   **Validation Rules**       **Linked Microservice**   **Stripe Metadata**
  --------------------- ------------------- --------------- -------------- -------------------------- ------------------------- ---------------------
  Gift Card Code        giftCardCode        string          No             Alphanumeric, 16 chars     checkout-service          Yes
  Wallet Balance Used   walletBalanceUsed   number          No             Positive currency format   checkout-service          Yes
  Gift Card Applied     giftCardApplied     boolean         No             True/False                 checkout-service          No

## **💳 Tab 4: Installments & Subscriptions**

  **Field Label**           **Field Name**          **Data Type**   **Required**   **Validation Rules**            **Linked Microservice**   **Stripe Metadata**
  ------------------------- ----------------------- --------------- -------------- ------------------------------- ------------------------- ---------------------
  Installment Plan Option   installmentPlanOption   string          No             Enum: monthly, biweekly, etc.   checkout-service          Yes
  Number of Payments        numberOfPayments        number          No             1--12                           checkout-service          Yes
  Start Date                subscriptionStartDate   date            No             ISO 8601 format                 checkout-service          Yes

## **💳 Tab 5: Split Payments**

  **Field Label**           **Field Name**          **Data Type**   **Required**   **Validation Rules**   **Linked Microservice**   **Stripe Metadata**
  ------------------------- ----------------------- --------------- -------------- ---------------------- ------------------------- ---------------------
  Split Payment Enabled     splitPaymentEnabled     boolean         No             True/False             checkout-service          Yes
  Initial Payment Amount    initialPaymentAmount    number          No             Positive currency      checkout-service          Yes
  Remaining Payment Terms   remainingPaymentTerms   string          No             Max 200 chars          checkout-service          Yes

## **💳 Tab 6: Thank You / Confirmation**

  **Field Label**          **Field Name**        **Data Type**   **Required**   **Validation Rules**       **Linked Microservice**   **Stripe Metadata**
  ------------------------ --------------------- --------------- -------------- -------------------------- ------------------------- ---------------------
  Confirmation Message     confirmationMessage   string          Yes            Static text                checkout-service          No
  Payment Verified Badge   paymentVerified       boolean         Yes            True after first success   checkout-service          No
  Payment Date             paymentDate           date            Yes            ISO 8601                   checkout-service          Yes

## **💳 Tab 7: Stripe Metadata**

  **Field Label**         **Field Name**        **Data Type**   **Required**   **Validation Rules**       **Linked Microservice**   **Stripe Metadata**
  ----------------------- --------------------- --------------- -------------- -------------------------- ------------------------- ---------------------
  Client ID               clientId              string          Yes            UUID format                user-service              Yes
  Project ID              projectId             string          Yes            UUID format                listing-service           Yes
  Contract ID             contractId            string          Yes            UUID format                contract-service          Yes
  Installment Plan ID     installmentPlanId     string          No             UUID format                checkout-service          Yes
  Gift Card ID            giftCardId            string          No             UUID format                checkout-service          Yes
  Wallet Top-up Amount    walletTopUpAmount     number          No             Positive currency format   checkout-service          Yes
  Applied Discount Code   appliedDiscountCode   string          No             Alphanumeric               checkout-service          Yes

All fields are subject to update based on backend requirements and
Stripe integration logic.
