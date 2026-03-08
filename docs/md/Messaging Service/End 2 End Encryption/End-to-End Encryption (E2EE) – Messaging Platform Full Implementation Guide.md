**End-to-End Encryption (E2EE) -- Messaging Platform Full Implementation
Guide**

### **🔥 Architecture Overview**

- Messages are **encrypted in the browser using the recipient's public
  key**.

- Server and database store only ciphertext.

- Each user has their own RSA key pair:

  - **Public key** stored on server.

  - **Private key** stored securely in the browser (IndexedDB or secure
    local storage).

- Only the intended recipient can decrypt the message.

### **🗄️ Database Schema (Postgres)**

****CREATE TABLE users (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

email TEXT UNIQUE NOT NULL,

username TEXT UNIQUE NOT NULL,

role TEXT NOT NULL CHECK (role IN (\'client\', \'talent\', \'admin\')),

public_key TEXT NOT NULL, \-- PEM or base64 encoded

created_at TIMESTAMP DEFAULT now()

);

CREATE TABLE messages (

id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

conversation_id UUID NOT NULL,

sender_id UUID REFERENCES users(id),

recipient_id UUID REFERENCES users(id),

ciphertext TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now()

);



### **📁 File Structure (Client Side)**

****/src

/crypto

e2ee.ts ← encrypt & decrypt functions

keys.ts ← generate, import, export keys

/api

user.ts ← get recipient public keys

/hooks

useMessaging.ts ← send + decrypt messages



### **🔐 Client-side Crypto Code**

#### **/src/crypto/keys.ts**

****export async function generateKeyPair() {

return await window.crypto.subtle.generateKey(

{

name: \"RSA-OAEP\",

modulusLength: 4096,

publicExponent: new Uint8Array(\[1, 0, 1\]),

hash: \"SHA-256\",

},

true,

\[\"encrypt\", \"decrypt\"\]

);

}

export async function exportPublicKey(key) {

const exported = await window.crypto.subtle.exportKey(\"spki\", key);

return btoa(String.fromCharCode(\...new Uint8Array(exported)));

}

export async function importPublicKey(pem) {

const binaryDer = Uint8Array.from(atob(pem), c =\> c.charCodeAt(0));

return await window.crypto.subtle.importKey(

\"spki\",

binaryDer,

{ name: \"RSA-OAEP\", hash: \"SHA-256\" },

true,

\[\"encrypt\"\]

);

}

#### **/src/crypto/e2ee.ts**

****export async function encryptMessage(plainText, recipientPublicKey)
{

const encoded = new TextEncoder().encode(plainText);

const encrypted = await window.crypto.subtle.encrypt(

{ name: \"RSA-OAEP\" },

recipientPublicKey,

encoded

);

return btoa(String.fromCharCode(\...new Uint8Array(encrypted)));

}

export async function decryptMessage(cipherText, privateKey) {

const binary = Uint8Array.from(atob(cipherText), c =\> c.charCodeAt(0));

const decrypted = await window.crypto.subtle.decrypt(

{ name: \"RSA-OAEP\" },

privateKey,

binary

);

return new TextDecoder().decode(decrypted);

}



### **📡 Server API Endpoints**

#### **GET /users/:id/public-key**

Return the stored public key for a user so clients can encrypt for them.

{

\"publicKey\": \"MIIBIjANBgkqh\...\"

}

#### **POST /messages**

Store encrypted ciphertext without ever decrypting.

{

\"senderId\": \"uuid\",

\"recipientId\": \"uuid\",

\"conversationId\": \"uuid\",

\"ciphertext\": \"B64ENCODED\...\"

}

Server just saves it to DB.

### **📝 Usage Flow**

- On login or first message:

  - Generate key pair in browser (store private in IndexedDB).

  - Upload public key to server (PATCH /users/me/public-key).

- When sending:

  - Fetch recipient's public key (GET /users/:id/public-key)

  - Encrypt with that key.

  - POST ciphertext to server.

- When receiving:

  - Load ciphertext from API.

  - Decrypt locally with a private key.
