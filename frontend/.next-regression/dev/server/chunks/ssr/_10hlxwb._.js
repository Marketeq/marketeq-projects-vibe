module.exports = [
"[project]/src/crypto/backup.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/crypto/backup.ts
/** Deterministically derive a CryptoKey from userId + system salt */ __turbopack_context__.s([
    "decryptWithKEK",
    ()=>decryptWithKEK,
    "deriveKEK",
    ()=>deriveKEK,
    "encryptWithKEK",
    ()=>encryptWithKEK
]);
async function deriveKEK(userId) {
    const encoder = new TextEncoder();
    const systemSecret = process.env.NEXT_PUBLIC_SYSTEM_SECRET;
    if (!systemSecret) {
        throw new Error("NEXT_PUBLIC_SYSTEM_SECRET is not set. KEK derivation requires a non-empty system secret.");
    }
    const keyMaterialRaw = encoder.encode(`${userId}:${systemSecret}`);
    const keyMaterial = await crypto.subtle.importKey("raw", keyMaterialRaw, {
        name: "PBKDF2"
    }, false, [
        "deriveKey"
    ]);
    return await crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: encoder.encode("message-encryption"),
        iterations: 100_000,
        hash: "SHA-256"
    }, keyMaterial, {
        name: "AES-GCM",
        length: 256
    }, true, [
        "encrypt",
        "decrypt"
    ]);
}
async function encryptWithKEK(rawPrivateKey, kek) {
    const encoded = new TextEncoder().encode(rawPrivateKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv
    }, kek, encoded);
    return `${btoa(String.fromCharCode(...iv))}:${btoa(String.fromCharCode(...new Uint8Array(encrypted)))}`;
}
async function decryptWithKEK(encrypted, kek) {
    const [ivStr, dataStr] = encrypted.split(":");
    const iv = Uint8Array.from(atob(ivStr), (c)=>c.charCodeAt(0));
    const data = Uint8Array.from(atob(dataStr), (c)=>c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv
    }, kek, data);
    return new TextDecoder().decode(decrypted);
}
}),
"[project]/src/crypto/keys.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ensureEncryptionKeysExist",
    ()=>ensureEncryptionKeysExist,
    "exportPrivateKey",
    ()=>exportPrivateKey,
    "exportPublicKey",
    ()=>exportPublicKey,
    "generateKeyPair",
    ()=>generateKeyPair,
    "importPrivateKey",
    ()=>importPrivateKey,
    "importPublicKey",
    ()=>importPublicKey,
    "loadPrivateKey",
    ()=>loadPrivateKey,
    "loadPublicKey",
    ()=>loadPublicKey,
    "savePrivateKey",
    ()=>savePrivateKey,
    "savePublicKey",
    ()=>savePublicKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/idb/build/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/backup.ts [app-ssr] (ecmascript)");
