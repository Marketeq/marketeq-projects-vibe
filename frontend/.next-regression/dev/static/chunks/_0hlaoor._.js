(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/crypto/backup.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
async function deriveKEK(userId) {
    const encoder = new TextEncoder();
    const systemSecret = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_SYSTEM_SECRET;
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/crypto/keys.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/idb/build/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/backup.ts [app-client] (ecmascript)");
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
        dbPromise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openDB"])(DB_NAME, DB_VERSION, {
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
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccessToken"])();
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
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/public-key", {
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
            const { encryptedPrivateKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!encryptedPrivateKey) {
                let serverPub = null;
                try {
                    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/get-public-key", {
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
                        const kek = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deriveKEK"])(userId);
                        const blob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encryptWithKEK"])(existingPrivatePem, kek);
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
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
        kek = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deriveKEK"])(userId);
    } catch (err) {
        console.warn("KEK derivation unavailable. Private-key backup/restore will be skipped for this session.", err);
    }
    // Try to restore from server backup
    if (kek) {
        try {
            const { encryptedPrivateKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (encryptedPrivateKey) {
                const privPem = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decryptWithKEK"])(encryptedPrivateKey, kek);
                // Validate and store in IndexedDB
                await importPrivateKey(privPem);
                await savePrivateKeyPem(userId, privPem);
                // We can't derive public from private with WebCrypto, so fetch from server
                const { publicKey: serverPubKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/get-public-key", {
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
            const encryptedBlob = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$backup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["encryptWithKEK"])(privPem, kek);
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/user-keys/private-key", {
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
        const deviceRes = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/devices", {
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
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/messaging/public-key", {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/crypto/e2ee.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/keys.ts [app-client] (ecmascript)");
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
    const publicKey = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["importPublicKey"])(pem);
    // Encrypt using RSA-OAEP with SHA-256
    const keyMaterial = Uint8Array.from(aesKey).buffer;
    const encrypted = await window.crypto.subtle.encrypt({
        name: "RSA-OAEP"
    }, publicKey, keyMaterial);
    // Return base64 encoded ciphertext
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/crypto/storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/search/message-search.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/fuse.js/dist/fuse.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/idb/build/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
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
        dbPromise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$idb$2f$build$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openDB"])(DB_NAME, DB_VERSION, {
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
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadKey"])(conv.id);
    } catch  {
    /* not cached; unwrap below */ }
    try {
        const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
        const rawBuffer = await window.crypto.subtle.decrypt({
            name: "RSA-OAEP"
        }, privateKey, wrapped);
        const key = new Uint8Array(rawBuffer);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveKey"])(conv.id, btoa(String.fromCharCode(...key)));
        return key;
    } catch (err) {
        console.warn(`[message-search] failed to unwrap key for thread ${conv.id}`, err);
        return null;
    }
}
async function buildSearchIndex(opts) {
    const { token, privateKey, existing = [], onProgress, signal } = opts;
    const threads = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads", {
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
            const messages = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/thread/${thread.id}`, {
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
                        content = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decryptAES"])(m.ciphertext, aesKey);
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
    const fuse = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$fuse$2e$js$2f$dist$2f$fuse$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"](docs, FUSE_OPTIONS);
    return (query)=>{
        const q = query.trim();
        if (!q) return [];
        return fuse.search(q, {
            limit: 50
        }).map((r)=>r.item);
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/api/user.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
;
async function getRecipientPublicKey(userId, token) {
    console.log("Fetching public key for userId:", userId);
    const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/messaging/get-public-key?userId=${userId}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    console.log("Received public key:", data.publicKey);
    return data.publicKey;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/useMessageSearchIndex.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMessageSearchIndex",
    ()=>useMessageSearchIndex
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/search/message-search.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function useMessageSearchIndex({ userId, token, privateKey }) {
    _s();
    const [docs, setDocs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [ready, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isIndexing, setIsIndexing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [progress, setProgress] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const searcherRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])({
        "useMessageSearchIndex.useRef[searcherRef]": ()=>[]
    }["useMessageSearchIndex.useRef[searcherRef]"]);
    const indexingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useMessageSearchIndex.useEffect": ()=>{
            searcherRef.current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["makeSearcher"])(docs);
        }
    }["useMessageSearchIndex.useEffect"], [
        docs
    ]);
    // Phase 1: load cached docs from IndexedDB immediately so search works
    // with whatever was indexed last session.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useMessageSearchIndex.useEffect": ()=>{
            if (!userId) return;
            let cancelled = false;
            ({
                "useMessageSearchIndex.useEffect": async ()=>{
                    const cached = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadCachedDocs"])(userId);
                    if (cancelled) return;
                    setDocs(cached);
                    setReady(true);
                }
            })["useMessageSearchIndex.useEffect"]();
            return ({
                "useMessageSearchIndex.useEffect": ()=>{
                    cancelled = true;
                }
            })["useMessageSearchIndex.useEffect"];
        }
    }["useMessageSearchIndex.useEffect"], [
        userId
    ]);
    // Phase 2: once we have a token + private key, rebuild/refresh the index
    // in the background. Merges new messages into whatever was cached.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useMessageSearchIndex.useEffect": ()=>{
            if (!userId || !token || !privateKey || !ready) return;
            if (indexingRef.current) return;
            indexingRef.current = true;
            setIsIndexing(true);
            setProgress(0);
            const controller = new AbortController();
            ({
                "useMessageSearchIndex.useEffect": async ()=>{
                    try {
                        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildSearchIndex"])({
                            userId,
                            token,
                            privateKey,
                            existing: docs,
                            signal: controller.signal,
                            onProgress: {
                                "useMessageSearchIndex.useEffect": (done, total)=>{
                                    setProgress(total > 0 ? done / total : 1);
                                }
                            }["useMessageSearchIndex.useEffect"]
                        });
                        if (controller.signal.aborted) return;
                        setDocs(result.docs);
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveCachedDocs"])(userId, result.docs, result.threadsIndexed);
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
                }
            })["useMessageSearchIndex.useEffect"]();
            return ({
                "useMessageSearchIndex.useEffect": ()=>{
                    controller.abort();
                    indexingRef.current = false;
                }
            })["useMessageSearchIndex.useEffect"];
        // `docs` intentionally omitted — we want one build per auth session,
        // not a rebuild every time the docs ref changes. Incremental updates
        // on new message arrival should be handled at a higher level.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["useMessageSearchIndex.useEffect"], [
        userId,
        token,
        privateKey,
        ready
    ]);
    const search = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMessageSearchIndex.useCallback[search]": (query)=>{
            return searcherRef.current(query);
        }
    }["useMessageSearchIndex.useCallback[search]"], []);
    const addDoc = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMessageSearchIndex.useCallback[addDoc]": (doc)=>{
            setDocs({
                "useMessageSearchIndex.useCallback[addDoc]": (prev)=>{
                    // Replace if same id already present (handles edits), otherwise append.
                    const idx = prev.findIndex({
                        "useMessageSearchIndex.useCallback[addDoc].idx": (d)=>d.id === doc.id
                    }["useMessageSearchIndex.useCallback[addDoc].idx"]);
                    const next = idx >= 0 ? prev.slice() : [
                        ...prev,
                        doc
                    ];
                    if (idx >= 0) next[idx] = doc;
                    // Persist asynchronously; fire-and-forget — the in-memory state is
                    // what drives the searcher above, IDB is just the cache for next load.
                    if (userId) {
                        void (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$search$2f$message$2d$search$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveCachedDocs"])(userId, next, // We don't track threadsIndexed here; saveCachedDocs handles it.
                        []).catch({
                            "useMessageSearchIndex.useCallback[addDoc]": ()=>{}
                        }["useMessageSearchIndex.useCallback[addDoc]"]);
                    }
                    return next;
                }
            }["useMessageSearchIndex.useCallback[addDoc]"]);
        }
    }["useMessageSearchIndex.useCallback[addDoc]"], [
        userId
    ]);
    // Stable object identity — consumers put this in effect deps.
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useMessageSearchIndex.useMemo": ()=>({
                search,
                isIndexing,
                progress,
                ready,
                docCount: docs.length,
                allDocs: docs,
                addDoc
            })
    }["useMessageSearchIndex.useMemo"], [
        search,
        isIndexing,
        progress,
        ready,
        docs,
        addDoc
    ]);
}
_s(useMessageSearchIndex, "QfxfC1qgtEtLoMaP89gef3XIoEo=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/conversation.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/utils/conversation.ts
__turbopack_context__.s([
    "getOtherParticipantId",
    ()=>getOtherParticipantId
]);
function getOtherParticipantId(conv, me) {
    return conv.participantIds?.find((id)=>id !== me);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/useAblyChannel.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAblyChannel",
    ()=>useAblyChannel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
function useAblyChannel(threadId, onMessage, onPinToggled, onDelete, onUndelete, onEdit, onReaction) {
    _s();
    // Stable refs so the effect doesn't tear down on every render
    const onMessageRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onMessage);
    const onPinToggledRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onPinToggled);
    const onDeleteRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onDelete);
    const onUndeleteRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onUndelete);
    const onEditRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onEdit);
    const onReactionRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(onReaction);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onMessageRef.current = onMessage;
        }
    }["useAblyChannel.useEffect"], [
        onMessage
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onPinToggledRef.current = onPinToggled;
        }
    }["useAblyChannel.useEffect"], [
        onPinToggled
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onDeleteRef.current = onDelete;
        }
    }["useAblyChannel.useEffect"], [
        onDelete
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onUndeleteRef.current = onUndelete;
        }
    }["useAblyChannel.useEffect"], [
        onUndelete
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onEditRef.current = onEdit;
        }
    }["useAblyChannel.useEffect"], [
        onEdit
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            onReactionRef.current = onReaction;
        }
    }["useAblyChannel.useEffect"], [
        onReaction
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyChannel.useEffect": ()=>{
            if (!threadId) return;
            const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            if (!currentUser) {
                console.error("No logged-in user; cannot subscribe to Ably");
                return;
            }
            const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Realtime"]({
                authCallback: {
                    "useAblyChannel.useEffect": async (_tokenParams, callback)=>{
                        try {
                            const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccessToken"])();
                            const tokenDetails = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token?threadId=${threadId}`, {
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
                    }
                }["useAblyChannel.useEffect"],
                clientId: currentUser.id
            });
            const channel = client.channels.get(`chat:thread-${threadId}`);
            channel.subscribe({
                "useAblyChannel.useEffect": (msg)=>{
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
                }
            }["useAblyChannel.useEffect"]);
            return ({
                "useAblyChannel.useEffect": ()=>{
                    channel.unsubscribe();
                    client.close();
                }
            })["useAblyChannel.useEffect"];
        }
    }["useAblyChannel.useEffect"], [
        threadId
    ]);
}
_s(useAblyChannel, "d+FpQdFBbxhGBGOrVm5xTrxy7to=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/useAblyPresence.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAblyPresence",
    ()=>useAblyPresence
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
const TYPING_TIMEOUT_MS = 5000;
function useAblyPresence(threadId) {
    _s();
    const [members, setMembers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const channelRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sendingTypingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    const typingResetTimerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const staleTypingTimersRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Map());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAblyPresence.useEffect": ()=>{
            if (!threadId) {
                setMembers([]);
                return;
            }
            const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            if (!currentUser) return;
            let cancelled = false;
            let entered = false;
            const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Realtime"]({
                authCallback: {
                    "useAblyPresence.useEffect": async (_tokenParams, callback)=>{
                        try {
                            const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccessToken"])();
                            const tokenDetails = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token?threadId=${threadId}`, {
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
                    }
                }["useAblyPresence.useEffect"],
                clientId: currentUser.id
            });
            const channel = client.channels.get(`presence:thread-${threadId}`);
            channelRef.current = channel;
            const syncMembers = {
                "useAblyPresence.useEffect.syncMembers": async ()=>{
                    if (cancelled) return;
                    try {
                        const current = await channel.presence.get();
                        if (cancelled) return;
                        setMembers(current.map({
                            "useAblyPresence.useEffect.syncMembers": (m)=>({
                                    clientId: m.clientId,
                                    connectionId: m.connectionId,
                                    data: m.data
                                })
                        }["useAblyPresence.useEffect.syncMembers"]));
                    } catch  {
                    // channel may have been detached by cleanup; ignore.
                    }
                }
            }["useAblyPresence.useEffect.syncMembers"];
            const handlePresence = {
                "useAblyPresence.useEffect.handlePresence": (member)=>{
                    if (cancelled) return;
                    void syncMembers();
                    // Safety net: if a typing:true update never gets a typing:false
                    // follow-up (dropped event, tab close, etc.), auto-clear locally
                    // after the doc's 5s timeout so the indicator doesn't linger.
                    if (member.action === "update" && member.data?.typing) {
                        const existing = staleTypingTimersRef.current.get(member.clientId);
                        if (existing) clearTimeout(existing);
                        const timer = setTimeout({
                            "useAblyPresence.useEffect.handlePresence.timer": ()=>{
                                setMembers({
                                    "useAblyPresence.useEffect.handlePresence.timer": (prev)=>prev.map({
                                            "useAblyPresence.useEffect.handlePresence.timer": (m)=>m.clientId === member.clientId ? {
                                                    ...m,
                                                    data: {
                                                        ...m.data ?? {},
                                                        typing: false
                                                    }
                                                } : m
                                        }["useAblyPresence.useEffect.handlePresence.timer"])
                                }["useAblyPresence.useEffect.handlePresence.timer"]);
                                staleTypingTimersRef.current.delete(member.clientId);
                            }
                        }["useAblyPresence.useEffect.handlePresence.timer"], TYPING_TIMEOUT_MS + 500);
                        staleTypingTimersRef.current.set(member.clientId, timer);
                    }
                }
            }["useAblyPresence.useEffect.handlePresence"];
            channel.presence.subscribe(handlePresence).catch({
                "useAblyPresence.useEffect": ()=>{}
            }["useAblyPresence.useEffect"]);
            ({
                "useAblyPresence.useEffect": async ()=>{
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
                }
            })["useAblyPresence.useEffect"]();
            return ({
                "useAblyPresence.useEffect": ()=>{
                    cancelled = true;
                    channelRef.current = null;
                    if (typingResetTimerRef.current) {
                        clearTimeout(typingResetTimerRef.current);
                        typingResetTimerRef.current = null;
                    }
                    staleTypingTimersRef.current.forEach({
                        "useAblyPresence.useEffect": (t)=>clearTimeout(t)
                    }["useAblyPresence.useEffect"]);
                    staleTypingTimersRef.current.clear();
                    try {
                        channel.presence.unsubscribe(handlePresence);
                    } catch  {}
                    // Only attempt leave if we actually entered. Swallow any error —
                    // client.close() below detaches the channel regardless, and
                    // detaching mid-attach would otherwise produce a scary console error.
                    ;
                    ({
                        "useAblyPresence.useEffect": async ()=>{
                            try {
                                if (entered) await channel.presence.leave();
                            } catch  {}
                            try {
                                client.close();
                            } catch  {}
                        }
                    })["useAblyPresence.useEffect"]();
                    sendingTypingRef.current = false;
                }
            })["useAblyPresence.useEffect"];
        }
    }["useAblyPresence.useEffect"], [
        threadId
    ]);
    // Publish our own typing state. Call with `true` from the composer's
    // onChange; the hook auto-clears after TYPING_TIMEOUT_MS of silence.
    const sendTyping = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAblyPresence.useCallback[sendTyping]": (typing)=>{
            const channel = channelRef.current;
            if (!channel) return;
            const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            if (!currentUser) return;
            if (typing) {
                if (typingResetTimerRef.current) {
                    clearTimeout(typingResetTimerRef.current);
                }
                typingResetTimerRef.current = setTimeout({
                    "useAblyPresence.useCallback[sendTyping]": ()=>{
                        sendTyping(false);
                    }
                }["useAblyPresence.useCallback[sendTyping]"], TYPING_TIMEOUT_MS);
                if (sendingTypingRef.current) return;
                sendingTypingRef.current = true;
                channel.presence.update({
                    userId: currentUser.id,
                    typing: true
                }).catch({
                    "useAblyPresence.useCallback[sendTyping]": (err)=>{
                        console.warn("[useAblyPresence] typing update failed", err);
                        sendingTypingRef.current = false;
                    }
                }["useAblyPresence.useCallback[sendTyping]"]);
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
                }).catch({
                    "useAblyPresence.useCallback[sendTyping]": (err)=>{
                        console.warn("[useAblyPresence] typing clear failed", err);
                    }
                }["useAblyPresence.useCallback[sendTyping]"]);
            }
        }
    }["useAblyPresence.useCallback[sendTyping]"], []);
    const isOnline = (userId)=>!!userId && members.some((m)=>m.clientId === userId);
    const me = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])()?.id;
    const typingUserIds = members.filter((m)=>m.clientId !== me && !!m.data?.typing).map((m)=>m.clientId);
    return {
        members,
        isOnline,
        sendTyping,
        typingUserIds
    };
}
_s(useAblyPresence, "cis4FDnYd5eqpjYZWdIDJTXRTDk=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/useUserChannel.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useUserChannel",
    ()=>useUserChannel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
function useUserChannel(handlers) {
    _s();
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(handlers);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useUserChannel.useEffect": ()=>{
            ref.current = handlers;
        }
    }["useUserChannel.useEffect"], [
        handlers
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useUserChannel.useEffect": ()=>{
            const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])();
            if (!currentUser) return;
            // Reuse the ably-token endpoint. Capability is wildcard so it covers user:{id}.
            // We piggy-back on a known threadId request param or just pass empty; backend ignores for token issuance.
            const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Realtime"]({
                authCallback: {
                    "useUserChannel.useEffect": async (_params, cb)=>{
                        try {
                            const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAccessToken"])();
                            const details = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/ably-token`, {
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
                    }
                }["useUserChannel.useEffect"],
                clientId: currentUser.id
            });
            const channel = client.channels.get(`user:${currentUser.id}`);
            channel.subscribe({
                "useUserChannel.useEffect": (msg)=>{
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
                }
            }["useUserChannel.useEffect"]);
            return ({
                "useUserChannel.useEffect": ()=>{
                    channel.unsubscribe();
                    client.close();
                }
            })["useUserChannel.useEffect"];
        }
    }["useUserChannel.useEffect"], []);
}
_s(useUserChannel, "lq1tzM4DdcBd9rchfALtCTAkzkA=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/chat.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chat",
    ()=>Chat,
    "ChatsContextProvider",
    ()=>ChatsContextProvider,
    "UserDetail",
    ()=>UserDetail,
    "useChatsContext",
    ()=>useChatsContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$conversation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/conversation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/hooks.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/react-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useOnlineUsers.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isToday.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isYesterday.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useToggle.js [app-client] (ecmascript) <export default as useToggle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/badge/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$checkbox$2f$checkbox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/checkbox/checkbox.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/favorite/favorite.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
const chatVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("group/chat relative cursor-pointer flex items-start gap-x-2 pl-3.5 hover:bg-gray-100 data-[state=active]:bg-primary-50 hover:data-[state=active]:bg-primary-100");
const formatConversationDate = (isoDateStr)=>{
    const date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(isoDateStr);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isToday"])(date)) return "Today";
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isYesterday"])(date)) return "Yesterday";
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(date, "MMM dd") // e.g., "Jun 23"
    ;
};
const [ChatsContextProvider, useChatsContext] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    displayName: "ChatsContext"
});
const UserDetail = ({ conversation, className, variant = "default", pinned, onPinnedChange, starred, onStarredChange, onMarkUnread, onArchive, onSpam, onTrash, onCheckedChange, checked: checkedProp })=>{
    _s();
    const { onChatPinned, showPinnedIcon, onChatChecked, checkedChats } = useChatsContext();
    const { isOnline } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOnlineUsers"])();
    // Avatar dot reflects whether the OTHER 1:1 participant is currently
    // present on the global presence:online channel. Group conversations:
    // show online if any non-self participant is online.
    const me = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentUser"])()?.id;
    const otherId = me ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$conversation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getOtherParticipantId"])(conversation, me) : undefined;
    const showOnlineDot = conversation.isGroup ? (conversation.participantIds ?? []).some((id)=>id !== me && isOnline(id)) : isOnline(otherId);
    //jwt token
    const jwtToken = (()=>{
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const Cookies = __turbopack_context__.r("[project]/node_modules/js-cookie/dist/js.cookie.js [app-client] (ecmascript)");
        return Cookies.get("access_token") || Cookies.get("accessToken") || localStorage.getItem("token") || null;
    })();
    const [isPinned, setIsPinned] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        defaultValue: false,
        value: pinned,
        onChange: {
            "UserDetail.useControllableState": async (value)=>{
                onPinnedChange?.(value);
                onChatPinned(value);
                try {
                    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/${conversation.id}/pin`, {
                        method: value ? "POST" : "DELETE",
                        headers: jwtToken ? {
                            Authorization: `Bearer ${jwtToken}`
                        } : {}
                    });
                } catch (err) {
                    console.error("Failed to toggle pin on server", err);
                    // Revert UI if server failed
                    const reverted = !value;
                    setIsPinned(reverted);
                    onPinnedChange?.(reverted);
                    onChatPinned(reverted);
                }
            }
        }["UserDetail.useControllableState"]
    });
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        defaultValue: false,
        value: checkedProp,
        onChange: {
            "UserDetail.useControllableState": (value)=>{
                if (typeof value === "boolean") {
                    onChatChecked(value);
                    onCheckedChange?.(conversation.id, value);
                }
            }
        }["UserDetail.useControllableState"]
    });
    const [open, toggle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    const showCheckbox = checkedChats > 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(chatVariants({
            className
        }), conversation.markedUnread && "bg-primary-25"),
        "data-state": variant,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-3.5 group",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Avatar"], {
                        size: "md",
                        className: "hover:ring-0 active:ring-primary-100",
                        isOnline: showOnlineDot,
                        containerClassName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group-hover:hidden", showCheckbox && "hidden"),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                src: conversation.participantAvatarUrl || undefined,
                                alt: conversation.participantUsername || "User"
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 194,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvatarFallbackIcon"], {}, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/chat.tsx",
                        lineNumber: 185,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        onClick: (e)=>e.stopPropagation(),
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("size-10 rounded-full bg-white group-hover:inline-flex shrink-0 justify-center items-center hidden", showCheckbox && "inline-flex"),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$checkbox$2f$checkbox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Checkbox"], {
                            size: "md",
                            onCheckedChange: setSelected,
                            checked: selected
                        }, void 0, false, {
                            fileName: "[project]/components/chat.tsx",
                            lineNumber: 207,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/chat.tsx",
                        lineNumber: 200,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/chat.tsx",
                lineNumber: 184,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pr-3.5 flex flex-col flex-auto min-w-0 gap-y-0.5 items-start py-[18px] border-b border-gray-200 relative",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex self-stretch items-center justify-between gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group-data-[state=active]/chat:font-bold text-[13px] leading-[18.88px] text-dark-blue-400 min-w-0 flex-1 truncate", conversation.markedUnread ? "font-semibold group-hover/chat:font-bold" : "font-medium"),
                                children: conversation.participantUsername || "Unknown"
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 216,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("transition duration-300 shrink-0 group-data-[state=active]/chat:font-bold group-hover/chat:opacity-0 opacity-100 text-xs leading-[14.52px] text-dark-blue-400", conversation.markedUnread ? "font-semibold" : "font-medium"),
                                children: formatConversationDate(conversation.createdAt)
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 223,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                modal: false,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: (e)=>e.stopPropagation(),
                                            className: "absolute top-[13.73px] right-[15px] size-[27px] hidden group-hover/chat:inline-flex data-[state=open]:inline-flex justify-center items-center focus-visible:outline-none text-gray-500 transition-opacity duration-300 group-hover/chat:opacity-100 data-[state=open]:opacity-100 opacity-0 rounded-full hover:text-dark-blue-500 hover:bg-primary-50",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MoreHorizontal"], {
                                                className: "size-[15px]"
                                            }, void 0, false, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 236,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 232,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/chat.tsx",
                                        lineNumber: 231,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                        onClick: (e)=>e.stopPropagation(),
                                        className: "min-w-[142px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100",
                                        align: "end",
                                        side: "bottom",
                                        sideOffset: 4,
                                        avoidCollisions: false,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>onMarkUnread?.(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EyeOff"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 249,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " ",
                                                    conversation.markedUnread ? "Mark as Read" : "Mark Unread"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 248,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>onSpam?.(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertCircle"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 252,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " ",
                                                    conversation.isSpam ? "Move to Inbox" : "Move to Spam"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 251,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>setIsPinned((prev)=>!prev),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pin02"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 256,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " ",
                                                    isPinned ? "Unpin" : "Pin"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 255,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>onArchive?.(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Archive"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 260,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " ",
                                                    conversation.isArchived ? "Unarchive" : "Archive"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 259,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 263,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " Block / Report"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 262,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 265,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                visual: conversation.isTrashed ? undefined : "destructive",
                                                onSelect: ()=>conversation.isTrashed ? onTrash?.() : toggle(),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 270,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " ",
                                                    conversation.isTrashed ? "Restore" : "Delete Chat"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 266,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/chat.tsx",
                                        lineNumber: 240,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 230,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
                                open: open,
                                onOpenChange: toggle,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                                    className: "max-w-[348px] p-7 rounded-xl",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                            children: "Delete this chat?"
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 277,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                            className: "mt-2",
                                            children: "This chat will be moved to Trash. You can restore it later from the Trash filter."
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 278,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-8 grid grid-cols-2 gap-x-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogClose"], {
                                                    asChild: true,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                        visual: "gray",
                                                        variant: "outlined",
                                                        children: "Cancel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 283,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/chat.tsx",
                                                    lineNumber: 282,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    onClick: ()=>{
                                                        onTrash?.();
                                                        toggle();
                                                    },
                                                    children: "Yes, Delete"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/chat.tsx",
                                                    lineNumber: 287,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 281,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/chat.tsx",
                                    lineNumber: 276,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 275,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            isPinned && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pin02"], {
                                className: "size-4 absolute shrink-0 text-primary-500 fill-primary-500 top-[3px] right-1"
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 293,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/chat.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-x-1.5 self-stretch items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group-data-[state=active]/chat:text-dark-blue-500 text-[11px] line-clamp-2 leading-[13.31px] flex-1 min-w-0 break-words [overflow-wrap:anywhere] group-data-[state=active]/chat:font-medium", conversation.markedUnread ? "text-dark-blue-400 font-medium" : "text-gray-500"),
                                children: conversation.lastMessagePreview || conversation.lastMessage?.m_content || (conversation.lastMessage?.m_ciphertext ? "Encrypted message" : "No messages yet")
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 298,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "shrink-0",
                                children: conversation.markedUnread && !starred ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                            visual: "primary",
                                            className: "inline-flex rounded-full size-[22px] shrink-0 group-hover/chat:hidden",
                                            children: "•"
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 310,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "hidden group-hover/chat:block",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FavoriteRoot"], {
                                                value: false,
                                                onValueChange: (next)=>{
                                                    onStarredChange?.(next);
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/${conversation.id}/star`, {
                                                        method: "POST",
                                                        headers: jwtToken ? {
                                                            Authorization: `Bearer ${jwtToken}`
                                                        } : {}
                                                    }).catch((err)=>{
                                                        console.error("Failed to toggle star", err);
                                                        onStarredChange?.(!next);
                                                    });
                                                },
                                                children: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Favorite"], {
                                                        onClick: (e)=>e.stopPropagation(),
                                                        className: "fill-transparent transition duration-300 size-[22px] text-dark-blue-400/50 hover:text-dark-blue-400/50",
                                                        starClassName: "size-[18px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/chat.tsx",
                                                        lineNumber: 331,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/chat.tsx",
                                                lineNumber: 317,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 316,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FavoriteRoot"], {
                                    value: starred ?? false,
                                    onValueChange: (next)=>{
                                        onStarredChange?.(next);
                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/${conversation.id}/star`, {
                                            method: next ? "POST" : "DELETE",
                                            headers: jwtToken ? {
                                                Authorization: `Bearer ${jwtToken}`
                                            } : {}
                                        }).catch((err)=>{
                                            console.error("Failed to toggle star", err);
                                            onStarredChange?.(!next);
                                        });
                                    },
                                    children: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Favorite"], {
                                            onClick: (e)=>e.stopPropagation(),
                                            className: "fill-transparent transition duration-300 size-[22px] text-dark-blue-400/50 hover:text-dark-blue-400/50",
                                            starClassName: "size-[18px]"
                                        }, void 0, false, {
                                            fileName: "[project]/components/chat.tsx",
                                            lineNumber: 355,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/chat.tsx",
                                    lineNumber: 341,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/chat.tsx",
                                lineNumber: 307,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/chat.tsx",
                        lineNumber: 297,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/chat.tsx",
                lineNumber: 214,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/chat.tsx",
        lineNumber: 183,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(UserDetail, "Ov7xMR+8pfTK/TxSzkVC1Og1TdA=", false, function() {
    return [
        useChatsContext,
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOnlineUsers"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"]
    ];
});
_c = UserDetail;
const Chat = ({ conversation, variant, className, onClick, pinned: pinnedProp, starred, onStarredChange, onMarkUnread, onArchive, onSpam, onTrash, onCheckedChange, checked })=>{
    _s1();
    const { showPinnedIcon } = useChatsContext();
    const [localPinned, setLocalPinned] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const isPinned = pinnedProp ?? localPinned;
    const setIsPinned = (v)=>setLocalPinned(v);
    const detailProps = {
        pinned: isPinned,
        onPinnedChange: setIsPinned,
        starred,
        onStarredChange,
        onMarkUnread,
        onArchive,
        onSpam,
        onTrash,
        onCheckedChange,
        checked,
        variant,
        className,
        conversation,
        name: conversation.participantUsername || "Unknown"
    };
    if (showPinnedIcon) {
        return isPinned ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            onClick: onClick,
            className: "cursor-pointer hover:bg-gray-100 rounded-md",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(UserDetail, {
                ...detailProps
            }, void 0, false, {
                fileName: "[project]/components/chat.tsx",
                lineNumber: 410,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/chat.tsx",
            lineNumber: 409,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0)) : null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        onClick: onClick,
        className: "cursor-pointer hover:bg-gray-100 rounded-md",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(UserDetail, {
            ...detailProps
        }, void 0, false, {
            fileName: "[project]/components/chat.tsx",
            lineNumber: 417,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/chat.tsx",
        lineNumber: 416,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s1(Chat, "dNYOACmPc9OP2JNr69J6eX7eY9g=", false, function() {
    return [
        useChatsContext
    ];
});
_c1 = Chat;
var _c, _c1;
__turbopack_context__.k.register(_c, "UserDetail");
__turbopack_context__.k.register(_c1, "Chat");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/inbox-comps.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EditContextProvider",
    ()=>EditContextProvider,
    "useEditContext",
    ()=>useEditContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/react-utils.ts [app-client] (ecmascript)");
"use client";
;
const [EditContextProvider, useEditContext] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    displayName: "EditContext"
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/emoji-picker.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmojiPicker",
    ()=>EmojiPicker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$data$2f$emojis$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/data/emojis.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/constants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/hooks.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useAsync$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useAsync$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useAsync.js [app-client] (ecmascript) <export default as useAsync>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input-group/input-group.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input-element.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/popover/popover.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/scroll-aria/scroll-area.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tabs/tabs.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
const ViewEmoji = ({ emoji })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: `https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/${(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emojiUnified"])(emoji)}.png`,
        alt: emoji[__TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmojiProperties"].name].join(" "),
        className: "size-6 object-contain"
    }, void 0, false, {
        fileName: "[project]/components/emoji-picker.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = ViewEmoji;
const EmojiPickerImpl = ({ onEmojiSelect, onGifSelect, children, align = "start", side = "top" })=>{
    _s();
    const [query, setQuery] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]("");
    const [tab, setTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useUncontrolledState"])({
        defaultValue: "emojis",
        onChange: {
            "EmojiPickerImpl.useUncontrolledState": ()=>{
                setQuery("");
            }
        }["EmojiPickerImpl.useUncontrolledState"]
    });
    const [suggestions, setSuggestions] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]([]);
    const [url, setUrl] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]("https://g.tenor.com/v1/trending?key=LIVDSRZULELA");
    const handleEmojiClick = (emoji)=>{
        setSuggestions((prev)=>prev.includes(emoji) ? prev : [
                ...prev,
                emoji
            ]);
        onEmojiSelect?.(emoji);
    };
    const handleGifClick = (gif)=>{
        onGifSelect?.(gif);
    };
    const filteredEmojis = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "EmojiPickerImpl.useMemo[filteredEmojis]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keys"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["omit"])(__TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["configByCategory"], __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Categories"].CUSTOM, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Categories"].SUGGESTED)).reduce({
                "EmojiPickerImpl.useMemo[filteredEmojis]": (prev, current)=>{
                    const values = __TURBOPACK__imported__module__$5b$project$5d2f$data$2f$emojis$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emojis"][current].reduce({
                        "EmojiPickerImpl.useMemo[filteredEmojis].values": (prev, current)=>current[__TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmojiProperties"].name].join(" ").includes(query) ? [
                                ...prev,
                                current
                            ] : prev
                    }["EmojiPickerImpl.useMemo[filteredEmojis].values"], []);
                    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsNotEmpty"])(values) ? {
                        ...prev,
                        [current]: values
                    } : prev;
                }
            }["EmojiPickerImpl.useMemo[filteredEmojis]"], {})
    }["EmojiPickerImpl.useMemo[filteredEmojis]"], [
        query
    ]);
    const handleChange = (event)=>{
        const { target: { value } } = event;
        setQuery(value);
        onUrlChange(value);
    };
    const onUrlChange = (query)=>{
        const searchParams = new URLSearchParams();
        searchParams.append("key", "LIVDSRZULELA");
        searchParams.append("q", query);
        searchParams.append("limit", "20");
        setUrl("https://g.tenor.com/v1/search?" + searchParams.toString());
    };
    const { value } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useAsync$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useAsync$3e$__["useAsync"])({
        "EmojiPickerImpl.useAsync": async ()=>{
            const response = await fetch(url);
            return response.json();
        }
    }["EmojiPickerImpl.useAsync"], [
        url
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Popover"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PopoverTrigger"], {
                asChild: true,
                children: children
            }, void 0, false, {
                fileName: "[project]/components/emoji-picker.tsx",
                lineNumber: 156,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PopoverContent"], {
                align: align,
                side: side,
                sideOffset: 10,
                className: "w-[344px] rounded-[12px] p-4 shadow-[0px_4px_12px_rgba(0,0,0,0.08)] bg-white border border-gray-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tabs"], {
                    value: tab,
                    onValueChange: setTab,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-2.5",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsList"], {
                                    className: "justify-start px-0 border-transparent",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                            value: "emojis",
                                            children: "Emojis"
                                        }, void 0, false, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 166,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                            value: "gifs",
                                            children: "GIFs"
                                        }, void 0, false, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 167,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/emoji-picker.tsx",
                                    lineNumber: 165,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InputGroup"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                            className: "h-[30px] text-xs rounded-[5px] leading-5 pl-3 pr-6",
                                            type: "text",
                                            placeholder: "Search",
                                            onChange: handleChange,
                                            value: query
                                        }, void 0, false, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 171,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InputRightElement"], {
                                            className: "w-6 justify-start",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SearchMd"], {
                                                className: "size-4 text-gray-400"
                                            }, void 0, false, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 179,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 178,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/emoji-picker.tsx",
                                    lineNumber: 170,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/emoji-picker.tsx",
                            lineNumber: 164,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "emojis",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-2.5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                    className: "h-[180px]",
                                    scrollBar: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollBar"], {
                                        className: "w-4 p-1"
                                    }, void 0, false, {
                                        fileName: "[project]/components/emoji-picker.tsx",
                                        lineNumber: 187,
                                        columnNumber: 28
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2.5",
                                        children: [
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsNotEmpty"])(suggestions) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2.5",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "text-xs leading-[14.52px] font-medium text-dark-blue-400",
                                                        children: __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["configByCategory"][__TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Categories"].SUGGESTED].name
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/emoji-picker.tsx",
                                                        lineNumber: 192,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2.5 flex-wrap",
                                                        children: suggestions.map((emoji)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                className: "focus-visible:outline-none",
                                                                onClick: ()=>handleEmojiClick(emoji),
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ViewEmoji, {
                                                                    emoji: emoji
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/emoji-picker.tsx",
                                                                    lineNumber: 203,
                                                                    columnNumber: 29
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emojiUnified"])(emoji), false, {
                                                                fileName: "[project]/components/emoji-picker.tsx",
                                                                lineNumber: 198,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0)))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/emoji-picker.tsx",
                                                        lineNumber: 196,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 191,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["keys"])(filteredEmojis).map((key)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-2.5",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                            className: "text-xs leading-[14.52px] font-medium text-dark-blue-400",
                                                            children: __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["configByCategory"][key].name
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/emoji-picker.tsx",
                                                            lineNumber: 212,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        filteredEmojis[key] && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2.5 flex-wrap",
                                                            children: filteredEmojis[key].map((emoji)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    className: "focus-visible:outline-none",
                                                                    onClick: ()=>handleEmojiClick(emoji),
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ViewEmoji, {
                                                                        emoji: emoji
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/emoji-picker.tsx",
                                                                        lineNumber: 224,
                                                                        columnNumber: 31
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                }, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["emojiUnified"])(emoji), false, {
                                                                    fileName: "[project]/components/emoji-picker.tsx",
                                                                    lineNumber: 219,
                                                                    columnNumber: 29
                                                                }, ("TURBOPACK compile-time value", void 0)))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/emoji-picker.tsx",
                                                            lineNumber: 217,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, key, true, {
                                                    fileName: "[project]/components/emoji-picker.tsx",
                                                    lineNumber: 211,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0)))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/emoji-picker.tsx",
                                        lineNumber: 189,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/emoji-picker.tsx",
                                    lineNumber: 185,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/emoji-picker.tsx",
                                lineNumber: 184,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/emoji-picker.tsx",
                            lineNumber: 183,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: "gifs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-2.5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-1 overflow-x-auto scrollbar-none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2",
                                                onClick: ()=>onUrlChange("Exited"),
                                                children: "Exited"
                                            }, void 0, false, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 238,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2",
                                                onClick: ()=>onUrlChange("Vacation"),
                                                children: "Vacation"
                                            }, void 0, false, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 244,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2",
                                                onClick: ()=>onUrlChange("Holiday"),
                                                children: "Holiday"
                                            }, void 0, false, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 250,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "border border-gray-300 shrink-0 inline-flex items-center bg-[#F8F9FC] rounded-full focus-visible:outline-none h-[22px] text-[10px] leading-[18px] text-dark-blue-400 px-2",
                                                onClick: ()=>onUrlChange("Laughing"),
                                                children: "Laughing"
                                            }, void 0, false, {
                                                fileName: "[project]/components/emoji-picker.tsx",
                                                lineNumber: 256,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/emoji-picker.tsx",
                                        lineNumber: 237,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/emoji-picker.tsx",
                                    lineNumber: 236,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-2.5",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                        className: "h-[180px]",
                                        scrollBar: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollBar"], {
                                            className: "w-4 p-1"
                                        }, void 0, false, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 267,
                                            columnNumber: 28
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-2 gap-x-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid gap-y-1",
                                                    children: value?.results.slice(0, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMiddleIndex"])(value.results)).map((gif)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleGifClick(gif),
                                                            className: "focus-visible:outline-none",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                src: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["first"])(gif.media).gif.url,
                                                                className: "object-contain",
                                                                alt: gif.content_description
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/emoji-picker.tsx",
                                                                lineNumber: 279,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, gif.id, false, {
                                                            fileName: "[project]/components/emoji-picker.tsx",
                                                            lineNumber: 274,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/emoji-picker.tsx",
                                                    lineNumber: 270,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "grid gap-y-1",
                                                    children: value?.results.slice((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMiddleIndex"])(value.results)).map((gif)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleGifClick(gif),
                                                            className: "focus-visible:outline-none",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                                src: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["first"])(gif.media).gif.url,
                                                                className: "object-contain",
                                                                alt: gif.content_description
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/emoji-picker.tsx",
                                                                lineNumber: 296,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, gif.id, false, {
                                                            fileName: "[project]/components/emoji-picker.tsx",
                                                            lineNumber: 291,
                                                            columnNumber: 25
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/emoji-picker.tsx",
                                                    lineNumber: 287,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/emoji-picker.tsx",
                                            lineNumber: 269,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/emoji-picker.tsx",
                                        lineNumber: 265,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/emoji-picker.tsx",
                                    lineNumber: 264,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/emoji-picker.tsx",
                            lineNumber: 235,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/emoji-picker.tsx",
                    lineNumber: 163,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/emoji-picker.tsx",
                lineNumber: 157,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/emoji-picker.tsx",
        lineNumber: 155,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(EmojiPickerImpl, "b2KdIYhCQ21iBEOK4RNI6mC/ek8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useUncontrolledState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useAsync$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useAsync$3e$__["useAsync"]
    ];
});
_c1 = EmojiPickerImpl;
const EmojiPicker = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"](EmojiPickerImpl, (prev, next)=>prev.onEmojiSelect === next.onEmojiSelect && prev.onGifSelect === next.onGifSelect && prev.align === next.align && prev.side === next.side);
_c2 = EmojiPicker;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "ViewEmoji");
__turbopack_context__.k.register(_c1, "EmojiPickerImpl");
__turbopack_context__.k.register(_c2, "EmojiPicker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toggle-group/toggle-group.tsx [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ToggleGroupItem",
    ()=>ToggleGroupItem,
    "ToggleGroupRoot",
    ()=>ToggleGroupRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ark$2d$ui$2f$react$2f$dist$2f$components$2f$toggle$2d$group$2f$toggle$2d$group$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ToggleGroup$3e$__ = __turbopack_context__.i("[project]/node_modules/@ark-ui/react/dist/components/toggle-group/toggle-group.js [app-client] (ecmascript) <export * as ToggleGroup>");
;
;
;
;
const ToggleGroupRoot = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].forwardRef(_c = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ark$2d$ui$2f$react$2f$dist$2f$components$2f$toggle$2d$group$2f$toggle$2d$group$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ToggleGroup$3e$__["ToggleGroup"].Root, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center border gap-x-1 p-1 border-gray-200 bg-gray-100 rounded-lg", className),
        ...props,
        ref: ref
    }, void 0, false, {
        fileName: "[project]/components/ui/toggle-group/toggle-group.tsx",
        lineNumber: 9,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c1 = ToggleGroupRoot;
ToggleGroupRoot.displayName = "ToggleGroup";
const ToggleGroupItem = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].forwardRef(_c2 = ({ className, ...props }, ref)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$ark$2d$ui$2f$react$2f$dist$2f$components$2f$toggle$2d$group$2f$toggle$2d$group$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ToggleGroup$3e$__["ToggleGroup"].Item, {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-9 text-sm transition duration-300 leading-5 px-3 font-semibold focus-visible:outline-none shrink-0 inline-flex items-center gap-x-2 justify-center text-gray-500 data-[focus]:bg-white data-[state=on]:shadow-[0px_1px_2px_0px_rgba(16,24,40,.06)_0px_1px_3px_0px_rgba(16,24,40,.1)] py-3 rounded-md data-[state=on]:bg-white", className),
        ...props,
        ref: ref
    }, void 0, false, {
        fileName: "[project]/components/ui/toggle-group/toggle-group.tsx",
        lineNumber: 25,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0)));
