# **📂 Suggested File Structure**

****/src

/crypto

e2ee.ts ← core encrypt/decrypt functions

keys.ts ← generate + load/save keys

/api

user.ts ← fetch public keys from your server

/hooks

useMessaging.ts ← calls encrypt before send, decrypt on load



# **🔑 1. Generate or Load RSA Key Pair (client-side)**

/src/crypto/keys.ts

export async function generateKeyPair() {

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

export async function exportPublicKey(key: CryptoKey): Promise\<string\>
{

const exported = await window.crypto.subtle.exportKey(\"spki\", key);

return btoa(String.fromCharCode(\...new Uint8Array(exported)));

}

export async function exportPrivateKey(key: CryptoKey):
Promise\<string\> {

const exported = await window.crypto.subtle.exportKey(\"pkcs8\", key);

return btoa(String.fromCharCode(\...new Uint8Array(exported)));

}

export async function importPublicKey(pem: string): Promise\<CryptoKey\>
{

const binaryDer = Uint8Array.from(atob(pem), c =\> c.charCodeAt(0));

return await window.crypto.subtle.importKey(

\"spki\",

binaryDer,

{ name: \"RSA-OAEP\", hash: \"SHA-256\" },

true,

\[\"encrypt\"\]

);

}

export async function importPrivateKey(pem: string):
Promise\<CryptoKey\> {

const binaryDer = Uint8Array.from(atob(pem), c =\> c.charCodeAt(0));

return await window.crypto.subtle.importKey(

\"pkcs8\",

binaryDer,

{ name: \"RSA-OAEP\", hash: \"SHA-256\" },

true,

\[\"decrypt\"\]

);

}



# **🔐 2. Encrypt & Decrypt Messages**

/src/crypto/e2ee.ts

export async function encryptMessage(plainText: string,
recipientPublicKey: CryptoKey) {

const encoded = new TextEncoder().encode(plainText);

const encrypted = await window.crypto.subtle.encrypt(

{ name: \"RSA-OAEP\" },

recipientPublicKey,

encoded

);

return btoa(String.fromCharCode(\...new Uint8Array(encrypted)));

}

export async function decryptMessage(cipherText: string, privateKey:
CryptoKey) {

const binary = Uint8Array.from(atob(cipherText), c =\> c.charCodeAt(0));

const decrypted = await window.crypto.subtle.decrypt(

{ name: \"RSA-OAEP\" },

privateKey,

binary

);

return new TextDecoder().decode(decrypted);

}



# **🚀 3. Typical Flow in a React Hook**

/src/hooks/useMessaging.ts

import { encryptMessage, decryptMessage } from \"@/crypto/e2ee\";

import { importPublicKey, importPrivateKey } from \"@/crypto/keys\";

import { getRecipientPublicKey } from \"@/api/user\";

export function useMessaging(currentUserPrivateKey: CryptoKey) {

async function sendEncryptedMessage(toUserId: string, plainText: string)
{

const recipientPem = await getRecipientPublicKey(toUserId);

const recipientKey = await importPublicKey(recipientPem);

const encrypted = await encryptMessage(plainText, recipientKey);

// Now send \`encrypted\` to your backend or Ably

await fetch(\"/api/messages\", {

method: \"POST\",

body: JSON.stringify({

recipientId: toUserId,

content: encrypted,

}),

headers: { \"Content-Type\": \"application/json\" },

});

}

async function decryptIncomingMessage(cipherText: string) {

return await decryptMessage(cipherText, currentUserPrivateKey);

}

return { sendEncryptedMessage, decryptIncomingMessage };

}



# **🗄️ 4. Minimal API to Fetch Public Keys**

/src/api/user.ts

export async function getRecipientPublicKey(userId: string):
Promise\<string\> {

const res = await fetch(\`/api/users/\${userId}/public-key\`);

const data = await res.json();

return data.publicKey;

}

(Your server stores public keys per user --- never private keys.)

# **⚡ Summary:**

✅ **All encryption happens in the browser.\**
✅ **Server & DB only see ciphertext.\**
✅ **Ably or your messaging transport carries encrypted payload.**
