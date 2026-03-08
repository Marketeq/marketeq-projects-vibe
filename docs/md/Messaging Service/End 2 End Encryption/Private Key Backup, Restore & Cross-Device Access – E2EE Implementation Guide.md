**Private Key Backup, Restore & Cross-Device Access -- E2EE
Implementation Guide**

## **🔐 Purpose**

This document describes the complete implementation for **secure backup
and restoration of a user\'s private key** to support **end-to-end
encrypted (E2EE)** messaging across devices and sessions.

All logic occurs **client-side** to preserve E2EE integrity. The server
**never sees the decrypted private key.**

## **🔧 Key Features**

- Secure AES-GCM encryption of private key using login password (via
  PBKDF2)

- Backup to server-side storage (encrypted blob)

- Seamless restore after login

- Enforced E2EE access across devices

- Supports future key rotation and loss recovery

## **🕐 When This Happens**

  ------------------------------------------------
  **Event**      **Action**
  -------------- ---------------------------------
  First Login    Generate new keypair + securely
                 back up

  New Device     Fetch and decrypt key using login
                 password

  Password       Re-encrypt key using new derived
  Change         key

  Key Lost       Re-generate keypair (new messages
                 only)
  ------------------------------------------------

## **📂 Folder Structure**

****/src

/crypto

keys.ts ← generate/load/save keypairs

encrypt.ts ← AES encrypt/decrypt

/api

user.ts ← upload/download encrypted key blob

/hooks

usePrivateKey.ts ← wrapper for backup + restore flows



## **🔐 Step 1: Generate RSA Key Pair**

****// /src/crypto/keys.ts

export async function generateKeyPair() {

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



## **🤑 Step 2: Derive Encryption Key from Password**

****// /src/crypto/encrypt.ts

export async function deriveKeyFromPassword(password: string, salt:
Uint8Array): Promise\<CryptoKey\> {

const enc = new TextEncoder();

const baseKey = await crypto.subtle.importKey(

\"raw\",

enc.encode(password),

\"PBKDF2\",

false,

\[\"deriveKey\"\]

);

return await crypto.subtle.deriveKey(

{

name: \"PBKDF2\",

salt,

iterations: 100000,

hash: \"SHA-256\",

},

baseKey,

{ name: \"AES-GCM\", length: 256 },

false,

\[\"encrypt\", \"decrypt\"\]

);

}



## **⚿ Step 3: Encrypt Private Key**

****export async function encryptPrivateKey(pem: string, password:
string) {

const salt = crypto.getRandomValues(new Uint8Array(16));

const iv = crypto.getRandomValues(new Uint8Array(12));

const key = await deriveKeyFromPassword(password, salt);

const encoded = new TextEncoder().encode(pem);

const cipher = await crypto.subtle.encrypt(

{ name: \"AES-GCM\", iv },

key,

encoded

);

return {

blob: btoa(String.fromCharCode(\...new Uint8Array(cipher))),

salt: btoa(String.fromCharCode(\...salt)),

iv: btoa(String.fromCharCode(\...iv)),

};

}



## **🔐 Step 4: Decrypt Private Key**

****export async function decryptPrivateKey(cipherBase64: string,
saltB64: string, ivB64: string, password: string) {

const cipher = Uint8Array.from(atob(cipherBase64), c =\>
c.charCodeAt(0));

const salt = Uint8Array.from(atob(saltB64), c =\> c.charCodeAt(0));

const iv = Uint8Array.from(atob(ivB64), c =\> c.charCodeAt(0));

const key = await deriveKeyFromPassword(password, salt);

const decrypted = await crypto.subtle.decrypt(

{ name: \"AES-GCM\", iv },

key,

cipher

);

return new TextDecoder().decode(decrypted); // PEM

}



## **📡 Step 5: Backend API for Upload/Download**

****// /src/api/user.ts

export async function uploadEncryptedPrivateKey(userId: string,
encrypted: {

blob: string,

salt: string,

iv: string,

}) {

await fetch(\`/api/users/\${userId}/private-key\`, {

method: \"POST\",

headers: { \"Content-Type\": \"application/json\" },

body: JSON.stringify(encrypted),

});

}

export async function downloadEncryptedPrivateKey(userId: string) {

const res = await fetch(\`/api/users/\${userId}/private-key\`);

return await res.json();

}



## **🪑 Step 6: React Hook**

****// /src/hooks/usePrivateKey.ts

import {

encryptPrivateKey,

decryptPrivateKey,

} from \"@/crypto/encrypt\";

import { uploadEncryptedPrivateKey, downloadEncryptedPrivateKey } from
\"@/api/user\";

export function usePrivateKey(userId: string) {

async function backupPrivateKey(pem: string, password: string) {

const encrypted = await encryptPrivateKey(pem, password);

await uploadEncryptedPrivateKey(userId, encrypted);

}

async function restorePrivateKey(password: string): Promise\<string\> {

const { blob, salt, iv } = await downloadEncryptedPrivateKey(userId);

return await decryptPrivateKey(blob, salt, iv, password);

}

return { backupPrivateKey, restorePrivateKey };

}



## **🏛 Server Schema Example**

****// Postgres table: user_keys

CREATE TABLE user_keys (

user_id UUID PRIMARY KEY,

encrypted_key TEXT NOT NULL,

salt TEXT NOT NULL,

iv TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now(),

updated_at TIMESTAMP DEFAULT now()

);



## **🔒 Recovery Flow (Key Loss)**

If decryption fails:

- Regenerate keypair

- Alert user: \"Message history is no longer accessible. You\'ll start
  fresh from here.\"

- Backup new private key

## **✅ Summary**

- Private keys are stored only encrypted

- Users can change devices without losing access

- E2EE remains intact with no server-side plaintext exposure

- Key rotation + loss handling fully supported