_c3 = ToggleGroupItem;
ToggleGroupItem.displayName = "ToggleGroupItem";
;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "ToggleGroupRoot$React.forwardRef");
__turbopack_context__.k.register(_c1, "ToggleGroupRoot");
__turbopack_context__.k.register(_c2, "ToggleGroupItem$React.forwardRef");
__turbopack_context__.k.register(_c3, "ToggleGroupItem");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/toggle-group/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$toggle$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/toggle-group/toggle-group.tsx [app-client] (ecmascript) <locals>");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/spinner/spinner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Spinner",
    ()=>Spinner,
    "SpinnerPositioner",
    ()=>SpinnerPositioner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$portal$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-portal/dist/index.mjs [app-client] (ecmascript)");
;
;
;
const Spinner = (props)=>{
    const { size = 58, strokeWidth = 8, value = 80, trackClassName, className } = props;
    const radius = (size - strokeWidth) / 2;
    const circumference = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computeCircumference"])(radius);
    const strokeDashArray = `${(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computePercentage"])(circumference, value)} ${circumference - (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["computePercentage"])(circumference, value)}`;
    const style = `
    .blend-metrics-spinner {
      stroke-dashoffset: 0;
      animation: blend-metrics-spin 700ms linear infinite;
    }
    @keyframes blend-metrics-spin {
      to {
        stroke-dashoffset: ${circumference};
      }
    }
  `;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: size,
        height: size,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fill-none stroke-gray-200", trackClassName),
                cx: size / 2,
                cy: size / 2,
                r: radius,
                strokeWidth: strokeWidth
            }, void 0, false, {
                fileName: "[project]/components/ui/spinner/spinner.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: style
            }, void 0, false, {
                fileName: "[project]/components/ui/spinner/spinner.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fill-none stroke-primary-500 blend-metrics-spinner", className),
                cx: size / 2,
                cy: size / 2,
                r: radius,
                opacity: value === 0 ? 0 : undefined,
                strokeLinecap: "round",
                strokeWidth: strokeWidth,
                strokeDasharray: strokeDashArray
            }, void 0, false, {
                fileName: "[project]/components/ui/spinner/spinner.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/spinner/spinner.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c = Spinner;
const SpinnerPositioner = ({ children })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$portal$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        className: "fixed inset-0 flex items-center z-50 justify-center bg-dark-blue-600/60 backdrop-blur-[8px]",
        children: children
    }, void 0, false, {
        fileName: "[project]/components/ui/spinner/spinner.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_c1 = SpinnerPositioner;
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Spinner");
__turbopack_context__.k.register(_c1, "SpinnerPositioner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_0hlaoor._.js.map