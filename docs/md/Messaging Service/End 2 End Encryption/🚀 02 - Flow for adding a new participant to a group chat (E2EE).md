# **🚀 02 - Flow for adding a new participant to a group chat (E2EE)**

## **🔑 Step 1 -- Get the current groupKey**

- The groupKey is an **AES-256 random key** generated when the group was
  created.

- It's stored encrypted in your group_keys table for each current
  participant.

- When adding a new participant, your backend loads any existing
  encrypted copy, decrypts it using the inviter's private key (by
  calling the inviter's client over HTTPS --- your server still **never
  holds** the groupKey in plaintext).

## **🧭 Full secure flow**

### **🔍 (A) On the client (inviter's browser)**

  **Action**                                                                                             **Why**
  ------------------------------------------------------------------------------------------------------ ------------------------------------------------------------------------------------------------------
  ✅ 1. Load inviter's own encrypted groupKey from API.                                                  E.g. GET /groups/:groupId/group-key returns { encryptedGroupKey: \"\...\", encryptedFor: inviterId }
  ✅ 2. Decrypt with inviter's private key in browser.                                                   Produces raw AES groupKey bytes.
  ✅ 3. Encrypt groupKey with **new participant's public key** (fetch from GET /users/:id/public-key).   
  ✅ 4. Send the new encrypted blob to backend.                                                          POST to /groups/:groupId/add-user with { newUserId, encryptedGroupKeyForNewUser }

### **🔍 (B) On the server**

  **Action**                                                              **Why**
  ----------------------------------------------------------------------- ----------------------------------------------------------------------------------
  ✅ 5. Store encrypted groupKey in group_keys for the new participant.   That user can now decrypt all group messages.
  ✅ 6. Insert user into group_participants.                              Marks them officially in the group.
  ✅ 7. Broadcast via Ably that new participant joined.                   So existing clients can show "Anna was added and can now see previous messages."

## **🗂️ Example API structure**

### **POST /groups/:groupId/add-user**

****{

\"newUserId\": \"uuid-of-new-user\",

\"encryptedGroupKey\": \"b64-encoded-encrypted-groupKey\"

}

Server inserts:

INSERT INTO group_keys (group_id, user_id, encrypted_group_key)

VALUES (:groupId, :newUserId, :encryptedGroupKey);

And also:

INSERT INTO group_participants (group_id, user_id)

VALUES (:groupId, :newUserId);



## **🔐 Key guarantees**

  **🔥**                                                                                                             **Ensures**
  ------------------------------------------------------------------------------------------------------------------ -------------
  ✅ The server **never sees the raw groupKey**.                                                                     
  ✅ Each participant only decrypts with their own private key.                                                      
  ✅ New participant immediately sees the full history since they can now decrypt all past AES-encrypted messages.   

## **💡 Your summary architecture**

- All **messages** in the group are AES-256 encrypted with the groupKey.

- Each **participant** gets their personal encrypted copy of the
  groupKey stored in group_keys.

- This ensures the **new participant can instantly decrypt the entire
  conversation history**, fully aligned with a Slack-like UX but under
  strict E2EE.
