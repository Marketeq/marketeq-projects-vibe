# **📄 Installment Plan -- Manual QA Checklist**

This document contains the **step-by-step manual testing checklist** for
validating all key functionality of the Installment Plan logic on the
Marketeq platform. It is intended for QA testers with access to the
staging environment. All tests should be completed before each
production release.

✅ = Must pass before shipping\
🟡 = Optional for regression (pre-launch or major refactor)

### **🧪 1. Checkout Flow (Installments)**

  ----------------------------------------------------------------------------
  **Test   **Description**                                        **Status**
  Step**                                                          
  -------- ------------------------------------------------------ ------------
  ✅       Select an eligible listing and click \"Pay in          
           Installments\"                                         

  ✅       Choose a frequency (weekly, biweekly, monthly)         

  ✅       Confirm total price, installment breakdown, and due    
           dates are displayed                                    

  ✅       Pay upfront deposit and validate redirection to        
           success screen                                         

  ✅       Stripe Dashboard shows active subscription tied to     
           correct email                                          
  ----------------------------------------------------------------------------

### **💳 2. Deposit & Subscription Logic**

  **Test Step**   **Description**                                                                              **Status**
  --------------- -------------------------------------------------------------------------------------------- ------------
  ✅              Verify deposit amount matches selected frequency (1w, 2w, 1mo)                               
  ✅              Verify deposit is recorded as **first installment**, not separate                            
  ✅              Check that subsequent payments are scheduled correctly in Stripe                             
  ✅              Verify Stripe subscription metadata includes installmentFrequency, projectId, userId, etc.   

### **💥 3. Payment Failure Simulation**

  **Test Step**   **Description**                                                                        **Status**
  --------------- -------------------------------------------------------------------------------------- ------------
  ✅              Simulate a failed payment using Stripe\'s test card 4000 0000 0000 9995                
  ✅              Confirm Stripe triggers invoice.payment_failed webhook                                 
  ✅              Platform retries the payment (based on retry schedule)                                 
  ✅              Confirm platform updates project or contract to paused state after final retry fails   

### **🔁 4. Recovery After Failure**

  --------------------------------------------------------------------------
  **Test   **Description**                                      **Status**
  Step**                                                        
  -------- ---------------------------------------------------- ------------
  ✅       Update payment method in user dashboard              

  ✅       Retry is triggered automatically (based on webhook   
           or platform logic)                                   

  ✅       Confirm project or contract returns to active state  

  ✅       Badge is reactivated only after payment is verified  
           again                                                
  --------------------------------------------------------------------------

### **💼 5. Admin Reporting (Optional for Now)**

  ------------------------------------------------------------------
  **Test   **Description**                              **Status**
  Step**                                                
  -------- -------------------------------------------- ------------
  🟡       Verify subscription metadata is viewable in  
           internal tools                               

  🟡       Confirm deposits and installments are        
           visible in AR reports                        
  ------------------------------------------------------------------

### **🧾 6. Receipt & Metadata Checks**

  -------------------------------------------------------------------
  **Test   **Description**                               **Status**
  Step**                                                 
  -------- --------------------------------------------- ------------
  ✅       Confirm user receives a receipt email after   
           deposit                                       

  ✅       Metadata appears correctly in Stripe and      
           database                                      

  ✅       Wallet balance remains unaffected by          
           installment payments                          
  -------------------------------------------------------------------

### **📆 7. Timeline Accuracy**

  ----------------------------------------------------------
  **Test   **Description**                      **Status**
  Step**                                        
  -------- ------------------------------------ ------------
  ✅       Verify start date = day deposit is   
           paid                                 

  ✅       Verify end date = start + calculated 
           duration                             

  ✅       Verify due dates match selected      
           frequency logic                      
  ----------------------------------------------------------
