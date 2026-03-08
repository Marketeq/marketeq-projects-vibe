# **🚀 E2EE direct 1:1 conversations using AES conversationKey**

## **🎯 Why this?**

- Ensures **both participants in a 1:1 chat can always decrypt the full
  conversation history**.

- Avoids the problem: "the sender can't decrypt their own messages from
  the DB."

- Matches your existing group encryption architecture, so no new logic.

# **🗄 Postgres schema**

## **conversations**

Stores direct conversation metadata.

CREATE TABLE conversations (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

is_group BOOLEAN DEFAULT FALSE,

created_at TIMESTAMP DEFAULT now()

);



## **conversation_participants**

Stores who is in the conversation (even if only 2 users).

CREATE TABLE conversation_participants (

conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

user_id UUID REFERENCES users(id) ON DELETE CASCADE,

joined_at TIMESTAMP DEFAULT now(),

PRIMARY KEY (conversation_id, user_id)

);



## **conversation_keys**

Stores the AES conversationKey encrypted for each participant.

CREATE TABLE conversation_keys (

conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

user_id UUID REFERENCES users(id) ON DELETE CASCADE,

encrypted_key TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now(),

PRIMARY KEY (conversation_id, user_id)

);



## **messages**

Stores actual messages, encrypted with the conversationKey.

CREATE TABLE messages (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

conversation_id UUID REFERENCES conversations(id),

sender_id UUID REFERENCES users(id),

ciphertext TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now()

);



# **🔥 Typical flow**

## **🔑 1. Creating a new direct chat**

### **✅ Backend service**

****// src/direct-messaging.service.ts

async createDirectConversation(userA: UUID, userB: UUID) {

const conversation = await this.db.conversations.create({});

// Generate AES conversationKey (32 bytes)

const conversationKey = crypto.randomBytes(32);

// Encrypt for both participants

const encryptedKeyForA = await
this.cryptoService.encryptWithPublicKey(conversationKey, userA);

const encryptedKeyForB = await
this.cryptoService.encryptWithPublicKey(conversationKey, userB);

// Store encrypted keys

await this.db.conversationKeys.createMany(\[

{ conversationId: conversation.id, userId: userA, encryptedKey:
encryptedKeyForA },

{ conversationId: conversation.id, userId: userB, encryptedKey:
encryptedKeyForB },

\]);

// Register participants

await this.db.conversationParticipants.createMany(\[

{ conversationId: conversation.id, userId: userA },

{ conversationId: conversation.id, userId: userB },

\]);

return conversation.id;

}



## **🔐 2. Sending a message**

### **✅ Browser-side**

- Load conversationKey by decrypting from your own copy in IndexedDB.

- Encrypt the plaintext message with AES.

import { decryptAES, encryptAES } from \"@/crypto/e2ee\";

import { loadConversationKey } from \"@/crypto/indexedDb\";

async function sendMessage(conversationId, plainText) {

const conversationKey = await loadConversationKey(conversationId);

const ciphertext = await encryptAES(plainText, conversationKey);

await fetch(\'/api/messages\', {

method: \'POST\',

body: JSON.stringify({

conversationId,

ciphertext

}),

headers: {\'Content-Type\': \'application/json\'}

});

}



## **📨 3. Loading message history**

### **✅ Browser decrypts after fetching ciphertext from DB**

****const conversationKey = await loadConversationKey(conversationId);

const res = await
fetch(\`/api/messages?conversationId=\${conversationId}\`);

const messages = await res.json();

const decrypted = await Promise.all(

messages.map(async (msg) =\> ({

\...msg,

text: await decryptAES(msg.ciphertext, conversationKey)

}))

);



# **🔥 Crypto helper examples**

### **AES encrypt & decrypt**

****export async function encryptAES(plainText: string, key:
Uint8Array) {

const iv = crypto.getRandomValues(new Uint8Array(12));

const encoded = new TextEncoder().encode(plainText);

const cryptoKey = await crypto.subtle.importKey(

\"raw\", key, \"AES-GCM\", false, \[\"encrypt\"\]

);

const encrypted = await crypto.subtle.encrypt(

{ name: \"AES-GCM\", iv }, cryptoKey, encoded

);

return btoa(String.fromCharCode(\...iv, \...new Uint8Array(encrypted)));

}

export async function decryptAES(ciphertext: string, key: Uint8Array) {

const binary = Uint8Array.from(atob(ciphertext), c =\> c.charCodeAt(0));

const iv = binary.slice(0, 12);

const data = binary.slice(12);

const cryptoKey = await crypto.subtle.importKey(

\"raw\", key, \"AES-GCM\", false, \[\"decrypt\"\]

);

const decrypted = await crypto.subtle.decrypt(

{ name: \"AES-GCM\", iv }, cryptoKey, data

);

return new TextDecoder().decode(decrypted);

}



# **✅ Summary --- what this achieves**

+------------------------------------------------------------------+---+
| **🔥**                                                           |   |
+------------------------------------------------------------------+---+
| ✅ Sender can always decrypt their own messages from DB, because |   |
| they have the conversationKey encrypted for them.                |   |
+------------------------------------------------------------------+---+
| ✅ Recipient can decrypt with their own private key.             |   |
+------------------------------------------------------------------+---+
| ✅ Same DB schema & logic supports both 1:1 and group chats.     |   |
+------------------------------------------------------------------+---+
| ✅ Keeps everything 100% E2EE --- your server, DB, Ably, or your |   |
| devs never see plaintext.                                        |   |
|                                                                  |   |
| ✅ Use the same groupKey (AES) strategy for **1:1 direct         |   |
| conversations\                                                   |   |
| \**                                                              |   |
| ✅ Encrypt & store the AES key for both participants\            |   |
| \                                                                |   |
| ✅ Encrypt & decrypt messages so **both sender and recipient can |   |
| always read history**                                            |   |
+==================================================================+===+