;
;
;
;
const DB_NAME = "marketeq-e2ee";
const DB_VERSION = 1;
const STORE = "keys";
let dbPromise = null;
function getDb() {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB unavailable (non-browser environment)"));
    }
    if (!dbPromise) {
        dbPromise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["openDB"])(DB_NAME, DB_VERSION, {
            upgrade (db) {
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
                }
            }
        });
    }
    return dbPromise;
}
async function idbSet(key, value) {
    const db = await getDb();
    await db.put(STORE, value, key);
}
async function idbGet(key) {
    const db = await getDb();
    const value = await db.get(STORE, key);
    return typeof value === "string" ? value : null;
}
function privateKeyIdbKey(userId) {
    return `private-${userId}`;
}
function publicKeyIdbKey(userId) {
    return `public-${userId}`;
}
async function generateKeyPair() {
    return await window.crypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 4096,
        publicExponent: new Uint8Array([
            1,
            0,
            1
        ]),
        hash: "SHA-256"
    }, true, [
        "encrypt",
        "decrypt"
    ]);
}
async function exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported))).replace(/\n/g, "").replace(/\r/g, "").replace(/\s/g, "");
}
async function exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return btoa(String.fromCharCode(...new Uint8Array(exported))).replace(/\n/g, "").replace(/\r/g, "").replace(/\s/g, "");
}
async function importPublicKey(pem) {
    let b64 = pem.trim();
    if (b64.includes("-----BEGIN")) {
        b64 = b64.replace(/-----BEGIN PUBLIC KEY-----/, "").replace(/-----END PUBLIC KEY-----/, "").replace(/\s+/g, "");
    }
    const binaryDer = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
    return await window.crypto.subtle.importKey("spki", binaryDer, {
        name: "RSA-OAEP",
        hash: "SHA-256"
    }, true, [
        "encrypt"
    ]);
}
async function importPrivateKey(pem) {
    let b64 = pem.trim();
    if (b64.includes("-----BEGIN")) {
        b64 = b64.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
    }
    const binaryDer = Uint8Array.from(atob(b64), (c)=>c.charCodeAt(0));
    return await window.crypto.subtle.importKey("pkcs8", binaryDer, {
        name: "RSA-OAEP",
        hash: "SHA-256"
    }, true, [
        "decrypt"
    ]);
}
async function savePrivateKey(userId, key) {
    if (!userId) throw new Error("savePrivateKey requires userId");
    const pem = await exportPrivateKey(key);
    await idbSet(privateKeyIdbKey(userId), pem);
}
async function savePublicKey(userId, key) {
    if (!userId) throw new Error("savePublicKey requires userId");
    const pem = await exportPublicKey(key);
    await idbSet(publicKeyIdbKey(userId), pem);
}
async function loadPrivateKey(userId) {
    if (!userId) return null;
    const pem = await idbGet(privateKeyIdbKey(userId));
    return pem ? await importPrivateKey(pem) : null;
}
async function loadPublicKey(userId) {
    if (!userId) return null;
    const pem = await idbGet(publicKeyIdbKey(userId));
    return pem ? await importPublicKey(pem) : null;
}
async function savePrivateKeyPem(userId, pem) {
    await idbSet(privateKeyIdbKey(userId), pem);
}
async function savePublicKeyPem(userId, pem) {
    await idbSet(publicKeyIdbKey(userId), pem);
}
async function loadPrivateKeyPem(userId) {
    return await idbGet(privateKeyIdbKey(userId));
}
async function loadPublicKeyPem(userId) {
    return await idbGet(publicKeyIdbKey(userId));
}
function parseUserIdFromToken(token) {
    try {
        return JSON.parse(atob(token.split(".")[1])).sub;
    } catch  {
        return undefined;
    }
}
async function ensureEncryptionKeysExist(userId) {
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
    if (!token) {
        console.error("No access token found, cannot set up encryption keys");
        return;
    }
    const resolvedUserId = userId ?? parseUserIdFromToken(token);
    if (!resolvedUserId) {
        console.error("Cannot parse userId from token");
        return;
    }
    userId = resolvedUserId;
    // Fast path: IndexedDB already has the keys
    const existingPrivatePem = await loadPrivateKeyPem(userId);
    const existingPublicPem = await loadPublicKeyPem(userId);
    if (existingPrivatePem && existingPublicPem) {
        // Ensure messaging-service has the public key
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/public-key", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    publicKey: existingPublicPem
                }
            });
        } catch  {
        /* messaging-service may already have it */ }
        // Ensure server has the encrypted backup (one-time migration for existing users).
        // IMPORTANT: only migrate if the server's stored public key matches ours —
        // otherwise we could overwrite a valid backup with a stale/wrong keypair
        // and leave the user unable to unwrap any conversation keys.
        try {
            const { encryptedPrivateKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!encryptedPrivateKey) {
                let serverPub = null;
                try {
                    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/get-public-key", {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    serverPub = res?.publicKey ?? null;
                } catch  {
                /* no server public key yet — safe to migrate */ }
                const normalize = (s)=>s.replace(/\s+/g, "");
                const publicKeyMatches = !serverPub || normalize(serverPub) === normalize(existingPublicPem);
                if (!publicKeyMatches) {
                    console.warn("Local public key differs from server — refusing to migrate stale private key to server backup");
                } else {
                    try {
                        const kek = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deriveKEK"])(userId);
                        const blob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptWithKEK"])(existingPrivatePem, kek);
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                            method: "PUT",
                            headers: {
                                Authorization: `Bearer ${token}`
                            },
                            body: {
                                encryptedPrivateKey: blob,
                                publicKey: existingPublicPem
                            }
                        });
                        console.log("Migrated existing private key to server backup");
                    } catch (err) {
                        console.warn("Skipping private-key migration backup because KEK derivation is unavailable.", err);
                    }
                }
            }
        } catch  {
        /* server backup is best-effort */ }
        return;
    }
    // Derive KEK when configured. If missing, keep messaging available and skip backup.
    let kek = null;
    try {
        kek = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deriveKEK"])(userId);
    } catch (err) {
        console.warn("KEK derivation unavailable. Private-key backup/restore will be skipped for this session.", err);
    }
    // Try to restore from server backup
    if (kek) {
        try {
            const { encryptedPrivateKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (encryptedPrivateKey) {
                const privPem = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptWithKEK"])(encryptedPrivateKey, kek);
                // Validate and store in IndexedDB
                await importPrivateKey(privPem);
                await savePrivateKeyPem(userId, privPem);
                // We can't derive public from private with WebCrypto, so fetch from server
                const { publicKey: serverPubKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/get-public-key", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (serverPubKey) {
                    await importPublicKey(serverPubKey);
                    await savePublicKeyPem(userId, serverPubKey);
                }
                console.log("Restored encryption keys from server backup");
                return;
            }
        } catch (err) {
            console.warn("Could not restore keys from server, will generate new ones", err);
        }
    }
    // First-time setup: generate new keypair
    const { publicKey, privateKey } = await generateKeyPair();
    const pubPem = await exportPublicKey(publicKey);
    const privPem = await exportPrivateKey(privateKey);
    // Store locally
    await savePrivateKeyPem(userId, privPem);
    await savePublicKeyPem(userId, pubPem);
    // Encrypt private key with KEK and upload to server for future recovery
    if (kek) {
        try {
            const encryptedBlob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptWithKEK"])(privPem, kek);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    encryptedPrivateKey: encryptedBlob,
                    publicKey: pubPem
                }
            });
            console.log("Backed up encrypted private key to server");
        } catch (err) {
            console.error("Failed to backup private key to server", err);
        }
    }
    // Register device
    try {
        const deviceRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/devices", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                publicKey: pubPem
            }
        });
        localStorage.setItem("deviceId", deviceRes.deviceId);
    } catch (err) {
        console.error("Failed to register device", err);
    }
    // Push public key to messaging-service
    try {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/public-key", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                publicKey: pubPem
            }
        });
    } catch (err) {
        console.error("Failed to store public key in messaging-service", err);
    }
}
}),
"[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "decryptAES",
    ()=>decryptAES,
    "decryptMessage",
    ()=>decryptMessage,
    "decryptWithPrivateKey",
    ()=>decryptWithPrivateKey,
    "encryptAES",
    ()=>encryptAES,
    "encryptMessage",
    ()=>encryptMessage,
    "encryptWithPublicKey",
    ()=>encryptWithPublicKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/keys.ts [app-ssr] (ecmascript)");
