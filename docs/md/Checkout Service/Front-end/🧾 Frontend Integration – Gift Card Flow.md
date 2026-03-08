# **🧾 Frontend Integration -- Gift Card Flow**

### **📁 File Structure (Suggested)**

****/components/checkout/

GiftCardEntryModal.tsx

GiftCardSummary.tsx

GiftCardListView.tsx

RemoveGiftCardModal.tsx

/hooks/

useGiftCard.ts

/services/

giftCardService.ts // Handles API calls



## **1. 🎯 Entry Point: From Payment Details Screen**

### **Trigger:**

- When user clicks "Add Gift Card(s)", display the GiftCardEntryModal.

## **2. 🧾 Gift Card Entry Modal**

### **Components:**

- Input field: Gift card code

- Input field: Amount to apply (if partial usage is allowed)

- CTA: Apply

- CTA: Cancel

### **Integration Steps:**

1.  On Apply, call backend API:

await giftCardService.applyGiftCard({ code, amount });

2.  On success:

    - Dismiss modal

    - Trigger UI update of the sidebar (project summary) to reflect
      updated gift card balance applied.

    - Trigger re-fetch of gift card list.

3.  On failure:

    - Show error toast or inline error in the modal (e.g. invalid code,
      expired, already used, etc.).

## **3. 🔁 Adding More Cards**

From the gift card modal:

- If user enters and submits a card successfully, modal stays open to
  allow additional entries.

- Use a visual cue (e.g. toast or "Card Applied" confirmation) to inform
  success before entry resets.

## **4. 📋 View Gift Cards (\"See All Gift Cards\")**

### **When user clicks "See All Gift Cards":**

- Open a GiftCardListView component displaying all added cards.

- Show:

  - Gift card code (masked)

  - Applied amount

  - Expiry (optional)

## **5. ❌ Removing Gift Cards**

### **Option 1: Remove All**

- User clicks Remove All

- Show RemoveGiftCardModal asking for confirmation.

- If confirmed, call:

await giftCardService.removeAllGiftCards();

- On success, update the sidebar and hide the gift card summary.

### **Option 2: Remove Individual**

- From GiftCardListView, user clicks remove next to individual card.

await giftCardService.removeGiftCard(code);

- Update UI after success.

## **6. 💳 Sidebar Summary Sync**

- Sidebar (project summary) must always show:

  - Subtotal

  - Applied gift card balance

  - Total after applying gift cards

### **Fetch Strategy:**

Use a useGiftCard() hook or useCheckoutSummary() to pull updated totals
after gift card state changes.

## **7. ✅ API Layer (assumes existing backend logic)**

****// services/giftCardService.ts

export async function applyGiftCard(payload: { code: string; amount:
number }) {

return axios.post(\'/api/gift-cards/apply\', payload);

}

export async function removeGiftCard(code: string) {

return axios.delete(\`/api/gift-cards/\${code}\`);

}

export async function removeAllGiftCards() {

return axios.delete(\'/api/gift-cards\');

}

export async function listGiftCards() {

return axios.get(\'/api/gift-cards\');

}



## **8. 🧠 State Management Tips**

- Use React Query or SWR to cache and auto-refresh the list of gift
  cards applied.

- Trigger refetch of totals and card list when:

  - Card is added

  - Card is removed

  - User proceeds to payment confirmation

## **9. 🚨 Error States & Edge Handling**

  -------------------------------------------------------
  **Scenario**      **Handling**
  ----------------- -------------------------------------
  Duplicate gift    Show toast: "This card has already
  card              been added."

  Expired/invalid   Show modal or inline error

  No more balance   Alert: "This gift card has no
                    remaining balance."

  Network/server    Show generic error toast with retry
  error             
  -------------------------------------------------------
