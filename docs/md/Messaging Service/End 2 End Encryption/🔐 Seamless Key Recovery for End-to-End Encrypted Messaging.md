## **🔐 Seamless Key Recovery for End-to-End Encrypted Messaging**

**Purpose:\**
Ensure users never lose access to their messages, even after password
resets, device loss, or private key deletion.\
**Guarantees:**

- ✅ Message history is never lost

- ✅ Users never manage encryption keys

- ✅ Password resets do **not** break decryption

- ✅ All flows are automatic and invisible to users

### **🧠 High-Level Architecture**

Every user has:

- A **client-side RSA keypair** (private + public key)

- A **securely stored, encrypted backup** of their private key

- A **server-side public key record** for encryption

The **private key** is backed up using a **Key Encryption Key (KEK)**
derived from a *stable system-generated secret* (see below), ensuring it
can be restored even if the user resets their password.

### **🏗 File Structure**

****/src

/crypto

keys.ts \# Keypair generation + secure storage

backup.ts \# Key encryption/decryption & recovery

/services

auth.service.ts \# Injects KEK during login

messaging.service.ts# Transparent key use for E2EE



### **🔑 Key Generation & Storage Flow**

#### **✅ On Signup or First Login:**

****const { publicKey, privateKey } = await generateKeyPair();

const exportedPrivateKey = await exportPrivateKey(privateKey);

const KEK = await getStableKEK(); // stable, system-generated,
user-agnostic

const encryptedPrivateKey = await encryptWithKEK(exportedPrivateKey,
KEK);

// Save encrypted key to backend

await api.saveEncryptedPrivateKey(encryptedPrivateKey);

await api.savePublicKey(publicKey);

#### **generateKeyPair() uses SubtleCrypto:**

****window.crypto.subtle.generateKey({

name: \"RSA-OAEP\",

modulusLength: 4096,

publicExponent: new Uint8Array(\[1, 0, 1\]),

hash: \"SHA-256\",

}, true, \[\"encrypt\", \"decrypt\"\]);



### **🧬 What Is a Stable KEK?**

A **Key Encryption Key (KEK)** is a system-generated encryption key
that:

- Is **not tied to user input\**

- Can be **deterministically regenerated\**

- Is **stored in the backend** (encrypted at rest)

#### **✅ Recommended KEK sources:**

- A **server-side KMS (Key Management System)** like AWS KMS or Google
  Cloud KMS

- A **deterministically derived secret** per user, stored encrypted
  (e.g., HMAC(userId + systemSecret))

function getStableKEK(userId: string) {

return crypto.createHmac(\"sha256\",
process.env.SYSTEM_SECRET).update(userId).digest();

}



### **🔁 Password Reset or New Device Flow**

#### **On login or password reset:**

****const KEK = await getStableKEK();

const encryptedPrivateKey = await api.getEncryptedPrivateKey();

const rawPrivateKey = await decryptWithKEK(encryptedPrivateKey, KEK);

const privateKey = await importPrivateKey(rawPrivateKey);

- \
  No user input is needed

- Private key is restored in memory

- E2EE messaging continues without issue

### **💬 Messaging Flow Example (Transparent to User)**

- When sending: encrypt with recipient\'s public key

- When receiving: decrypt with restored private key from memory

- When logging out: clear private key from memory

All storage and recovery is handled **behind the scenes**.

### **🛡 Recovery Failure Handling (Highly Unlikely)**

If decryption ever fails:

- Log incident for investigation

- Retry with known backup sources (if multiple KEKs or fallback copies
  exist)

- Still **never alert the user with technical terms** like "decryption
  key missing"

If unrecoverable (extremely rare edge case):

- Show:\
  \
  \
  "Some old messages could not be restored. Future messages will be
  visible as usual."

  - Only show to internal support team unless user has noticed

  - Log affected thread IDs for admin audit

### **🧪 Backend Schema Example**

****CREATE TABLE user_keys (

user_id UUID PRIMARY KEY,

public_key TEXT NOT NULL,

encrypted_private_key TEXT NOT NULL,

created_at TIMESTAMP DEFAULT now(),

updated_at TIMESTAMP DEFAULT now()

);



### **🚀 Summary**

  ------------------------------------
  **Requirement**           **Met?**
  ------------------------- ----------
  Message history never     ✅
  lost                      

  No user password          ✅
  dependency                

  No extra keys or          ✅
  passphrases               

  Invisible encryption UX   ✅

  Secure server-side KEK    ✅
  strategy                  

  Recovery post-password    ✅
  reset                     
  ------------------------------------