;
async function encryptMessage(plainText, recipientPublicKey) {
    const encoded = new TextEncoder().encode(plainText);
    const encrypted = await window.crypto.subtle.encrypt({
        name: "RSA-OAEP"
    }, recipientPublicKey, encoded);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
async function decryptMessage(cipherText, privateKey) {
    const binary = Uint8Array.from(atob(cipherText), (c)=>c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt({
        name: "RSA-OAEP"
    }, privateKey, binary);
    return new TextDecoder().decode(decrypted);
}
///
// src/crypto/e2ee.ts
/**
 * Turn a PEM string into an ArrayBuffer,
 * stripping the header/footer and base64-decoding.
 */ function pemToArrayBuffer(pem) {
    // console.log('Converting PEM to ArrayBuffer:', pem);
    const b64 = pem.trim().replace(/-----BEGIN [\w\s]+-----/, "").replace(/-----END [\w\s]+-----/, "").replace(/\s+/g, "");
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++){
        arr[i] = bin.charCodeAt(i);
    }
    return arr.buffer;
}
async function decryptWithPrivateKey(wrappedB64, privateKeyPem) {
    // 1) import the private key
    const keyData = pemToArrayBuffer(privateKeyPem);
    const privateKey = await crypto.subtle.importKey("pkcs8", keyData, {
        name: "RSA-OAEP",
        hash: "SHA-256"
    }, false, [
        "decrypt"
    ]);
    // 2) base64→ArrayBuffer
    const wrapped = Uint8Array.from(atob(wrappedB64), (c)=>c.charCodeAt(0));
    // 3) decrypt
    let raw;
    try {
        raw = await crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, privateKey, wrapped);
    } catch (err) {
        console.error("decryptWithPrivateKey error:", err);
        throw err;
    }
    return raw;
}
async function encryptAES(plainText, keyBytes) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);
    const keyMaterial = Uint8Array.from(keyBytes).buffer;
    const cryptoKey = await crypto.subtle.importKey("raw", keyMaterial, {
        name: "AES-GCM"
    }, false, [
        "encrypt"
    ]);
    const encrypted = await crypto.subtle.encrypt({
        name: "AES-GCM",
        iv
    }, cryptoKey, encoded);
    // prepend IV and base64-encode
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);
    return btoa(String.fromCharCode(...combined));
}
async function decryptAES(ciphertextB64, keyBytes) {
    const combined = Uint8Array.from(atob(ciphertextB64), (c)=>c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ctAndTag = combined.slice(12);
    const keyMaterial = Uint8Array.from(keyBytes).buffer;
    const cryptoKey = await crypto.subtle.importKey("raw", keyMaterial, {
        name: "AES-GCM"
    }, false, [
        "decrypt"
    ]);
    const decrypted = await crypto.subtle.decrypt({
        name: "AES-GCM",
        iv
    }, cryptoKey, ctAndTag);
    return new TextDecoder().decode(decrypted);
}
async function encryptWithPublicKey(aesKey, publicKeyInput) {
    let pem = publicKeyInput.trim();
    // Normalize to full PEM if needed
    if (!pem.includes("-----BEGIN")) {
        const body = pem.replace(/\s+/g, "");
        const lines = body.match(/.{1,64}/g).join("\n");
        pem = `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
    }
    // Convert PEM to CryptoKey
    const publicKey = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["importPublicKey"])(pem);
    // Encrypt using RSA-OAEP with SHA-256
    const keyMaterial = Uint8Array.from(aesKey).buffer;
    const encrypted = await window.crypto.subtle.encrypt({
        name: "RSA-OAEP"
    }, publicKey, keyMaterial);
    // Return base64 encoded ciphertext
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
}),
"[project]/src/crypto/storage.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/crypto/storage.ts
/**
 * Persist the Base64‐encoded AES key for a conversation.
 */ __turbopack_context__.s([
    "loadKey",
    ()=>loadKey,
    "saveKey",
    ()=>saveKey
]);
function saveKey(convId, rawKeyB64) {
    localStorage.setItem(`convKey:${convId}`, rawKeyB64);
    console.debug(`Saved AES key for conversation ${convId}`);
}
function loadKey(convId) {
    const rawKeyB64 = localStorage.getItem(`convKey:${convId}`);
    if (!rawKeyB64) {
        throw new Error(`No AES key cached for conversation ${convId}`);
    }
    return Uint8Array.from(atob(rawKeyB64), (c)=>c.charCodeAt(0));
}
}),
"[project]/src/search/message-search.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildSearchIndex",
    ()=>buildSearchIndex,
    "clearCachedIndex",
    ()=>clearCachedIndex,
    "loadCachedDocs",
    ()=>loadCachedDocs,
    "makeSearcher",
    ()=>makeSearcher,
    "saveCachedDocs",
    ()=>saveCachedDocs
]);
// Client-side message search index.
//
// Background: messages are E2EE — the server only has ciphertext, so the
// backend's /v1/messages/search can't match anything under normal operation.
// We build an index on the client from decrypted messages and persist it in
// IndexedDB so a refresh doesn't cost re-indexing. A brand-new device pays
// the one-time cost of fetching + decrypting all history.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/fuse.js/dist/fuse.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/idb/build/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
;
;
;
;
const DB_NAME = "marketeq-search";
const DB_VERSION = 1;
const DOCS_STORE = "docs";
const META_STORE = "meta";
let dbPromise = null;
function getDb() {
    if (typeof indexedDB === "undefined") {
        return Promise.reject(new Error("IndexedDB unavailable"));
    }
    if (!dbPromise) {
        dbPromise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["openDB"])(DB_NAME, DB_VERSION, {
            upgrade (db) {
                if (!db.objectStoreNames.contains(DOCS_STORE)) {
                    db.createObjectStore(DOCS_STORE);
                }
                if (!db.objectStoreNames.contains(META_STORE)) {
                    db.createObjectStore(META_STORE);
                }
            }
        });
    }
    return dbPromise;
}
const docsKey = (userId)=>`docs:${userId}`;
const metaKey = (userId)=>`meta:${userId}`;
async function loadCachedDocs(userId) {
    try {
        const db = await getDb();
        const docs = await db.get(DOCS_STORE, docsKey(userId));
        return Array.isArray(docs) ? docs : [];
    } catch  {
        return [];
    }
}
async function saveCachedDocs(userId, docs, threadsIndexed) {
    try {
        const db = await getDb();
        const tx = db.transaction([
            DOCS_STORE,
            META_STORE
        ], "readwrite");
        await tx.objectStore(DOCS_STORE).put(docs, docsKey(userId));
        await tx.objectStore(META_STORE).put({
            lastIndexedAt: new Date().toISOString(),
            threadsIndexed
        }, metaKey(userId));
        await tx.done;
    } catch (err) {
        console.warn("[message-search] failed to persist index", err);
    }
}
async function clearCachedIndex(userId) {
    try {
        const db = await getDb();
        const tx = db.transaction([
            DOCS_STORE,
            META_STORE
        ], "readwrite");
        await tx.objectStore(DOCS_STORE).delete(docsKey(userId));
        await tx.objectStore(META_STORE).delete(metaKey(userId));
        await tx.done;
    } catch  {}
}
/**
 * Unwrap a thread's AES key using the user's RSA private key. Uses the
 * localStorage cache when available to avoid repeated network + RSA work.
 */ async function unwrapAesKey(conv, token, privateKey) {
    try {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(conv.id);
    } catch  {
    /* not cached; unwrap below */ }
    try {
        const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
        const rawBuffer = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, privateKey, wrapped);
        const key = new Uint8Array(rawBuffer);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(conv.id, btoa(String.fromCharCode(...key)));
        return key;
    } catch (err) {
        console.warn(`[message-search] failed to unwrap key for thread ${conv.id}`, err);
        return null;
    }
}
async function buildSearchIndex(opts) {
    const { token, privateKey, existing = [], onProgress, signal } = opts;
    const threads = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        signal
    });
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    // Merge by message id; we re-index every thread. Since messages are
    // append-mostly (edits excepted), this refreshes content on edits too.
    const byId = new Map(existing.map((d)=>[
            d.id,
            d
        ]));
    const threadsIndexed = [];
    let done = 0;
    const total = threads.length;
    onProgress?.(done, total);
    // Sequential to avoid RSA-OAEP bursts + 20 concurrent GETs on a fresh device.
    for (const thread of threads){
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        try {
            let aesKey = null;
            if (privateKey) aesKey = await unwrapAesKey(thread, token, privateKey);
            const messages = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/thread/${thread.id}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                signal
            });
            if (signal?.aborted) throw new DOMException("aborted", "AbortError");
            for (const m of messages){
                if (m.deleted || m.isDeleted) continue;
                let content = m.content || "";
                if (!content && m.ciphertext && aesKey) {
                    try {
                        content = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(m.ciphertext, aesKey);
                    } catch  {
                        // Decryption failed — but if the message has attachments, still
                        // index it so the Files section can find them by filename.
                        if (!m.attachments?.length) continue;
                    }
                }
                // Skip only if there's NEITHER content NOR attachments.
                if (!content && !m.attachments?.length) continue;
                byId.set(m.id, {
                    id: m.id,
                    threadId: thread.id,
                    senderId: m.senderId,
                    content,
                    createdAt: m.createdAt,
                    attachments: m.attachments
                });
            }
            threadsIndexed.push(thread.id);
        } catch (err) {
            if (err?.name === "AbortError") throw err;
            console.warn(`[message-search] failed to index thread ${thread.id}`, err);
        }
        done += 1;
        onProgress?.(done, total);
    }
    return {
        docs: Array.from(byId.values()),
        threadsIndexed
    };
}
const FUSE_OPTIONS = {
    // Search both message body text and attachment filenames so that typing a
    // filename surfaces the conversation it lives in, not just messages whose
    // body contains the filename.
    keys: [
        "content",
        "attachments.fileName"
    ],
    threshold: 0.3,
    ignoreLocation: true,
    includeMatches: false,
    minMatchCharLength: 2
};
function makeSearcher(docs) {
    const fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"](docs, FUSE_OPTIONS);
    return (query)=>{
        const q = query.trim();
        if (!q) return [];
        return fuse.search(q, {
            limit: 50
        }).map((r)=>r.item);
    };
}
}),
"[project]/src/api/user.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRecipientPublicKey",
    ()=>getRecipientPublicKey
]);
// export async function getRecipientPublicKey(userId: string): Promise<string> {
//      console.log("userId:", userId);
//   const res = await fetch(`http://localhost:3007/api/messaging/${userId}/public-key`);
//   const data = await res.json();
//   console.log("Received public key:", data.publicKey);
//   return data.publicKey; // Assuming your backend returns { publicKey: "..." }
// }
// src/api/user.ts or wherever you define your API helpers
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
async function getRecipientPublicKey(userId, token) {
    console.log("Fetching public key for userId:", userId);
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/messaging/get-public-key?userId=${userId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    console.log("Received public key:", data.publicKey);
    return data.publicKey;
}
}),
"[project]/utils/useMessageSearchIndex.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMessageSearchIndex",
    ()=>useMessageSearchIndex
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/search/message-search.ts [app-ssr] (ecmascript)");
"use client";
;
;
function useMessageSearchIndex({ userId, token, privateKey }) {
    const [docs, setDocs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [ready, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isIndexing, setIsIndexing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [progress, setProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const searcherRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(()=>[]);
    const indexingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        searcherRef.current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeSearcher"])(docs);
    }, [
        docs
    ]);
    // Phase 1: load cached docs from IndexedDB immediately so search works
    // with whatever was indexed last session.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!userId) return;
        let cancelled = false;
        (async ()=>{
            const cached = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadCachedDocs"])(userId);
            if (cancelled) return;
            setDocs(cached);
            setReady(true);
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        userId
    ]);
    // Phase 2: once we have a token + private key, rebuild/refresh the index
    // in the background. Merges new messages into whatever was cached.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!userId || !token || !privateKey || !ready) return;
        if (indexingRef.current) return;
        indexingRef.current = true;
        setIsIndexing(true);
        setProgress(0);
        const controller = new AbortController();
        (async ()=>{
            try {
                const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildSearchIndex"])({
                    userId,
                    token,
                    privateKey,
                    existing: docs,
                    signal: controller.signal,
                    onProgress: (done, total)=>{
                        setProgress(total > 0 ? done / total : 1);
                    }
                });
                if (controller.signal.aborted) return;
                setDocs(result.docs);
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveCachedDocs"])(userId, result.docs, result.threadsIndexed);
            } catch (err) {
                if (err?.name !== "AbortError") {
                    console.error("[useMessageSearchIndex] build failed", err);
                }
            } finally{
                if (!controller.signal.aborted) {
                    setIsIndexing(false);
                    setProgress(1);
                }
                indexingRef.current = false;
            }
        })();
        return ()=>{
            controller.abort();
            indexingRef.current = false;
        };
    // `docs` intentionally omitted — we want one build per auth session,
    // not a rebuild every time the docs ref changes. Incremental updates
    // on new message arrival should be handled at a higher level.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        userId,
        token,
        privateKey,
        ready
    ]);
    const search = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((query)=>{
        return searcherRef.current(query);
    }, []);
    const addDoc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((doc)=>{
        setDocs((prev)=>{
            // Replace if same id already present (handles edits), otherwise append.
            const idx = prev.findIndex((d)=>d.id === doc.id);
            const next = idx >= 0 ? prev.slice() : [
                ...prev,
                doc
            ];
            if (idx >= 0) next[idx] = doc;
            // Persist asynchronously; fire-and-forget — the in-memory state is
            // what drives the searcher above, IDB is just the cache for next load.
            if (userId) {
                void (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveCachedDocs"])(userId, next, // We don't track threadsIndexed here; saveCachedDocs handles it.
                []).catch(()=>{});
            }
            return next;
        });
    }, [
        userId
    ]);
    // Stable object identity — consumers put this in effect deps.
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            search,
            isIndexing,
            progress,
            ready,
            docCount: docs.length,
            allDocs: docs,
            addDoc
        }), [
        search,
        isIndexing,
        progress,
        ready,
        docs,
        addDoc
    ]);
}
}),
"[project]/utils/conversation.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/utils/conversation.ts
__turbopack_context__.s([
    "getOtherParticipantId",
    ()=>getOtherParticipantId
]);
function getOtherParticipantId(conv, me) {
    return conv.participantIds?.find((id)=>id !== me);
}
}),
"[project]/utils/useAblyChannel.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAblyChannel",
    ()=>useAblyChannel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably-node.js [app-ssr] (ecmascript)");
