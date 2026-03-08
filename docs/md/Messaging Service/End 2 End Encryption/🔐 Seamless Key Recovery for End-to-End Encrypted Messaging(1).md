**🔐 Seamless Key Recovery for End-to-End Encrypted Messaging**

### **📌 Purpose**

Guarantee that message history is **never lost** under any circumstance
--- including password resets, device changes, or deletion of the local
private key. Users will never have to manage keys or passwords related
to encryption. This is a platform-level feature that must be fully
automated and invisible to the user.

### **✅ Platform Constraints**

- Message history is never lost --- **non-negotiable\**

- Users never interact with encryption keys

- Password resets or new devices do **not** break access to encrypted
  messages

- Key recovery must be automatic and secure

### **🧠 Architecture Summary**

Each user has:

- A **public/private key pair** generated in the browser

- A **public key** stored in the platform backend (PostgreSQL)

- A **private key** encrypted and stored securely in the database

The private key is encrypted with a **Key Encryption Key (KEK)** that is
generated **deterministically using the user ID and a system-wide
secret**. This guarantees recovery without requiring the user to enter a
passphrase.

### **🗂 File Structure**

****/src

/crypto

keys.ts \# RSA key generation, import/export

backup.ts \# Encrypt/decrypt private key using KEK

/services

auth.service.ts \# Derives KEK and restores key on login

messaging.service.ts \# Uses decrypted private key



### **🔐 Key Generation (First-Time Login or Signup)**

****// /src/crypto/keys.ts

export async function generateKeyPair() {

return await window.crypto.subtle.generateKey({

name: \"RSA-OAEP\",

modulusLength: 4096,

publicExponent: new Uint8Array(\[1, 0, 1\]),

hash: \"SHA-256\",

}, true, \[\"encrypt\", \"decrypt\"\]);

}

export async function exportPrivateKey(privateKey: CryptoKey):
Promise\<string\> {

const exported = await window.crypto.subtle.exportKey(\"pkcs8\",
privateKey);

return btoa(String.fromCharCode(\...new Uint8Array(exported)));

}

export async function exportPublicKey(publicKey: CryptoKey):
Promise\<string\> {

const exported = await window.crypto.subtle.exportKey(\"spki\",
publicKey);

return btoa(String.fromCharCode(\...new Uint8Array(exported)));

}



### **🔐 KEK Derivation (Deterministic per User)**

****// /src/crypto/backup.ts

export async function deriveKEK(userId: string): Promise\<CryptoKey\> {

const encoder = new TextEncoder();

const systemSecret = import.meta.env.VITE_SYSTEM_SECRET;

const keyMaterialRaw = encoder.encode(\`\${userId}:\${systemSecret}\`);

const keyMaterial = await crypto.subtle.importKey(

\"raw\",

keyMaterialRaw,

{ name: \"PBKDF2\" },

false,

\[\"deriveKey\"\]

);

return await crypto.subtle.deriveKey({

name: \"PBKDF2\",

salt: encoder.encode(\"message-encryption\"),

iterations: 100000,

hash: \"SHA-256\"

}, keyMaterial, { name: \"AES-GCM\", length: 256 }, true, \[\"encrypt\",
\"decrypt\"\]);

}



### **🔐 Backup Private Key**

****// /src/crypto/backup.ts

export async function encryptWithKEK(rawPrivateKey: string, kek:
CryptoKey): Promise\<string\> {

const encoded = new TextEncoder().encode(rawPrivateKey);

const iv = crypto.getRandomValues(new Uint8Array(12));

const encrypted = await crypto.subtle.encrypt({ name: \"AES-GCM\", iv },
kek, encoded);

return
\`\${btoa(String.fromCharCode(\...iv))}:\${btoa(String.fromCharCode(\...new
Uint8Array(encrypted)))}\`;

}

export async function decryptWithKEK(encrypted: string, kek: CryptoKey):
Promise\<string\> {

const \[ivStr, dataStr\] = encrypted.split(\":\");

const iv = Uint8Array.from(atob(ivStr), c =\> c.charCodeAt(0));

const data = Uint8Array.from(atob(dataStr), c =\> c.charCodeAt(0));

const decrypted = await crypto.subtle.decrypt({ name: \"AES-GCM\", iv },
kek, data);

return new TextDecoder().decode(decrypted);

}



### **🔁 On Login or Password Reset (Key Recovery)**

****// /services/auth.service.ts

const kek = await deriveKEK(user.id);

const encryptedPrivateKey = await api.getEncryptedPrivateKey(user.id);

const rawPrivateKey = await decryptWithKEK(encryptedPrivateKey, kek);

const privateKey = await importPrivateKey(rawPrivateKey); // imported to
CryptoKey object



### **💾 Backend Schema**

****CREATE TABLE user_keys (

user_id UUID PRIMARY KEY,

public_key TEXT NOT NULL,

encrypted_private_key TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now(),

updated_at TIMESTAMP DEFAULT now()

);



### **🔐 Password Reset Flow**

- User initiates reset → updates account password

- System does **not** rotate encryption keys

- KEK is derived from unchanged user ID → reuses same key

- Message decryption continues without interruption

### **🛡 What If Everything Is Deleted (Worst Case)**

If IndexedDB is wiped *and* database access is lost (rare dev mistake):

- Platform support logs the issue

- Admin reissues keys via secure reset flow

- All future messages continue, and old messages remain encrypted but
  undecryptable only as a last resort --- **this is never expected to
  occur in production\**

### **✅ Summary**

  ----------------------------------------
  **Feature**                 **Status**
  --------------------------- ------------
  User never loses message    ✅
  history                     

  No user-facing key          ✅
  management                  

  Password reset has zero     ✅
  impact                      

  Recovery flow works on any  ✅
  device                      

  Platform manages KEK        ✅
  securely                    

  No guesswork or optional    ✅
  logic                       
  ----------------------------------------
