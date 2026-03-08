# **🗄️ 01 - Postgres Schema: groups, group_participants, group_keys**

### **📦 groups**

Basic metadata about the group.

CREATE TABLE groups (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

name TEXT, \-- optional display name

created_by UUID NOT NULL REFERENCES users(id),

created_at TIMESTAMP DEFAULT now()

);



### **👥 group_participants**

Tracks which users are currently in the group.

CREATE TABLE group_participants (

group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

user_id UUID REFERENCES users(id) ON DELETE CASCADE,

joined_at TIMESTAMP DEFAULT now(),

PRIMARY KEY (group_id, user_id)

);



### **🔐 group_keys**

Stores the **group AES key encrypted for each participant**.

CREATE TABLE group_keys (

group_id UUID REFERENCES groups(id) ON DELETE CASCADE,

user_id UUID REFERENCES users(id) ON DELETE CASCADE,

encrypted_group_key TEXT NOT NULL, \-- AES group key encrypted with this
user\'s public key

created_at TIMESTAMP DEFAULT now(),

PRIMARY KEY (group_id, user_id)

);



## **🚀 How this design works**

  ---------------------------------------------
  **✅ When you create a new group**
  ---------------------------------------------
  \- Generate a groupKey (AES-256 random).

  \- Encrypt it with the **public key of each
  initial participant**.

  \- Store each encrypted copy in group_keys.
  ---------------------------------------------

  ----------------------------------------------
  **✅ When you add a new member**
  ----------------------------------------------
  \- Encrypt the same groupKey with the new
  user's public key.

  \- Insert it into group_keys.

  \- Now they can decrypt **all past & future
  messages**.
  ----------------------------------------------

  ---------------------------------------------------------------
  **✅ When someone leaves**
  ---------------------------------------------------------------
  \- Delete their row from group_keys and group_participants.

  \- Their device no longer has the groupKey, so old messages
  can't be decrypted again.
  ---------------------------------------------------------------

## **✅ Summary**

This structure:

- Keeps your **UX identical to Slack, LinkedIn, Instagram (full history
  on join)**,

- Preserves **strong E2EE** (the server never holds plaintext),

- And still allows removing access cleanly by deleting their encrypted
  key.

- Use a single groupKey (AES-256) to encrypt all messages in the group
  (full history visibility for new members),

- And store that groupKey encrypted under **each participant's public
  key**.
