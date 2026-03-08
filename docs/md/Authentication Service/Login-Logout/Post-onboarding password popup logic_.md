**Post-onboarding password popup logic:**

## **✅ Password Creation Flow for New Users (Post-Onboarding)**

### **🔐 Context:**

- New users register with **email only** (no password initially)

- Immediately after onboarding, they are prompted to **secure their
  account\**

- This prompt is a **step-by-step modal window**, not a full page

- This flow is part of a 3-step security onboarding

## **🔁 Step-by-Step Flow**

### **✅ Step 1: Create Password**

**Modal Title:** "Secure your account"\
**Fields:**

- Create Password

- Confirm Password

**Requirements:**

- At least 8 characters

- One lowercase letter

- One uppercase letter

- One number

- One symbol

✅ **Form validation must enforce this**

### **✅ Step 2: Set Up Two-Factor Authentication**

- Field: Phone number (e.g. +1 (555) 000-0000)

- Behavior: Send a **magic link** to this phone number

✅ This means SMS login via OTP/magic link, not password reset

### **✅ Step 3: Phone Verification**

- UI confirms: "We sent a magic link to the number ending in 7890"

- Option to resend

- Success = user can now enter the app fully secured

## **💡 When Should This Modal Appear?**

Trigger the 3-step password/security setup modal **immediately after**:

- User finishes onboarding **and\**

- User does **not have a password or 2FA phone number on file\**

✅ Best triggered by a backend flag like:

if (!user.hasPassword \|\| !user.has2FA) {

showSecurityModal();

}



## **🔐 What to Store in Backend**

When user completes this flow, store:

- ✅ Hashed password (from Step 1)

- ✅ Verified phone number (from Step 2/3)

- ✅ Flag: securitySetupComplete = true

This way, the modal never reappears again.

## **✅ Final Takeaway**

  -----------------------------------------------
  **Component**   **Logic**
  --------------- -------------------------------
  Popup trigger   After onboarding, if no
                  password or 2FA

  Step 1          Require strong password &
                  confirmation

  Step 2          Phone input + send magic link

  Step 3          Confirm via SMS magic link

  Modal dismissed Only after full 2FA + password
                  is set
  -----------------------------------------------