;
;
;
;
function useAblyChannel(threadId, onMessage, onPinToggled, onDelete, onUndelete, onEdit, onReaction) {
    // Stable refs so the effect doesn't tear down on every render
    const onMessageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onMessage);
    const onPinToggledRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onPinToggled);
    const onDeleteRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onDelete);
    const onUndeleteRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onUndelete);
    const onEditRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onEdit);
    const onReactionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(onReaction);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onMessageRef.current = onMessage;
    }, [
        onMessage
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onPinToggledRef.current = onPinToggled;
    }, [
        onPinToggled
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onDeleteRef.current = onDelete;
    }, [
        onDelete
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onUndeleteRef.current = onUndelete;
    }, [
        onUndelete
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onEditRef.current = onEdit;
    }, [
        onEdit
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        onReactionRef.current = onReaction;
    }, [
        onReaction
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!threadId) return;
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) {
            console.error("No logged-in user; cannot subscribe to Ably");
            return;
        }
        const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Realtime"]({
            authCallback: async (_tokenParams, callback)=>{
                try {
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
                    const tokenDetails = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token?threadId=${threadId}`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!tokenDetails) {
                        callback("Realtime token unavailable", null);
                        return;
                    }
                    callback(null, tokenDetails);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    callback(msg, null);
                }
            },
            clientId: currentUser.id
        });
        const channel = client.channels.get(`chat:thread-${threadId}`);
        channel.subscribe((msg)=>{
            if (msg.name === "message:new") {
                onMessageRef.current(msg.data);
            }
            if (msg.name === "message:edit" && onEditRef.current) {
                onEditRef.current(msg.data);
            }
            if (msg.name === "message-pin-toggled" && onPinToggledRef.current) {
                onPinToggledRef.current(msg.data);
            }
            if (msg.name === "message:delete" && onDeleteRef.current) {
                onDeleteRef.current(msg.data.messageId);
            }
            if (msg.name === "message:restore" && onUndeleteRef.current) {
                onUndeleteRef.current(msg.data.messageId);
            }
            if (msg.name === "message:reaction" && onReactionRef.current) {
                onReactionRef.current(msg.data);
            }
        });
        return ()=>{
            channel.unsubscribe();
            client.close();
        };
    }, [
        threadId
    ]);
}
}),
"[project]/utils/useAblyPresence.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAblyPresence",
    ()=>useAblyPresence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably-node.js [app-ssr] (ecmascript)");
;
;
;
;
const TYPING_TIMEOUT_MS = 5000;
function useAblyPresence(threadId) {
    const [members, setMembers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const channelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sendingTypingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    const typingResetTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const staleTypingTimersRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!threadId) {
            setMembers([]);
            return;
        }
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) return;
        let cancelled = false;
        let entered = false;
        const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Realtime"]({
            authCallback: async (_tokenParams, callback)=>{
                try {
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
                    const tokenDetails = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token?threadId=${threadId}`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!tokenDetails) {
                        callback("Realtime token unavailable", null);
                        return;
                    }
                    callback(null, tokenDetails);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    callback(msg, null);
                }
            },
            clientId: currentUser.id
        });
        const channel = client.channels.get(`presence:thread-${threadId}`);
        channelRef.current = channel;
        const syncMembers = async ()=>{
            if (cancelled) return;
            try {
                const current = await channel.presence.get();
                if (cancelled) return;
                setMembers(current.map((m)=>({
                        clientId: m.clientId,
                        connectionId: m.connectionId,
                        data: m.data
                    })));
            } catch  {
            // channel may have been detached by cleanup; ignore.
            }
        };
        const handlePresence = (member)=>{
            if (cancelled) return;
            void syncMembers();
            // Safety net: if a typing:true update never gets a typing:false
            // follow-up (dropped event, tab close, etc.), auto-clear locally
            // after the doc's 5s timeout so the indicator doesn't linger.
            if (member.action === "update" && member.data?.typing) {
                const existing = staleTypingTimersRef.current.get(member.clientId);
                if (existing) clearTimeout(existing);
                const timer = setTimeout(()=>{
                    setMembers((prev)=>prev.map((m)=>m.clientId === member.clientId ? {
                                ...m,
                                data: {
                                    ...m.data ?? {},
                                    typing: false
                                }
                            } : m));
                    staleTypingTimersRef.current.delete(member.clientId);
                }, TYPING_TIMEOUT_MS + 500);
                staleTypingTimersRef.current.set(member.clientId, timer);
            }
        };
        channel.presence.subscribe(handlePresence).catch(()=>{});
        (async ()=>{
            try {
                await channel.presence.enter({
                    userId: currentUser.id,
                    typing: false
                });
                if (cancelled) return;
                entered = true;
                await syncMembers();
            } catch (err) {
                // StrictMode double-mount or rapid thread switch can tear the
                // channel down before attach completes; that's not actionable.
                if (!cancelled) {
                    console.warn("[useAblyPresence] enter failed (probably tore down mid-attach):", err);
                }
            }
        })();
        return ()=>{
            cancelled = true;
            channelRef.current = null;
            if (typingResetTimerRef.current) {
                clearTimeout(typingResetTimerRef.current);
                typingResetTimerRef.current = null;
            }
            staleTypingTimersRef.current.forEach((t)=>clearTimeout(t));
            staleTypingTimersRef.current.clear();
            try {
                channel.presence.unsubscribe(handlePresence);
            } catch  {}
            // Only attempt leave if we actually entered. Swallow any error —
            // client.close() below detaches the channel regardless, and
            // detaching mid-attach would otherwise produce a scary console error.
            ;
            (async ()=>{
                try {
                    if (entered) await channel.presence.leave();
                } catch  {}
                try {
                    client.close();
                } catch  {}
            })();
            sendingTypingRef.current = false;
        };
    }, [
        threadId
    ]);
    // Publish our own typing state. Call with `true` from the composer's
    // onChange; the hook auto-clears after TYPING_TIMEOUT_MS of silence.
    const sendTyping = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((typing)=>{
        const channel = channelRef.current;
        if (!channel) return;
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) return;
        if (typing) {
            if (typingResetTimerRef.current) {
                clearTimeout(typingResetTimerRef.current);
            }
            typingResetTimerRef.current = setTimeout(()=>{
                sendTyping(false);
            }, TYPING_TIMEOUT_MS);
            if (sendingTypingRef.current) return;
            sendingTypingRef.current = true;
            channel.presence.update({
                userId: currentUser.id,
                typing: true
            }).catch((err)=>{
                console.warn("[useAblyPresence] typing update failed", err);
                sendingTypingRef.current = false;
            });
        } else {
            if (typingResetTimerRef.current) {
                clearTimeout(typingResetTimerRef.current);
                typingResetTimerRef.current = null;
            }
            if (!sendingTypingRef.current) return;
            sendingTypingRef.current = false;
            channel.presence.update({
                userId: currentUser.id,
                typing: false
            }).catch((err)=>{
                console.warn("[useAblyPresence] typing clear failed", err);
            });
        }
    }, []);
    const isOnline = (userId)=>!!userId && members.some((m)=>m.clientId === userId);
    const me = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])()?.id;
    const typingUserIds = members.filter((m)=>m.clientId !== me && !!m.data?.typing).map((m)=>m.clientId);
    return {
        members,
        isOnline,
        sendTyping,
        typingUserIds
    };
}
}),
"[project]/utils/useUserChannel.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useUserChannel",
    ()=>useUserChannel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably-node.js [app-ssr] (ecmascript)");
