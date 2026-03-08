### **✅ Unified Login Strategy -- Login Behavior Confirmation**

  **Scenario**                                                            **Expected Result**
  ----------------------------------------------------------------------- -------------------------------------------------------------
  A user signs up with **Google** (email: alice@example.com)              Account created with email alice@example.com, no password
  Same user logs in later via **email/password** with alice@example.com   ✅ Works **if a password was later set** via settings modal
  Same user logs in via **LinkedIn** using alice@example.com              ✅ Seamlessly logs into same account
  A user signs up with **email only** (bob@example.com)                   Account created with bob@example.com
  User later logs in with **Google or LinkedIn** (same email)             ✅ Logs into same account --- **no duplicates**
  Any method pulls same email → same user account                         ✅ One account per email only
  If password isn\'t set yet → email login fails until it\'s set          ✅ Prompt user with password modal after first login
  User creates password via security modal on dashboard                   ✅ Enables email/password login from then on

### **✅ System Design Summary**

- 🧠 **Email = Primary Identifier\**

- 🌐 **Social logins extract email** and match to existing user

- 🔁 **No provider switching** needed --- email maps everything

- 🔐 **Password is optional** at signup; added later via settings modal

- 🔗 **Unified account regardless of login method**
