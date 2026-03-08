✅ **Payment Details Screen -- Frontend Integration Guide**

### **📍 Screen: Payment Details**

This screen allows the user to:

Choose between full or installment payment

View and apply available balance

Select a payment method (Credit Card, ACH via Stripe Link, Apple Pay,
Google Pay, Wire Transfer)

See full price details for their selected project

## **🔧 1. Data Sources**

  **Section**                     **Source Service**         **API Endpoint or Data Notes**
  ------------------------------- -------------------------- ----------------------------------------------------
  Project Details                 **Listing Service**        Pull scope, pricing, title, and image by listingId
  Team Members                    **User Service**           Use teamMemberIds\[\] to fetch user details
  Installment Plan Options        **Checkout Service**       Only if "Installments" is selected
  Available Balance + Gift Card   **Billing Service**        Returns balance, gift card amount
  Payment Methods                 **Local Frontend State**   Controlled UI state based on selection

## **📥 2. Initial Data Fetch**

When this screen loads:

useEffect(() =\> {

async function loadScreenData() {

const \[projectData, teamData, balanceData\] = await Promise.all(\[

fetchListingDetails(listingId), // from Listing Service

fetchTeamMembers(listing.teamMemberIds), // from User Service

fetchUserBalanceAndGiftCard(userId), // from Billing Service

\]);

setProject(projectData);

setTeam(teamData);

setBalances(balanceData); // includes wallet balance + gift card

}

loadScreenData();

}, \[\]);



## **🧠 3. State Handling**

****const \[paymentType, setPaymentType\] = useState\<\'full\' \|
\'installments\'\>(\'full\');

const \[useBalance, setUseBalance\] = useState(false);

const \[giftCardApplied, setGiftCardApplied\] = useState(false);

const \[selectedMethod, setSelectedMethod\] = useState\<\'card\' \|
\'ach\' \| \'apple\' \| \'google\' \| \'wire\' \| null\>(null);



## **🎛️ 4. UI Components**

### **➤ Payment Type Selector**

Radio buttons: "Pay in full" \| "Pay in Installments"

onChange: Update paymentType

If installments is selected, fetch plan details from Checkout Service:

useEffect(() =\> {

if (paymentType === \'installments\') {

fetchInstallmentOptions(listingId).then(setInstallmentData);

}

}, \[paymentType\]);



### **➤ Available Balance Block**

Show user wallet balance

Checkbox: "Use available balance"

If checked, apply logic to deduct from total amount

### **➤ Gift Card**

Small inline link: "+ Add Gift Card"

Opens modal for code input

Triggers: applyGiftCard(code) API via Billing Service

### **➤ Payment Method Selection**

Render boxes for:

Credit/Debit Card

Bank Account (ACH via Stripe Link)

Apple Pay (Stripe pop-up)

Google Pay (Stripe pop-up)

Wire Transfer (redirect on next step)

Use setSelectedMethod() on click.

## **💳 5. Stripe Payment Method Logic**

### **➤ Card Input**

****const stripe = useStripe();

const elements = useElements();

const handleCardSubmit = async () =\> {

const cardElement = elements.getElement(CardElement);

const { paymentMethod, error } = await stripe.createPaymentMethod({

type: \'card\',

card: cardElement,

});

};

### **➤ ACH via Link**

Use stripe.collectBankAccountForPayment()\
Trigger after user chooses ACH → opens Stripe's Link interface.

## **💡 6. Validation & CTA**

Disable **"Continue"** button until:

> A payment method is selected
>
> If balance/gift card don't cover total, an active method is required
>
> Stripe method confirmation (card or ACH) completed

## **🧪 7. Error Handling**

Catch Stripe errors and show in UI

Example:

if (error) {

setFormError(error.message);

}



## **✅ 8. On Submit**

Trigger API: POST /checkout/start\
Body includes:

> userId
>
> listingId
>
> paymentType (full/installments)
>
> paymentMethod (card, ach, apple, etc.)
>
> balanceUsed
>
> giftCardApplied
>
> stripePaymentMethodId if applicable