;
;
;
;
function useUserChannel(handlers) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(handlers);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        ref.current = handlers;
    }, [
        handlers
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) return;
        // Reuse the ably-token endpoint. Capability is wildcard so it covers user:{id}.
        // We piggy-back on a known threadId request param or just pass empty; backend ignores for token issuance.
        const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Realtime"]({
            authCallback: async (_params, cb)=>{
                try {
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
                    const details = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!details) {
                        cb("Realtime token unavailable", null);
                        return;
                    }
                    cb(null, details);
                } catch (err) {
                    cb(err instanceof Error ? err.message : String(err), null);
                }
            },
            clientId: currentUser.id
        });
        const channel = client.channels.get(`user:${currentUser.id}`);
        channel.subscribe((msg)=>{
            switch(msg.name){
                case "thread:state-changed":
                    ref.current.onThreadStateChanged?.(msg.data);
                    break;
                case "thread:list-assignments-changed":
                    ref.current.onListAssignmentsChanged?.(msg.data);
                    break;
                case "thread:lists-changed":
                    ref.current.onListsChanged?.();
                    break;
                case "message:read":
                    ref.current.onMessageRead?.(msg.data);
                    break;
            }
        });
        return ()=>{
            channel.unsubscribe();
            client.close();
        };
    }, []);
}
}),
];

//# sourceMappingURL=_10hlxwb._.js.map