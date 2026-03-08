The following **interactive elements on the Project Details Page**
require the user to be **logged in** in order to function:

### **🔐 Login Required for These Actions**

  **Element**                            **Action**                            **Behavior if Not Logged In**
  -------------------------------------- ------------------------------------- ------------------------------------------------------------
  **Ask a Question (Live Chat)**         Opens chat modal or sends message     Triggers login modal before message is sent
  **Save to Favorites (Star Icon)**      Saves project to user\'s saved list   Triggers login modal before saving
  **Share Project (Share Button)**       Copies link or opens share options    Triggers login modal (optional, based on product decision)
  **Leave a Review** (future feature)    Posts a public review                 Requires login to submit review
  **Request to Hire / Start Proposal**   Sends proposal or request to team     Triggers login modal if not authenticated

### **✅ No Login Required**

  ------------------------------------------------------------------
  **Element**                          **Action**
  ------------------------------------ -----------------------------
  Viewing project details              Read-only

  Viewing project scope, pricing, and  Fully public
  deliverables                         

  Viewing assigned team info           Public

  Viewing reviews                      Public, unless admin has
                                       hidden them

  Clicking Tags / Categories /         Opens public search results
  Industries                           
  ------------------------------------------------------------------
