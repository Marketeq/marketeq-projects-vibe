**🚀 03 - Secure private key storage in IndexedDB**

## **📁 Directory structure**

****/src

/crypto

indexedDb.ts ← handles storing/loading keys securely

keys.ts ← generate, import, export keys (from before)



## **⚡ Setup IndexedDB with idb library**

Use the tiny idb wrapper for safe IndexedDB.\
(IndexedDB is native, but idb makes it ergonomic + auto wraps
transactions.)

npm install idb



## **🔐 /src/crypto/indexedDb.ts**

****import { openDB } from \'idb\';

const DB_NAME = \'marketeq-e2ee\';

const STORE_NAME = \'keys\';

export async function savePrivateKey(userId: string, privateKey:
CryptoKey) {

const exported = await window.crypto.subtle.exportKey(\'pkcs8\',
privateKey);

const db = await openDB(DB_NAME, 1, {

upgrade(db) {

db.createObjectStore(STORE_NAME);

}

});

await db.put(STORE_NAME, exported, \`private-\${userId}\`);

}

export async function loadPrivateKey(userId: string): Promise\<CryptoKey
\| null\> {

const db = await openDB(DB_NAME, 1);

const exported = await db.get(STORE_NAME, \`private-\${userId}\`);

if (!exported) return null;

return await window.crypto.subtle.importKey(

\'pkcs8\',

exported,

{ name: \'RSA-OAEP\', hash: \'SHA-256\' },

true,

\[\'decrypt\'\]

);

}

export async function deletePrivateKey(userId: string) {

const db = await openDB(DB_NAME, 1);

await db.delete(STORE_NAME, \`private-\${userId}\`);

}



## **🔍 How this protects your E2EE**

✅ **No plaintext keys ever go to your backend or DB.\**
✅ Only this user's browser keeps the private key (in IndexedDB).\
✅ If they clear their storage, they'll need to regenerate or restore
their private key.\
(You could optionally give them an encrypted backup file, like
ProtonMail's recovery key.)

## **🚀 Typical usage in your auth flow**

****import { generateKeyPair } from \"@/crypto/keys\";

import { savePrivateKey, loadPrivateKey } from \"@/crypto/indexedDb\";

async function onboarding() {

const keyPair = await generateKeyPair();

// Upload public key to server

const publicKeyPem = await exportPublicKey(keyPair.publicKey);

await fetch(\'/api/users/me/public-key\', {

method: \'PATCH\',

headers: {\'Content-Type\': \'application/json\'},

body: JSON.stringify({ publicKey: publicKeyPem })

});

// Store private key securely in browser

await savePrivateKey(\'current-user-id\', keyPair.privateKey);

}

async function login() {

const privateKey = await loadPrivateKey(\'current-user-id\');

if (!privateKey) {

alert(\"Missing private key --- please restore from backup or
re-onboard.\");

}

}



## **✅ Summary**

  --------------------------------------------------------------------
  **🔥**                                              **What this
                                                      achieves**
  --------------------------------------------------- ----------------
  ✅ Keeps private key on local device only           
  (IndexedDB).                                        

  ✅ Even if your DB is breached, attacker can't      
  decrypt messages.                                   

  ✅ No UX disruptions --- keys load automatically in 
  the background.                                     
  --------------------------------------------------------------------
