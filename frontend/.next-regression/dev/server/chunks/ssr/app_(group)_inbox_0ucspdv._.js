module.exports = [
"[project]/app/(group)/inbox/hooks/use-file-upload.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useFileUpload",
    ()=>useFileUpload
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const API_BASE_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:4100/api") || ("TURBOPACK compile-time value", "http://127.0.0.1:4100") || "http://localhost:3002/api";
function useFileUpload(token, privateKey, isGroup = false) {
    return async function uploadFile(conversationId, file, textMessage) {
        if (!conversationId || !token || !file) {
            throw new Error("Missing required parameters for file upload");
        }
        console.log("Starting file upload:", {
            conversationId,
            fileName: file.name,
            fileSize: file.size,
            hasTextMessage: !!textMessage
        });
        // 1) Get or fetch the AES key (same logic as useSendMessage)
        let key;
        try {
            key = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(conversationId);
            console.log("Loaded existing AES key for file upload");
        } catch  {
            console.log("No key found for file upload, fetching from server...");
            if (!privateKey) {
                throw new Error("No private key available for file upload");
            }
            const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/messaging/conversations/${conversationId}/key?isGroup=${isGroup}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // Decrypt the wrapped key
            const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
            const rawBuffer = await crypto.subtle.decrypt({
                name: "RSA-OAEP"
            }, privateKey, wrapped);
            key = new Uint8Array(rawBuffer);
            // Cache it
            const b64 = btoa(String.fromCharCode(...key));
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(conversationId, b64);
        }
        // 2) Encrypt the text message if provided
        if (!textMessage) {
            textMessage = "";
        }
        let encryptedText = "";
        if (textMessage && textMessage.trim()) {
            encryptedText = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptAES"])(textMessage.trim(), key);
        }
        // 3) Create FormData
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversationId", conversationId);
        if (encryptedText) {
            formData.append("ciphertext", encryptedText); // Send encrypted text, not plain text
        }
        // Log FormData contents
        // for (const [key, value] of formData.entries()) {
        //   if (value instanceof File) {
        //   } else {
        //     console.log(`${key}:`, value)
        //   }
        // }
        try {
            const response = await fetch(`${API_BASE_URL}/messaging/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("File upload failed:", response.status, errorText);
                throw new Error(`Upload failed: ${response.status}`);
            }
            const result = await response.json();
            console.log("File upload successful:", result);
            return result;
        } catch (error) {
            console.error("File upload error:", error);
            throw error;
        }
    };
}
}),
"[project]/app/(group)/inbox/hooks/use-cloud-picker.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "downloadOneDriveItems",
    ()=>downloadOneDriveItems,
    "getOneDriveToken",
    ()=>getOneDriveToken,
    "listOneDriveFolder",
    ()=>listOneDriveFolder,
    "openDropboxChooser",
    ()=>openDropboxChooser,
    "openGoogleDrivePicker",
    ()=>openGoogleDrivePicker
]);
"use client";
// Cloud file pickers for Google Drive, Dropbox, and OneDrive.
// Each function opens the vendor's JS picker, downloads the chosen file(s)
// into memory, and returns File objects ready to feed into the existing
// `uploadFile()` flow (which uploads to Cloudflare R2).
//
// Provisioning (all three must be registered before pickers work):
//  - Google Drive: Google Cloud Console → enable Drive API + Picker API,
//    create OAuth client ID (Web app) + API key. Add JS origins.
//    Env: NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY
//  - Dropbox: dropbox.com/developers/apps → Scoped access app.
//    Settings → Chooser/Saver domains: add app hostnames.
//    Env: NEXT_PUBLIC_DROPBOX_APP_KEY
//  - OneDrive: Azure Portal → App registrations → SPA redirect URIs match origin.
//    API permissions: Microsoft Graph → Files.Read (delegated).
//    Env: NEXT_PUBLIC_ONEDRIVE_CLIENT_ID
const loadScript = (src, attrs)=>new Promise((resolve, reject)=>{
        if (typeof document === "undefined") {
            reject(new Error("Cloud pickers require a browser environment"));
            return;
        }
        const existing = document.querySelector(`script[data-cloud-picker="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === "true") {
                resolve();
                return;
            }
            existing.addEventListener("load", ()=>resolve(), {
                once: true
            });
            existing.addEventListener("error", ()=>reject(new Error(`Failed to load ${src}`)), {
                once: true
            });
            return;
        }
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.dataset.cloudPicker = src;
        if (attrs) {
            for (const [k, v] of Object.entries(attrs))script.setAttribute(k, v);
        }
        script.addEventListener("load", ()=>{
            script.dataset.loaded = "true";
            resolve();
        }, {
            once: true
        });
        script.addEventListener("error", ()=>reject(new Error(`Failed to load ${src}`)), {
            once: true
        });
        document.head.appendChild(script);
    });
// In-memory Google token cache. Tokens live ~1h and are not persisted —
// a full page reload forces a fresh consent.
let googleToken = null;
const fetchAsFile = async (url, fileName, mimeType, headers)=>{
    const res = await fetch(url, headers ? {
        headers
    } : undefined);
    if (!res.ok) {
        throw new Error(`Download failed (${res.status}) for ${fileName}`);
    }
    const blob = await res.blob();
    return new File([
        blob
    ], fileName, {
        type: mimeType || blob.type || "application/octet-stream"
    });
};
async function openGoogleDrivePicker(onPicked) {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY;
    if (!clientId || !apiKey) {
        throw new Error("Google Drive not configured. Set NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY.");
    }
    await Promise.all([
        loadScript("https://apis.google.com/js/api.js"),
        loadScript("https://accounts.google.com/gsi/client")
    ]);
    const gapi = window.gapi;
    const google = window.google;
    if (!gapi || !google?.accounts?.oauth2) {
        throw new Error("Google picker libraries failed to initialize");
    }
    await new Promise((resolve, reject)=>{
        gapi.load("picker", {
            callback: ()=>resolve(),
            onerror: ()=>reject(new Error("gapi picker module failed to load"))
        });
    });
    // Reuse a cached token if still valid (with a 60s safety margin).
    let accessToken;
    if (googleToken && googleToken.expiresAt > Date.now() + 60_000) {
        accessToken = googleToken.value;
    } else {
        accessToken = await new Promise((resolve, reject)=>{
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                // drive.file is non-sensitive (no Google verification needed) and the
                // Picker UI lets users select any of their files — Google grants
                // per-file access on pick. This is the recommended scope for picker
                // flows. drive.readonly would require full app verification.
                scope: "https://www.googleapis.com/auth/drive.file",
                callback: (resp)=>{
                    if (resp.error) {
                        reject(new Error(resp.error_description || resp.error));
                        return;
                    }
                    googleToken = {
                        value: resp.access_token,
                        expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000
                    };
                    resolve(resp.access_token);
                }
            });
            tokenClient.requestAccessToken({
                prompt: ""
            });
        });
    }
    // setAppId is required for drive.file scope — it tells Google which app
    // the picker belongs to so the "granted file" record persists for the
    // follow-up Drive API download. Value is the numeric project ID (the
    // prefix of the client ID before the first '-').
    const appId = clientId.split("-")[0];
    const docs = await new Promise((resolve)=>{
        const picker = new google.picker.PickerBuilder().addView(google.picker.ViewId.DOCS).setAppId(appId).setOAuthToken(accessToken).setDeveloperKey(apiKey).enableFeature(google.picker.Feature.MULTISELECT_ENABLED).setCallback((data)=>{
            if (data.action === google.picker.Action.PICKED) {
                resolve(data.docs || []);
            } else if (data.action === google.picker.Action.CANCEL) {
                resolve([]);
            }
        }).build();
        picker.setVisible(true);
    });
    // Map Google native formats → export MIME type + filename extension.
    const GOOGLE_EXPORT = {
        "application/vnd.google-apps.document": {
            mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ext: "docx"
        },
        "application/vnd.google-apps.spreadsheet": {
            mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ext: "xlsx"
        },
        "application/vnd.google-apps.presentation": {
            mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ext: "pptx"
        },
        "application/vnd.google-apps.drawing": {
            mime: "image/png",
            ext: "png"
        }
    };
    if (docs.length === 0) return [];
    onPicked?.(docs.length);
    const files = [];
    for (const doc of docs){
        const exportTarget = GOOGLE_EXPORT[doc.mimeType];
        let url;
        let fileName;
        let downloadMime;
        if (exportTarget) {
            url = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=${encodeURIComponent(exportTarget.mime)}`;
            fileName = doc.name.endsWith(`.${exportTarget.ext}`) ? doc.name : `${doc.name}.${exportTarget.ext}`;
            downloadMime = exportTarget.mime;
        } else {
            url = `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`;
            fileName = doc.name;
            downloadMime = doc.mimeType;
        }
        files.push(await fetchAsFile(url, fileName, downloadMime, {
            Authorization: `Bearer ${accessToken}`
        }));
    }
    return files;
}
async function openDropboxChooser(onPicked) {
    const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;
    if (!appKey) {
        throw new Error("Dropbox not configured. Set NEXT_PUBLIC_DROPBOX_APP_KEY.");
    }
    await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
        id: "dropboxjs",
        "data-app-key": appKey
    });
    const Dropbox = window.Dropbox;
    if (!Dropbox?.choose) {
        throw new Error("Dropbox chooser failed to initialize");
    }
    const picked = await new Promise((resolve)=>{
        Dropbox.choose({
            success: (selection)=>resolve(selection),
            cancel: ()=>resolve([]),
            linkType: "direct",
            multiselect: true
        });
    });
    if (picked.length === 0) return [];
    onPicked?.(picked.length);
    const files = [];
    for (const item of picked){
        files.push(await fetchAsFile(item.link, item.name));
    }
    return files;
}
// In-memory MSAL state so repeat picks reuse the login without re-consenting.
let msalInstance = null;
let msalAccount = null;
const GRAPH_SCOPES = [
    "Files.Read",
    "User.Read"
];
async function getMsal(clientId) {
    if (msalInstance) return msalInstance;
    await loadScript("https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js");
    const msal = window.msal;
    if (!msal?.PublicClientApplication) {
        throw new Error("MSAL failed to load");
    }
    msalInstance = new msal.PublicClientApplication({
        auth: {
            clientId,
            // `common` accepts both personal MS accounts and any org tenant,
            // matching the Azure App Registration's multitenant+personal setting.
            authority: "https://login.microsoftonline.com/common",
            redirectUri: window.location.origin
        },
        cache: {
            cacheLocation: "sessionStorage"
        }
    });
    await msalInstance.initialize();
    return msalInstance;
}
async function acquireGraphToken(instance) {
    // 1) Silent with a cached account — fastest, no popup
    if (msalAccount) {
        try {
            const r = await instance.acquireTokenSilent({
                scopes: GRAPH_SCOPES,
                account: msalAccount
            });
            return {
                token: r.accessToken,
                account: r.account
            };
        } catch  {
        /* fall through */ }
    }
    // 2) ssoSilent — uses existing MS browser session cookies, no popup
    try {
        const r = await instance.ssoSilent({
            scopes: GRAPH_SCOPES
        });
        msalAccount = r.account;
        return {
            token: r.accessToken,
            account: r.account
        };
    } catch  {
    /* fall through */ }
    // 3) Interactive popup — consumes the user gesture
    const r = await instance.loginPopup({
        scopes: GRAPH_SCOPES
    });
    msalAccount = r.account;
    return {
        token: r.accessToken,
        account: r.account
    };
}
async function getOneDriveToken() {
    const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
    if (!clientId) {
        throw new Error("OneDrive not configured. Set NEXT_PUBLIC_ONEDRIVE_CLIENT_ID.");
    }
    const instance = await getMsal(clientId);
    return acquireGraphToken(instance);
}
async function listOneDriveFolder(token, folderId) {
    const base = folderId ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children` : `https://graph.microsoft.com/v1.0/me/drive/root/children`;
    // Request enough fields + ask for download URLs up front so we can skip
    // a second call for each file.
    const url = `${base}?$top=200&$select=id,name,size,folder,file,parentReference,lastModifiedDateTime,webUrl&$expand=thumbnails($select=small)`;
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        throw new Error(`OneDrive list failed (${res.status})`);
    }
    const body = await res.json();
    return body.value || [];
}
async function downloadOneDriveItems(items, token) {
    const files = [];
    for (const item of items){
        // `/me/drive/items/{id}/content` redirects to a pre-signed URL and
        // works whether the file lives in the personal drive root or a
        // sub-folder; no need to construct the driveId path manually.
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(item.id)}/content`;
        const res = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (!res.ok) {
            console.warn(`OneDrive download failed (${res.status}) for ${item.name}`);
            continue;
        }
        const blob = await res.blob();
        const mime = item.file?.mimeType || blob.type || "application/octet-stream";
        files.push(new File([
            blob
        ], item.name, {
            type: mime
        }));
    }
    return files;
}
}),
"[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OneDrivePickerDialog",
    ()=>OneDrivePickerDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/spinner/spinner.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-cloud-picker.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
function OneDrivePickerDialog({ open, onOpenChange, onPicked, onConfirm }) {
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [authError, setAuthError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [path, setPath] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([
        {
            id: null,
            name: "My files"
        }
    ]);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [downloading, setDownloading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const currentFolderId = path[path.length - 1]?.id ?? null;
    const authenticate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setAuthError(null);
        try {
            const { token: t } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOneDriveToken"])();
            setToken(t);
        } catch (err) {
            console.error("OneDrive auth failed:", err);
            setAuthError(err?.message || "Failed to sign in to OneDrive");
        }
    }, []);
    const loadFolder = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (folderId, authToken)=>{
        setLoading(true);
        try {
            const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["listOneDriveFolder"])(authToken, folderId);
            setItems(data);
        } catch (err) {
            console.error("OneDrive list failed:", err);
            setAuthError(err?.message || "Failed to list OneDrive items");
        } finally{
            setLoading(false);
        }
    }, []);
    // Reset state when the dialog closes.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open) {
            setSelected(new Set());
            setItems([]);
            setPath([
                {
                    id: null,
                    name: "My files"
                }
            ]);
            setAuthError(null);
            setDownloading(false);
        }
    }, [
        open
    ]);
    // Authenticate on first open if we don't have a token yet.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open) return;
        if (!token && !authError) authenticate();
    }, [
        open,
        token,
        authError,
        authenticate
    ]);
    // Load the current folder when token becomes available or folder changes.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open || !token) return;
        loadFolder(currentFolderId, token);
    }, [
        open,
        token,
        currentFolderId,
        loadFolder
    ]);
    const toggleSelect = (id)=>{
        setSelected((prev)=>{
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    const enterFolder = (item)=>{
        setPath((prev)=>[
                ...prev,
                {
                    id: item.id,
                    name: item.name
                }
            ]);
        setSelected(new Set());
    };
    const goTo = (index)=>{
        setPath((prev)=>prev.slice(0, index + 1));
        setSelected(new Set());
    };
    const handleConfirm = async ()=>{
        if (!token || selected.size === 0) return;
        const picked = items.filter((i)=>selected.has(i.id) && !i.folder);
        if (picked.length === 0) return;
        onPicked?.(picked.length);
        onOpenChange(false);
        setDownloading(true);
        try {
            const files = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["downloadOneDriveItems"])(picked, token);
            onConfirm(files);
        } catch (err) {
            console.error("OneDrive download failed:", err);
            onConfirm([]);
        } finally{
            setDownloading(false);
        }
    };
    const fileItems = items.filter((i)=>!i.folder);
    const folderItems = items.filter((i)=>i.folder);
    const pickableSelectedCount = fileItems.filter((f)=>selected.has(f.id)).length;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
            className: "max-w-[640px] p-0",
            accessibilityTitle: "OneDrive file picker",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between border-b border-gray-200 px-5 py-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-sm font-semibold text-gray-900",
                            children: "Upload from OneDrive"
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 140,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                            asChild: true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                visual: "gray",
                                variant: "ghost",
                                size: "sm",
                                className: "rounded-full",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 143,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                lineNumber: 142,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 141,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                    lineNumber: 139,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-x-1 px-5 py-2 text-xs text-gray-500",
                    children: path.map((crumb, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "inline-flex items-center gap-x-1",
                            children: [
                                i > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronRight"], {
                                    className: "size-3 text-gray-400"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 152,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: `hover:text-gray-800 ${i === path.length - 1 ? "font-semibold text-gray-900" : ""}`,
                                    onClick: ()=>goTo(i),
                                    disabled: i === path.length - 1,
                                    children: crumb.name
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 153,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, `${crumb.id ?? "root"}-${i}`, true, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 151,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                    lineNumber: 149,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "min-h-[320px] max-h-[420px] overflow-y-auto px-2 py-1",
                    children: [
                        authError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "m-3 rounded-md border border-error-200 bg-error-50 p-3 text-xs text-error-600",
                            children: [
                                authError,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "ml-2 font-semibold underline",
                                    onClick: authenticate,
                                    children: "Retry"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 170,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 168,
                            columnNumber: 13
                        }, this),
                        loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-center py-12 text-gray-400 gap-x-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                    size: 16,
                                    strokeWidth: 3
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 182,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs",
                                    children: "Loading…"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 183,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 181,
                            columnNumber: 13
                        }, this),
                        !loading && !authError && items.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-center py-12 text-gray-400 text-xs",
                            children: "This folder is empty."
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 188,
                            columnNumber: 13
                        }, this),
                        !loading && !authError && folderItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col",
                            children: folderItems.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "flex items-center gap-x-3 rounded-md px-3 py-2 text-left hover:bg-gray-50",
                                    onClick: ()=>enterFolder(f),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Folder"], {
                                            className: "size-5 text-primary-500 shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 202,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex-1 truncate text-sm text-gray-900",
                                            children: f.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 203,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronRight"], {
                                            className: "size-4 text-gray-400 shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 204,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, f.id, true, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 196,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 194,
                            columnNumber: 13
                        }, this),
                        !loading && !authError && fileItems.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col",
                            children: fileItems.map((f)=>{
                                const isSelected = selected.has(f.id);
                                const sizeLabel = formatSize(f.size);
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: `flex items-center gap-x-3 rounded-md px-3 py-2 cursor-pointer ${isSelected ? "bg-primary-50" : "hover:bg-gray-50"}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            className: "size-4 shrink-0 accent-primary-500",
                                            checked: isSelected,
                                            onChange: ()=>toggleSelect(f.id)
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 220,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File"], {
                                            className: "size-5 text-gray-500 shrink-0"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 226,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex-1 truncate text-sm text-gray-900",
                                            children: f.name
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 227,
                                            columnNumber: 21
                                        }, this),
                                        sizeLabel && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "shrink-0 text-[11px] text-gray-500",
                                            children: sizeLabel
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                            lineNumber: 229,
                                            columnNumber: 23
                                        }, this)
                                    ]
                                }, f.id, true, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 216,
                                    columnNumber: 19
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 211,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                    lineNumber: 166,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between border-t border-gray-200 px-5 py-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs text-gray-500",
                            children: pickableSelectedCount > 0 ? `${pickableSelectedCount} file${pickableSelectedCount === 1 ? "" : "s"} selected` : "Select one or more files"
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 240,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-x-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        visual: "gray",
                                        variant: "outlined",
                                        size: "sm",
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                        lineNumber: 247,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 246,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    size: "sm",
                                    disabled: pickableSelectedCount === 0 || downloading,
                                    onClick: handleConfirm,
                                    children: downloading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                        size: 14,
                                        strokeWidth: 3
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                        lineNumber: 256,
                                        columnNumber: 30
                                    }, this) : "Select"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                                    lineNumber: 251,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                            lineNumber: 245,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
                    lineNumber: 239,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
            lineNumber: 138,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx",
        lineNumber: 137,
        columnNumber: 5
    }, this);
}
function formatSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
}),
"[project]/app/(group)/inbox/hooks/use-group-encryption.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addParticipantToGroup",
    ()=>addParticipantToGroup,
    "encryptGroupKeyForUser",
    ()=>encryptGroupKeyForUser
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$api$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/api/user.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
;
;
;
;
;
async function encryptGroupKeyForUser(groupId, userId) {
    const aesKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(groupId);
    if (!aesKey) throw new Error("Group AES key not found in localStorage");
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
    if (!token) throw new Error("User token not found in localStorage");
    const publicKey = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$api$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRecipientPublicKey"])(userId, token);
    return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptWithPublicKey"])(aesKey, publicKey);
}
async function addParticipantToGroup(groupId, newUserId) {
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
    if (!token) throw new Error("No auth token");
    const encryptedGroupKey = await encryptGroupKeyForUser(groupId, newUserId);
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/${groupId}/participants`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: {
            userId: newUserId,
            encryptedGroupKey
        }
    });
}
}),
"[project]/app/(group)/inbox/hooks/use-edit-message.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useEditMessage",
    ()=>useEditMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function useEditMessage(token) {
    return async function edit(messageId, convId, plaintext) {
        if (!messageId || !convId || !token) {
            throw new Error("Missing message ID, conversation ID, or auth token");
        }
        const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(convId);
        if (!key) {
            throw new Error("Encryption key not available. Please wait and try again.");
        }
        const ciphertext = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptAES"])(plaintext, key);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/${messageId}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                ciphertext
            }
        });
    };
}
}),
"[project]/app/(group)/inbox/hooks/use-messages.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMessages",
    ()=>useMessages
]);
// src/hooks/useMessaging.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
;
;
;
function useMessages(convId, token, keyReady) {
    const [messages, setMessages] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setMessages([]);
        if (!convId || !token) {
            setLoading(false);
            return;
        }
        if (keyReady === false) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const ac = new AbortController();
        (async ()=>{
            try {
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/thread/${convId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    signal: ac.signal
                });
                if (ac.signal.aborted) return;
                let key = null;
                try {
                    key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(convId);
                } catch  {
                // no AES key cached yet
                }
                const decrypted = await Promise.all(data.map(async (m)=>{
                    const decryptIfNeeded = async (cipher)=>{
                        if (!cipher) return null;
                        if (!key) return "🔒 Encrypted message";
                        try {
                            return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(cipher, key);
                        } catch  {
                            return "🔒 Encrypted message";
                        }
                    };
                    const [content, quotedContent] = await Promise.all([
                        decryptIfNeeded(m.ciphertext),
                        decryptIfNeeded(m.quotedCiphertext)
                    ]);
                    return {
                        ...m,
                        content: content ?? m.content ?? "",
                        quotedContent
                    };
                }));
                if (ac.signal.aborted) return;
                setMessages(decrypted);
            } catch (err) {
                if (err?.name === "AbortError") return;
                console.error("useMessages error:", err);
            } finally{
                if (!ac.signal.aborted) setLoading(false);
            }
        })();
        return ()=>ac.abort();
    }, [
        convId,
        token,
        keyReady
    ]);
    return {
        messages,
        loading
    };
}
}),
"[project]/app/(group)/inbox/hooks/use-send-message.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useSendMessage",
    ()=>useSendMessage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
function useSendMessage(token, privateKey, isGroup = false) {
    /**
   * Encrypts & sends a new message.
   * @param convId   the conversation UUID
   * @param plaintext the message body
   */ return async function send(convId, plaintext, replyToMessageId) {
        if (!convId || !token) {
            throw new Error("Missing conversation ID or auth token");
        }
        // If no private key or no AES key available, send as plaintext fallback
        let key = null;
        try {
            key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(convId);
        } catch  {
        // no cached key
        }
        if (!key && privateKey) {
            try {
                const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/messaging/conversations/${convId}/key?isGroup=${isGroup}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
                const rawBuffer = await crypto.subtle.decrypt({
                    name: "RSA-OAEP"
                }, privateKey, wrapped);
                key = new Uint8Array(rawBuffer);
                const b64 = btoa(String.fromCharCode(...key));
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(convId, b64);
            } catch  {
            // key exchange not available yet, fall through to plaintext
            }
        }
        // Encrypt or fail — never send plaintext
        if (!key) {
            throw new Error("Encryption key not available. Please wait and try again.");
        }
        const ciphertext = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptAES"])(plaintext, key);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                threadId: convId,
                ciphertext,
                ...replyToMessageId && {
                    replyToMessageId
                }
            }
        });
    };
}
}),
"[project]/app/(group)/inbox/hooks/use-thread-actions.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useThreadActions",
    ()=>useThreadActions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
;
;
async function call(path, { method, token }) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(path, {
        method,
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
}
function useThreadActions(token) {
    // Thread-level pin (distinct from message-level pin)
    const pin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/pin`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const unpin = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/pin`, {
            method: "DELETE",
            token
        }), [
        token
    ]);
    // Star = favorite per AC §2
    const star = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/star`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const unstar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/star`, {
            method: "DELETE",
            token
        }), [
        token
    ]);
    const archive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/archive`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const unarchive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/archive`, {
            method: "DELETE",
            token
        }), [
        token
    ]);
    const markUnread = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/mark-unread`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const markRead = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/read`, {
            method: "PATCH",
            token
        }), [
        token
    ]);
    const spam = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/spam`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const unspam = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/spam`, {
            method: "DELETE",
            token
        }), [
        token
    ]);
    const trash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/trash`, {
            method: "POST",
            token
        }), [
        token
    ]);
    const untrash = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((threadId)=>call(`/v1/threads/${threadId}/trash`, {
            method: "DELETE",
            token
        }), [
        token
    ]);
    const bulk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((ids, action)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/bulk`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: {
                ids,
                action
            }
        }), [
        token
    ]);
    return {
        pin,
        unpin,
        star,
        unstar,
        archive,
        unarchive,
        markUnread,
        markRead,
        spam,
        unspam,
        trash,
        untrash,
        bulk
    };
}
}),
"[project]/app/(group)/inbox/components/forward-message-dialog.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ForwardMessageDialog",
    ()=>ForwardMessageDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2f$use$2d$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toast/use-toast.tsx [app-ssr] (ecmascript)");
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
const MAX_RECIPIENTS = 5;
/**
 * Highlight matching letters in bold (case-insensitive).
 * Renders nodes with <strong> for the matching portions.
 */ function HighlightMatch({ text, query }) {
    if (!query.trim()) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: text
    }, void 0, false);
    const q = query.trim().toLowerCase();
    const parts = [];
    let i = 0;
    const lower = text.toLowerCase();
    while(i < text.length){
        const idx = lower.indexOf(q, i);
        if (idx === -1) {
            parts.push(text.slice(i));
            break;
        }
        if (idx > i) parts.push(text.slice(i, idx));
        parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
            className: "font-bold text-dark-blue-400",
            children: text.slice(idx, idx + q.length)
        }, idx, false, {
            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
            lineNumber: 71,
            columnNumber: 7
        }, this));
        i = idx + q.length;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: parts
    }, void 0, false);
}
function formatMessageDate(iso) {
    try {
        const d = new Date(iso);
        const date = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
        const time = d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
        });
        return `${date} ${time}`;
    } catch  {
        return iso;
    }
}
function ForwardMessageDialog({ open, onOpenChange, message, currentUserId, currentUserProfile, receiverUser, privateKey }) {
    const { toast } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2f$use$2d$toast$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useToast"])();
    const [contacts, setContacts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [selectedIds, setSelectedIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [addedMessage, setAddedMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSending, setIsSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showLimitWarning, setShowLimitWarning] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isDropdownOpen, setIsDropdownOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const searchContainerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const inputRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    // Reset state when dialog opens
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open) return;
        setSelectedIds(new Set());
        setSearchQuery("");
        setAddedMessage("");
        setError(null);
        setShowLimitWarning(false);
        setIsDropdownOpen(false);
    }, [
        open
    ]);
    // Close dropdown when clicking outside the search container
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!isDropdownOpen) return;
        const handleClickOutside = (e)=>{
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return ()=>document.removeEventListener("mousedown", handleClickOutside);
    }, [
        isDropdownOpen
    ]);
    // Fetch recent contacts when dialog opens
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open) return;
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
        if (!token) return;
        setIsLoading(true);
        (async ()=>{
            try {
                const threads = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const contactList = [];
                const seen = new Set();
                for (const t of threads){
                    if (t.isGroup) continue;
                    const otherId = t.participantIds?.find((id)=>id !== currentUserId);
                    if (!otherId || seen.has(otherId)) continue;
                    seen.add(otherId);
                    try {
                        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/users/${otherId}`, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        const displayName = user.firstName?.trim() || user.username || "Unknown";
                        contactList.push({
                            userId: otherId,
                            threadId: t.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            username: user.username,
                            avatarUrl: user.avatarUrl,
                            displayName,
                            isOnline: true
                        });
                    } catch  {
                    // Skip failed lookups
                    }
                }
                setContacts(contactList);
            } catch (err) {
                console.error("[ForwardDialog] Failed to load contacts", err);
                setError("Failed to load contacts");
            } finally{
                setIsLoading(false);
            }
        })();
    }, [
        open,
        currentUserId
    ]);
    // Filter contacts by search query (exclude already-selected from dropdown)
    const filteredContacts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const q = searchQuery.trim().toLowerCase();
        return contacts.filter((c)=>{
            if (selectedIds.has(c.userId)) return false;
            if (!q) return true;
            return c.displayName.toLowerCase().includes(q) || (c.username || "").toLowerCase().includes(q);
        });
    }, [
        contacts,
        searchQuery,
        selectedIds
    ]);
    const selectedContacts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>contacts.filter((c)=>selectedIds.has(c.userId)), [
        contacts,
        selectedIds
    ]);
    const toggleSelect = (contact)=>{
        setShowLimitWarning(false);
        setSelectedIds((prev)=>{
            const next = new Set(prev);
            if (next.has(contact.userId)) {
                next.delete(contact.userId);
            } else {
                if (next.size >= MAX_RECIPIENTS) {
                    setShowLimitWarning(true);
                    return prev;
                }
                next.add(contact.userId);
            }
            return next;
        });
        setSearchQuery("");
        inputRef.current?.focus();
    };
    const removeSelected = (userId)=>{
        setSelectedIds((prev)=>{
            const next = new Set(prev);
            next.delete(userId);
            return next;
        });
    };
    const handleSend = async ()=>{
        if (!message || selectedIds.size === 0) return;
        const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
        if (!token) return;
        setIsSending(true);
        setError(null);
        try {
            let originalText = message.content || "";
            const sourceThreadId = message.threadId || message.conversationId;
            if (message.ciphertext && sourceThreadId) {
                let sourceKey = null;
                try {
                    sourceKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(sourceThreadId);
                } catch  {
                // source key not cached
                }
                if (!sourceKey && privateKey) {
                    try {
                        const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${sourceThreadId}/key?isGroup=false`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
                        const rawBuffer = await crypto.subtle.decrypt({
                            name: "RSA-OAEP"
                        }, privateKey, wrapped);
                        sourceKey = new Uint8Array(rawBuffer);
                        const b64 = btoa(String.fromCharCode(...sourceKey));
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(sourceThreadId, b64);
                    } catch (err) {
                        console.error("[ForwardDialog] Failed to fetch source conversation key", err);
                    }
                }
                if (!sourceKey) {
                    throw new Error("Encryption key unavailable for source message.");
                }
                originalText = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(message.ciphertext, sourceKey);
            } else if (originalText.trim() === "🔒 Encrypted message") {
                throw new Error("Source message is encrypted and unavailable for forwarding.");
            }
            for (const contact of selectedContacts){
                let key = null;
                try {
                    key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(contact.threadId);
                } catch  {
                // key not cached
                }
                if (!key && privateKey) {
                    try {
                        const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${contact.threadId}/key?isGroup=false`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
                        const rawBuffer = await crypto.subtle.decrypt({
                            name: "RSA-OAEP"
                        }, privateKey, wrapped);
                        key = new Uint8Array(rawBuffer);
                        const b64 = btoa(String.fromCharCode(...key));
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(contact.threadId, b64);
                    } catch (err) {
                        console.error("[ForwardDialog] Failed to fetch conversation key", err);
                    }
                }
                if (!key) {
                    throw new Error(`Encryption key unavailable for ${contact.displayName}. Cannot forward.`);
                }
                // Slack/Telegram-style: one message carries both the wrapper and the quoted original.
                const quotedCiphertext = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptAES"])(originalText, key);
                const wrapperCiphertext = addedMessage.trim() ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["encryptAES"])(addedMessage.trim(), key) : null;
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: {
                        threadId: contact.threadId,
                        ciphertext: wrapperCiphertext,
                        forwardedFromId: message.id,
                        quotedCiphertext
                    }
                });
            }
            onOpenChange(false);
            toast({
                title: "Message Forwarded",
                variant: "success"
            });
        } catch (err) {
            console.error("[ForwardDialog] Send failed", err);
            setError("Failed to forward message. Try again.");
        } finally{
            setIsSending(false);
        }
    };
    const getInitials = (c)=>c.displayName.charAt(0).toUpperCase() || "?";
    // Pick sender profile based on who sent the message being forwarded
    const isMyMessage = message?.senderId === currentUserId;
    const senderProfile = isMyMessage ? currentUserProfile : receiverUser;
    const senderFullName = senderProfile?.firstName?.trim() || (isMyMessage ? "Me" : "Unknown");
    const senderLabel = isMyMessage ? "Me" : senderFullName;
    const senderUsername = senderProfile?.username || "";
    const senderAvatarUrl = senderProfile?.avatarUrl || undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
            className: "max-w-[420px] p-0 rounded-xl shadow-2xl",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pt-6 pb-4 flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-base leading-6 font-semibold text-dark-blue-400",
                                children: "Forward Message"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 384,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    className: "text-gray-400 hover:text-gray-600 transition",
                                    "aria-label": "Close",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                        className: "size-4"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 393,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                    lineNumber: 388,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 387,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 383,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pb-3 relative",
                        ref: searchContainerRef,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: `min-h-[44px] px-2 py-1.5 border rounded-lg flex flex-wrap items-center gap-1.5 transition cursor-text ${isDropdownOpen ? "border-primary-500 ring-2 ring-primary-100" : "border-gray-300"}`,
                                onClick: ()=>{
                                    setIsDropdownOpen(true);
                                    inputRef.current?.focus();
                                },
                                children: [
                                    selectedContacts.map((c)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "inline-flex items-center gap-x-1 bg-gray-100 text-dark-blue-400 text-xs font-medium pl-0.5 pr-1.5 py-0.5 rounded-full",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                                    size: "xs",
                                                    className: "shrink-0 size-5",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                                            src: c.avatarUrl || undefined,
                                                            alt: c.displayName
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                            lineNumber: 417,
                                                            columnNumber: 21
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                                            delayMs: 0,
                                                            children: getInitials(c)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                            lineNumber: 418,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                    lineNumber: 416,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: [
                                                        c.displayName.split(" ")[0],
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-primary-500",
                                                            children: [
                                                                "@",
                                                                c.username
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                            lineNumber: 422,
                                                            columnNumber: 21
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                    lineNumber: 420,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: (e)=>{
                                                        e.stopPropagation();
                                                        removeSelected(c.userId);
                                                    },
                                                    className: "hover:bg-gray-200 rounded-full p-0.5 transition",
                                                    "aria-label": `Remove ${c.displayName}`,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                                        className: "size-3 text-gray-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                        lineNumber: 433,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, c.userId, true, {
                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                            lineNumber: 412,
                                            columnNumber: 17
                                        }, this)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex items-center flex-1 min-w-[120px] pl-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMd"], {
                                                className: "size-4 text-gray-400 shrink-0"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 438,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                ref: inputRef,
                                                type: "text",
                                                className: "flex-1 bg-transparent outline-none border-0 p-0 m-0 focus:ring-0 focus:outline-none text-sm placeholder:text-gray-400 min-w-0 ml-1.5",
                                                placeholder: "Find people",
                                                value: searchQuery,
                                                onChange: (e)=>{
                                                    setSearchQuery(e.target.value);
                                                    setIsDropdownOpen(true);
                                                },
                                                onFocus: ()=>setIsDropdownOpen(true),
                                                onKeyDown: (e)=>{
                                                    if (e.key === "Backspace" && searchQuery === "" && selectedContacts.length > 0) {
                                                        removeSelected(selectedContacts[selectedContacts.length - 1].userId);
                                                    }
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 439,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 437,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 400,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                                open: showLimitWarning,
                                onOpenChange: setShowLimitWarning,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                                    className: "max-w-[348px] shadow-xl p-6",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-xl bg-white",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                className: "text-lg leading-7 font-semibold text-gray-900",
                                                children: "Message Forwarding Limit"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 468,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-2 text-gray-500",
                                                children: [
                                                    "You can forward messages to",
                                                    " ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold text-gray-900",
                                                        children: [
                                                            "max ",
                                                            MAX_RECIPIENTS,
                                                            " people"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                        lineNumber: 473,
                                                        columnNumber: 21
                                                    }, this),
                                                    " ",
                                                    "at a time"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 471,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "mt-9",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    className: "w-full",
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    onClick: ()=>setShowLimitWarning(false),
                                                    children: "Ok"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                    lineNumber: 479,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 478,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 467,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                    lineNumber: 466,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 465,
                                columnNumber: 13
                            }, this),
                            isDropdownOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute left-6 right-6 top-full mt-1 z-30 bg-white rounded-lg shadow-xl border border-gray-200 max-h-[280px] overflow-y-auto",
                                children: [
                                    !searchQuery.trim() && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-500 uppercase tracking-wider",
                                        children: "Recent Contacts"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 498,
                                        columnNumber: 19
                                    }, this),
                                    isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-center py-6 text-gray-400 text-sm",
                                        children: "Loading contacts..."
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 504,
                                        columnNumber: 19
                                    }, this) : filteredContacts.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center justify-center py-6 text-gray-400 text-sm",
                                        children: searchQuery ? "No contacts match" : "No recent contacts"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 508,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "flex flex-col py-1",
                                        children: filteredContacts.map((contact)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: ()=>toggleSelect(contact),
                                                    className: "w-full flex items-center gap-x-3 px-4 py-2 hover:bg-gray-50 transition",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "relative shrink-0",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                                                    size: "sm",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                                                            src: contact.avatarUrl || undefined,
                                                                            alt: contact.displayName
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                            lineNumber: 524,
                                                                            columnNumber: 31
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                                                            delayMs: 0,
                                                                            children: getInitials(contact)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                            lineNumber: 528,
                                                                            columnNumber: 31
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                    lineNumber: 523,
                                                                    columnNumber: 29
                                                                }, this),
                                                                contact.isOnline && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-success-500 ring-2 ring-white"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                    lineNumber: 533,
                                                                    columnNumber: 31
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                            lineNumber: 522,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex-1 min-w-0 text-left text-sm text-dark-blue-400 truncate",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HighlightMatch, {
                                                                    text: contact.displayName,
                                                                    query: searchQuery
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                    lineNumber: 537,
                                                                    columnNumber: 29
                                                                }, this),
                                                                " ",
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-primary-500",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HighlightMatch, {
                                                                        text: `@${contact.username || ""}`,
                                                                        query: searchQuery
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                        lineNumber: 542,
                                                                        columnNumber: 31
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                                    lineNumber: 541,
                                                                    columnNumber: 29
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                            lineNumber: 536,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                    lineNumber: 517,
                                                    columnNumber: 25
                                                }, this)
                                            }, contact.userId, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 516,
                                                columnNumber: 23
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 514,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 496,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 399,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pb-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "border border-gray-300 rounded-lg px-3 py-2 min-h-[96px]",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                                className: "w-full bg-transparent outline-none border-0 p-0 m-0 focus:ring-0 focus:outline-none resize-none text-sm leading-5 placeholder:text-gray-400",
                                placeholder: "Add a message...",
                                rows: 3,
                                value: addedMessage,
                                onChange: (e)=>setAddedMessage(e.target.value)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 560,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                            lineNumber: 559,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 558,
                        columnNumber: 11
                    }, this),
                    message && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pb-4 border-l-2 border-primary-500 ml-6 mr-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                        size: "xs",
                                        className: "shrink-0 size-5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                                src: senderAvatarUrl,
                                                alt: senderLabel
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 575,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                                delayMs: 0,
                                                children: senderFullName.charAt(0).toUpperCase()
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                                lineNumber: 576,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 574,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-semibold text-dark-blue-400",
                                        children: senderLabel
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 580,
                                        columnNumber: 17
                                    }, this),
                                    senderUsername && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-primary-500",
                                        children: [
                                            "@",
                                            senderUsername
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                        lineNumber: 584,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 573,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1.5 text-sm text-dark-blue-400 line-clamp-3",
                                children: message.content || "(empty)"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 587,
                                columnNumber: 15
                            }, this),
                            message.createdAt && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-1 text-[11px] text-gray-500",
                                children: formatMessageDate(message.createdAt)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 591,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 572,
                        columnNumber: 13
                    }, this),
                    error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pb-2 text-xs text-error-500 text-center",
                        children: error
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 599,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-6 pb-6 pt-2 grid grid-cols-2 gap-x-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    visual: "gray",
                                    variant: "outlined",
                                    disabled: isSending,
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                    lineNumber: 607,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 606,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                visual: "primary",
                                variant: "filled",
                                disabled: selectedIds.size === 0 || isSending,
                                onClick: handleSend,
                                children: isSending ? "Sending..." : "Send"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                                lineNumber: 611,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                        lineNumber: 605,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
                lineNumber: 381,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
            lineNumber: 380,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/inbox/components/forward-message-dialog.tsx",
        lineNumber: 379,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/(group)/inbox/components/chats-comp.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Chats",
    ()=>Chats
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/keys.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/stories/inbox.stories.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useAblyChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useAblyChannel.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useAblyPresence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useAblyPresence.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useOnlineUsers.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useUserChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useUserChannel.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$brands$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/brands.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isSameDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isSameDay.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isToday.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/isYesterday.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMeasure$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__useMeasure$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useMeasure.js [app-ssr] (ecmascript) <export default as useMeasure>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/toggle-group/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$toggle$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/toggle-group/toggle-group.tsx [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$emoji$2d$picker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/emoji-picker.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/favorite/favorite.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input-group/input-group.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input-element.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/scroll-aria/scroll-area.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea/textarea.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tooltip/tooltip.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/spinner/spinner.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$file$2d$upload$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-file-upload.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-cloud-picker.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$onedrive$2d$picker$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/onedrive-picker-dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$group$2d$encryption$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-group-encryption.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$edit$2d$message$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-edit-message.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-messages.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$send$2d$message$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-send-message.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$thread$2d$actions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-thread-actions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$forward$2d$message$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/forward-message-dialog.tsx [app-ssr] (ecmascript)");
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
;
;
;
;
;
;
const formatDateSeparator = (iso)=>{
    const d = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(iso);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isToday$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isToday"])(d)) return "Today";
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isYesterday$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isYesterday"])(d)) return "Yesterday";
    const now = new Date();
    return d.getFullYear() === now.getFullYear() ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, "MMM d") : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])(d, "MMM d, yyyy");
};
const DateSeparator = ({ label })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-x-3 py-1",
        role: "separator",
        "aria-label": label,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-px flex-1 bg-gray-200"
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 153,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-[11px] font-medium text-gray-500 shrink-0",
                children: label
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 154,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-px flex-1 bg-gray-200"
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 155,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
        lineNumber: 152,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
function Chats({ selectedConversation, jwtToken, privateKey, currentUserProfile, onToggleRightSidebar, onMessagesLoaded, highlightMessageId, onHighlightConsumed, onIndexNewMessage }) {
    const [textareaValue, setTextareaValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const composerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [uploadModalMode, setUploadModalMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [receiverUser, setReceiverUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [starredMap, setStarredMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [selectedTab, setSelectedTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("Messages");
    const [pinnedMsgs, setPinnedMsgs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const pinnedFetchRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [selectedFiles, setSelectedFiles] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isUploading, setIsUploading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isSending, setIsSending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [forwardOpen, setForwardOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [forwardTarget, setForwardTarget] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [keyReady, setKeyReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [keyError, setKeyError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [replyingTo, setReplyingTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editingMessage, setEditingMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // Thread-level state is source-of-truth from the server (selectedConversation)
    // which is kept up-to-date by the user:{userId} Ably subscription in left-sidebar.
    const threadPinned = !!selectedConversation?.isPinned;
    const threadArchived = !!selectedConversation?.isArchived;
    const threadSpam = !!selectedConversation?.isSpam;
    const threadUnread = !!selectedConversation?.markedUnread;
    const [starredOverride, setStarredOverride] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const threadStarred = starredOverride ?? !!selectedConversation?.isStarred;
    const threadActions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$thread$2d$actions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useThreadActions"])(jwtToken);
    const handleOpenForward = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((msg)=>{
        setForwardTarget(msg);
        setForwardOpen(true);
    }, []);
    const [currentUser, setCurrentUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (base && currentUserProfile?.username) {
            setCurrentUser({
                ...base,
                username: currentUserProfile.username
            });
        } else {
            setCurrentUser(base);
        }
    }, [
        currentUserProfile
    ]);
    const handleEmojiSelect = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((emoji)=>{
        const emojiChar = String.fromCodePoint(...emoji[__TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmojiProperties"].unified].split("-").map((hex)=>parseInt(hex, 16)));
        setTextareaValue((prev)=>(prev || "") + emojiChar);
    }, []);
    // Auto-grow the composer to fit its content (Figma: composer expands as
    // the user types multi-line, then caps at max-height with internal scroll).
    // When empty, clear the inline height so the CSS `min-h-[36px]` rules the
    // box — otherwise an empty textarea's scrollHeight (which includes extra
    // browser padding) would lock the field at a taller-than-default size on
    // mount and after every send.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const ta = composerRef.current;
        if (!ta) return;
        if (!textareaValue) {
            ta.style.height = "";
            return;
        }
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
    }, [
        textareaValue
    ]);
    // Reset per-conversation state when switching conversations
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setStarredOverride(null);
        setReplyingTo(null);
        setEditingMessage(null);
        setTextareaValue("");
        setSelectedFiles([]);
        setUploadModalMode(null);
    }, [
        selectedConversation?.id
    ]);
    // Auto mark-read when opening a conversation
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!selectedConversation) return;
        threadActions.markRead(selectedConversation.id).catch(()=>{});
    }, [
        selectedConversation?.id
    ]);
    // 1) unwrap the AES key once per conversation
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setKeyReady(false);
        setKeyError(null);
        if (!selectedConversation || !privateKey) return;
        const ac = new AbortController();
        const convId = selectedConversation.id;
        (async ()=>{
            try {
                const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${convId}/key?isGroup=${selectedConversation.isGroup}`, {
                    headers: {
                        Authorization: `Bearer ${jwtToken}`
                    },
                    signal: ac.signal
                });
                if (ac.signal.aborted) return;
                const privatePem = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["exportPrivateKey"])(privateKey);
                const rawBuf = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptWithPrivateKey"])(encryptedKey, privatePem);
                if (ac.signal.aborted) return;
                const arr = new Uint8Array(rawBuf);
                const b64 = btoa(String.fromCharCode(...arr));
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(convId, b64);
                setKeyReady(true);
            } catch (err) {
                if (err?.name === "AbortError") return;
                console.error("Failed to unwrap conversation key", err);
                if (!ac.signal.aborted) {
                    setKeyReady(false);
                    setKeyError("Could not decrypt this conversation key. Refresh and try again.");
                }
            }
        })();
        return ()=>ac.abort();
    }, [
        selectedConversation?.id,
        selectedConversation?.isGroup,
        privateKey,
        jwtToken
    ]);
    //below logic to add new user to a group chat //need to add button for it once user-service can be called to add users
    const handleAddUser = async (userId)=>{
        if (!selectedConversation) {
            console.error("No conversation selected");
            return;
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$group$2d$encryption$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addParticipantToGroup"])(selectedConversation.id, userId);
        } catch (err) {
            console.error("Failed to add user:", err);
        }
    };
    // File selection handler
    const handleFileSelect = (event)=>{
        const files = Array.from(event.target.files || []);
        if (files.length > 0) {
            setSelectedFiles((prev)=>[
                    ...prev,
                    ...files
                ]);
            // Reset the input value to allow selecting the same file again
            event.target.value = "";
        }
    };
    // Remove selected file
    const removeSelectedFile = (index)=>{
        setSelectedFiles((prev)=>prev.filter((_, i)=>i !== index));
    };
    const [cloudFetching, setCloudFetching] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [onedriveDialogOpen, setOnedriveDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleCloudPick = async (provider)=>{
        // OneDrive uses a custom Dialog component instead of a popup picker —
        // Microsoft's consumer picker can't be embedded reliably.
        if (provider === "onedrive") {
            setOnedriveDialogOpen(true);
            return;
        }
        try {
            const picker = provider === "google-drive" ? __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["openGoogleDrivePicker"] : __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$cloud$2d$picker$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["openDropboxChooser"];
            const files = await picker((count)=>setCloudFetching({
                    provider,
                    count
                }));
            if (files.length > 0) {
                setSelectedFiles((prev)=>[
                        ...prev,
                        ...files
                    ]);
            }
        } catch (err) {
            console.error(`Cloud picker (${provider}) failed:`, err);
        } finally{
            setCloudFetching(null);
        }
    };
    const providerLabel = (p)=>p === "google-drive" ? "Google Drive" : p === "dropbox" ? "Dropbox" : "OneDrive";
    // Format file size helper
    const formatFileSize = (bytes)=>{
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = [
            "Bytes",
            "KB",
            "MB",
            "GB"
        ];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    // 1) measure for sticky container
    const [bottomRef, { height }] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMeasure$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__useMeasure$3e$__["useMeasure"])();
    // 2) fetch & decrypt messages
    const { messages: fetchedMsgs, loading: messagesLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$messages$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMessages"])(selectedConversation ? selectedConversation.id : "", jwtToken, keyReady);
    const isSwitching = !keyError && (messagesLoading || !keyReady);
    // 2.2) Ably presence for this thread (online status + typing)
    // Per-thread presence: typing indicators only. The "isOnline" check used
    // to come from this hook too, but per-thread presence can't show whether
    // a user is online unless they're in the same thread channel right now —
    // which broke the avatar dot in 99% of cases. Online status now comes from
    // the global presence:online channel via useOnlineUsers().
    const { members: presentMembers, sendTyping, typingUserIds } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useAblyPresence$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAblyPresence"])(selectedConversation?.id ?? "");
    const { isOnline } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useOnlineUsers"])();
    // 2.1) local messages state for optimistic updates
    const [localMsgs, setLocalMsgs] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (fetchedMsgs) {
            setLocalMsgs(fetchedMsgs);
        }
    }, [
        fetchedMsgs
    ]);
    // Hoist decrypted messages up so the sidebar can search over them
    // client-side. Required because backend search only matches plaintext
    // `content`, which is always null under E2EE.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!selectedConversation) return;
        onMessagesLoaded?.(selectedConversation.id, localMsgs);
    }, [
        localMsgs,
        selectedConversation?.id,
        onMessagesLoaded
    ]);
    // Scroll-to-and-flash a specific message when the sidebar opens a
    // search result. Waits until that message is actually in the rendered
    // list (it may arrive after a thread-switch's history fetch).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!highlightMessageId) return;
        if (!localMsgs.some((m)=>m.id === highlightMessageId)) return;
        // Give the bubble one paint to mount, then scroll + flash.
        const id = requestAnimationFrame(()=>{
            const el = document.querySelector(`[data-message-id="${highlightMessageId}"]`);
            if (el) {
                el.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                el.classList.add("inbox-highlight-flash");
                window.setTimeout(()=>{
                    el.classList.remove("inbox-highlight-flash");
                }, 2200);
            }
            onHighlightConsumed?.();
        });
        return ()=>cancelAnimationFrame(id);
    }, [
        highlightMessageId,
        localMsgs,
        onHighlightConsumed
    ]);
    // 2.3) Read-receipts: react to message:read broadcasts on user:{me}.
    // Backend publishes when any reader PATCHes /v1/messages/:id/read, so the
    // sender learns their own message has been seen. Patches local state only.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useUserChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useUserChannel"])({
        onMessageRead: ({ messageId })=>{
            setLocalMsgs((prev)=>prev.map((m)=>m.id === messageId ? {
                        ...m,
                        status: "read"
                    } : m));
        }
    });
    // 2.4) Mark incoming messages as read when the thread is open.
    // Fires for each unread inbound message; backend's markRead is idempotent
    // and publishes message:read on the sender's user channel on success.
    const readSentRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!selectedConversation || !currentUser || !jwtToken) return;
        const unread = localMsgs.filter((m)=>m.senderId !== currentUser.id && m.status !== "read" && !readSentRef.current.has(m.id));
        if (unread.length === 0) return;
        for (const m of unread){
            readSentRef.current.add(m.id);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/${m.id}/read`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                }
            }).catch((err)=>{
                console.error("markRead failed", err);
                readSentRef.current.delete(m.id);
            });
        }
    }, [
        localMsgs,
        selectedConversation?.id,
        currentUser?.id,
        jwtToken
    ]);
    // Reset the read-sent guard when switching threads.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        readSentRef.current = new Set();
    }, [
        selectedConversation?.id
    ]);
    const displayedMessages = (selectedTab === "Messages" ? localMsgs : pinnedMsgs).filter((m)=>{
        if (!m.isDeleted && !m.deleted) return true;
        const deletedAt = m.deletedAt;
        if (m.senderId === currentUser?.id && deletedAt && Date.now() - deletedAt < 30000) {
            return true;
        }
        return false;
    });
    // 3) subscribe to Ably for real-time incoming
    // subscribe to Ably for real-time updates
    const channelName = selectedConversation?.id || "";
    // 1) memoize your incoming‐message handler so it stays the same function reference:
    const handleIncoming = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (incoming)=>{
        const convId = incoming.threadId;
        let key = null;
        try {
            key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(convId);
        } catch  {
        // no cached key
        }
        if (!key) {
            console.error("No AES key for", convId);
            return;
        }
        let plain = "";
        if (incoming.ciphertext) {
            try {
                plain = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(incoming.ciphertext, key);
            } catch (err) {
                console.error("Failed to decrypt incoming:", err);
                return;
            }
        }
        let quotedPlain = null;
        if (incoming.quotedCiphertext) {
            try {
                quotedPlain = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(incoming.quotedCiphertext, key);
            } catch (err) {
                console.error("Failed to decrypt quoted content:", err);
                quotedPlain = "🔒 Encrypted message";
            }
        }
        setLocalMsgs((prev)=>{
            if (prev.some((m)=>m.id === incoming.id)) return prev;
            return [
                ...prev,
                {
                    ...incoming,
                    content: plain,
                    quotedContent: quotedPlain,
                    isRead: false,
                    isPinned: incoming.pinned ?? false,
                    isDeleted: incoming.deleted ?? false
                }
            ];
        });
        onIndexNewMessage?.({
            id: incoming.id,
            threadId: incoming.threadId,
            senderId: incoming.senderId,
            content: plain ?? "",
            createdAt: incoming.createdAt,
            attachments: incoming.attachments
        });
    }, [
        setLocalMsgs,
        onIndexNewMessage
    ]);
    //pin/unpin,  delete, undo delete
    const updateMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((messageId, updates)=>{
        setLocalMsgs((prev)=>prev.map((m)=>m.id === messageId ? {
                    ...m,
                    ...updates
                } : m));
    }, []);
    const handleLocalDelete = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((messageId)=>{
        updateMessage(messageId, {
            isDeleted: true,
            deletedAt: Date.now()
        });
        setTimeout(()=>{
            setLocalMsgs((prev)=>prev.map((m)=>m));
        }, 30000);
    }, [
        updateMessage
    ]);
    const handleLocalRestore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((messageId)=>{
        updateMessage(messageId, {
            isDeleted: false,
            deletedAt: undefined
        });
    }, [
        updateMessage
    ]);
    // Ably incoming edit: decrypt + patch local state
    const handleIncomingEdit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (incoming)=>{
        let plain = "";
        try {
            const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(incoming.threadId);
            if (key && incoming.ciphertext) {
                plain = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(incoming.ciphertext, key);
            }
        } catch (err) {
            console.error("Failed to decrypt edited message:", err);
            plain = "🔒 Encrypted message";
        }
        updateMessage(incoming.id, {
            content: plain,
            ciphertext: incoming.ciphertext,
            edited: true
        });
    }, [
        updateMessage
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useAblyChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAblyChannel"])(channelName, handleIncoming, ({ messageId, isPinned })=>updateMessage(messageId, {
            isPinned
        }), (messageId)=>updateMessage(messageId, {
            isDeleted: true
        }), (messageId)=>updateMessage(messageId, {
            isDeleted: false
        }), handleIncomingEdit, ({ messageId, reactions })=>setLocalMsgs((prev)=>prev.map((m)=>m.id === messageId ? {
                    ...m,
                    reactions: reactions
                } : m)));
    const handleToggleReaction = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (messageId, emoji)=>{
        if (!jwtToken) return;
        // Optimistic toggle — Ably broadcast will reconcile.
        const me = currentUser?.id;
        if (me) {
            setLocalMsgs((prev)=>prev.map((m)=>{
                    if (m.id !== messageId) return m;
                    const current = m.reactions ?? [];
                    const idx = current.findIndex((r)=>r.userId === me && r.emoji === emoji);
                    const next = idx >= 0 ? current.filter((_, i)=>i !== idx) : [
                        ...current,
                        {
                            userId: me,
                            emoji,
                            createdAt: new Date().toISOString()
                        }
                    ];
                    return {
                        ...m,
                        reactions: next
                    };
                }));
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/${messageId}/reactions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${jwtToken}`
                },
                body: {
                    emoji
                }
            });
        } catch (err) {
            console.error("toggleReaction failed", err);
        }
    }, [
        jwtToken,
        currentUser?.id
    ]);
    // 3) send message hook
    const send = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$send$2d$message$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSendMessage"])(jwtToken, privateKey, selectedConversation?.isGroup);
    const editMsg = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$edit$2d$message$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEditMessage"])(jwtToken);
    const uploadFile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$file$2d$upload$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useFileUpload"])(jwtToken, privateKey, selectedConversation?.isGroup);
    const appendUploadedMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (result)=>{
        if (!selectedConversation) return;
        let displayContent = result.message.content ?? "";
        try {
            const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(selectedConversation.id);
            if (key && result.message.ciphertext) {
                displayContent = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(result.message.ciphertext, key);
            }
        } catch (err) {
            console.error("Failed to decrypt uploaded attachment caption:", err);
            if (result.message.ciphertext) {
                displayContent = "🔒 Encrypted message";
            }
        }
        setLocalMsgs((prev)=>{
            if (prev.some((m)=>m.id === result.message.id)) return prev;
            return [
                ...prev,
                {
                    ...result.message,
                    threadId: result.message.threadId ?? result.message.conversationId ?? selectedConversation.id,
                    content: displayContent,
                    messageType: result.message.messageType ?? "file",
                    attachments: result.message.attachments?.length ? result.message.attachments : [
                        result.attachment
                    ]
                }
            ];
        });
        onIndexNewMessage?.({
            id: result.message.id,
            threadId: selectedConversation.id,
            senderId: result.message.senderId,
            content: displayContent ?? "",
            createdAt: result.message.createdAt,
            attachments: result.message.attachments?.length ? result.message.attachments : [
                result.attachment
            ]
        });
    }, [
        selectedConversation?.id
    ]);
    // 4) scroll to bottom on new messages
    const scrollRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        scrollRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [
        localMsgs
    ]);
    // 5) load receiver's profile
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!selectedConversation) return;
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) {
            console.error("No logged-in user found");
            return;
        }
        const otherId = selectedConversation.participantIds?.find((id)=>id !== currentUser.id);
        if (!otherId) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/users/${otherId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${jwtToken}`
            }
        }).then(setReceiverUser).catch(console.error);
    }, [
        selectedConversation?.id
    ]);
    // 6) send handler
    const handleSendMessage = async ()=>{
        if (!selectedConversation) return;
        if (isSending) return;
        const hasFiles = selectedFiles.length > 0;
        const hasText = textareaValue.trim().length > 0;
        if (!hasText && !hasFiles) return;
        setIsSending(true);
        try {
            if (hasFiles) {
                const caption = textareaValue.trim();
                for(let i = 0; i < selectedFiles.length; i++){
                    const file = selectedFiles[i];
                    const uploaded = await uploadFile(selectedConversation.id, file, i === 0 ? caption : undefined);
                    await appendUploadedMessage(uploaded);
                }
                setSelectedFiles([]);
                setTextareaValue("");
                sendTyping(false);
                setReplyingTo(null);
                return;
            }
            const saved = await send(selectedConversation.id, textareaValue.trim(), replyingTo?.id);
            // Backend returns message directly or wrapped in { data }
            const msg = saved.data ?? saved;
            let displayContent = msg.content;
            try {
                const key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(selectedConversation.id);
                if (key && msg.ciphertext) {
                    displayContent = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(msg.ciphertext, key);
                }
            } catch  {
            // no key cached, content is already plaintext
            }
            setLocalMsgs((prev)=>{
                if (prev.some((m)=>m.id === msg.id)) return prev;
                return [
                    ...prev,
                    {
                        ...msg,
                        content: displayContent
                    }
                ];
            });
            onIndexNewMessage?.({
                id: msg.id,
                threadId: selectedConversation.id,
                senderId: msg.senderId,
                content: displayContent ?? "",
                createdAt: msg.createdAt,
                attachments: msg.attachments
            });
            setTextareaValue("");
            sendTyping(false);
            setReplyingTo(null);
        } catch (err) {
            console.error("Send failed", err);
        } finally{
            setIsSending(false);
        }
    };
    // Edit flow: enter edit mode, pre-fill composer
    const handleStartEdit = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((msg)=>{
        setEditingMessage(msg);
        setTextareaValue(msg.content || "");
        setReplyingTo(null);
        // focus + move caret to end on next tick (after textarea gets the new value)
        requestAnimationFrame(()=>{
            const el = composerRef.current;
            if (el) {
                el.focus();
                const len = el.value.length;
                el.setSelectionRange(len, len);
            }
        });
    }, []);
    const handleCancelEdit = ()=>{
        setEditingMessage(null);
        setTextareaValue("");
    };
    const handleSaveEdit = async ()=>{
        if (!editingMessage || !selectedConversation) return;
        const newContent = textareaValue.trim();
        if (!newContent) return;
        if (newContent === (editingMessage.content || "").trim()) {
            // no change — just exit edit mode
            handleCancelEdit();
            return;
        }
        const messageId = editingMessage.id;
        const prevContent = editingMessage.content;
        // Optimistic update
        updateMessage(messageId, {
            content: newContent,
            edited: true
        });
        const editingSnapshot = editingMessage;
        setEditingMessage(null);
        setTextareaValue("");
        try {
            await editMsg(messageId, selectedConversation.id, newContent);
        } catch (err) {
            console.error("Edit failed", err);
            // Rollback
            updateMessage(messageId, {
                content: prevContent,
                edited: !!editingSnapshot.edited
            });
        }
    };
    // Updated handleSendMessage to handle both text and files
    //     const handleSendMessage = async () => {
    //     if (!selectedConversation) return
    //     // Check if we have either text or files to send
    //     const hasText = textareaValue.trim()
    //     const hasFiles = selectedFiles.length > 0
    //     if (!hasText && !hasFiles) return
    //     setIsUploading(true)
    //     console.log('> handleSendMessage – sending:', { hasText, hasFiles, filesCount: selectedFiles.length })
    //     try {
    //         // Case 1: Only text message (existing logic)
    //         if (hasText && !hasFiles) {
    //             const saved = await send(selectedConversation.id, textareaValue.trim())
    //             console.log('Text message sent:', saved.message, saved.data)
    //             // Decrypt and add to local state (existing logic)
    //             const key = loadKey(selectedConversation.id)
    //             const plain = await decryptAES(saved.data.ciphertext, key)
    //             setLocalMsgs(prev => [
    //                 ...prev,
    //                 {
    //                     ...saved.data,
    //                     content: plain
    //                 }
    //             ])
    //         }
    //         // Case 2: Files (with optional text)
    //         if (hasFiles) {
    //             // Upload each file
    //             console.log('Uploading files:', selectedFiles.map(f => f.name))
    //             console.log('Textarea value:', textareaValue.trim())
    //             console.log('Conversation ID:', selectedConversation.id)
    //             const uploadPromises = selectedFiles.map(file =>
    //                 uploadFile(selectedConversation.id, file, hasText ? textareaValue.trim() : undefined)
    //             )
    //             const uploadResults = await Promise.all(uploadPromises)
    //             console.log('Files uploaded:', uploadResults)
    //             // Add file messages to local state
    //             for (const result of uploadResults) {
    //                  // Decrypt and add to local state (existing logic)
    //             const key = loadKey(selectedConversation.id)
    //             const plain = await decryptAES(result.message.ciphertext, key)
    //                 setLocalMsgs(prev => [
    //                     ...prev,
    //                     {
    //                         ...result.message,
    //                         content: plain, // For file messages, content = ciphertext (which might be empty or the optional text)
    //                         // Add attachment data for rendering
    //                         fileUrl: result.attachment.fileUrl,
    //                         fileName: result.attachment.fileName,
    //                         fileType: result.attachment.fileType,
    //                         fileSize: result.attachment.fileSize
    //                     }
    //                 ])
    //             }
    //             // Clear selected files
    //             setSelectedFiles([])
    //         }
    //         // Clear text input
    //         setTextareaValue('')
    //     } catch (err) {
    //         console.error('Send failed', err)
    //         // You might want to show an error toast here
    //     } finally {
    //         setIsUploading(false)
    //     }
    // }
    // pinned messages or normal messages logic:
    const handleToggleChange = async (value)=>{
        const tab = value;
        setSelectedTab(tab);
        if (tab === "Pinned") {
            if (!selectedConversation) return;
            pinnedFetchRef.current?.abort();
            const ac = new AbortController();
            pinnedFetchRef.current = ac;
            const convId = selectedConversation.id;
            setPinnedMsgs([]);
            try {
                const allMsgs = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/messages/thread/${convId}`, {
                    headers: {
                        Authorization: `Bearer ${jwtToken}`
                    },
                    signal: ac.signal
                });
                if (ac.signal.aborted) return;
                const pinned = allMsgs.filter((m)=>m.pinned || m.isPinned);
                let key = null;
                try {
                    key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(convId);
                } catch  {}
                const decrypted = await Promise.all(pinned.map(async (m)=>{
                    if (!m.ciphertext) return m;
                    if (!key) return {
                        ...m,
                        content: "🔒 Encrypted message"
                    };
                    try {
                        return {
                            ...m,
                            content: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(m.ciphertext, key)
                        };
                    } catch  {
                        return {
                            ...m,
                            content: "🔒 Encrypted message"
                        };
                    }
                }));
                if (ac.signal.aborted) return;
                setPinnedMsgs(decrypted);
            } catch (err) {
                if (err?.name === "AbortError") return;
                console.error("Failed to fetch pinned messages", err);
            }
        }
    };
    // starring a conversation
    // const handleToggleStar = async () => {
    //   if (!selectedConversation) return;
    //   try {
    //     console.log("> handleToggleStar for:", selectedConversation.id);
    //      // 1) Call your API using apiFetch
    //     const { success } = await apiFetch<{ success: boolean }>(
    //       `/api/messaging/conversations/${selectedConversation.id}/star`,
    //       {
    //         method: "POST", // or POST if your backend uses POST
    //         headers: {
    //           Authorization: `Bearer ${jwtToken}`, // use your token state
    //         },
    //       }
    //     );
    //     // 2) Optimistically update local UI state
    //     if (success) {
    //       setIsStarred((prev) => !prev);
    //     }
    //     console.log("Toggle star success:", success);
    //   } catch (err) {
    //     console.error("Toggle star failed", err);
    //   }
    // };
    // const handleToggleStar = async (convId: string) => {
    //   try {
    //     const { success } = await apiFetch<{ success: boolean }>(
    //       `/api/messaging/conversations/${convId}/star`,
    //       {
    //         method: "POST",
    //         headers: { Authorization: `Bearer ${jwtToken}` },
    //       }
    //     );
    //     if (success) {
    //       setConversations((prev) =>
    //         prev.map((conv) =>
    //           conv.id === convId
    //             ? { ...conv, isStarred: !conv.isStarred }
    //             : conv
    //         )
    //       );
    //     }
    //   } catch (err) {
    //     console.error("Toggle star failed", err);
    //   }
    // };
    if (!currentUser) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex flex-col items-center justify-center gap-2 text-gray-400",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                size: 28,
                strokeWidth: 3
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1057,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
            lineNumber: 1056,
            columnNumber: 7
        }, this);
    }
    if (!selectedConversation) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex flex-col items-center justify-center gap-3 text-gray-400",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mail05"], {
                    className: "size-10 stroke-[1.5]"
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                    lineNumber: 1065,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm font-medium",
                    children: "Select a conversation to start messaging"
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                    lineNumber: 1066,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
            lineNumber: 1064,
            columnNumber: 7
        }, this);
    }
    if (!receiverUser) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex-1 flex flex-col items-center justify-center gap-2 text-gray-400",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                    size: 28,
                    strokeWidth: 3
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                    lineNumber: 1074,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm",
                    children: "Loading conversation..."
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                    lineNumber: 1075,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
            lineNumber: 1073,
            columnNumber: 7
        }, this);
    }
    // First-name-only display (per design)
    const fullName = selectedConversation?.isGroup ? selectedConversation.group?.name ?? "Unnamed Group" : receiverUser.firstName?.trim() || receiverUser.username || "Unknown User";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex-auto relative min-w-0 h-full flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-8 shrink-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "inline-flex items-center gap-x-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                className: "size-[43px]",
                                size: "md",
                                isOnline: selectedConversation?.isGroup ? presentMembers.some((m)=>m.clientId !== currentUser?.id) : isOnline(receiverUser.id),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                        src: selectedConversation?.isGroup ? "/group-default.png" : receiverUser.avatarUrl || "/default.png",
                                        alt: selectedConversation?.isGroup ? selectedConversation?.group?.name || "Group" : receiverUser.username ?? ""
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1105,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                        children: selectedConversation?.isGroup ? selectedConversation?.group?.name?.[0] ?? "G" : receiverUser.username?.[0] ?? ""
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1117,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1096,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col gap-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex items-center gap-x-1",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-lg font-semibold text-dark-blue-400",
                                            children: fullName
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1126,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1125,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex items-center gap-x-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm text-dark-blue-400",
                                                children: selectedConversation?.isGroup ? (()=>{
                                                    const others = presentMembers.filter((m)=>m.clientId !== currentUser?.id).length;
                                                    return others > 0 ? `${others} active now` : "No one active";
                                                })() : isOnline(receiverUser.id) ? "Active now" : "Offline"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1131,
                                                columnNumber: 15
                                            }, this),
                                            receiverUser.recentJobTitle || receiverUser.jobTitles && receiverUser.jobTitles[0] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-block h-4 w-px bg-gray-300"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1147,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-sm text-dark-blue-400",
                                                        children: receiverUser.recentJobTitle || receiverUser.jobTitles[0]
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1148,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1130,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1124,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1091,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$toggle$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ToggleGroupRoot"], {
                                value: selectedTab ? [
                                    selectedTab
                                ] : undefined,
                                onValueChange: (details)=>{
                                    const val = details.value?.[0];
                                    if (val === "Messages" || val === "Pinned") {
                                        handleToggleChange(val);
                                    }
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$toggle$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ToggleGroupItem"], {
                                        value: "Messages",
                                        children: "Messages"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1168,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toggle$2d$group$2f$toggle$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ToggleGroupItem"], {
                                        value: "Pinned",
                                        children: [
                                            "Pinned",
                                            (()=>{
                                                const count = localMsgs.filter((m)=>m.pinned || m.isPinned).length;
                                                return count > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold bg-gray-300 text-gray-800 rounded-full",
                                                    children: count
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1174,
                                                    columnNumber: 19
                                                }, this) : null;
                                            })()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1169,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1159,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        visual: "gray",
                                        variant: "ghost",
                                        size: "lg",
                                        className: "rounded-full",
                                        onClick: onToggleRightSidebar,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Info"], {
                                            className: "size-[22px]"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1190,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1183,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FavoriteRoot"], {
                                        value: threadStarred,
                                        onValueChange: (next)=>{
                                            if (!selectedConversation) return;
                                            setStarredOverride(next);
                                            (next ? threadActions.star(selectedConversation.id) : threadActions.unstar(selectedConversation.id)).catch((err)=>{
                                                console.error("star toggle failed", err);
                                                setStarredOverride(!next);
                                            });
                                        },
                                        children: ()=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "size-11 flex items-center justify-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Favorite"], {
                                                    className: "text-gray-500"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1208,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1207,
                                                columnNumber: 17
                                            }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1192,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                        modal: false,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    className: "rounded-full text-gray-500",
                                                    visual: "gray",
                                                    variant: "ghost",
                                                    size: "lg",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MoreHorizontal"], {
                                                        className: "size-[22px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1221,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1215,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1214,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                                align: "end",
                                                side: "bottom",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: onToggleRightSidebar,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Info"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1226,
                                                                columnNumber: 19
                                                            }, this),
                                                            " Profile Info"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1225,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            if (!selectedConversation) return;
                                                            const next = !threadStarred;
                                                            setStarredOverride(next);
                                                            (next ? threadActions.star(selectedConversation.id) : threadActions.unstar(selectedConversation.id)).catch((err)=>{
                                                                console.error("star toggle failed", err);
                                                                setStarredOverride(!next);
                                                            });
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1243,
                                                                columnNumber: 19
                                                            }, this),
                                                            threadStarred ? "Unmark Favorite" : "Mark Favorite"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1228,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            if (!selectedConversation) return;
                                                            (threadUnread ? threadActions.markRead(selectedConversation.id) : threadActions.markUnread(selectedConversation.id)).catch((err)=>console.error("mark unread/read failed", err));
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mail05"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1256,
                                                                columnNumber: 19
                                                            }, this),
                                                            " ",
                                                            threadUnread ? "Mark as Read" : "Mark Unread"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1246,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            if (!selectedConversation) return;
                                                            const next = !threadPinned;
                                                            (next ? threadActions.pin(selectedConversation.id) : threadActions.unpin(selectedConversation.id)).catch((err)=>console.error("pin toggle failed", err));
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Pin02"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1269,
                                                                columnNumber: 19
                                                            }, this),
                                                            threadPinned ? "Unpin Chat" : "Pin Chat"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1258,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            if (!selectedConversation) return;
                                                            (threadArchived ? threadActions.unarchive(selectedConversation.id) : threadActions.archive(selectedConversation.id)).catch((err)=>console.error("archive toggle failed", err));
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Archive"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1282,
                                                                columnNumber: 19
                                                            }, this),
                                                            " ",
                                                            threadArchived ? "Unarchive" : "Archive"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1272,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1284,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            if (!selectedConversation) return;
                                                            (threadSpam ? threadActions.unspam(selectedConversation.id) : threadActions.spam(selectedConversation.id)).catch((err)=>console.error("spam toggle failed", err));
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1295,
                                                                columnNumber: 19
                                                            }, this),
                                                            " ",
                                                            threadSpam ? "Move to Inbox" : "Move to Spam"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1285,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        className: "text-error-500",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1298,
                                                                columnNumber: 19
                                                            }, this),
                                                            " Block / Report"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1297,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        className: "text-error-500",
                                                        onSelect: (e)=>{
                                                            e.preventDefault();
                                                            setShowDeleteConfirm(true);
                                                        },
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trash2"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1307,
                                                                columnNumber: 19
                                                            }, this),
                                                            " Delete Chat"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1300,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1224,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1213,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                                        open: showDeleteConfirm,
                                        onOpenChange: setShowDeleteConfirm,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                                            className: "max-w-[348px] p-7 rounded-xl",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                                    children: "Delete this chat?"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1314,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                                    className: "mt-2",
                                                    children: "This chat will be moved to Trash. You can restore it later from the Trash filter."
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1315,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-8 grid grid-cols-2 gap-x-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                visual: "gray",
                                                                variant: "outlined",
                                                                children: "Cancel"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1320,
                                                                columnNumber: 21
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1319,
                                                            columnNumber: 19
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            onClick: ()=>{
                                                                if (!selectedConversation) return;
                                                                threadActions.trash(selectedConversation.id).catch((err)=>console.error("trash failed", err));
                                                                setShowDeleteConfirm(false);
                                                            },
                                                            children: "Yes, Delete"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1324,
                                                            columnNumber: 19
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1318,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1313,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1312,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1182,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1158,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1090,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 min-h-0 min-w-0",
                style: {
                    ...{
                        "--h": (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toPxIfNumber"])(height)
                    }
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                    className: "h-full",
                    viewportClassName: "h-full",
                    scrollBar: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollBar"], {
                        className: "w-4 p-1"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1348,
                        columnNumber: 22
                    }, this),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-8 grid gap-y-6",
                        children: [
                            isSwitching && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center justify-center py-20 text-gray-400 gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                        size: 24,
                                        strokeWidth: 3
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1353,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm",
                                        children: "Loading messages..."
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1354,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1352,
                                columnNumber: 15
                            }, this),
                            !isSwitching && keyError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center justify-center py-20 text-error-500 gap-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm font-medium",
                                    children: keyError
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1359,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1358,
                                columnNumber: 15
                            }, this),
                            !isSwitching && displayedMessages.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center justify-center py-20 text-gray-400 gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Send"], {
                                        className: "size-8 stroke-[1.5]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1364,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm",
                                        children: "No messages yet. Say hello!"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1365,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1363,
                                columnNumber: 15
                            }, this),
                            !isSwitching && displayedMessages.map((m, i)=>{
                                const prev = i > 0 ? displayedMessages[i - 1] : null;
                                const showDate = !prev || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$isSameDay$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isSameDay"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(m.createdAt), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["parseISO"])(prev.createdAt));
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].Fragment, {
                                    children: [
                                        showDate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(DateSeparator, {
                                            label: formatDateSeparator(m.createdAt)
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1376,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            "data-message-id": m.id,
                                            className: `flex rounded-lg ${m.senderId === currentUser.id ? "justify-end" : "justify-start"}`,
                                            children: m.senderId === currentUser.id ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bubble"], {
                                                message: m,
                                                currentUser: currentUser,
                                                participantUsername: receiverUser.username ?? "",
                                                participantName: fullName,
                                                onForward: handleOpenForward,
                                                onReply: setReplyingTo,
                                                onEdit: handleStartEdit,
                                                onLocalDelete: handleLocalDelete,
                                                onLocalRestore: handleLocalRestore,
                                                onToggleReaction: handleToggleReaction,
                                                replyToMessage: m.replyToMessageId ? localMsgs.find((r)=>r.id === m.replyToMessageId) ?? null : null
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1387,
                                                columnNumber: 23
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YourBubble"], {
                                                message: m,
                                                currentUser: currentUser,
                                                onForward: handleOpenForward,
                                                onReply: setReplyingTo,
                                                onToggleReaction: handleToggleReaction,
                                                replyToMessage: m.replyToMessageId ? localMsgs.find((r)=>r.id === m.replyToMessageId) ?? null : null,
                                                participantName: fullName,
                                                participantUsername: receiverUser.username ?? "",
                                                participantAvatarUrl: receiverUser.avatarUrl ?? undefined
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1401,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1378,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, m.id ?? i, true, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1374,
                                    columnNumber: 17
                                }, this);
                            }),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                ref: scrollRef
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1417,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1350,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                    lineNumber: 1345,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1341,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white shrink-0 border-t border-gray-200",
                ref: bottomRef,
                children: [
                    typingUserIds.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 pt-2 pb-1 flex items-center gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-flex items-center gap-x-0.5",
                                "aria-hidden": "true",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1433,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1434,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "size-1.5 rounded-full bg-gray-400 animate-bounce"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1435,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1429,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs italic text-gray-500",
                                children: (()=>{
                                    const displayName = typingUserIds.length === 1 && receiverUser && typingUserIds[0] === receiverUser.id ? receiverUser.firstName?.trim() || receiverUser.username || "Someone" : typingUserIds.length === 1 ? "Someone" : `${typingUserIds.length} people`;
                                    return `${displayName} ${typingUserIds.length === 1 ? "is" : "are"} typing…`;
                                })()
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1437,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1428,
                        columnNumber: 11
                    }, this),
                    replyingTo && !editingMessage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-1 min-w-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs font-semibold text-primary-600",
                                        children: [
                                            "Replying to ",
                                            replyingTo.senderId === currentUser?.id ? "yourself" : receiverUser?.firstName || receiverUser?.username || "Unknown"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1457,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-gray-500 truncate",
                                        children: replyingTo.content || "Encrypted message"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1460,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1456,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                visual: "gray",
                                variant: "ghost",
                                size: "sm",
                                className: "rounded-full",
                                onClick: ()=>setReplyingTo(null),
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1471,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1464,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1455,
                        columnNumber: 11
                    }, this),
                    editingMessage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs font-semibold text-primary-600",
                                children: "Editing Message..."
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1478,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                visual: "gray",
                                variant: "ghost",
                                size: "sm",
                                className: "rounded-full",
                                onClick: handleCancelEdit,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1488,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1481,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1477,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                        open: uploadModalMode !== null,
                        onOpenChange: (o)=>setUploadModalMode(o ? uploadModalMode : null),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                            className: "max-w-[467px] p-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-xs font-semibold text-gray-900",
                                    children: uploadModalMode === "image" ? "Upload Image" : "Upload Files"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1498,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        visual: "gray",
                                        variant: "ghost",
                                        size: "sm",
                                        className: "absolute top-2 right-2 rounded-full",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1508,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1502,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1501,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-4 flex flex-col items-center justify-center gap-y-1 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-500",
                                    onDragOver: (e)=>e.preventDefault(),
                                    onDrop: (e)=>{
                                        e.preventDefault();
                                        const files = Array.from(e.dataTransfer.files || []);
                                        if (files.length > 0) {
                                            setSelectedFiles((prev)=>[
                                                    ...prev,
                                                    ...files
                                                ]);
                                        }
                                    },
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                            className: "size-6 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1522,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            children: [
                                                "Drag and drop or",
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: "font-semibold text-primary-600 hover:underline",
                                                    onClick: ()=>document.getElementById(uploadModalMode === "image" ? "image-file-input" : "desktop-file-input")?.click(),
                                                    children: "Choose a File"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1525,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1523,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1511,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex flex-col gap-y-2 max-h-[260px] overflow-y-auto",
                                    children: selectedFiles.map((f, i)=>{
                                        const sizeLabel = f.size < 1024 ? `${f.size} B` : f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1557,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1556,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "min-w-0 flex-auto",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "truncate text-xs font-semibold text-gray-900",
                                                            children: f.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1560,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[11px] text-gray-500",
                                                            children: [
                                                                sizeLabel,
                                                                isUploading ? " • uploading…" : ""
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1563,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1559,
                                                    columnNumber: 21
                                                }, this),
                                                !isUploading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    className: "shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700",
                                                    onClick: ()=>removeSelectedFile(i),
                                                    children: "Remove"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1569,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, `modal-${f.name}-${i}`, true, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1552,
                                            columnNumber: 19
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1543,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-2 text-[11px] text-gray-500",
                                    children: uploadModalMode === "image" ? "Supported formats: PNG, JPG, GIF, SVG. Max 50 MB per file." : "Supported formats: PDF, DOC, JPG, PNG, MP4. Max 50 MB per file."
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1581,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-8 grid grid-cols-2 gap-x-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            visual: "gray",
                                            variant: "outlined",
                                            onClick: ()=>setUploadModalMode(null),
                                            disabled: isUploading,
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1587,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            visual: "primary",
                                            variant: "filled",
                                            disabled: !selectedFiles.length || !selectedConversation || isUploading,
                                            onClick: async ()=>{
                                                if (!selectedConversation || !selectedFiles.length) return;
                                                setIsUploading(true);
                                                try {
                                                    for (const file of selectedFiles){
                                                        const uploaded = await uploadFile(selectedConversation.id, file);
                                                        await appendUploadedMessage(uploaded);
                                                    }
                                                    setSelectedFiles([]);
                                                    setUploadModalMode(null);
                                                } catch (err) {
                                                    console.error("Attachment upload failed:", err);
                                                } finally{
                                                    setIsUploading(false);
                                                }
                                            },
                                            children: isUploading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                                size: 16,
                                                strokeWidth: 3
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1621,
                                                columnNumber: 32
                                            }, this) : "Send"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1595,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                    lineNumber: 1586,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                            lineNumber: 1497,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1493,
                        columnNumber: 9
                    }, this),
                    cloudFetching && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 pt-2 flex flex-col gap-y-2",
                        children: Array.from({
                            length: cloudFetching.count
                        }).map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                            size: 16,
                                            strokeWidth: 3
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1635,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1634,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0 flex-auto",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-xs font-semibold text-gray-900",
                                                children: [
                                                    "Fetching from ",
                                                    providerLabel(cloudFetching.provider),
                                                    "…"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1638,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-gray-500",
                                                children: cloudFetching.count > 1 ? `File ${i + 1} of ${cloudFetching.count}` : "Downloading file"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1641,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1637,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, `cloud-pending-${i}`, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1630,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1628,
                        columnNumber: 11
                    }, this),
                    selectedFiles.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "px-3 pt-2 flex flex-col gap-y-2",
                        children: selectedFiles.map((f, i)=>{
                            const sizeLabel = f.size < 1024 ? `${f.size} B` : f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1667,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1666,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "min-w-0 flex-auto",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-xs font-semibold text-gray-900",
                                                children: f.name
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1670,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-gray-500",
                                                children: sizeLabel
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1673,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1669,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        className: "shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700",
                                        onClick: ()=>removeSelectedFile(i),
                                        children: "Remove"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1675,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, `${f.name}-${i}`, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1662,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1653,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-3 flex min-h-[68px] items-end gap-x-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$emoji$2d$picker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmojiPicker"], {
                                        onEmojiSelect: handleEmojiSelect,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                            visual: "gray",
                                            variant: "ghost",
                                            size: "lg",
                                            className: "rounded-full",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Smile"], {
                                                className: "size-[22px]"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1693,
                                                columnNumber: 15
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1692,
                                            columnNumber: 13
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1691,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        visual: "gray",
                                        variant: "ghost",
                                        size: "lg",
                                        className: "rounded-full",
                                        onClick: ()=>setUploadModalMode("image"),
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Image03"], {
                                            className: "size-[22px]"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1704,
                                            columnNumber: 13
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1697,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    visual: "gray",
                                                    variant: "ghost",
                                                    size: "lg",
                                                    className: "rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Attachment01"], {
                                                        className: "size-[22px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1710,
                                                        columnNumber: 17
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1709,
                                                    columnNumber: 15
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1708,
                                                columnNumber: 13
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                                className: "w-[212px]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onClick: ()=>setUploadModalMode("file"),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                                                className: "size-6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1715,
                                                                columnNumber: 17
                                                            }, this),
                                                            " Upload from Desktop"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1714,
                                                        columnNumber: 15
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onClick: ()=>handleCloudPick("dropbox"),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$brands$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropboxBrand"], {
                                                                className: "size-6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1718,
                                                                columnNumber: 17
                                                            }, this),
                                                            " Upload via Dropbox"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1717,
                                                        columnNumber: 15
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onClick: ()=>handleCloudPick("google-drive"),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$brands$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GoogleDrive1Brand"], {
                                                                className: "size-6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1721,
                                                                columnNumber: 17
                                                            }, this),
                                                            " Upload via Google Drive"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1720,
                                                        columnNumber: 15
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onClick: ()=>handleCloudPick("onedrive"),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$brands$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MsOnedriveBrand"], {
                                                                className: "size-6"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                                lineNumber: 1724,
                                                                columnNumber: 17
                                                            }, this),
                                                            " Upload via OneDrive"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1723,
                                                        columnNumber: 15
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuArrow"], {
                                                        className: "fill-white"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1726,
                                                        columnNumber: 15
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1713,
                                                columnNumber: 13
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1707,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        id: "desktop-file-input",
                                        type: "file",
                                        className: "hidden",
                                        onChange: handleFileSelect,
                                        accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.mp4,.mov",
                                        multiple: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1731,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        id: "image-file-input",
                                        type: "file",
                                        className: "hidden",
                                        onChange: handleFileSelect,
                                        accept: "image/*",
                                        multiple: true
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1739,
                                        columnNumber: 11
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1690,
                                columnNumber: 9
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputGroup"], {
                                className: "flex-auto w-[calc(100%-164px)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Textarea"], {
                                        ref: composerRef,
                                        placeholder: editingMessage ? "Edit message..." : selectedFiles.length > 0 ? "Add a message (optional)..." : "Send message...",
                                        className: `w-full resize-none py-1.5 leading-5 h-9 max-h-[120px] overflow-y-auto ${editingMessage ? "pr-[120px] ring-1 ring-primary-500 border-primary-500 focus:ring-primary-500 focus:border-primary-500" : "pr-11"}`,
                                        rows: 1,
                                        value: textareaValue,
                                        onChange: (e)=>{
                                            setTextareaValue(e.target.value);
                                            if (e.target.value.length > 0) sendTyping(true);
                                            else sendTyping(false);
                                        },
                                        onBlur: ()=>sendTyping(false),
                                        onKeyDown: (e)=>{
                                            if (editingMessage) {
                                                if (e.key === "Escape") {
                                                    e.preventDefault();
                                                    handleCancelEdit();
                                                } else if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSaveEdit();
                                                }
                                                return;
                                            }
                                            // Standard chat UX: Enter sends, Shift+Enter inserts newline
                                            // (so multi-line composing still works for users who want it).
                                            if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1751,
                                        columnNumber: 11
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputRightElement"], {
                                        className: editingMessage ? "!w-[120px] justify-end" : "items-center",
                                        children: editingMessage ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-x-3 pr-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: handleCancelEdit,
                                                    className: "text-xs font-medium text-gray-500 hover:text-gray-700",
                                                    children: "Cancel"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1797,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "h-3 w-px bg-gray-300",
                                                    "aria-hidden": true
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1804,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    type: "button",
                                                    onClick: handleSaveEdit,
                                                    disabled: !textareaValue.trim() || !keyReady || !!keyError || textareaValue.trim() === (editingMessage.content || "").trim(),
                                                    className: "text-xs font-semibold text-primary-500 hover:text-primary-600 disabled:text-gray-400 disabled:cursor-not-allowed",
                                                    children: "Save"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                    lineNumber: 1805,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1796,
                                            columnNumber: 15
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                        className: `text-gray-500 hover:text-primary-500 disabled:text-gray-400 ${isUploading || isSending ? "animate-pulse" : ""}`,
                                                        onClick: handleSendMessage,
                                                        disabled: !textareaValue.trim() && selectedFiles.length === 0 || isUploading || isSending || !keyReady || !!keyError,
                                                        children: isUploading || isSending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                                                            size: 18,
                                                            strokeWidth: 3
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1836,
                                                            columnNumber: 23
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Send"], {
                                                            className: "size-[18px]"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                            lineNumber: 1838,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1822,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                        children: isUploading ? "Uploading..." : selectedFiles.length > 0 ? "Send files" : textareaValue ? "Send message" : "Type a message or select files"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                        lineNumber: 1841,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                                lineNumber: 1821,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                            lineNumber: 1820,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                        lineNumber: 1792,
                                        columnNumber: 11
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                                lineNumber: 1750,
                                columnNumber: 9
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                        lineNumber: 1688,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1423,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$forward$2d$message$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ForwardMessageDialog"], {
                open: forwardOpen,
                onOpenChange: setForwardOpen,
                message: forwardTarget,
                currentUserId: currentUser.id,
                currentUserProfile: currentUserProfile,
                receiverUser: receiverUser,
                privateKey: privateKey
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1858,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$onedrive$2d$picker$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OneDrivePickerDialog"], {
                open: onedriveDialogOpen,
                onOpenChange: setOnedriveDialogOpen,
                onPicked: (count)=>setCloudFetching({
                        provider: "onedrive",
                        count
                    }),
                onConfirm: (files)=>{
                    setCloudFetching(null);
                    if (files.length > 0) {
                        setSelectedFiles((prev)=>[
                                ...prev,
                                ...files
                            ]);
                    }
                }
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
                lineNumber: 1868,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/inbox/components/chats-comp.tsx",
        lineNumber: 1088,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/(group)/inbox/components/search-results-panel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SearchResultsPanel",
    ()=>SearchResultsPanel,
    "extractUrls",
    ()=>extractUrls
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/spinner/spinner.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/stories/inbox.stories.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const SectionHeader = ({ label })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "px-4 py-1.5",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-[11px] font-semibold text-gray-500 uppercase tracking-wide",
            children: label
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
            lineNumber: 64,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
        lineNumber: 63,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
const formatDate = (iso)=>new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
    });
function SearchResultsPanel({ query, isLoading, isIndexing, indexProgress, people, messages, links, files, onOpenThread }) {
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center py-8 text-gray-400",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                size: 20,
                strokeWidth: 3
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                lineNumber: 90,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
            lineNumber: 89,
            columnNumber: 7
        }, this);
    }
    const totalResults = people.length + messages.length + links.length + files.length;
    if (totalResults === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col items-center justify-center py-8 gap-2 text-gray-400 px-6 text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMd"], {
                    className: "size-6 stroke-[1.5]"
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs",
                    children: [
                        'No results matching "',
                        query,
                        '"'
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                    lineNumber: 102,
                    columnNumber: 9
                }, this),
                isIndexing && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[11px] leading-4 text-gray-500",
                    children: "Still indexing older messages — try again in a moment."
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                    lineNumber: 104,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
            lineNumber: 100,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "py-2",
        children: [
            isIndexing && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "px-4 pb-2 inline-flex items-center gap-x-1 text-[10px] text-gray-400",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                        size: 10,
                        strokeWidth: 3
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 116,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: [
                            "Indexing ",
                            Math.round((indexProgress ?? 0) * 100),
                            "%"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 117,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                lineNumber: 115,
                columnNumber: 9
            }, this),
            people.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionHeader, {
                        label: "People"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 123,
                        columnNumber: 11
                    }, this),
                    people.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchPeopleRow"], {
                            name: p.name,
                            username: p.username,
                            avatarUrl: p.avatarUrl,
                            onClick: ()=>onOpenThread(p.threadId)
                        }, p.participantId + p.threadId, false, {
                            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                            lineNumber: 125,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true),
            messages.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionHeader, {
                        label: "Messages"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 138,
                        columnNumber: 11
                    }, this),
                    messages.map((m)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMessageRow"], {
                            participantName: m.participantName,
                            participantAvatarUrl: m.participantAvatarUrl,
                            snippet: m.snippet,
                            date: formatDate(m.createdAt),
                            onClick: ()=>onOpenThread(m.threadId, m.id)
                        }, m.id, false, {
                            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                            lineNumber: 140,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true),
            links.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionHeader, {
                        label: "Links"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 154,
                        columnNumber: 11
                    }, this),
                    links.map((l)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchLinkRow"], {
                            url: l.url,
                            title: l.title,
                            senderName: l.senderName,
                            date: l.createdAt ? formatDate(l.createdAt) : undefined,
                            onClick: ()=>onOpenThread(l.threadId, l.id)
                        }, l.id + l.url, false, {
                            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                            lineNumber: 156,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true),
            files.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionHeader, {
                        label: "Files"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this),
                    files.map((f)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchFileRow"], {
                            fileName: f.fileName,
                            fileSize: f.fileSize ?? undefined,
                            fileType: f.fileType,
                            fileUrl: f.fileUrl,
                            senderName: f.senderName,
                            date: f.createdAt ? formatDate(f.createdAt) : undefined,
                            onClick: ()=>onOpenThread(f.threadId, f.id)
                        }, f.id, false, {
                            fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
                            lineNumber: 172,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/inbox/components/search-results-panel.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
}
// Helper: extract URLs from a string. Used by left-sidebar to derive Links
// section results from message contents.
const URL_REGEX = /https?:\/\/[^\s<>"]+/g;
function extractUrls(text) {
    if (!text) return [];
    const matches = text.match(URL_REGEX);
    return matches ?? [];
}
}),
"[project]/app/(group)/inbox/components/left-sidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/keys.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$thread$2d$actions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/hooks/use-thread-actions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useUserChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useUserChannel.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/spinner/spinner.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/e2ee.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/storage.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/chat.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input-group/input-group.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input-element.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/scroll-aria/scroll-area.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tooltip/tooltip.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$search$2d$results$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/search-results-panel.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/stories/inbox.stories.tsx [app-ssr] (ecmascript)");
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
;
;
;
;
function getOtherParticipantId(conv, me) {
    return conv.participantIds?.find((id)=>id !== me);
}
const LeftSidebar = ({ selectedConversation, setSelectedConversation, messagesByConversation, initialThreadId, initialParticipantId, searchIndex, onHighlightMessage })=>{
    const { pinnedChats, setPinnedChats, toggleShowPinnedIcon, showPinnedIcon, checkedChats, resetCheckedChats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useChatsContext"])();
    //getting the user id || can get other details later as required
    const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
    const currentUserId = currentUser?.id || "";
    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const [conversations, setConversations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [activeFilter, setActiveFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("all");
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [searchResults, setSearchResults] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [searchLoading, setSearchLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [checkedIds, setCheckedIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const [bulkActionPending, setBulkActionPending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const threadActions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$hooks$2f$use$2d$thread$2d$actions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useThreadActions"])(token || "");
    const visibleConversations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>conversations.filter((c)=>{
            switch(activeFilter){
                case "starred":
                    return c.isStarred;
                case "unread":
                    return c.markedUnread;
                case "sent":
                    return c.lastMessage?.m_senderId === currentUserId;
                case "archived":
                    return c.isArchived;
                case "spam":
                    return c.isSpam;
                case "trash":
                    return c.isTrashed;
                case "all":
                default:
                    return !c.isArchived && !c.isSpam && !c.isTrashed;
            }
        }), [
        activeFilter,
        conversations,
        currentUserId
    ]);
    const clearSelection = ()=>{
        setCheckedIds(new Set());
        resetCheckedChats?.();
    };
    const bulkAction = async (action, patch)=>{
        if (bulkActionPending) return false;
        const ids = Array.from(checkedIds);
        if (!ids.length) return false;
        setBulkActionPending(true);
        try {
            await threadActions.bulk(ids, action);
            const idSet = new Set(ids);
            setConversations((prev)=>prev.map((c)=>idSet.has(c.id) ? {
                        ...c,
                        ...patch
                    } : c));
            if (selectedConversation && idSet.has(selectedConversation.id)) {
                setSelectedConversation({
                    ...selectedConversation,
                    ...patch
                });
            }
            clearSelection();
            return true;
        } catch (err) {
            console.error("[LeftSidebar] bulk action failed:", err);
            return false;
        } finally{
            setBulkActionPending(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!token) return;
        let cancelled = false;
        const patchConv = (id, patch)=>{
            if (cancelled) return;
            setConversations((prev)=>prev.map((c)=>c.id === id ? {
                        ...c,
                        ...patch
                    } : c));
        };
        const enrichGroup = async (conv)=>{
            try {
                const group = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/v1/threads/${conv.id}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                patchConv(conv.id, {
                    participantUsername: group.name
                });
            } catch (err) {
                console.warn(`[LeftSidebar] failed to fetch group name for ${conv.id}`, err);
                patchConv(conv.id, {
                    participantUsername: "Unnamed Group"
                });
            }
        };
        const enrichIndividual = async (conv, privKeyRef)=>{
            const otherId = conv.participantIds?.find((id)=>id !== currentUserId);
            if (!otherId) {
                patchConv(conv.id, {
                    participantUsername: "Unknown User"
                });
                return;
            }
            try {
                const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/users/${otherId}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const displayName = user.firstName?.trim() || user.username;
                patchConv(conv.id, {
                    participantUsername: displayName,
                    participantAvatarUrl: user.avatarUrl
                });
            } catch (err) {
                console.warn(`[LeftSidebar] failed to fetch user for ${otherId}`, err);
                patchConv(conv.id, {
                    participantUsername: "Unknown User"
                });
                return;
            }
            // Last-message preview (best-effort; placeholder already rendered)
            const lm = conv.lastMessage;
            if (!lm) return;
            // Forward indicator mirrors chat-bubble UI (Send03 icon + "Forwarded"
            // label there, ↪ here in the row preview where icons are unavailable).
            const fwd = lm.m_forwardedFromId ? "↪ " : "";
            if (lm.m_content) {
                patchConv(conv.id, {
                    lastMessagePreview: `${fwd}${lm.m_content}`
                });
                return;
            }
            // File-only or image-only message — show filename as the preview.
            // Backend uses TypeORM getRawOne() which prefixes attachment columns
            // with the table alias, e.g. `a_fileName`/`a_fileType`.
            const att = lm.attachment;
            if (att?.a_fileName || att?.a_fileType) {
                const isImage = (att.a_fileType || "").startsWith("image/");
                const rawName = att.a_fileName || (isImage ? "Image" : "File");
                const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateFilenameMiddle"])(rawName);
                patchConv(conv.id, {
                    lastMessagePreview: `${fwd}${isImage ? "🖼️" : "📎"} ${name}`
                });
                return;
            }
            if (!lm.m_ciphertext) {
                // Forwarded messages may have neither content, ciphertext, nor an
                // attachment (forward only copies content/ciphertext, not attachments —
                // upstream bug). Still surface that the conversation has activity.
                if (lm.m_forwardedFromId) {
                    patchConv(conv.id, {
                        lastMessagePreview: "↪ Forwarded message"
                    });
                }
                return;
            }
            let key = null;
            try {
                key = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadKey"])(conv.id);
            } catch  {}
            if (!key && currentUserId) {
                try {
                    const privKey = privKeyRef.current;
                    if (privKey) {
                        const { encryptedKey } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`, {
                            headers: {
                                Authorization: `Bearer ${token}`
                            }
                        });
                        const wrapped = Uint8Array.from(atob(encryptedKey), (c)=>c.charCodeAt(0));
                        const rawBuffer = await window.crypto.subtle.decrypt({
                            name: "RSA-OAEP"
                        }, privKey, wrapped);
                        key = new Uint8Array(rawBuffer);
                        const b64 = btoa(String.fromCharCode(...key));
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$storage$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["saveKey"])(conv.id, b64);
                    }
                } catch  {
                /* unwrap failed; keep placeholder */ }
            }
            if (key) {
                try {
                    const decrypted = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$e2ee$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["decryptAES"])(lm.m_ciphertext, key);
                    patchConv(conv.id, {
                        lastMessagePreview: `${fwd}${decrypted}`
                    });
                } catch  {
                /* decrypt failed; placeholder remains */ }
            }
        };
        const run = async ()=>{
            try {
                const data = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (cancelled) return;
                // Render list immediately with placeholders; no network/crypto blocked.
                const placeholders = data.map((conv)=>{
                    const lm = conv.lastMessage;
                    let preview = "";
                    const att = lm?.attachment;
                    const fwd = lm?.m_forwardedFromId ? "↪ " : "";
                    if (lm?.m_content) {
                        preview = `${fwd}${lm.m_content}`;
                    } else if (att?.a_fileName || att?.a_fileType) {
                        const isImage = (att.a_fileType || "").startsWith("image/");
                        const rawName = att.a_fileName || (isImage ? "Image" : "File");
                        const name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["truncateFilenameMiddle"])(rawName);
                        preview = `${fwd}${isImage ? "🖼️" : "📎"} ${name}`;
                    } else if (lm?.m_ciphertext) {
                        preview = `${fwd}Encrypted message`;
                    } else if (lm?.m_forwardedFromId) {
                        // Forwarded file/image messages don't carry attachments via the
                        // forward (backend bug — forward.ts only copies content/ciphertext).
                        // Show a generic forward indicator so the row isn't "No messages yet".
                        preview = "↪ Forwarded message";
                    }
                    return {
                        ...conv,
                        participantUsername: conv.isGroup ? "Group" : "…",
                        lastMessagePreview: preview
                    };
                });
                setConversations(placeholders);
                setPinnedChats?.(placeholders.filter((c)=>c.isPinned).length);
                setIsLoading(false);
                // Auto-select the thread if the caller passed ?threadId=... and it
                // exists in this user's threads. Only fires once per mount.
                // If the thread was previously trashed, restore it so it's visible
                // again (user explicitly chose to message this person). Other flags
                // (archived, spam) are intentional — leave them as-is.
                if (initialThreadId) {
                    const match = placeholders.find((c)=>c.id === initialThreadId);
                    if (match && !cancelled) {
                        if (match.isTrashed) {
                            threadActions.untrash(match.id).catch(()=>{});
                            const restored = {
                                ...match,
                                isTrashed: false
                            };
                            setConversations((prev)=>prev.map((c)=>c.id === match.id ? restored : c));
                            setSelectedConversation(restored);
                        } else {
                            setSelectedConversation(match);
                        }
                        // Clear threadId from URL so refreshes don't re-trigger
                        // auto-select or auto-untrash.
                        router.replace("/inbox", {
                            scroll: false
                        });
                    }
                }
                // Load the private key once per pass; share across all unwraps.
                const privKeyRef = {
                    current: null
                };
                if (currentUserId) {
                    try {
                        privKeyRef.current = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadPrivateKey"])(currentUserId);
                    } catch  {
                        privKeyRef.current = null;
                    }
                }
                // Enrich in parallel; each resolves independently and patches state.
                await Promise.allSettled(data.map((conv)=>conv.isGroup ? enrichGroup(conv) : enrichIndividual(conv, privKeyRef)));
            } catch (err) {
                if (!cancelled) {
                    console.error("[LeftSidebar] error fetching conversations:", err);
                    setIsLoading(false);
                }
            }
        };
        run();
        return ()=>{
            cancelled = true;
        };
    }, [
        currentUserId,
        token,
        initialThreadId
    ]);
    // Handle ?participantId= independently of the thread-list fetch so it works
    // even when GET /v1/threads is unavailable.
    // Fast path: if the thread-list load has populated a 1:1 thread with the
    // target participant, select it immediately — skips the POST round-trip.
    // Slow path: no local match → POST /v1/threads to create; backend is
    // idempotent and the DB unique index on 1:1 pairs prevents duplicates.
    // Ref guard covers React 18 StrictMode double-invoke and rapid clicks.
    const createdForParticipantRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!initialParticipantId || !currentUserId || !token) return;
        if (initialParticipantId === currentUserId) {
            router.replace("/inbox", {
                scroll: false
            });
            return;
        }
        if (createdForParticipantRef.current === initialParticipantId) return;
        // Wait for the thread-list fetch before deciding local-vs-POST.
        if (isLoading) return;
        createdForParticipantRef.current = initialParticipantId;
        const local = conversations.find((c)=>!c.isGroup && c.participantIds?.length === 2 && c.participantIds.includes(initialParticipantId));
        if (local) {
            if (local.isTrashed) {
                threadActions.untrash(local.id).catch(()=>{});
                const restored = {
                    ...local,
                    isTrashed: false
                };
                setConversations((prev)=>prev.map((c)=>c.id === restored.id ? restored : c));
                setSelectedConversation(restored);
            } else {
                setSelectedConversation(local);
            }
            router.replace("/inbox", {
                scroll: false
            });
            return;
        }
        let cancelled = false;
        (async ()=>{
            try {
                const thread = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: {
                        participantIds: [
                            currentUserId,
                            initialParticipantId
                        ],
                        isGroup: false
                    }
                });
                if (cancelled) return;
                setConversations((prev)=>{
                    const existing = prev.find((c)=>c.id === thread.id);
                    if (existing) {
                        if (!existing.isTrashed) {
                            setSelectedConversation(existing);
                        } else {
                            threadActions.untrash(existing.id).catch(()=>{});
                            const restored = {
                                ...existing,
                                isTrashed: false
                            };
                            setSelectedConversation(restored);
                            return prev.map((c)=>c.id === restored.id ? restored : c);
                        }
                        return prev;
                    }
                    const placeholder = {
                        ...thread,
                        participantUsername: "…",
                        lastMessagePreview: ""
                    };
                    setSelectedConversation(placeholder);
                    return [
                        placeholder,
                        ...prev
                    ];
                });
                router.replace("/inbox", {
                    scroll: false
                });
            } catch (err) {
                console.error("[LeftSidebar] participantId thread create failed:", err);
            }
        })();
        return ()=>{
            cancelled = true;
        };
    }, [
        currentUserId,
        token,
        initialParticipantId,
        isLoading,
        conversations
    ]);
    // Live-sync: apply server state-change broadcasts (pin/star/archive/...)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useUserChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useUserChannel"])({
        onThreadStateChanged: ({ threadId, patch })=>{
            if (patch.removed) {
                setConversations((prev)=>prev.filter((c)=>c.id !== threadId));
                return;
            }
            setConversations((prev)=>{
                const next = prev.map((c)=>c.id === threadId ? {
                        ...c,
                        ...patch
                    } : c);
                next.sort((a, b)=>{
                    if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                });
                return next;
            });
            // Keep the currently-open thread in the top bar in sync too
            if (selectedConversation && selectedConversation.id === threadId) {
                setSelectedConversation({
                    ...selectedConversation,
                    ...patch
                });
            }
        }
    });
    // Keep the pinned-chats bar count in sync with the live conversations list
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setPinnedChats?.(conversations.filter((c)=>c.isPinned).length);
    }, [
        conversations,
        setPinnedChats
    ]);
    const searching = searchQuery.trim().length > 0;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isLoading || initialParticipantId || searching) return;
        const selectedVisible = selectedConversation ? visibleConversations.some((c)=>c.id === selectedConversation.id) : false;
        if (selectedVisible) return;
        const firstVisible = visibleConversations[0] ?? null;
        if (firstVisible) {
            setSelectedConversation(firstVisible);
        }
    }, [
        initialParticipantId,
        isLoading,
        searching,
        selectedConversation,
        setSelectedConversation,
        visibleConversations
    ]);
    // Search uses the persisted client-side index when available (covers the
    // full history). Falls back to in-memory messagesByConversation (only
    // opened threads) when the index hook isn't plumbed in yet.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const q = searchQuery.trim();
        if (!q) {
            setSearchResults([]);
            setSearchLoading(false);
            return;
        }
        setSearchLoading(true);
        const handle = setTimeout(()=>{
            if (searchIndex?.ready) {
                setSearchResults(searchIndex.search(q));
            } else {
                const ql = q.toLowerCase();
                const hits = [];
                for (const [threadId, msgs] of Object.entries(messagesByConversation ?? {})){
                    for (const m of msgs){
                        if (m.isDeleted || m.deleted) continue;
                        const content = m.content || "";
                        if (content.toLowerCase().includes(ql)) {
                            hits.push({
                                id: m.id,
                                threadId,
                                senderId: m.senderId,
                                content,
                                createdAt: m.createdAt
                            });
                        }
                    }
                }
                hits.sort((a, b)=>new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setSearchResults(hits.slice(0, 50));
            }
            setSearchLoading(false);
        }, 150);
        return ()=>clearTimeout(handle);
    }, [
        searchQuery,
        messagesByConversation,
        searchIndex
    ]);
    const openSearchResult = (threadId, messageId)=>{
        const conv = conversations.find((c)=>c.id === threadId);
        if (conv) setSelectedConversation(conv);
        if (messageId) onHighlightMessage?.(messageId);
        setSearchQuery("");
    };
    // Derive the four sections from search results + conversations list.
    // People comes from the conversations array (no index needed). Messages,
    // Links and Files all derive from the existing searchResults array.
    const searchSections = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            return {
                people: [],
                messages: [],
                links: [],
                files: []
            };
        }
        const people = [];
        for (const conv of conversations){
            if (conv.isGroup) continue;
            const otherId = conv.participantIds?.find((id)=>id !== currentUserId);
            if (!otherId) continue;
            const name = conv.participantName || conv.participantUsername;
            const username = conv.participantUsername;
            if (!name && !username) continue;
            const haystack = `${name ?? ""} ${username ?? ""}`.toLowerCase();
            if (!haystack.includes(q)) continue;
            people.push({
                participantId: otherId,
                threadId: conv.id,
                name: name || username || "Unknown",
                username: username,
                avatarUrl: conv.participantAvatarUrl
            });
        }
        const convById = new Map(conversations.map((c)=>[
                c.id,
                c
            ]));
        // Messages section = matches in actual message TEXT.
        // File-only messages (empty content, attachments only) belong in the
        // Files section, not Messages — otherwise the same message shows up
        // twice with a misleading "Encrypted message" snippet.
        // Sorted newest-first so users find their recent activity quickly
        // (matching Slack/Discord/iMessage search behavior).
        const messages = searchResults.filter((r)=>(r.content || "").trim().length > 0).map((r)=>{
            const conv = convById.get(r.threadId);
            return {
                id: r.id,
                threadId: r.threadId,
                participantName: conv?.participantUsername || "Conversation",
                participantAvatarUrl: conv?.participantAvatarUrl,
                snippet: r.content,
                createdAt: r.createdAt
            };
        }).sort((a, b)=>b.createdAt.localeCompare(a.createdAt));
        // Links and Files iterate the FULL doc set (not fuse output) because
        // fuse keys on `content` + filenames; a URL inside a message body that
        // doesn't otherwise fuzzy-match the query would be missed by fuse but
        // still belongs in the Links list. Same logic for Files when the query
        // is a partial filename — the substring filter below catches it even
        // when fuse's threshold doesn't.
        const allDocs = searchIndex?.allDocs ?? [];
        // Per Figma, Links and Files rows include a small sender-name header
        // above each card. For 1:1 threads we can derive that from the cached
        // participantUsername — for the current user we just say "You".
        const senderNameFor = (senderId, conv)=>{
            if (senderId === currentUserId) return "You";
            return conv?.participantUsername || "Unknown";
        };
        const links = [];
        for (const r of allDocs){
            const contentLower = (r.content || "").toLowerCase();
            const urls = (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$search$2d$results$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["extractUrls"])(r.content || "");
            const conv = convById.get(r.threadId);
            for (const url of urls){
                if (!url.toLowerCase().includes(q) && !contentLower.includes(q)) {
                    continue;
                }
                links.push({
                    id: r.id,
                    threadId: r.threadId,
                    url,
                    senderName: senderNameFor(r.senderId, conv),
                    createdAt: r.createdAt
                });
            }
        }
        const files = [];
        for (const r of allDocs){
            if (!r.attachments?.length) continue;
            const contentLower = (r.content || "").toLowerCase();
            const conv = convById.get(r.threadId);
            for (const a of r.attachments){
                const fname = a.fileName || "(untitled)";
                if (!fname.toLowerCase().includes(q) && !contentLower.includes(q)) {
                    continue;
                }
                files.push({
                    id: a.id,
                    threadId: r.threadId,
                    fileName: fname,
                    fileSize: a.fileSize ?? null,
                    fileType: a.fileType,
                    fileUrl: a.fileUrl,
                    senderName: senderNameFor(r.senderId, conv),
                    createdAt: r.createdAt
                });
            }
        }
        // Links and Files: newest-first.
        const byCreatedDesc = (a, b)=>(b.createdAt || "").localeCompare(a.createdAt || "");
        links.sort(byCreatedDesc);
        files.sort(byCreatedDesc);
        return {
            people,
            messages,
            links,
            files
        };
    }, [
        searchQuery,
        searchResults,
        conversations,
        currentUserId,
        searchIndex
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-[322px] shrink-0 border-r bg-white border-gray-200 h-full flex flex-col min-h-0",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pt-1 p-3 border-b border-gray-200 shrink-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                        modal: false,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "focus-visible:outline-none w-[157px] h-11 inline-flex items-center justify-center shrink-0 text-base leading-6 font-semibold gap-x-[6px]",
                                    children: [
                                        {
                                            all: "All Messages",
                                            unread: "Unread",
                                            starred: "Starred",
                                            sent: "Sent",
                                            archived: "Archived",
                                            spam: "Spam",
                                            trash: "Trash"
                                        }[activeFilter] ?? "All Messages",
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                            className: "size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 781,
                                            columnNumber: 177
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                    lineNumber: 780,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 779,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                align: "start",
                                side: "bottom",
                                sideOffset: 4,
                                className: "w-[142px] max-h-[170px] overflow-y-auto rounded-[5px]",
                                children: [
                                    [
                                        "all",
                                        "All Messages"
                                    ],
                                    [
                                        "unread",
                                        "Unread"
                                    ],
                                    [
                                        "starred",
                                        "Starred"
                                    ],
                                    [
                                        "sent",
                                        "Sent"
                                    ],
                                    [
                                        "archived",
                                        "Archived"
                                    ],
                                    [
                                        "spam",
                                        "Spam"
                                    ],
                                    [
                                        "trash",
                                        "Trash"
                                    ]
                                ].map(([key, label])=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                        className: `w-[142px] h-[34px] gap-[8px] py-[10px] px-3 ${activeFilter === key ? "font-semibold" : ""}`,
                                        onSelect: ()=>setActiveFilter(key),
                                        children: label
                                    }, key, false, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 799,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)))
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 784,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 778,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    checkedChats > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "inline-flex gap-x-0.5 items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>clearSelection(),
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 823,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 817,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 816,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Close"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 826,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 815,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 814,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[13px] font-semibold leading-[18.88px] text-dark-blue-400",
                                                children: [
                                                    checkedChats,
                                                    " selected"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 829,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 813,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>{
                                                                    void bulkAction("mark-unread", {
                                                                        markedUnread: true
                                                                    });
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mail05"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 844,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 838,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 837,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Mark Unread"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 847,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 836,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 835,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>{
                                                                    void bulkAction("star", {
                                                                        isStarred: true
                                                                    });
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 859,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 853,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 852,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Star"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 862,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 851,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 850,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>{
                                                                    void bulkAction("pin", {
                                                                        isPinned: true
                                                                    });
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Pin02"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 874,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 868,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 867,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Pin"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 877,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 866,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 865,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>{
                                                                    void bulkAction("archive", {
                                                                        isArchived: true
                                                                    });
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Archive"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 889,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 883,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 882,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Archive"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 892,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 881,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 880,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-dark-blue-400",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>{
                                                                    void bulkAction("spam", {
                                                                        isSpam: true
                                                                    });
                                                                },
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AlertTriangle"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 904,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 898,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 897,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Move to Spam"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 907,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 896,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 895,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                                className: "rounded-full size-7 text-gray-400 hover:text-error-500 hover:bg-error-100",
                                                                visual: "gray",
                                                                variant: "ghost",
                                                                onClick: ()=>setShowBulkDeleteConfirm(true),
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trash2"], {
                                                                    className: "size-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                    lineNumber: 919,
                                                                    columnNumber: 25
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                                lineNumber: 913,
                                                                columnNumber: 23
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 912,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            side: "bottom",
                                                            children: "Delete"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                            lineNumber: 922,
                                                            columnNumber: 21
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 911,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 910,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 834,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 812,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                                open: showBulkDeleteConfirm,
                                onOpenChange: setShowBulkDeleteConfirm,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                                    className: "max-w-[348px] p-7 rounded-xl",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                            children: [
                                                "Delete ",
                                                checkedIds.size,
                                                " chats?"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 929,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                            className: "mt-2",
                                            children: "These chats will be moved to Trash. You can restore them later from the Trash filter."
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 930,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-8 grid grid-cols-2 gap-x-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                                    asChild: true,
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                        visual: "gray",
                                                        variant: "outlined",
                                                        children: "Cancel"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                        lineNumber: 935,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 934,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    onClick: ()=>{
                                                        void bulkAction("trash", {
                                                            isTrashed: true
                                                        }).then((ok)=>{
                                                            if (ok) setShowBulkDeleteConfirm(false);
                                                        });
                                                    },
                                                    disabled: bulkActionPending,
                                                    children: "Yes, Delete"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                    lineNumber: 939,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 933,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                    lineNumber: 928,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 927,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2d$group$2f$input$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputGroup"], {
                                className: "flex-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                        id: "search-bar",
                                        type: "text",
                                        className: "h-8 pl-[34px] py-2.5 pr-8 text-xs leading-5",
                                        placeholder: "Search inbox",
                                        value: searchQuery,
                                        onChange: (e)=>setSearchQuery(e.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 956,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputLeftElement"], {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMd"], {
                                            className: "text-gray-400 size-4"
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 965,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 964,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    searchQuery && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2d$element$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InputRightElement"], {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            className: "text-gray-400 hover:text-gray-600",
                                            onClick: ()=>setSearchQuery(""),
                                            "aria-label": "Clear search",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                                className: "size-3.5"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                                lineNumber: 975,
                                                columnNumber: 21
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                            lineNumber: 969,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                        lineNumber: 968,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 955,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                className: "size-8 rounded-full",
                                visual: "gray",
                                variant: "ghost",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Edit05"], {
                                    className: "size-4"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                    lineNumber: 982,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 981,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 954,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                lineNumber: 777,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            pinnedChats > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "py-1 flex h-7 items-center justify-between pr-2 pl-4 bg-gray-25 border-b border-gray-200 shrink-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Pin02"], {
                                className: "text-gray-500 fill-gray-500 size-4"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 990,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[11px] leading-5 font-semibold text-gray-500",
                                children: [
                                    pinnedChats,
                                    " pinned chats"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 991,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 989,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    showPinnedIcon ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        className: "hover:no-underline",
                        variant: "link",
                        visual: "gray",
                        onClick: ()=>toggleShowPinnedIcon(),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                className: "size-[15px]"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 1003,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            " Close"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 997,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        className: "hover:no-underline",
                        variant: "link",
                        visual: "gray",
                        onClick: ()=>toggleShowPinnedIcon(),
                        children: "View"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 1006,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                lineNumber: 988,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                className: "flex-1 min-h-0",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-col",
                    children: searching ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$search$2d$results$2d$panel$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchResultsPanel"], {
                        query: searchQuery,
                        isLoading: searchLoading,
                        isIndexing: searchIndex?.isIndexing,
                        indexProgress: searchIndex?.progress,
                        people: searchSections.people,
                        messages: searchSections.messages,
                        links: searchSections.links,
                        files: searchSections.files,
                        onOpenThread: openSearchResult
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 1021,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)) : isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-center py-12 text-gray-400",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$spinner$2f$spinner$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Spinner"], {
                            size: 24,
                            strokeWidth: 3
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                            lineNumber: 1034,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                        lineNumber: 1033,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)) : (()=>{
                        return visibleConversations.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col items-center justify-center py-12 gap-2 text-gray-400",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Mail05"], {
                                    className: "size-8 stroke-[1.5]"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                    lineNumber: 1039,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm",
                                    children: activeFilter === "all" ? "No conversations yet" : `No ${activeFilter} conversations`
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                    lineNumber: 1040,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                            lineNumber: 1038,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)) : visibleConversations.map((conv)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Chat"], {
                                conversation: {
                                    ...conv,
                                    participantUsername: conv.participantUsername
                                },
                                variant: selectedConversation?.id === conv.id ? "active" : "default",
                                pinned: conv.isPinned,
                                starred: conv.isStarred,
                                onStarredChange: (val)=>{
                                    setConversations((prev)=>prev.map((c)=>c.id === conv.id ? {
                                                ...c,
                                                isStarred: val
                                            } : c));
                                },
                                onMarkUnread: ()=>{
                                    const next = !conv.markedUnread;
                                    (next ? threadActions.markUnread(conv.id) : threadActions.markRead(conv.id)).catch(console.error);
                                    setConversations((prev)=>prev.map((c)=>c.id === conv.id ? {
                                                ...c,
                                                markedUnread: next
                                            } : c));
                                },
                                onArchive: ()=>{
                                    const next = !conv.isArchived;
                                    (next ? threadActions.archive(conv.id) : threadActions.unarchive(conv.id)).catch(console.error);
                                    setConversations((prev)=>prev.map((c)=>c.id === conv.id ? {
                                                ...c,
                                                isArchived: next
                                            } : c));
                                },
                                onSpam: ()=>{
                                    const next = !conv.isSpam;
                                    (next ? threadActions.spam(conv.id) : threadActions.unspam(conv.id)).catch(console.error);
                                    setConversations((prev)=>prev.map((c)=>c.id === conv.id ? {
                                                ...c,
                                                isSpam: next
                                            } : c));
                                },
                                onTrash: ()=>{
                                    const next = !conv.isTrashed;
                                    (next ? threadActions.trash(conv.id) : threadActions.untrash(conv.id)).catch(console.error);
                                    setConversations((prev)=>prev.map((c)=>c.id === conv.id ? {
                                                ...c,
                                                isTrashed: next
                                            } : c));
                                },
                                checked: checkedIds.has(conv.id),
                                onCheckedChange: (convId, isChecked)=>{
                                    setCheckedIds((prev)=>{
                                        const next = new Set(prev);
                                        isChecked ? next.add(convId) : next.delete(convId);
                                        return next;
                                    });
                                },
                                currentUserId: currentUserId,
                                onClick: ()=>{
                                    setSelectedConversation(conv);
                                }
                            }, conv.id, false, {
                                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                                lineNumber: 1046,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)));
                    })()
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                    lineNumber: 1019,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
                lineNumber: 1018,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/inbox/components/left-sidebar.tsx",
        lineNumber: 776,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = LeftSidebar;
}),
"[project]/app/(group)/inbox/components/right-sidebar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useOnlineUsers.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/badge/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/favorite/favorite.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
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
const RightSidebar = ({ selectedConversation, jwtToken })=>{
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { isOnline } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useOnlineUsers$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useOnlineUsers"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setUser(null);
        if (!selectedConversation || !currentUser) return;
        const otherId = selectedConversation.participantIds?.find((id)=>id !== currentUser.id);
        if (!otherId) return;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])(`/users/${otherId}`, {
            method: "GET",
            headers: jwtToken ? {
                Authorization: `Bearer ${jwtToken}`
            } : {}
        }).then(setUser).catch(console.error);
    }, [
        selectedConversation,
        jwtToken
    ]);
    if (!selectedConversation) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm",
                children: "Select a conversation"
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 104,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
            lineNumber: 103,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    }
    if (!user) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm",
                children: "Loading profile..."
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 112,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
            lineNumber: 111,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    }
    const fullName = user.firstName?.trim() || user.username || "Unknown";
    const username = user.username || "";
    const avatarUrl = user.avatarUrl;
    const initials = fullName.charAt(0).toUpperCase();
    const rate = user.rateMin && user.rateMax ? `$${user.rateMin} - $${user.rateMax}` : null;
    const availability = user.availability;
    const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    }) : null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pb-5 flex flex-col items-center border-b border-gray-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                        size: "2xl",
                        isOnline: isOnline(user?.id),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                src: avatarUrl || undefined,
                                alt: fullName
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 129,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                delayMs: 0,
                                children: initials
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 130,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-2 flex flex-col gap-y-1.5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-base leading-[19.36px] text-center font-bold text-dark-blue-400",
                                children: fullName
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 134,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            username && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[13px] leading-[15.73px] text-center text-dark-blue-400",
                                children: [
                                    "@",
                                    username
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 138,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5 flex items-center gap-x-2 justify-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex items-center gap-x-1 border border-gray-300 rounded-l-[5px] h-9 xs:max-lg:h-[25.5px] px-3 shadow-xs cursor-pointer hover:bg-gray-50 text-gray-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Favorite"], {
                                                starClassName: "size-[12.75px] lg:size-5",
                                                className: "size-[12.75px] lg:size-5"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                lineNumber: 147,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "xs:max-lg:text-[8.93px] xs:max-lg:leading-[12.75px] text-sm",
                                                children: "Save"
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                lineNumber: 151,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                        lineNumber: 146,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    className: "group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500",
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                                        className: "duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                        lineNumber: 161,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                    lineNumber: 156,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                lineNumber: 155,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                                align: "end",
                                                side: "bottom",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioGroup"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                                value: "Customer Service",
                                                                children: "Customer Service"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                                lineNumber: 166,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                                value: "Digital Marketing",
                                                                children: "Digital Marketing"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                                lineNumber: 169,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                                value: "Email Marketing",
                                                                children: "Email Marketing"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                                lineNumber: 172,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                                value: "React Developers",
                                                                children: "React Developers"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                                lineNumber: 175,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                        lineNumber: 165,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                        lineNumber: 179,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        className: "text-primary-500",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Plus"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                                lineNumber: 181,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " Create New List"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                        lineNumber: 180,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                                lineNumber: 164,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                        lineNumber: 154,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 145,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                visual: "primary",
                                variant: "filled",
                                children: "Hire Me"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 186,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 144,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 127,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 pb-5 flex flex-col gap-y-3 border-b border-gray-200",
                children: [
                    rate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] leading-[15.73px] text-[#122A4B] font-light",
                                children: "Rate"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 195,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] leading-[15.73px] text-[#122A4B] font-light",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold",
                                        children: rate
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                        lineNumber: 197,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    " /hr"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 196,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 194,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    availability && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] leading-[15.73px] text-[#122A4B] font-light",
                                children: "Availability"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 203,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] leading-[15.73px] text-[#122A4B] font-bold",
                                children: availability
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 204,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 202,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    user?.clientSuccessRating && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-flex text-dark-blue-400 items-center text-xs leading-[14.52px] font-medium gap-x-1 py-1 px-2 bg-primary-50 rounded-[4px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                        className: "size-3 fill-dark-blue-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                        lineNumber: 210,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    " ",
                                    user.clientSuccessRating
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 209,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            user.totalProjectsCompleted != null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[13px] leading-[15.73px] text-[#122A4B] font-light",
                                children: [
                                    user.totalProjectsCompleted,
                                    " projects"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 213,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 208,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 192,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            user?.skills && user.skills.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-3 pb-5 border-b border-gray-200",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "font-bold text-sm text-dark-blue-400",
                        children: "Skills"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 223,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex flex-wrap gap-2",
                        children: user.skills.map((s)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                visual: "gray",
                                children: s.name
                            }, s.id, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 226,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)))
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 224,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 222,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-auto flex flex-col gap-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        visual: "gray",
                        variant: "outlined",
                        disabled: !user?.username,
                        onClick: ()=>{
                            if (!user?.username) return;
                            router.push(`/talent-profile?username=${encodeURIComponent(user.username)}`);
                        },
                        children: "View Full Profile"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 233,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    memberSince && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-center text-xs leading-[14.52px] text-dark-blue-400",
                        children: [
                            "Member since ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-semibold",
                                children: memberSince
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                                lineNumber: 247,
                                columnNumber: 26
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                        lineNumber: 246,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
                lineNumber: 232,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/inbox/components/right-sidebar.tsx",
        lineNumber: 126,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const __TURBOPACK__default__export__ = RightSidebar;
}),
"[project]/app/(group)/inbox/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>InboxRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/crypto/keys.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useMessageSearchIndex$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useMessageSearchIndex.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useToggle.js [app-ssr] (ecmascript) <export default as useToggle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/chat.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$inbox$2d$comps$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/inbox-comps.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/stories/inbox.stories.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$chats$2d$comp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/chats-comp.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$left$2d$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/left-sidebar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$right$2d$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/(group)/inbox/components/right-sidebar.tsx [app-ssr] (ecmascript)");
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
;
;
const Inbox = ({ children })=>{
    const [pinnedChats, setPinnedChats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const [showPinnedIcon, toggleShowPinnedIcon] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    const [checkedChats, setCheckedChats] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    // If everything gets unpinned while in "View pinned" mode, exit the mode
    // so the sidebar doesn't render empty with no visible Close control.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (pinnedChats === 0 && showPinnedIcon) {
            toggleShowPinnedIcon(false);
        }
    }, [
        pinnedChats,
        showPinnedIcon,
        toggleShowPinnedIcon
    ]);
    const onChatPinned = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>value ? setPinnedChats((prev)=>prev + 1) : setPinnedChats((prev)=>prev - 1), []);
    const onChatChecked = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((value)=>value ? setCheckedChats((prev)=>prev + 1) : setCheckedChats((prev)=>prev - 1), []);
    const resetCheckedChats = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>setCheckedChats(0), []);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            pinnedChats,
            setPinnedChats,
            onChatPinned,
            showPinnedIcon,
            toggleShowPinnedIcon,
            onChatChecked,
            resetCheckedChats,
            checkedChats
        }), [
        pinnedChats,
        onChatPinned,
        showPinnedIcon,
        toggleShowPinnedIcon,
        onChatChecked,
        resetCheckedChats,
        checkedChats
    ]);
    const [chat, setChat] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [isSaved, setIsSaved] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [selectedUser, setSelectedUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null) //  NEW STATE
    ;
    const onSave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setIsSaved(true);
    }, []);
    const onUnsave = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setChat("");
        setIsSaved(false);
    }, []);
    const editContextValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            chat,
            onChatChange: setChat,
            onSave,
            isSaved,
            onUnsave
        }), [
        chat,
        setChat,
        onSave,
        isSaved,
        onUnsave
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$inbox$2d$comps$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EditContextProvider"], {
        value: editContextValue,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$stories$2f$inbox$2e$stories$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EditContextProvider"], {
            value: editContextValue,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$chat$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChatsContextProvider"], {
                value: value,
                children: children
            }, void 0, false, {
                fileName: "[project]/app/(group)/inbox/page.tsx",
                lineNumber: 102,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/app/(group)/inbox/page.tsx",
            lineNumber: 101,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/app/(group)/inbox/page.tsx",
        lineNumber: 100,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
function InboxRoot() {
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const initialThreadId = searchParams?.get("threadId") ?? null;
    const initialParticipantId = searchParams?.get("participantId") ?? null;
    const [selectedConversation, setSelectedConversation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [privateKey, setPrivateKey] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [rightSidebarOpen, setRightSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [highlightMessageId, setHighlightMessageId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [messagesByConversation, setMessagesByConversation] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [currentUserProfile, setCurrentUserProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setToken((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])() || "");
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        ;
        (async ()=>{
            if (!token) return;
            // 0) Fetch full user profile (includes username)
            try {
                const me = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/user/me", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setCurrentUserProfile(me);
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }
            // 1) Ensure keypair exists, device registered, public key pushed
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ensureEncryptionKeysExist"])();
            // 2) Load private key from IndexedDB (keyed by userId)
            const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])()?.id;
            if (!uid) {
                console.error("No userId available after key setup");
                return;
            }
            const key = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$crypto$2f$keys$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadPrivateKey"])(uid);
            if (!key) {
                console.error("No private key found after key setup");
                return;
            }
            setPrivateKey(key);
        })();
    }, [
        token
    ]);
    // Callback to let Chats tell us when history is loaded. Stable ref so
    // chats-comp's effect dep array doesn't fire every render → infinite loop.
    const handleMessagesLoaded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((convId, msgs)=>{
        setMessagesByConversation((prev)=>{
            if (prev[convId] === msgs) return prev;
            return {
                ...prev,
                [convId]: msgs
            };
        });
    }, []);
    // Persisted client-side search index. Loads cached docs from IndexedDB
    // immediately, then rebuilds in the background as soon as we have a
    // private key (E2EE makes server-side search impossible).
    const currentUserId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])()?.id ?? null;
    const searchIndex = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useMessageSearchIndex$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMessageSearchIndex"])({
        userId: currentUserId,
        token,
        privateKey
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Inbox, {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex w-full bg-white overflow-hidden",
            style: {
                height: "calc(100vh - 65px)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$left$2d$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    selectedConversation: selectedConversation,
                    setSelectedConversation: setSelectedConversation,
                    // We pass the whole map so Sidebar can show previews:
                    messagesByConversation: messagesByConversation,
                    initialThreadId: initialThreadId,
                    initialParticipantId: initialParticipantId,
                    searchIndex: searchIndex,
                    onHighlightMessage: setHighlightMessageId
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/page.tsx",
                    lineNumber: 191,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$chats$2d$comp$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Chats"], {
                    selectedConversation: selectedConversation,
                    jwtToken: token,
                    privateKey: privateKey,
                    currentUserProfile: currentUserProfile,
                    onToggleRightSidebar: ()=>setRightSidebarOpen((v)=>!v),
                    onMessagesLoaded: handleMessagesLoaded,
                    highlightMessageId: highlightMessageId,
                    onHighlightConsumed: ()=>setHighlightMessageId(null),
                    onIndexNewMessage: searchIndex.addDoc
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/page.tsx",
                    lineNumber: 203,
                    columnNumber: 9
                }, this),
                rightSidebarOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f28$group$292f$inbox$2f$components$2f$right$2d$sidebar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    selectedConversation: selectedConversation,
                    jwtToken: token
                }, void 0, false, {
                    fileName: "[project]/app/(group)/inbox/page.tsx",
                    lineNumber: 216,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/app/(group)/inbox/page.tsx",
            lineNumber: 187,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/inbox/page.tsx",
        lineNumber: 186,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=app_%28group%29_inbox_0ucspdv._.js.map