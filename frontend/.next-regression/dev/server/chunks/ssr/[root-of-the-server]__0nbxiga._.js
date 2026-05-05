module.exports = [
"[project]/service/http/autocomplete.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AutocompleteAPI",
    ()=>AutocompleteAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-ssr] (ecmascript)");
;
const AutocompleteAPI = {
    getCategories: (q)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`/autocomplete/categories?q=${encodeURIComponent(q)}`);
    },
    getByType: (type, q = "")=>{
        const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`/autocomplete/${type}${suffix}`);
    },
    submit: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post("/autocomplete/submit", data);
    },
    getCategoryMap: ()=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("/autocomplete/category-map");
    },
    review: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch("/autocomplete/review", data);
    }
};
}),
"[project]/libs/autocomplete/utils/fetchAutocomplete.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchAutocomplete",
    ()=>fetchAutocomplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$autocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/autocomplete.ts [app-ssr] (ecmascript)");
;
const fetchAutocomplete = async (type, q = '')=>{
    try {
        const res = await __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$autocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AutocompleteAPI"].getByType(type, q);
        return res.data;
    } catch (err) {
        // Fallback to static JSON
        try {
            const mod = await __turbopack_context__.f({
                "@/public/mock/certifications.json": {
                    id: ()=>"[project]/public/mock/certifications.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/certifications.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/industries.json": {
                    id: ()=>"[project]/public/mock/industries.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/industries.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/job_titles.json": {
                    id: ()=>"[project]/public/mock/job_titles.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/job_titles.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/languages.json": {
                    id: ()=>"[project]/public/mock/languages.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/languages.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/options.json": {
                    id: ()=>"[project]/public/mock/options.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/options.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/projects.json": {
                    id: ()=>"[project]/public/mock/projects.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/projects.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/projectsnew.json": {
                    id: ()=>"[project]/public/mock/projectsnew.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/projectsnew.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/roles.json": {
                    id: ()=>"[project]/public/mock/roles.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/roles.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/skills.json": {
                    id: ()=>"[project]/public/mock/skills.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/skills.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/team-members.json": {
                    id: ()=>"[project]/public/mock/team-members.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/team-members.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/uploaded-files.json": {
                    id: ()=>"[project]/public/mock/uploaded-files.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/uploaded-files.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                },
                "@/public/mock/users.json": {
                    id: ()=>"[project]/public/mock/users.json.[json].cjs [app-ssr] (ecmascript, async loader)",
                    module: ()=>__turbopack_context__.A("[project]/public/mock/users.json.[json].cjs [app-ssr] (ecmascript, async loader)")
                }
            }).import(`@/public/mock/${type}.json`);
            const data = mod.default || mod;
            if (!q) return data.slice(0, 10);
            const lower = q.toLowerCase();
            return data.filter((item)=>(item.label || '').toLowerCase().includes(lower)).slice(0, 20);
        } catch  {
            return [];
        }
    }
};
}),
"[project]/libs/autocomplete/config/autocompleteConfig.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "autocompleteSources",
    ()=>autocompleteSources
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/utils/fetchAutocomplete.ts [app-ssr] (ecmascript)");
;
const autocompleteSources = {
    job_titles: (q)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAutocomplete"])('job_titles', q),
    skills: (q)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAutocomplete"])('skills', q),
    certifications: (q)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAutocomplete"])('certifications', q),
    industries: (q)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAutocomplete"])('industries', q),
    languages: (q)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fetchAutocomplete"])('languages', q)
};
}),
"[project]/libs/autocomplete/hooks/useAutocomplete.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAutocomplete",
    ()=>useAutocomplete
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$config$2f$autocompleteConfig$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/config/autocompleteConfig.ts [app-ssr] (ecmascript)");
;
;
function useAutocomplete(type, query, debounceMs = 250) {
    const [suggestions, setSuggestions] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (timerRef.current) clearTimeout(timerRef.current);
        const source = __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$config$2f$autocompleteConfig$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["autocompleteSources"][type];
        if (!source) return;
        if (!query || query.trim().length === 0) {
            // Load defaults (no query)
            setLoading(true);
            source().then((data)=>{
                setSuggestions(data);
                setLoading(false);
            }).catch(()=>setLoading(false));
            return;
        }
        timerRef.current = setTimeout(()=>{
            setLoading(true);
            source(query).then((data)=>{
                setSuggestions(data);
                setLoading(false);
            }).catch(()=>setLoading(false));
        }, debounceMs);
        return ()=>{
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [
        type,
        query,
        debounceMs
    ]);
    return {
        suggestions,
        loading
    };
}
}),
"[project]/libs/autocomplete/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$utils$2f$fetchAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/utils/fetchAutocomplete.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$config$2f$autocompleteConfig$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/config/autocompleteConfig.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$hooks$2f$useAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/hooks/useAutocomplete.ts [app-ssr] (ecmascript)");
;
;
;
}),
"[project]/libs/notifications.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "formatNotificationTime",
    ()=>formatNotificationTime,
    "getNotificationCta",
    ()=>getNotificationCta,
    "getNotificationHref",
    ()=>getNotificationHref,
    "getNotificationKind",
    ()=>getNotificationKind,
    "isUserNotification",
    ()=>isUserNotification,
    "mapAblyNotificationToUi",
    ()=>mapAblyNotificationToUi,
    "mapApiNotificationToUi",
    ()=>mapApiNotificationToUi
]);
const DEFAULT_USER_NOTIFICATION_AVATAR = "/man.jpg";
const readAvatarUrl = (metadata)=>{
    const avatarUrl = metadata?.avatarUrl;
    return typeof avatarUrl === "string" && avatarUrl.trim().length > 0 ? avatarUrl : undefined;
};
const readCtaLabel = (metadata)=>{
    const ctaLabel = metadata?.ctaLabel;
    return typeof ctaLabel === "string" && ctaLabel.trim().length > 0 ? ctaLabel : undefined;
};
const isUserNotification = (item, kind)=>{
    const normalizedTitle = item.title?.trim?.() || "";
    return kind === "message" || normalizedTitle.startsWith("@") || !!readAvatarUrl(item.metadata) || typeof item.metadata?.senderUsername === "string";
};
const formatter = new Intl.RelativeTimeFormat("en", {
    numeric: "auto"
});
const formatNotificationTime = (value)=>{
    const timestamp = new Date(value).getTime();
    const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);
    const ranges = [
        [
            "year",
            60 * 60 * 24 * 365
        ],
        [
            "month",
            60 * 60 * 24 * 30
        ],
        [
            "week",
            60 * 60 * 24 * 7
        ],
        [
            "day",
            60 * 60 * 24
        ],
        [
            "hour",
            60 * 60
        ],
        [
            "minute",
            60
        ],
        [
            "second",
            1
        ]
    ];
    for (const [unit, secondsInUnit] of ranges){
        if (Math.abs(deltaSeconds) >= secondsInUnit || unit === "second") {
            return formatter.format(Math.round(deltaSeconds / secondsInUnit), unit);
        }
    }
    return "just now";
};
const getNotificationKind = (item)=>{
    const category = item.category?.toLowerCase?.() || "";
    const event = item.event?.toLowerCase?.() || "";
    if (category.includes("message") || category.includes("chat") || event.includes("message") || event.includes("thread")) {
        return "message";
    }
    if (category.includes("team") || category.includes("invite") || event.includes("invite")) {
        return "team";
    }
    if (category.includes("project") || category.includes("contract") || category.includes("listing") || event.includes("project") || event.includes("contract")) {
        return "project";
    }
    return "system";
};
const getNotificationHref = (item, kind)=>{
    if (item.link) return item.link;
    switch(kind){
        case "message":
            return "/inbox";
        case "team":
            return "/my-team";
        case "project":
            return "/publish-project";
        case "system":
        default:
            return "/notifications";
    }
};
const getNotificationCta = (kind, metadata)=>{
    const metadataCta = readCtaLabel(metadata);
    if (metadataCta) return metadataCta;
    switch(kind){
        case "message":
            return "Open conversation";
        case "team":
            return "Open team";
        case "project":
            return "Open details";
        case "system":
        default:
            return "View details";
    }
};
const mapApiNotificationToUi = (item)=>{
    const kind = getNotificationKind(item);
    const metadata = item.metadata || null;
    const userNotification = isUserNotification({
        ...item,
        metadata
    }, kind);
    return {
        id: item.id,
        kind,
        title: item.title,
        description: item.body,
        timeLabel: formatNotificationTime(item.createdAt),
        href: getNotificationHref(item, kind),
        ctaLabel: getNotificationCta(kind, metadata),
        read: item.isRead,
        category: item.category,
        event: item.event,
        metadata,
        isUserNotification: userNotification,
        avatarSrc: readAvatarUrl(metadata) || (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
        avatarAlt: item.title
    };
};
const mapAblyNotificationToUi = (item)=>{
    const kind = getNotificationKind({
        id: item.id,
        title: item.title,
        body: item.body,
        link: item.link,
        category: item.category,
        event: "",
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString()
    });
    const userNotification = isUserNotification({
        title: item.title,
        category: item.category,
        event: "",
        metadata: item.metadata
    }, kind);
    return {
        id: item.id,
        kind,
        title: item.title,
        description: item.body,
        timeLabel: "just now",
        href: getNotificationHref({
            id: item.id,
            title: item.title,
            body: item.body,
            link: item.link,
            category: item.category,
            event: "",
            isRead: false,
            isArchived: false,
            createdAt: new Date().toISOString()
        }, kind),
        ctaLabel: getNotificationCta(kind, item.metadata),
        read: false,
        category: item.category,
        event: "",
        metadata: item.metadata,
        isUserNotification: userNotification,
        avatarSrc: readAvatarUrl(item.metadata) || (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
        avatarAlt: item.title
    };
};
}),
"[project]/src/lib/api/dev-login.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ensureDevAuth",
    ()=>ensureDevAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-ssr] (ecmascript)");
;
const GATEWAY_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") || "http://localhost:4000";
const DEV_EMAIL = ("TURBOPACK compile-time value", "dev@marketeq.local") || "dev@marketeq.local";
async function ensureDevAuth() {
    if ("TURBOPACK compile-time truthy", 1) return false;
    //TURBOPACK unreachable
    ;
    // If there's already a token, verify it decodes to the right user
    const existing = undefined;
}
}),
"[project]/src/lib/api/contracts.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createContractGroup",
    ()=>createContractGroup,
    "disputeContract",
    ()=>disputeContract,
    "endContract",
    ()=>endContract,
    "getClientContracts",
    ()=>getClientContracts,
    "getContract",
    ()=>getContract,
    "getContractGroup",
    ()=>getContractGroup,
    "getTalentContracts",
    ()=>getTalentContracts,
    "respondToContract",
    ()=>respondToContract
]);
// frontend/src/lib/api/contracts.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-ssr] (ecmascript)");
;
const CONTRACTS_API_URL = process.env.NEXT_PUBLIC_CONTRACTS_API_URL || "http://localhost:3010";
function authHeaders() {
    const token = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("access_token");
    return {
        "Content-Type": "application/json",
        ...token ? {
            Authorization: `Bearer ${token}`
        } : {}
    };
}
async function getContract(contractId) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/${contractId}`, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error fetching contract:", error);
        return null;
    }
}
async function getClientContracts(clientId) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/client/${clientId}`, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Error fetching client contracts:", error);
        return [];
    }
}
async function getTalentContracts(talentId) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/talent/${talentId}`, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Error fetching talent contracts:", error);
        return [];
    }
}
async function createContractGroup(dto) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contract-groups`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("Failed to create contract group:", res.status, text);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error("Error creating contract group:", error);
        return null;
    }
}
async function getContractGroup(groupId) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contract-groups/${groupId}`, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error fetching contract group:", error);
        return null;
    }
}
async function endContract(contractId, dto) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/${contractId}/end`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("Failed to end contract:", res.status, text);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error("Error ending contract:", error);
        return null;
    }
}
async function respondToContract(contractId, dto) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/${contractId}/respond`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("Failed to respond to contract:", res.status, text);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error("Error responding to contract:", error);
        return null;
    }
}
async function disputeContract(contractId, dto) {
    try {
        const res = await fetch(`${CONTRACTS_API_URL}/contracts/${contractId}/dispute`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("Failed to dispute contract:", res.status, text);
            return null;
        }
        return res.json();
    } catch (error) {
        console.error("Error disputing contract:", error);
        return null;
    }
}
}),
"[project]/service/http/notifications.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NotificationsAPI",
    ()=>NotificationsAPI,
    "default",
    ()=>__TURBOPACK__default__export__,
    "isTransientNotificationsApiError",
    ()=>isTransientNotificationsApiError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-ssr] (ecmascript)");
;
const API_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
const USER_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
const BASE = `${API_BASE}/v1/notifications`;
const NotificationsAPI = {
    list: (params)=>{
        const q = new URLSearchParams();
        if (params?.page) q.set("page", String(params.page));
        if (params?.limit) q.set("limit", String(params.limit));
        if (params?.category) q.set("category", params.category);
        if (params?.unread) q.set("unread", "true");
        const qs = q.toString();
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(qs ? `${BASE}?${qs}` : BASE);
    },
    getUnreadCount: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`${BASE}/unread-count`),
    markRead: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`${BASE}/${id}/read`, {}),
    markAllRead: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`${BASE}/read-all`, {}),
    archive: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`${BASE}/${id}/archive`, {}),
    remove: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].del(`${BASE}/${id}`),
    getPreferences: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`${BASE}/preferences`),
    getCatalog: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(`${BASE}/preferences/catalog`),
    updatePreferences: (payload)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch(`${BASE}/preferences`, payload),
    resetPreferences: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`${BASE}/preferences/reset`, {}),
    updatePhone: (phone)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].patch(`${USER_BASE}/user/phone`, {
            phone
        }),
    // Keep this explicit even when unavailable so callers can feature-detect
    // safely without reaching for `any` or failing type-checks.
    seedDev: undefined
};
const isTransientNotificationsApiError = (error)=>{
    // AxiosRequest is an axios wrapper; errors may follow axios error shape.
    const anyErr = error;
    const status = anyErr?.response?.status;
    const code = anyErr?.code;
    // Network / CORS / service down / gateway timeout etc.
    if (code === "ECONNABORTED" || code === "ERR_NETWORK" || code === "ERR_BAD_RESPONSE" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
        return true;
    }
    if (typeof status === "number") {
        // 401 happens frequently during auth bootstrap; UI retries after ensureDevAuth().
        if (status === 401) return true;
        // Retryable server errors.
        if (status === 408 || status === 429) return true;
        if (status >= 500) return true;
    }
    return false;
};
const __TURBOPACK__default__export__ = NotificationsAPI;
}),
"[project]/components/icons/logo.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Logo",
    ()=>Logo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Logo = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-[120px] h-[17.63px]", className),
        viewBox: "0 0 120 19",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M27.1105 18.2901C25.9895 18.2901 24.998 17.7044 23.9094 16.9886C23.2436 16.5498 22.4661 16.3128 21.6697 16.3059C20.8734 16.299 20.0919 16.5224 19.4187 16.9496C18.3171 17.6003 17.2284 18.3161 15.9518 18.3161H15.5501C14.6034 18.3073 13.691 17.9588 12.978 17.3334C12.2649 16.708 11.7981 15.8471 11.662 14.9063L11.6426 14.3467C11.6519 13.6629 11.83 12.9921 12.161 12.3945L13.7162 9.66144L14.6882 11.3729L13.5866 13.2469C13.3957 13.5882 13.2969 13.9737 13.3001 14.3651C13.3033 14.7565 13.4083 15.1403 13.6048 15.4783C13.8013 15.8164 14.0824 16.097 14.4202 16.2923C14.758 16.4876 15.1408 16.5908 15.5306 16.5917H15.9907C17.6561 16.5591 18.7253 14.6395 21.6349 14.6395C24.4343 14.6395 25.5229 16.6242 27.0781 16.6242C27.4244 16.635 27.7672 16.5526 28.0712 16.3857C28.3751 16.2187 28.6291 15.9732 28.8069 15.6746C28.9846 15.376 29.0797 15.0351 29.0822 14.6873C29.0847 14.3394 28.9947 13.9971 28.8213 13.6959L23.0475 3.51206C22.8497 3.17036 22.5661 2.88677 22.2249 2.68965C21.8838 2.49253 21.4971 2.38879 21.1035 2.38879C20.7099 2.38879 20.3232 2.49253 19.9821 2.68965C19.6409 2.88677 19.3573 3.17036 19.1595 3.51206L16.8266 7.55308L15.8546 5.84818L17.6561 2.67263C18.001 2.06824 18.4988 1.56604 19.099 1.21678C19.6992 0.867521 20.3806 0.683594 21.0743 0.683594C21.768 0.683594 22.4494 0.867521 23.0497 1.21678C23.6499 1.56604 24.1476 2.06824 24.4926 2.67263L30.2663 12.8305C30.5817 13.3856 30.7464 14.0141 30.744 14.6531C30.7417 15.2922 30.5723 15.9194 30.2528 16.4721C29.9333 17.0248 29.475 17.4836 28.9235 17.8027C28.3721 18.1217 27.7469 18.2898 27.1105 18.2901Z",
                fill: "#306CFE"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                opacity: "0.5",
                d: "M18.8039 13.1624C18.6937 12.9021 12.9135 2.75072 12.8746 2.69216C12.5296 2.08778 12.0319 1.58557 11.4317 1.23631C10.8315 0.887052 10.1501 0.703125 9.45636 0.703125C8.76265 0.703125 8.08125 0.887052 7.48103 1.23631C6.88082 1.58557 6.38307 2.08778 6.03811 2.69216L0.497645 12.3945C0.164716 12.9931 -0.00675583 13.6687 0.000203713 14.3543C0.00716325 15.0399 0.192313 15.7118 0.537325 16.3035C0.882336 16.8952 1.37525 17.3861 1.96726 17.7277C2.55928 18.0693 3.22987 18.2497 3.91265 18.251H4.32089C5.61691 18.251 6.68612 17.5418 7.78774 16.8845C8.26929 16.5932 8.80384 16.4011 9.36015 16.3195C9.91645 16.238 10.4834 16.2686 11.0278 16.4095C10.7659 15.8401 10.612 15.2266 10.5742 14.6005C9.32057 14.4749 8.05952 14.7505 6.97125 15.3878C2.02694 18.2641 1.13917 14.6851 1.9427 13.2079L7.47669 3.447C7.67449 3.10529 7.95814 2.82171 8.29928 2.62459C8.64043 2.42747 9.02713 2.32373 9.42072 2.32373C9.81431 2.32373 10.201 2.42747 10.5421 2.62459C10.8833 2.82171 11.1669 3.10529 11.3647 3.447L15.2528 10.2601L15.849 11.3143C17.0089 13.3836 17.4042 13.8651 17.4042 14.4703C17.4264 14.6082 17.4264 14.7489 17.4042 14.8868C17.9323 14.5393 18.4921 14.243 19.076 14.0018C19.0198 13.7119 18.9284 13.43 18.8039 13.1624Z",
                fill: "#306CFE"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M56.706 7.92758C56.6026 7.67272 56.7326 7.38218 56.9975 7.30784C57.4311 7.18611 57.9178 7.08663 58.4574 7.0094C59.2067 6.89145 59.99 6.83247 60.8074 6.83247C61.5158 6.83247 62.1084 6.90217 62.5852 7.04157C63.062 7.17025 63.4367 7.35791 63.7091 7.60454C63.9952 7.85117 64.1927 8.14606 64.3017 8.4892C64.4243 8.83234 64.4856 9.21837 64.4856 9.6473C64.4856 10.1191 64.4652 10.5963 64.4243 11.0788C64.3835 11.5507 64.3562 12.0171 64.3426 12.4782C64.3426 12.9393 64.363 13.3897 64.4039 13.8293C64.4211 14.0098 64.4491 14.1864 64.488 14.3592C64.5639 14.6963 64.3276 15.0518 63.982 15.0518H62.8751C62.6758 15.0518 62.4969 14.9292 62.425 14.7433L62.137 13.9983C62.1239 13.9643 62.0912 13.9419 62.0548 13.9419C62.0283 13.9419 62.0034 13.9538 61.9863 13.974C61.7158 14.293 61.3433 14.5718 60.8687 14.8105C60.3919 15.0464 59.772 15.1644 59.0091 15.1644C58.5323 15.1644 58.1032 15.1108 57.7217 15.0035C57.3403 14.8856 57.0133 14.7247 56.7409 14.521C56.4684 14.3065 56.2573 14.0599 56.1074 13.7811C55.9575 13.4916 55.8826 13.1699 55.8826 12.816C55.8826 12.3227 56.0189 11.9099 56.2913 11.5775C56.5774 11.2343 56.9793 10.9609 57.497 10.7571C58.0283 10.5427 58.6549 10.3979 59.377 10.3229C60.1126 10.2371 60.93 10.2103 61.8291 10.2424C61.9245 9.64194 61.87 9.21301 61.6656 8.95566C61.4613 8.68758 61.0049 8.55354 60.2965 8.55354C59.7652 8.55354 59.1999 8.59643 58.6004 8.68222C58.2225 8.73757 57.887 8.80408 57.5942 8.88175C57.343 8.94836 57.0721 8.8292 56.9743 8.58841L56.706 7.92758ZM59.8878 13.4433C60.4191 13.4433 60.8414 13.3522 61.1548 13.1699C61.4681 12.9768 61.6997 12.7731 61.8496 12.5586V11.5131C61.4272 11.481 61.0185 11.4756 60.6235 11.497C60.242 11.5185 59.9014 11.5667 59.6017 11.6418C59.302 11.7169 59.0636 11.8241 58.8865 11.9635C58.7094 12.1029 58.6209 12.2798 58.6209 12.4943C58.6209 12.7945 58.7299 13.0305 58.9478 13.202C59.1794 13.3629 59.4928 13.4433 59.8878 13.4433Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M72.4476 8.43194C72.3979 8.71258 72.1174 8.88589 71.8367 8.83689C71.6145 8.79811 71.4058 8.77872 71.2106 8.77872C70.7338 8.77872 70.3319 8.88059 70.0049 9.08434C69.7177 9.26124 69.5164 9.48768 69.4009 9.76367C69.3799 9.8138 69.3714 9.86808 69.3714 9.92243V14.5531C69.3714 14.8196 69.1554 15.0357 68.8889 15.0357H67.1975C66.931 15.0357 66.7149 14.8196 66.7149 14.5531V7.47586C66.7149 7.20936 66.931 6.99332 67.1975 6.99332H68.4159C68.6309 6.99332 68.8199 7.13549 68.8795 7.342L69.0854 8.05491C69.317 7.65815 69.712 7.35254 70.1071 7.13808C70.5022 6.92362 70.9654 6.81639 71.4967 6.81639C71.7328 6.81639 71.9901 6.84259 72.2686 6.89501C72.5155 6.94149 72.6686 7.18385 72.6248 7.4313L72.4476 8.43194Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M77.3955 11.8995C77.3044 11.7778 77.1613 11.7061 77.0093 11.7061H76.5356V14.5531C76.5356 14.8196 76.3195 15.0357 76.053 15.0357H74.3616C74.0951 15.0357 73.8791 14.8196 73.8791 14.5531V5.04052C73.8791 4.83492 74.0093 4.6519 74.2036 4.58458L75.895 3.99837C76.2085 3.88972 76.5356 4.12253 76.5356 4.45431V10.4194C76.9353 10.2726 77.2824 10.0104 77.5329 9.66613L79.3689 7.14341C79.4376 7.0491 79.5472 6.99332 79.6638 6.99332H81.3945C81.7994 6.99332 82.0243 7.46201 81.7708 7.77785L79.4576 10.6606L80.0299 11.2879L82.2228 14.2671C82.4574 14.5857 82.2299 15.0357 81.8342 15.0357H79.9853C79.8333 15.0357 79.6902 14.9641 79.5991 14.8424L77.3955 11.8995Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 32,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M91.5879 13.9343C91.7329 14.16 91.666 14.4618 91.4228 14.575C91.0777 14.7355 90.662 14.8784 90.1756 15.0035C89.4808 15.1751 88.7383 15.2609 87.9482 15.2609C86.2998 15.2609 85.0941 14.8856 84.3313 14.1349C83.5684 13.3736 83.1869 12.3335 83.1869 11.0145C83.1869 9.59905 83.616 8.53745 84.4743 7.82972C85.3326 7.122 86.5382 6.76813 88.0912 6.76813C88.6089 6.76813 89.113 6.82175 89.6034 6.92898C90.0938 7.03621 90.5298 7.21314 90.9112 7.45978C91.2927 7.70641 91.5992 8.03883 91.8308 8.45703C92.0624 8.87523 92.1782 9.39531 92.1782 10.0173C92.1782 10.2424 92.1577 10.4837 92.1169 10.7411C92.0664 11.2183 91.6362 11.5453 91.1564 11.5453H85.8434C85.8843 12.2209 86.1023 12.7302 86.4973 13.0734C86.906 13.4165 87.5599 13.5881 88.4591 13.5881C89.0176 13.5881 89.5149 13.5237 89.9508 13.395C90.1794 13.3242 90.3798 13.2533 90.552 13.1824C90.7934 13.0831 91.0848 13.1515 91.2259 13.371L91.5879 13.9343ZM88.0504 8.44094C87.3556 8.44094 86.8379 8.60715 86.4973 8.93957C86.1704 9.26127 85.9728 9.69556 85.9047 10.2424H89.2663C89.5153 10.2424 89.7308 10.052 89.7125 9.80365C89.6853 9.43335 89.5672 9.1346 89.3582 8.9074C89.0857 8.59643 88.6498 8.44094 88.0504 8.44094Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M92.9917 7.47586C92.9917 7.20936 93.2078 6.99332 93.4743 6.99332H94.4017V5.83256C94.4017 5.62321 94.5367 5.43774 94.7359 5.37339L96.4274 4.82697C96.739 4.7263 97.0582 4.95866 97.0582 5.28615V6.99332H99.0687C99.3353 6.99332 99.5513 7.20936 99.5513 7.47586V8.2801C99.5513 8.5466 99.3353 8.76264 99.0687 8.76264H97.0582V11.8509C97.0582 12.4085 97.1264 12.8106 97.2626 13.0573C97.4124 13.2932 97.6849 13.4111 98.08 13.4111C98.3524 13.4111 98.584 13.3897 98.7748 13.3468C98.8357 13.334 98.8985 13.3193 98.9631 13.3027C99.2308 13.2338 99.5142 13.3765 99.5917 13.6418L99.7939 14.3339C99.8646 14.5757 99.7376 14.8324 99.4964 14.905C99.2332 14.9841 98.9449 15.0545 98.6317 15.1161C98.1413 15.2126 97.644 15.2609 97.14 15.2609C96.2 15.2609 95.5052 15.0732 95.0556 14.6979C94.6197 14.3119 94.4017 13.6846 94.4017 12.816V8.76264H93.4743C93.2078 8.76264 92.9917 8.5466 92.9917 8.2801V7.47586Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 40,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M108.989 13.9343C109.134 14.16 109.067 14.4618 108.824 14.575C108.479 14.7355 108.063 14.8784 107.577 15.0035C106.882 15.1751 106.14 15.2609 105.35 15.2609C103.701 15.2609 102.496 14.8856 101.733 14.1349C100.97 13.3736 100.588 12.3335 100.588 11.0145C100.588 9.59905 101.017 8.53745 101.876 7.82972C102.734 7.122 103.94 6.76813 105.493 6.76813C106.01 6.76813 106.514 6.82175 107.005 6.92898C107.495 7.03621 107.931 7.21314 108.313 7.45978C108.694 7.70641 109.001 8.03883 109.232 8.45703C109.464 8.87523 109.58 9.39531 109.58 10.0173C109.58 10.2424 109.559 10.4837 109.518 10.7411C109.468 11.2183 109.038 11.5453 108.558 11.5453H103.245C103.286 12.2209 103.504 12.7302 103.899 13.0734C104.307 13.4165 104.961 13.5881 105.861 13.5881C106.419 13.5881 106.916 13.5237 107.352 13.395C107.581 13.3242 107.781 13.2533 107.953 13.1824C108.195 13.0831 108.486 13.1515 108.627 13.371L108.989 13.9343ZM105.452 8.44094C104.757 8.44094 104.239 8.60715 103.899 8.93957C103.572 9.26127 103.374 9.69556 103.306 10.2424H106.668C106.917 10.2424 107.132 10.052 107.114 9.80365C107.087 9.43335 106.969 9.1346 106.76 8.9074C106.487 8.59643 106.051 8.44094 105.452 8.44094Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 44,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M120 17.1034C120 17.317 119.859 17.5052 119.655 17.566L117.963 18.0685C117.654 18.1604 117.343 17.9286 117.343 17.6059V14.344C117.112 14.6229 116.717 14.848 116.322 15.0196C115.927 15.1805 115.416 15.2609 114.789 15.2609C113.522 15.2609 112.548 14.9231 111.867 14.2475C111.199 13.572 110.866 12.5479 110.866 11.1754C110.866 9.73845 111.322 8.65005 112.235 7.91015C113.161 7.17025 114.483 6.8003 116.199 6.8003C116.567 6.8003 116.935 6.81639 117.303 6.84856C117.67 6.87 118.018 6.90753 118.345 6.96115C118.685 7.00404 118.999 7.05766 119.285 7.122C119.415 7.14635 119.535 7.17071 119.645 7.19507C119.856 7.2417 120 7.43223 120 7.64844V17.1034ZM115.504 13.4916C116.022 13.4916 116.417 13.4004 116.689 13.2181C116.952 13.0507 117.158 12.8064 117.305 12.4852C117.332 12.428 117.343 12.3654 117.343 12.3025V8.77872C117.139 8.69294 116.907 8.63932 116.649 8.61788C116.39 8.58571 116.097 8.56962 115.77 8.56962C115.048 8.56962 114.503 8.78409 114.135 9.21301C113.781 9.64194 113.604 10.2692 113.604 11.0949C113.604 11.8777 113.767 12.4729 114.094 12.8803C114.421 13.2878 114.891 13.4916 115.504 13.4916Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M51.4306 7.75031L47.7959 12.7615C47.7051 12.8867 47.5599 12.9608 47.4053 12.9608H46.9941C46.8419 12.9608 46.6986 12.889 46.6076 12.7671L42.9564 7.88183L42.9518 14.5535C42.9516 14.8199 42.7356 15.0357 42.4692 15.0357H40.7775C40.511 15.0357 40.2949 14.8196 40.2949 14.5531V4.25891C40.2949 3.99241 40.511 3.77637 40.7775 3.77637H42.6101C42.7608 3.77637 42.9028 3.84677 42.9941 3.9667L47.3206 9.65223C47.3359 9.67235 47.3597 9.68416 47.385 9.68416C47.4111 9.68416 47.4357 9.67157 47.4509 9.65033L51.5123 3.97799C51.6029 3.85144 51.749 3.77637 51.9046 3.77637H53.708C53.9745 3.77637 54.1905 3.99241 54.1905 4.25891V14.5531C54.1905 14.8196 53.9745 15.0357 53.708 15.0357H51.8761C51.6086 15.0357 51.3922 14.818 51.3936 14.5505L51.4306 7.75031Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/logo.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/facebook.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Facebook",
    ()=>Facebook
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Facebook = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", className),
        stroke: "currentColor",
        fill: "currentColor",
        strokeWidth: 0,
        viewBox: "0 0 320 512",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"
        }, void 0, false, {
            fileName: "[project]/components/icons/facebook.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/facebook.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/linkedin.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Linkedin",
    ()=>Linkedin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Linkedin = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", className),
        stroke: "currentColor",
        fill: "currentColor",
        strokeWidth: 0,
        viewBox: "0 0 448 512",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"
        }, void 0, false, {
            fileName: "[project]/components/icons/linkedin.tsx",
            lineNumber: 17,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/linkedin.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/protected-lock.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProtectedLock",
    ()=>ProtectedLock
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const ProtectedLock = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-[50px] w-[50px]", className),
        viewBox: "0 0 50 50",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M37.5 29.1665L43.75 31.2498C43.75 39.5832 42.4583 41.8748 37.5 43.7498C32.5417 41.8748 31.25 39.5832 31.25 31.2498L37.5 29.1665Z",
                stroke: "#22376B",
                strokeWidth: "1.6",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/protected-lock.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M37.5 20.8332V18.7498C37.5 18.1973 37.2805 17.6674 36.8898 17.2767C36.4991 16.886 35.9692 16.6665 35.4167 16.6665H29.1667L25 20.8332H8.33333C7.7808 20.8332 7.25089 21.0527 6.86019 21.4434C6.46949 21.8341 6.25 22.364 6.25 22.9165V37.4998C6.25 38.0524 6.46949 38.5823 6.86019 38.973C7.25089 39.3637 7.7808 39.5832 8.33333 39.5832H22.9167",
                stroke: "#306CFE",
                strokeWidth: "1.6",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/protected-lock.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M29.1666 16.6667L25 20.8333H10.4166V8.33333C10.4166 7.7808 10.6361 7.25089 11.0268 6.86019C11.4175 6.46949 11.9474 6.25 12.5 6.25H31.25C31.8025 6.25 32.3324 6.46949 32.7231 6.86019C33.1138 7.25089 33.3333 7.7808 33.3333 8.33333V16.6667H29.1666Z",
                stroke: "#306CFE",
                strokeWidth: "1.6",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/protected-lock.tsx",
                lineNumber: 29,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/protected-lock.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/user.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "User",
    ()=>User
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const User = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-5 w-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M9.99967 3.33203C10.8837 3.33203 11.7316 3.68322 12.3567 4.30834C12.9818 4.93346 13.333 5.78131 13.333 6.66536C13.333 7.54942 12.9818 8.39727 12.3567 9.02239C11.7316 9.64751 10.8837 9.9987 9.99967 9.9987C9.11562 9.9987 8.26777 9.64751 7.64265 9.02239C7.01753 8.39727 6.66634 7.54942 6.66634 6.66536C6.66634 5.78131 7.01753 4.93346 7.64265 4.30834C8.26777 3.68322 9.11562 3.33203 9.99967 3.33203ZM9.99967 11.6654C13.683 11.6654 16.6663 13.157 16.6663 14.9987V16.6654H3.33301V14.9987C3.33301 13.157 6.31634 11.6654 9.99967 11.6654Z",
            fill: "currentColor"
        }, void 0, false, {
            fileName: "[project]/components/icons/user.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/user.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/menu.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Menu",
    ()=>Menu
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Menu = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-5 h-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                y: "-0.0078125",
                width: "20",
                height: "1.63636",
                rx: "0.818182",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/menu.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "4.16602",
                y: "9.08203",
                width: "15.8333",
                height: "1.63636",
                rx: "0.818182",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/menu.tsx",
                lineNumber: 22,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: "9.9043",
                y: "18.1758",
                width: "10",
                height: "1.63636",
                rx: "0.818182",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/menu.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/menu.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/filter.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Filter",
    ()=>Filter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Filter = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-5 w-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M7.49967 4.16667C7.03944 4.16667 6.66634 4.53976 6.66634 5C6.66634 5.46024 7.03944 5.83333 7.49967 5.83333C7.95991 5.83333 8.33301 5.46024 8.33301 5C8.33301 4.53976 7.95991 4.16667 7.49967 4.16667ZM5.14193 4.16667C5.48513 3.19567 6.41116 2.5 7.49967 2.5C8.58819 2.5 9.51422 3.19567 9.85742 4.16667H15.833C16.2932 4.16667 16.6663 4.53976 16.6663 5C16.6663 5.46024 16.2932 5.83333 15.833 5.83333H9.85742C9.51422 6.80433 8.58819 7.5 7.49967 7.5C6.41116 7.5 5.48513 6.80433 5.14193 5.83333H4.16634C3.7061 5.83333 3.33301 5.46024 3.33301 5C3.33301 4.53976 3.7061 4.16667 4.16634 4.16667H5.14193ZM12.4997 9.16667C12.0394 9.16667 11.6663 9.53976 11.6663 10C11.6663 10.4602 12.0394 10.8333 12.4997 10.8333C12.9599 10.8333 13.333 10.4602 13.333 10C13.333 9.53976 12.9599 9.16667 12.4997 9.16667ZM10.1419 9.16667C10.4851 8.19567 11.4112 7.5 12.4997 7.5C13.5882 7.5 14.5142 8.19567 14.8574 9.16667H15.833C16.2932 9.16667 16.6663 9.53976 16.6663 10C16.6663 10.4602 16.2932 10.8333 15.833 10.8333H14.8574C14.5142 11.8043 13.5882 12.5 12.4997 12.5C11.4112 12.5 10.4851 11.8043 10.1419 10.8333H4.16634C3.7061 10.8333 3.33301 10.4602 3.33301 10C3.33301 9.53976 3.7061 9.16667 4.16634 9.16667H10.1419ZM7.49967 14.1667C7.03944 14.1667 6.66634 14.5398 6.66634 15C6.66634 15.4602 7.03944 15.8333 7.49967 15.8333C7.95991 15.8333 8.33301 15.4602 8.33301 15C8.33301 14.5398 7.95991 14.1667 7.49967 14.1667ZM5.14193 14.1667C5.48513 13.1957 6.41116 12.5 7.49967 12.5C8.58819 12.5 9.51422 13.1957 9.85742 14.1667H15.833C16.2932 14.1667 16.6663 14.5398 16.6663 15C16.6663 15.4602 16.2932 15.8333 15.833 15.8333H9.85742C9.51422 16.8043 8.58819 17.5 7.49967 17.5C6.41116 17.5 5.48513 16.8043 5.14193 15.8333H4.16634C3.7061 15.8333 3.33301 15.4602 3.33301 15C3.33301 14.5398 3.7061 14.1667 4.16634 14.1667H5.14193Z",
            fill: "currentColor"
        }, void 0, false, {
            fileName: "[project]/components/icons/filter.tsx",
            lineNumber: 15,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/filter.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/apple-calendar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AppleCalendar",
    ()=>AppleCalendar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const AppleCalendar = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", className),
        viewBox: "0 0 22 22",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                filter: "url(#filter0_d_1417_67242)",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: "M16.6119 20.4394H5.37413C2.98853 20.4394 1.06055 18.504 1.06055 16.1259V4.8956C1.06055 2.51001 2.99603 0.582031 5.37413 0.582031H16.6044C18.99 0.582031 20.918 2.51751 20.918 4.8956V16.1259C20.9255 18.5115 18.99 20.4394 16.6119 20.4394Z",
                    fill: "url(#paint0_linear_1417_67242)"
                }, void 0, false, {
                    fileName: "[project]/components/icons/apple-calendar.tsx",
                    lineNumber: 16,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M15.9476 8.77539V8.67539H15.8476H10.7988H10.6988V8.77539V9.43555V9.53555H10.7988H14.9719C13.3362 12.043 12.314 14.668 11.8928 17.4098L11.8751 17.525H11.9916H12.7343H12.8207L12.8333 17.4395C13.2361 14.6944 14.2656 12.0448 15.9314 9.49017L15.9476 9.46528V9.43555V8.77539Z",
                fill: "#2C2C2C",
                stroke: "#2C2C2C",
                strokeWidth: "0.2"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M7.87982 8.67539H7.80027L7.78238 8.7529C7.71537 9.04329 7.60107 9.38076 7.35172 9.58293L7.35172 9.58293L7.35068 9.58379C7.23191 9.68276 7.04934 9.76242 6.82669 9.82082C6.60579 9.87876 6.35377 9.91365 6.1035 9.92837L6.00937 9.93391V10.0282V10.4933V10.5933H6.10938H7.77232V17.4175V17.5175H7.87232H8.6H8.7V17.4175V8.77539V8.67539H8.6H7.87982Z",
                fill: "#2C2C2C",
                stroke: "#2C2C2C",
                strokeWidth: "0.2"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 27,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M16.4839 20.5081H5.50863C3.018 20.5081 1 18.4826 1 15.9994V5.02424C1 2.53362 3.02551 0.515625 5.50863 0.515625H16.4839C18.9745 0.515625 20.9925 2.54113 20.9925 5.02424V15.9994C21 18.4826 18.9745 20.5081 16.4839 20.5081ZM5.50863 0.643156C3.09302 0.643156 1.12753 2.60864 1.12753 5.02424V15.9994C1.12753 18.415 3.09302 20.3805 5.50863 20.3805H16.4839C18.8995 20.3805 20.865 18.415 20.865 15.9994V5.02424C20.865 2.60864 18.8995 0.643156 16.4839 0.643156H5.50863Z",
                fill: "#A4A4A4"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 33,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M20.933 6.50921V5.00133C20.933 2.54823 18.945 0.552734 16.4844 0.552734H5.50916C3.05605 0.552734 1.06055 2.54073 1.06055 5.00133V6.50921H20.933Z",
                fill: "#E9574E"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M21 6.57619H1V5.0008C1 2.51019 3.02551 0.492188 5.50863 0.492188H16.4839C18.9745 0.492188 20.9925 2.51769 20.9925 5.0008V6.57619H21ZM1.13503 6.44116H20.865V5.0008C20.865 2.5852 18.8995 0.619719 16.4839 0.619719H5.50863C3.09302 0.619719 1.12753 2.5852 1.12753 5.0008V6.44116H1.13503Z",
                fill: "#E9574E"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M7.24996 4.35682C7.24996 4.40934 7.25746 4.47685 7.26497 4.53687C7.27247 4.59688 7.28747 4.6569 7.32498 4.70941C7.35499 4.75442 7.4 4.79193 7.46752 4.83694C7.53503 4.88195 7.62505 4.90446 7.73758 4.90446C7.82761 4.90446 7.91763 4.88946 7.99265 4.85195C8.06767 4.81444 8.13518 4.75442 8.18019 4.6794C8.1952 4.6494 8.2102 4.61189 8.2252 4.57438C8.23271 4.53687 8.24021 4.49186 8.24771 4.45435C8.25521 4.41684 8.25521 4.37933 8.25521 4.34182C8.25521 4.30431 8.25521 4.2743 8.25521 4.2518V2.03125H8.69782V4.37933C8.69782 4.52937 8.66782 4.6569 8.6153 4.76943C8.56279 4.88195 8.48777 4.97948 8.39775 5.0545C8.30773 5.12952 8.2027 5.18953 8.08267 5.22704C7.96264 5.26455 7.83511 5.28705 7.70007 5.28705C7.65506 5.28705 7.60255 5.27955 7.54253 5.27205C7.47502 5.26455 7.4075 5.24954 7.33998 5.22704C7.27247 5.20453 7.19745 5.16703 7.12993 5.12201C7.06241 5.077 6.9949 5.01699 6.94238 4.94197C6.90488 4.88946 6.87487 4.83694 6.85236 4.78443C6.82986 4.72442 6.81485 4.6719 6.80735 4.61939C6.79985 4.56688 6.79235 4.52187 6.78484 4.46935C6.78484 4.42434 6.77734 4.38683 6.77734 4.34932H7.24996V4.35682Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M10.0188 2.03125V4.01924C10.0188 4.10176 10.0263 4.17678 10.0338 4.2443C10.0413 4.30431 10.0563 4.35682 10.0638 4.40184C10.0788 4.44685 10.0938 4.48436 10.1088 4.51436C10.1238 4.54437 10.1388 4.57438 10.1613 4.59688C10.2138 4.6644 10.2663 4.71691 10.3339 4.76192C10.4014 4.80694 10.4614 4.83694 10.5214 4.85945C10.5889 4.88195 10.6489 4.89696 10.7165 4.90446C10.7765 4.91196 10.8365 4.91196 10.8965 4.91196C11.1141 4.91196 11.2791 4.87445 11.3991 4.79943C11.5192 4.72442 11.6017 4.6419 11.6542 4.53687C11.7067 4.43935 11.7442 4.33432 11.7517 4.23679C11.7592 4.13927 11.7667 4.05675 11.7667 3.99674V2.03125H12.1943V4.01174C12.1943 4.05675 12.1943 4.10926 12.1868 4.17678C12.1868 4.23679 12.1718 4.31181 12.1568 4.38683C12.1418 4.46185 12.1118 4.54437 12.0818 4.62689C12.0443 4.70941 11.9993 4.79193 11.9318 4.87445C11.8492 4.97198 11.7667 5.0545 11.6692 5.10701C11.5717 5.16702 11.4816 5.21204 11.3841 5.24204C11.2866 5.27205 11.1966 5.29456 11.1141 5.30206C11.0315 5.30956 10.9565 5.31706 10.904 5.31706C10.829 5.31706 10.739 5.30956 10.6414 5.29456C10.5439 5.27955 10.4389 5.25705 10.3339 5.21954C10.2288 5.18203 10.1313 5.12952 10.0263 5.062C9.92876 4.99448 9.83874 4.91196 9.76372 4.79943C9.74121 4.76192 9.71871 4.72442 9.6962 4.6794C9.6737 4.63439 9.65119 4.58188 9.63619 4.52187C9.62118 4.46185 9.60618 4.38683 9.59118 4.29681C9.58367 4.21429 9.57617 4.10926 9.57617 3.98923V2.03125H10.0188Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M13.0273 2.03125H13.47V4.84444H14.9628V5.24204H13.0273V2.03125Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("filter", {
                        id: "filter0_d_1417_67242",
                        x: "0.560547",
                        y: "0.582031",
                        width: "20.8574",
                        height: "20.8574",
                        filterUnits: "userSpaceOnUse",
                        colorInterpolationFilters: "sRGB",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feFlood", {
                                floodOpacity: "0",
                                result: "BackgroundImageFix"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 67,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feColorMatrix", {
                                in: "SourceAlpha",
                                type: "matrix",
                                values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0",
                                result: "hardAlpha"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 68,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feOffset", {
                                dy: "0.5"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feGaussianBlur", {
                                stdDeviation: "0.25"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feComposite", {
                                in2: "hardAlpha",
                                operator: "out"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feColorMatrix", {
                                type: "matrix",
                                values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.19 0"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 77,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feBlend", {
                                mode: "normal",
                                in2: "BackgroundImageFix",
                                result: "effect1_dropShadow_1417_67242"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("feBlend", {
                                mode: "normal",
                                in: "SourceGraphic",
                                in2: "effect1_dropShadow_1417_67242",
                                result: "shape"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/icons/apple-calendar.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: "paint0_linear_1417_67242",
                        x1: "10.9893",
                        y1: "0.582031",
                        x2: "10.9893",
                        y2: "20.4394",
                        gradientUnits: "userSpaceOnUse",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.525",
                                stopColor: "white"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 101,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#E8E8E7"
                            }, void 0, false, {
                                fileName: "[project]/components/icons/apple-calendar.tsx",
                                lineNumber: 102,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/icons/apple-calendar.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/icons/apple-calendar.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/apple-calendar.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/google-calendar.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GoogleCalendar",
    ()=>GoogleCalendar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
function GoogleCalendar({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", className),
        viewBox: "0 0 20 21",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                clipPath: "url(#clip0_1302_63463)",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M15.2626 5.23633H4.73633V15.7626H15.2626V5.23633Z",
                        fill: "white"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 17,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M15.2623 20.4984L19.9992 15.7615L17.6308 15.3574L15.2623 15.7615L14.8301 17.9279L15.2623 20.4984Z",
                        fill: "#EA4335"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M0 15.7615V18.9194C0 19.7918 0.706562 20.4984 1.57891 20.4984H4.73688L5.2232 18.1299L4.73688 15.7615L2.15617 15.3574L0 15.7615Z",
                        fill: "#188038"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 25,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M19.9992 5.23687V2.07891C19.9992 1.20656 19.2927 0.5 18.4203 0.5H15.2623C14.9742 1.67469 14.8301 2.53914 14.8301 3.09344C14.8301 3.64766 14.9742 4.36219 15.2623 5.23687C16.31 5.53687 17.0995 5.68687 17.6308 5.68687C18.1621 5.68687 18.9516 5.53687 19.9992 5.23687Z",
                        fill: "#1967D2"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M20.0005 5.23633H15.2637V15.7626H20.0005V5.23633Z",
                        fill: "#FBBC04"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 33,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M15.2626 15.7637H4.73633V20.5005H15.2626V15.7637Z",
                        fill: "#34A853"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M15.2631 0.5H1.57898C0.706563 0.5 0 1.20656 0 2.07891V15.7631H4.73688V5.23687H15.2631V0.5Z",
                        fill: "#4285F4"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 41,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: "M6.89656 13.4024C6.50312 13.1366 6.2307 12.7485 6.08203 12.2352L6.99523 11.859C7.07805 12.1748 7.22281 12.4195 7.42945 12.5932C7.63469 12.7669 7.88469 12.8524 8.1768 12.8524C8.47547 12.8524 8.73203 12.7616 8.94648 12.58C9.16102 12.3984 9.26891 12.1669 9.26891 11.8866C9.26891 11.5998 9.1557 11.3655 8.92945 11.184C8.70312 11.0024 8.41891 10.9116 8.07945 10.9116H7.5518V10.0077H8.02547C8.31758 10.0077 8.56359 9.92875 8.76359 9.77078C8.96359 9.61297 9.06359 9.39711 9.06359 9.12211C9.06359 8.87742 8.97414 8.68266 8.79523 8.53664C8.61633 8.39055 8.38992 8.31687 8.11492 8.31687C7.84648 8.31687 7.63336 8.38797 7.47547 8.53133C7.31767 8.67514 7.19903 8.85671 7.1307 9.05898L6.2268 8.68266C6.34648 8.3432 6.56625 8.0432 6.88859 7.78398C7.21102 7.52477 7.62281 7.39453 8.12281 7.39453C8.49258 7.39453 8.82547 7.46563 9.12023 7.60898C9.41492 7.75242 9.64648 7.95109 9.81359 8.20375C9.98078 8.45766 10.0636 8.74188 10.0636 9.05766C10.0636 9.38 9.98602 9.65242 9.83078 9.87609C9.67547 10.0998 9.48469 10.2708 9.25836 10.3905V10.4445C9.5506 10.5649 9.80444 10.7629 9.99258 11.0169C10.1834 11.2734 10.2795 11.58 10.2795 11.938C10.2795 12.2958 10.1886 12.6155 10.007 12.8958C9.82547 13.1761 9.57422 13.3971 9.2557 13.5577C8.93602 13.7182 8.5768 13.7998 8.17813 13.7998C7.71625 13.8011 7.29 13.6682 6.89656 13.4024ZM12.5057 8.87078L11.5031 9.59578L11.0018 8.83531L12.8005 7.53789H13.4899V13.6577H12.5057V8.87078Z",
                        fill: "#4285F4"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 45,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/icons/google-calendar.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                    id: "clip0_1302_63463",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: "20",
                        height: "20",
                        fill: "white",
                        transform: "translate(0 0.5)"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/google-calendar.tsx",
                        lineNumber: 52,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/icons/google-calendar.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/icons/google-calendar.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/google-calendar.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/icons/outlook.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Outlook",
    ()=>Outlook
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Outlook = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", className),
        viewBox: "0 0 20 21",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12.1777 5.46094V8.88406L13.3752 9.63719C13.4185 9.64669 13.4633 9.64669 13.5065 9.63719L18.6552 6.16594C18.6515 5.99747 18.5898 5.83543 18.4807 5.70704C18.3715 5.57866 18.2215 5.49176 18.0559 5.46094H12.1777Z",
                fill: "#1948BD"
            }, void 0, false, {
                fileName: "[project]/components/icons/outlook.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M12.1767 10.1601L13.2686 10.9101C13.3197 10.9412 13.3784 10.9577 13.4383 10.9577C13.4982 10.9577 13.5569 10.9412 13.608 10.9101C13.4205 11.0232 18.6536 7.54883 18.6536 7.54883V13.8401C18.6673 13.9676 18.6529 14.0965 18.6115 14.2178C18.5701 14.3392 18.5027 14.45 18.414 14.5426C18.3253 14.6352 18.2174 14.7072 18.098 14.7538C17.9785 14.8003 17.8503 14.8201 17.7224 14.812H12.1761L12.1767 10.1601ZM6.52424 8.58195C6.34282 8.58108 6.16454 8.6293 6.0083 8.72151C5.85206 8.81371 5.72367 8.94647 5.63674 9.1057C5.39931 9.52781 5.28539 10.0082 5.30799 10.492C5.28331 10.9747 5.39739 11.4545 5.63674 11.8745C5.72331 12.0271 5.84853 12.1543 5.99984 12.2433C6.15114 12.3323 6.3232 12.3798 6.49871 12.3812C6.67422 12.3826 6.847 12.3378 6.9997 12.2512C7.1524 12.1647 7.27963 12.0395 7.36861 11.8882C7.60535 11.4701 7.71707 10.9929 7.69049 10.5132C7.7176 10.0184 7.60957 9.52563 7.37799 9.08758C7.29523 8.93353 7.17196 8.80502 7.0215 8.71591C6.87104 8.6268 6.6991 8.58048 6.52424 8.58195Z",
                fill: "#1948BD"
            }, void 0, false, {
                fileName: "[project]/components/icons/outlook.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M1.3457 3.72187V17.1137L11.5332 19.25V1.75L1.3457 3.72187ZM8.1632 12.6819C7.97263 12.9505 7.71923 13.1685 7.4251 13.3168C7.13096 13.465 6.80503 13.5391 6.4757 13.5325C6.15467 13.5382 5.83701 13.4663 5.54973 13.3229C5.26246 13.1794 5.01408 12.9688 4.8257 12.7087C4.37894 12.085 4.15546 11.3289 4.19133 10.5625C4.15332 9.75852 4.38085 8.96437 4.83883 8.3025C5.03181 8.02871 5.28918 7.80659 5.58827 7.65575C5.88735 7.5049 6.21894 7.42995 6.55383 7.4375C6.87254 7.4311 7.18794 7.50304 7.47236 7.64699C7.75678 7.79094 8.00151 8.00251 8.18508 8.26312C8.62737 8.9004 8.84706 9.66579 8.81008 10.4406C8.84904 11.2388 8.62148 12.0272 8.1632 12.6819Z",
                fill: "#1948BD"
            }, void 0, false, {
                fileName: "[project]/components/icons/outlook.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/outlook.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/linkedin-solid.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LinkedinSolid",
    ()=>LinkedinSolid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const LinkedinSolid = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4 text-[#0077B5]", className),
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "none",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            fillRule: "evenodd",
            clipRule: "evenodd",
            d: "M3.429 0A3.429 3.429 0 0 0 0 3.429V20.57A3.429 3.429 0 0 0 3.429 24H20.57A3.429 3.429 0 0 0 24 20.571V3.43A3.428 3.428 0 0 0 20.571 0H3.43Zm1.889 7.366a2.049 2.049 0 1 0 0-4.097 2.049 2.049 0 0 0 0 4.097Zm1.714 12.885V8.973H3.603V20.25h3.429ZM9.309 8.973h3.428v1.51c.506-.792 1.617-1.858 3.682-1.858 2.466 0 3.804 1.633 3.804 4.741 0 .15.014.83.014.83v6.053H16.81v-6.051c0-.832-.175-2.465-2.023-2.465-1.85 0-2.006 2.053-2.049 3.397v5.12H9.31V8.972Z",
            fill: "currentColor"
        }, void 0, false, {
            fileName: "[project]/components/icons/linkedin-solid.tsx",
            lineNumber: 14,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/linkedin-solid.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
;
}),
"[project]/components/icons/logo-3.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Logo3",
    ()=>Logo3
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Logo3 = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-[147px] h-3", className),
        viewBox: "0 0 147 22",
        fill: "none",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fill: "#306CFE",
                d: "M33.073 21.724c-1.368 0-2.578-.714-3.905-1.587a5.045 5.045 0 0 0-5.479-.048c-1.344.794-2.672 1.667-4.229 1.667h-.49a4.826 4.826 0 0 1-3.138-1.199 4.864 4.864 0 0 1-1.605-2.96l-.024-.683a5.057 5.057 0 0 1 .633-2.382l1.897-3.334 1.186 2.088-1.344 2.286a2.747 2.747 0 0 0 1.017 3.715c.412.239.879.364 1.354.366h.561c2.032-.04 3.336-2.382 6.886-2.382 3.415 0 4.743 2.421 6.64 2.421a2.364 2.364 0 0 0 2.109-1.158 2.388 2.388 0 0 0 .017-2.414L28.117 3.697a2.749 2.749 0 0 0-2.372-1.37 2.734 2.734 0 0 0-2.371 1.37l-2.846 4.93-1.186-2.08 2.198-3.874a4.818 4.818 0 0 1 1.76-1.776 4.79 4.79 0 0 1 6.58 1.776l7.043 12.391a4.467 4.467 0 0 1-1.638 6.066 4.42 4.42 0 0 1-2.211.594Z"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo-3.tsx",
                lineNumber: 13,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fill: "#306CFE",
                d: "M22.939 15.469c-.134-.318-7.186-12.702-7.233-12.773A4.816 4.816 0 0 0 13.946.92a4.791 4.791 0 0 0-6.58 1.776L.607 14.532A4.819 4.819 0 0 0 .655 19.3 4.792 4.792 0 0 0 2.4 21.038c.722.417 1.54.637 2.373.638h.498c1.581 0 2.885-.865 4.23-1.667a5.15 5.15 0 0 1 3.952-.58 6.173 6.173 0 0 1-.553-2.206 7.263 7.263 0 0 0-4.396.96c-6.031 3.51-7.114-.857-6.134-2.659L9.12 3.617a2.749 2.749 0 0 1 2.372-1.37 2.734 2.734 0 0 1 2.372 1.37l4.743 8.311.727 1.286c1.415 2.524 1.898 3.112 1.898 3.85.027.169.027.34 0 .508a12.14 12.14 0 0 1 2.039-1.08 4.435 4.435 0 0 0-.332-1.023Z",
                opacity: 0.5
            }, void 0, false, {
                fileName: "[project]/components/icons/logo-3.tsx",
                lineNumber: 17,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fill: "#22376B",
                d: "M69.174 9.084a.559.559 0 0 1 .356-.756c.529-.149 1.123-.27 1.78-.364a18.42 18.42 0 0 1 2.868-.216c.864 0 1.587.085 2.168.255.582.157 1.039.386 1.371.687.35.3.59.66.723 1.079.15.418.225.89.225 1.412 0 .576-.025 1.158-.075 1.747a30.01 30.01 0 0 0-.1 1.707c0 .563.025 1.112.075 1.648.02.22.055.436.103.647.092.41-.196.845-.618.845H76.7a.589.589 0 0 1-.549-.377l-.351-.909a.108.108 0 0 0-.184-.03c-.33.39-.785.73-1.364 1.021-.581.288-1.337.432-2.268.432a5.804 5.804 0 0 1-1.57-.196 3.905 3.905 0 0 1-1.197-.59 2.887 2.887 0 0 1-.773-.902 2.523 2.523 0 0 1-.274-1.177c0-.602.166-1.105.498-1.51.35-.42.84-.753 1.471-1.002.648-.261 1.413-.438 2.294-.53a19.853 19.853 0 0 1 2.991-.098c.116-.732.05-1.255-.2-1.57-.249-.326-.806-.49-1.67-.49-.648 0-1.338.053-2.069.157-.46.068-.87.149-1.227.244a.635.635 0 0 1-.756-.358l-.328-.806Zm3.882 6.728c.648 0 1.163-.11 1.545-.333.383-.236.665-.484.848-.746v-1.275a11.49 11.49 0 0 0-1.496-.02c-.465.026-.88.085-1.246.177-.366.091-.657.222-.873.392a.79.79 0 0 0-.324.648c0 .366.133.654.4.863.282.196.664.294 1.146.294ZM88.378 9.699c-.061.342-.403.554-.746.494a4.454 4.454 0 0 0-.764-.071c-.581 0-1.072.124-1.47.373-.35.216-.596.492-.737.829a.5.5 0 0 0-.036.193v5.65a.589.589 0 0 1-.589.588h-2.063a.589.589 0 0 1-.589-.589V8.533c0-.326.264-.59.589-.59h1.486c.263 0 .493.174.566.426l.25.87c.283-.484.765-.857 1.247-1.119.482-.261 1.047-.392 1.695-.392.288 0 .602.032.942.096a.558.558 0 0 1 .435.654l-.216 1.22ZM94.413 13.929a.588.588 0 0 0-.47-.236h-.578v3.473a.589.589 0 0 1-.59.589h-2.063a.589.589 0 0 1-.588-.589V5.562c0-.251.159-.474.396-.557l2.063-.715a.589.589 0 0 1 .782.557v7.276c.487-.179.91-.498 1.216-.918l2.24-3.078a.445.445 0 0 1 .36-.183h2.11c.495 0 .769.572.46.957l-2.822 3.517.698.765 2.675 3.634a.588.588 0 0 1-.474.938h-2.255a.589.589 0 0 1-.471-.236l-2.689-3.59ZM111.727 16.411c.177.276.095.644-.202.782-.421.196-.928.37-1.521.523-.848.209-1.753.313-2.717.313-2.011 0-3.482-.457-4.413-1.373-.93-.929-1.396-2.198-1.396-3.807 0-1.726.524-3.021 1.571-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.595.648.466.3.84.706 1.122 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.172.98h-6.481c.05.825.316 1.446.798 1.865.498.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687Zm-4.316-6.701c-.847 0-1.479.203-1.894.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .566-.233.544-.536-.033-.451-.177-.816-.432-1.093-.333-.38-.864-.57-1.596-.57ZM113.439 8.533c0-.326.264-.59.589-.59h1.132V6.529c0-.255.164-.482.407-.56l2.064-.667c.38-.123.769.16.769.56v2.083h2.453c.325 0 .588.263.588.589v.98a.588.588 0 0 1-.588.59H118.4v3.767c0 .68.083 1.17.249 1.471.183.288.516.432.998.432a3.912 3.912 0 0 0 1.077-.132c.327-.084.672.09.767.413l.246.845a.555.555 0 0 1-.363.696c-.321.097-.672.183-1.054.258a9.412 9.412 0 0 1-1.82.176c-1.147 0-1.994-.228-2.543-.686-.532-.471-.797-1.236-.797-2.296v-4.945h-1.132a.589.589 0 0 1-.589-.588v-.981ZM132.955 16.411c.177.276.095.644-.201.782-.421.196-.929.37-1.522.523a11.3 11.3 0 0 1-2.717.313c-2.011 0-3.482-.457-4.412-1.373-.931-.929-1.396-2.198-1.396-3.807 0-1.726.523-3.021 1.57-3.885 1.047-.863 2.518-1.295 4.412-1.295.632 0 1.247.066 1.845.196.598.131 1.13.347 1.596.648.465.3.839.706 1.121 1.216.283.51.424 1.145.424 1.904 0 .275-.025.569-.075.883-.061.582-.586.98-1.171.98h-6.482c.05.825.316 1.446.798 1.865.499.419 1.296.628 2.393.628.681 0 1.288-.079 1.82-.236.279-.086.523-.172.733-.259.295-.121.65-.038.822.23l.442.687ZM128.64 9.71c-.848 0-1.48.203-1.895.608-.399.393-.64.922-.723 1.59h4.101c.304 0 .567-.233.544-.536-.033-.451-.177-.816-.432-1.093-.332-.38-.864-.57-1.595-.57ZM146.387 20.277c0 .26-.171.49-.421.565l-2.064.613a.589.589 0 0 1-.756-.565v-3.979c-.282.34-.764.615-1.246.824-.482.196-1.105.294-1.87.294-1.545 0-2.734-.412-3.565-1.236-.814-.824-1.221-2.073-1.221-3.747 0-1.753.557-3.081 1.67-3.984 1.13-.902 2.742-1.354 4.836-1.354.449 0 .898.02 1.346.06.449.025.873.071 1.272.137.415.052.797.117 1.146.196.159.03.305.06.44.089a.56.56 0 0 1 .433.553v11.534Zm-5.484-4.406c.631 0 1.113-.111 1.445-.333.321-.205.571-.503.752-.895a.533.533 0 0 0 .046-.222v-4.3a2.772 2.772 0 0 0-.847-.195 8.776 8.776 0 0 0-1.072-.06c-.881 0-1.546.263-1.995.786-.432.523-.648 1.288-.648 2.296 0 .954.2 1.68.599 2.178.398.497.972.745 1.72.745ZM62.739 8.867l-4.434 6.114a.589.589 0 0 1-.477.243h-.501a.589.589 0 0 1-.472-.237l-4.454-5.96-.006 8.14a.589.589 0 0 1-.588.588h-2.064a.589.589 0 0 1-.589-.589V4.608c0-.325.264-.588.589-.588h2.236c.183 0 .357.085.468.232l5.278 6.936a.098.098 0 0 0 .159-.003l4.954-6.92a.589.589 0 0 1 .479-.245h2.2c.325 0 .589.263.589.588v12.558a.589.589 0 0 1-.589.589h-2.235a.589.589 0 0 1-.588-.592l.045-8.296Z"
            }, void 0, false, {
                fileName: "[project]/components/icons/logo-3.tsx",
                lineNumber: 22,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/logo-3.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
}),
"[project]/components/icons/x.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "XIcon",
    ()=>XIcon
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const XIcon = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-5 w-5", className),
        viewBox: "0 0 20 21",
        fill: "none",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            fill: "#000",
            d: "M15.75 1.777h3.067l-6.7 7.659L20 19.855h-6.172l-4.833-6.32-5.532 6.32H.395l7.167-8.192L0 1.778h6.328l4.37 5.777 5.053-5.778ZM14.676 18.02h1.7L5.404 3.517H3.582L14.675 18.02Z"
        }, void 0, false, {
            fileName: "[project]/components/icons/x.tsx",
            lineNumber: 13,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/x.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
}),
"[project]/components/icons/sort-as.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SortAs",
    ()=>SortAs
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const SortAs = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-6", className),
        viewBox: "0 0 24 24",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M21 6H13M6 20L6 4M6 20L3 17M6 20L9 17M19.4 10.2667H13M15.1333 14.5333H13",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "round",
            strokeLinejoin: "round"
        }, void 0, false, {
            fileName: "[project]/components/icons/sort-as.tsx",
            lineNumber: 13,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/sort-as.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
}),
"[project]/components/icons/grid.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Grid",
    ()=>Grid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Grid = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-6", className),
        viewBox: "0 0 24 25",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M7.25 12.3125L5.25 12.3125M7.25 7.8125L5.25 7.8125M7.25 16.8125L5.25 16.8125",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/grid.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M13 12.3125L11 12.3125M13 7.8125L11 7.8125M13 16.8125L11 16.8125",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/grid.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M18.75 12.3125L16.75 12.3125M18.75 7.8125L16.75 7.8125M18.75 16.8125L16.75 16.8125",
                stroke: "currentColor",
                strokeWidth: "1.5",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/icons/grid.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/grid.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/list.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "List",
    ()=>List
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const List = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-6", className),
        viewBox: "0 0 25 25",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M19.25 12.3125L5.75 12.3125M19.25 7.8125L5.75 7.8125M19.25 16.8125L5.75 16.8125",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "round",
            strokeLinejoin: "round"
        }, void 0, false, {
            fileName: "[project]/components/icons/list.tsx",
            lineNumber: 16,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/list.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/talent.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Talent",
    ()=>Talent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Talent = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                clipPath: "url(#clip0_13362_76761)",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    fillRule: "evenodd",
                    clipRule: "evenodd",
                    d: "M9.29494 0.132446C7.74242 0.132446 6.34643 0.981811 5.33408 1.80779C4.32174 2.63474 3.67635 3.46426 3.67635 3.46426L3.38701 3.83508L3.8393 3.96789C3.8393 3.96789 4.01476 4.01664 4.22518 4.2322C4.43432 4.44647 4.65855 4.81247 4.65855 5.50533C4.65855 6.40348 4.79647 7.12939 4.86544 7.43637C4.67939 7.60188 4.57258 7.83854 4.57097 8.08746C4.57097 8.27013 4.61899 8.42918 4.6654 8.58292C4.67196 8.60466 4.67849 8.62629 4.68485 8.64787C4.69299 8.676 4.7011 8.7035 4.70889 8.72992C4.72534 8.78573 4.74036 8.8367 4.75125 8.8785C4.75865 8.90623 4.7635 8.93378 4.76658 8.95131C4.7703 8.9725 4.77145 8.97906 4.77145 8.9536C4.77145 9.39947 5.14996 9.75552 5.59358 9.75552H5.61219C5.74691 10.8295 6.29383 11.809 7.13713 12.4872V13.4582L6.16103 14.3014C5.43545 14.6183 4.29159 15.1284 3.29784 15.7562C2.79167 16.0756 2.32559 16.4227 1.9721 16.8038C1.61894 17.1845 1.36328 17.6144 1.36328 18.0955V20.0201H18.0433V18.0955C18.0433 17.6144 17.7876 17.1845 17.4345 16.8038C17.081 16.4227 16.6149 16.0756 16.1087 15.7562C15.115 15.1284 13.9711 14.6183 13.2455 14.3014L12.2694 13.4582V12.4885C13.0916 11.8293 13.6516 10.8593 13.7944 9.75552H13.8133C14.2566 9.75552 14.6351 9.39947 14.6351 8.9536C14.6351 8.97906 14.6363 8.9725 14.64 8.9513C14.6431 8.93377 14.6479 8.90623 14.6553 8.8785C14.666 8.83748 14.6807 8.78765 14.6967 8.73298C14.7048 8.70555 14.7132 8.67691 14.7217 8.64755C14.728 8.62628 14.7344 8.60494 14.7409 8.58349C14.7874 8.42968 14.8356 8.27027 14.8356 8.08785C14.8356 7.82482 14.7166 7.59285 14.5337 7.42862C14.5924 7.0902 14.8356 5.64198 14.8356 4.62322C14.8356 3.47037 14.4045 2.64467 13.8232 2.13209C13.3004 1.67339 12.6868 1.48926 12.1427 1.45045C12.0552 1.31156 11.8999 1.09345 11.5779 0.841647C11.1153 0.482065 10.3737 0.132446 9.29494 0.132446ZM9.29494 0.773985C10.237 0.773985 10.8221 1.0659 11.1817 1.34817C11.5426 1.62981 11.6616 1.87773 11.6616 1.87773L11.7495 2.05706H11.9487C12.3759 2.05706 12.9511 2.22002 13.3985 2.61457C13.847 3.00912 14.194 3.62594 14.194 4.62322C14.194 5.51816 13.9811 6.82369 13.9182 7.18937H13.9134C13.897 7.18937 13.8921 7.19162 13.8872 7.19392C13.8838 7.19549 13.8804 7.19707 13.8733 7.19798V6.22706C13.8733 5.12939 13.4248 4.39124 12.9735 3.95403C12.5225 3.51682 12.05 3.35651 12.05 3.35651L11.8672 3.29487L11.727 3.42895C11.727 3.42895 11.5249 3.62718 11.0377 3.85011C10.5501 4.07305 9.7963 4.30245 8.74097 4.30245C8.16359 4.30245 7.40272 4.50677 6.74258 4.96771C6.08468 5.4277 5.53713 6.17959 5.53456 7.19932C5.52746 7.19828 5.52384 7.19647 5.52025 7.19467C5.51493 7.192 5.50967 7.18937 5.49319 7.18937C5.4895 7.18937 5.48573 7.19 5.48196 7.19062C5.47819 7.19125 5.47442 7.19187 5.47073 7.19187C5.35621 6.63694 5.29912 6.07181 5.30009 5.50533C5.30009 4.66588 4.99952 4.10837 4.68485 3.78503C4.59347 3.69103 4.55051 3.67211 4.49545 3.64786C4.46973 3.63653 4.44136 3.62403 4.40418 3.60217C4.62615 3.34139 5.03833 2.87883 5.74017 2.30625C6.6935 1.52839 7.98171 0.773985 9.29494 0.773985ZM11.966 4.03831C12.054 4.07146 12.2494 4.14505 12.5277 4.41404C12.8783 4.7547 13.2317 5.29843 13.2317 6.22706V8.24949L13.7142 7.96623C13.7969 7.91844 13.8733 7.87611 13.9272 7.84853C13.9304 7.8466 13.9325 7.84565 13.9347 7.84469C13.9369 7.84373 13.939 7.84278 13.9422 7.84085C14.0888 7.85593 14.194 7.95858 14.194 8.08785C14.194 8.11159 14.1565 8.29951 14.1074 8.46728C14.0824 8.55004 14.0574 8.6341 14.0362 8.71044C14.0332 8.72111 14.0302 8.73135 14.0273 8.74137C14.0092 8.80301 13.9936 8.85647 13.9936 8.9536C13.9936 9.03892 13.9233 9.11399 13.813 9.11399H13.2382L13.2231 9.4187C13.1368 11.053 11.9368 12.4134 10.3259 12.7024L10.2345 12.7175L10.1655 12.7816C10.0404 12.8955 9.88259 12.9632 9.70328 12.9632C9.52397 12.9632 9.36647 12.8942 9.23977 12.7804L9.17209 12.7175L9.08067 12.7024C7.46944 12.4134 6.26945 11.053 6.18348 9.41839L6.16744 9.11399H5.59327C5.48324 9.11399 5.41299 9.03892 5.41299 8.9536C5.41299 8.85648 5.39733 8.80301 5.37927 8.74137C5.37634 8.73135 5.37334 8.72111 5.37033 8.71044C5.34916 8.6341 5.32414 8.55004 5.29912 8.46728C5.25004 8.29951 5.21251 8.11159 5.21251 8.08785C5.21251 7.95858 5.31773 7.85593 5.46432 7.84085C5.46753 7.84278 5.46969 7.84373 5.47185 7.84469C5.47402 7.84565 5.47618 7.8466 5.47939 7.84853C5.53328 7.87611 5.60963 7.91844 5.69238 7.96623L6.17482 8.24949V7.20535C6.17482 6.40599 6.57322 5.8684 7.10954 5.49374C7.64587 5.1194 8.3275 4.94398 8.74097 4.94398C9.88997 4.94398 10.7394 4.69215 11.3046 4.43393C11.67 4.26699 11.801 4.1562 11.9039 4.06916C11.9192 4.05619 11.9339 4.04374 11.9487 4.03172C11.9539 4.03375 11.9597 4.03592 11.966 4.03831ZM7.77867 12.908C8.12189 13.0899 8.49302 13.2262 8.88628 13.3051C9.11178 13.4832 9.39117 13.6048 9.70328 13.6048C10.0154 13.6048 10.2922 13.4832 10.518 13.3051C10.9126 13.2275 11.2847 13.0899 11.6279 12.908V13.7362C11.472 13.9499 11.3033 14.1539 11.123 14.3476C10.6957 14.8025 10.1331 15.2086 9.70328 15.2086C9.27345 15.2086 8.71082 14.8025 8.28356 14.3476C8.10329 14.1539 7.93456 13.9499 7.77867 13.7362V12.908ZM7.29879 14.1661C7.45918 14.3823 7.63176 14.5895 7.81524 14.7864C8.05678 15.0443 8.34386 15.3112 8.66719 15.5146L7.46174 16.3175L6.834 14.5683L7.29879 14.1661ZM11.5916 14.7861C11.7751 14.5892 11.9474 14.3822 12.1078 14.1661L12.6954 14.6736L12.1052 16.3175L10.8234 15.463C11.1131 15.2663 11.371 15.0219 11.5916 14.7861ZM6.28901 14.9481L7.13328 17.3074L9.06559 16.0191L9.29975 16.6055L9.08676 19.3786H2.00482V18.0955C2.00482 17.8511 2.15013 17.5554 2.44331 17.2397C2.7365 16.9241 3.16247 16.5994 3.63882 16.2986C4.52446 15.7398 5.56632 15.2651 6.28901 14.9481ZM13.2568 15.0081C13.9711 15.325 14.9357 15.7738 15.7677 16.2986C16.2441 16.5994 16.6701 16.9241 16.9633 17.2397C17.2564 17.5554 17.4017 17.8511 17.4017 18.0955V19.3786H15.7979V18.0955H12.5902V19.3786H10.3198L10.1068 16.6055L10.375 15.9351L12.4337 17.3074L13.2568 15.0081ZM15.1564 18.7371V19.3786H13.2317V18.7371H15.1564Z",
                    fill: "currentColor"
                }, void 0, false, {
                    fileName: "[project]/components/icons/talent.tsx",
                    lineNumber: 16,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/icons/talent.tsx",
                lineNumber: 15,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                    id: "clip0_13362_76761",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: "20",
                        height: "20",
                        fill: "white"
                    }, void 0, false, {
                        fileName: "[project]/components/icons/talent.tsx",
                        lineNumber: 25,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/components/icons/talent.tsx",
                    lineNumber: 24,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/icons/talent.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/talent.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/project.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Project",
    ()=>Project
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Project = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M2.66641 2.63037C1.94969 2.63037 1.36328 3.21678 1.36328 3.9335V16.7041H18.0433V3.9335C18.0433 3.21678 17.4569 2.63037 16.7402 2.63037H2.66641ZM2.66641 3.15162H16.7402C17.1749 3.15162 17.522 3.49877 17.522 3.9335V4.71537C17.3787 4.71537 17.2614 4.83265 17.2614 4.976C17.2614 5.11934 17.3787 5.23662 17.522 5.23662V16.1829H1.88453V5.23662C2.02788 5.23662 2.14516 5.11934 2.14516 4.976C2.14516 4.83265 2.02788 4.71537 1.88453 4.71537V3.9335C1.88453 3.49877 2.23168 3.15162 2.66641 3.15162ZM2.92703 4.71537C2.78369 4.71537 2.66641 4.83265 2.66641 4.976C2.66641 5.11934 2.78369 5.23662 2.92703 5.23662C3.07038 5.23662 3.18766 5.11934 3.18766 4.976C3.18766 4.83265 3.07038 4.71537 2.92703 4.71537ZM3.96953 4.71537C3.82619 4.71537 3.70891 4.83265 3.70891 4.976C3.70891 5.11934 3.82619 5.23662 3.96953 5.23662C4.11288 5.23662 4.23016 5.11934 4.23016 4.976C4.23016 4.83265 4.11288 4.71537 3.96953 4.71537ZM5.01203 4.71537C4.86869 4.71537 4.75141 4.83265 4.75141 4.976C4.75141 5.11934 4.86869 5.23662 5.01203 5.23662C5.15538 5.23662 5.27266 5.11934 5.27266 4.976C5.27266 4.83265 5.15538 4.71537 5.01203 4.71537ZM6.05453 4.71537C5.91119 4.71537 5.79391 4.83265 5.79391 4.976C5.79391 5.11934 5.91119 5.23662 6.05453 5.23662C6.19788 5.23662 6.31516 5.11934 6.31516 4.976C6.31516 4.83265 6.19788 4.71537 6.05453 4.71537ZM7.09703 4.71537C6.95369 4.71537 6.83641 4.83265 6.83641 4.976C6.83641 5.11934 6.95369 5.23662 7.09703 5.23662C7.24038 5.23662 7.35766 5.11934 7.35766 4.976C7.35766 4.83265 7.24038 4.71537 7.09703 4.71537ZM8.13953 4.71537C7.99619 4.71537 7.87891 4.83265 7.87891 4.976C7.87891 5.11934 7.99619 5.23662 8.13953 5.23662C8.28288 5.23662 8.40016 5.11934 8.40016 4.976C8.40016 4.83265 8.28288 4.71537 8.13953 4.71537ZM9.18203 4.71537C9.03869 4.71537 8.92141 4.83265 8.92141 4.976C8.92141 5.11934 9.03869 5.23662 9.18203 5.23662C9.32538 5.23662 9.44266 5.11934 9.44266 4.976C9.44266 4.83265 9.32538 4.71537 9.18203 4.71537ZM10.2245 4.71537C10.0812 4.71537 9.96391 4.83265 9.96391 4.976C9.96391 5.11934 10.0812 5.23662 10.2245 5.23662C10.3679 5.23662 10.4852 5.11934 10.4852 4.976C10.4852 4.83265 10.3679 4.71537 10.2245 4.71537ZM11.267 4.71537C11.1237 4.71537 11.0064 4.83265 11.0064 4.976C11.0064 5.11934 11.1237 5.23662 11.267 5.23662C11.4104 5.23662 11.5277 5.11934 11.5277 4.976C11.5277 4.83265 11.4104 4.71537 11.267 4.71537ZM12.3095 4.71537C12.1662 4.71537 12.0489 4.83265 12.0489 4.976C12.0489 5.11934 12.1662 5.23662 12.3095 5.23662C12.4529 5.23662 12.5702 5.11934 12.5702 4.976C12.5702 4.83265 12.4529 4.71537 12.3095 4.71537ZM13.352 4.71537C13.2087 4.71537 13.0914 4.83265 13.0914 4.976C13.0914 5.11934 13.2087 5.23662 13.352 5.23662C13.4954 5.23662 13.6127 5.11934 13.6127 4.976C13.6127 4.83265 13.4954 4.71537 13.352 4.71537ZM14.3945 4.71537C14.2512 4.71537 14.1339 4.83265 14.1339 4.976C14.1339 5.11934 14.2512 5.23662 14.3945 5.23662C14.5379 5.23662 14.6552 5.11934 14.6552 4.976C14.6552 4.83265 14.5379 4.71537 14.3945 4.71537ZM15.437 4.71537C15.2937 4.71537 15.1764 4.83265 15.1764 4.976C15.1764 5.11934 15.2937 5.23662 15.437 5.23662C15.5804 5.23662 15.6977 5.11934 15.6977 4.976C15.6977 4.83265 15.5804 4.71537 15.437 4.71537ZM16.4795 4.71537C16.3362 4.71537 16.2189 4.83265 16.2189 4.976C16.2189 5.11934 16.3362 5.23662 16.4795 5.23662C16.6229 5.23662 16.7402 5.11934 16.7402 4.976C16.7402 4.83265 16.6229 4.71537 16.4795 4.71537ZM10.6095 7.32162L7.87891 14.3585H8.4012L11.1315 7.32162H10.6095ZM6.65214 8.7011L4.64351 10.7097L6.65214 12.7184L7.02067 12.3499L5.38056 10.7097L7.02067 9.06964L6.65214 8.7011ZM12.7544 8.7011L12.3859 9.06964L14.026 10.7097L12.3859 12.3499L12.7544 12.7184L14.7631 10.7097L12.7544 8.7011Z",
            fill: "currentColor"
        }, void 0, false, {
            fileName: "[project]/components/icons/project.tsx",
            lineNumber: 16,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/project.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/campaigns.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Campaigns",
    ()=>Campaigns
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const Campaigns = ({ className, ...props })=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-5", className),
        viewBox: "0 0 20 20",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M4.98416 13.1658H1.611C1.47423 13.1658 1.36328 13.2767 1.36328 13.4134V16.7938C1.36328 16.9306 1.47423 17.0415 1.611 17.0415H4.98416C5.12093 17.0415 5.23188 16.9306 5.23188 16.7938V13.4134C5.23188 13.2767 5.12106 13.1658 4.98416 13.1658ZM4.73656 16.5461H1.85872V13.6611H4.73656V16.5461Z",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/campaigns.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M9.25369 9.78546H5.8804C5.74363 9.78546 5.63281 9.89641 5.63281 10.0332V16.7939C5.63281 16.9306 5.74363 17.0416 5.8804 17.0416H9.25369C9.39046 17.0416 9.50128 16.9306 9.50128 16.7939V10.0332C9.50128 9.89641 9.39046 9.78546 9.25369 9.78546ZM9.00597 10.2808H6.12812V16.5461H9.00597V10.2808Z",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/campaigns.tsx",
                lineNumber: 20,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M13.5232 6.40495H10.1499C10.0132 6.40495 9.90234 6.51589 9.90234 6.65266V16.7938C9.90234 16.9305 10.0132 17.0415 10.1499 17.0415H13.5232C13.66 17.0415 13.7708 16.9305 13.7708 16.7938V6.65266C13.7709 6.51589 13.66 6.40495 13.5232 6.40495ZM13.2755 16.546H10.3977V6.90026H13.2755V16.546Z",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/campaigns.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M18.0395 3.27233C18.0395 3.13555 17.9285 3.02473 17.7918 3.02473H14.4186C14.2818 3.02473 14.1709 3.13555 14.1709 3.27233V16.7938C14.1709 16.9306 14.2818 17.0416 14.4186 17.0416H17.7918C17.9285 17.0416 18.0395 16.9306 18.0395 16.7938V3.27233ZM14.6662 16.5461H17.5442V3.52005H14.6662V16.5461Z",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/campaigns.tsx",
                lineNumber: 30,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M1.61125 7.68265C1.64955 7.68265 1.68836 7.67374 1.72474 7.65491L11.8914 2.39619L11.6403 3.18553C11.5988 3.31595 11.6708 3.45514 11.8012 3.49661C11.8261 3.50463 11.8515 3.50832 11.8763 3.50832C11.9812 3.50832 12.0787 3.44114 12.1123 3.33579L12.5448 1.97658C12.5862 1.8463 12.5141 1.70698 12.3838 1.6655L11.0247 1.23304C10.8944 1.19157 10.755 1.26358 10.7135 1.39399C10.672 1.52428 10.7442 1.66359 10.8745 1.70507L11.6638 1.95623L1.49725 7.21495C1.37575 7.2778 1.32816 7.42717 1.39102 7.54868C1.43504 7.63379 1.52156 7.68265 1.61125 7.68265Z",
                fill: "currentColor"
            }, void 0, false, {
                fileName: "[project]/components/icons/campaigns.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/icons/campaigns.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/icons/gift-card.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GiftCard",
    ()=>GiftCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const GiftCard = (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: 16,
        height: 16,
        viewBox: "0 0 28 28",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M23.297 4.5q1.718 0 2.578.854.816.81.858 2.366l.002.175V19.82q0 1.687-.86 2.534-.814.806-2.4.847l-.178.002H4.439q-1.719 0-2.58-.848-.813-.805-.856-2.36L1 19.821V7.895q0-1.697.86-2.546.815-.805 2.4-.846l.179-.003zM2.763 19.722q0 .855.438 1.287.405.4 1.135.43l.125.003 8.739-.001v-5.803h-.077a5.4 5.4 0 0 1-.86 1.61 8.3 8.3 0 0 1-1.336 1.379q-.707.585-1.522 1.002-.772.388-1.396.487-.47.066-.74-.208a.88.88 0 0 1-.268-.635q0-.394.23-.64a.94.94 0 0 1 .545-.276l.102-.015q.57-.065 1.214-.421a7.5 7.5 0 0 0 1.255-.876q.59-.501 1.084-1.096.417-.502.654-.951l.063-.127H2.763zm22.209-4.852h-9.386q.242.505.718 1.08.495.593 1.085 1.095.607.52 1.248.875.57.317 1.082.404l.128.018q.428.044.657.29.23.247.23.641 0 .362-.269.635-.267.273-.738.208-.636-.099-1.402-.487a8.5 8.5 0 0 1-1.517-1.002 8.3 8.3 0 0 1-1.336-1.38 5.5 5.5 0 0 1-.795-1.424l-.065-.186h-.088v5.804h8.75q.81 0 1.255-.432.41-.4.44-1.158l.003-.129zm-1.575-8.604-.122-.003h-8.75v3.757a4.7 4.7 0 0 1 .881-1.21 3.9 3.9 0 0 1 1.145-.784 3.2 3.2 0 0 1 1.303-.273q1.182 0 1.966.783.782.782.782 1.987 0 .69-.295 1.287a3.5 3.5 0 0 1-.827 1.067c-.32.282-.677.52-1.06.707l-.172.082h6.723V7.994q0-.855-.442-1.293-.41-.405-1.132-.435M13.2 6.262H4.46q-.82 0-1.259.438-.405.405-.435 1.164l-.003.128v5.673h6.713a5 5 0 0 1-1.221-.789 3.6 3.6 0 0 1-.832-1.067 2.8 2.8 0 0 1-.301-1.287q0-1.205.788-1.987.79-.783 1.96-.783.69-.001 1.315.274c.425.19.813.454 1.144.783a4.4 4.4 0 0 1 .78 1.037l.09.173zM9.959 9.307q-.591 0-.942.357-.35.355-.35.98 0 .514.317 1.024.316.509.876.92a4.9 4.9 0 0 0 1.28.662q.633.22 1.332.248l.202.004h.328v-.307a4.6 4.6 0 0 0-.241-1.489 4.2 4.2 0 0 0-.668-1.243 3.3 3.3 0 0 0-.975-.849 2.35 2.35 0 0 0-1.16-.307m7.807 0c-.403 0-.8.107-1.15.307a3.3 3.3 0 0 0-.974.849A4.4 4.4 0 0 0 14.725 13l-.004.195v.307h.329a4.75 4.75 0 0 0 2.82-.915q.553-.41.87-.92.319-.508.318-1.024 0-.623-.345-.98-.345-.356-.948-.356"
        }, void 0, false, {
            fileName: "[project]/components/icons/gift-card.tsx",
            lineNumber: 12,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/icons/gift-card.tsx",
        lineNumber: 4,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
;
}),
"[project]/components/icons/index.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/logo.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$facebook$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/facebook.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$linkedin$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/linkedin.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$protected$2d$lock$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/protected-lock.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$user$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/user.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$filter$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/filter.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$apple$2d$calendar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/apple-calendar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$google$2d$calendar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/google-calendar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$outlook$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/outlook.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$linkedin$2d$solid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/linkedin-solid.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2d$3$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/logo-3.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$x$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/x.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$sort$2d$as$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/sort-as.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$grid$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/grid.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$list$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/list.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$talent$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/talent.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$project$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/project.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$campaigns$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/campaigns.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$gift$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/gift-card.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$payment$2d$icons$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/payment-icons.tsx [app-ssr] (ecmascript)");
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
}),
"[project]/components/counter-offer-dialog.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CounterOfferDialog",
    ()=>CounterOfferDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parse.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$date$2d$picker$2f$date$2d$picker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/date-picker/date-picker.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/input/input.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/select/select.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea/textarea.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const RATE_OPTIONS = [
    {
        value: "logo-design",
        label: "Logo Design",
        rate: "$45/hr"
    },
    {
        value: "web-development",
        label: "Web Development",
        rate: "$70/hr"
    },
    {
        value: "ux-ui-design",
        label: "UX/UI Design",
        rate: "$85/hr"
    },
    {
        value: "custom-rate",
        label: "Custom Rate",
        rate: ""
    }
];
const DURATION_OPTIONS = [
    {
        value: "3-months",
        label: "3 Months"
    },
    {
        value: "6-months",
        label: "6 Months"
    },
    {
        value: "1-year",
        label: "1 Year"
    },
    {
        value: "18-months",
        label: "18 Months"
    },
    {
        value: "2-years",
        label: "2 Years"
    },
    {
        value: "ongoing",
        label: "Ongoing"
    },
    {
        value: "custom-duration",
        label: "Custom Duration"
    }
];
const CUSTOM_DURATION_UNITS = [
    "Months",
    "Years"
];
const SCHEDULE_OPTIONS = [
    {
        value: "full-time",
        label: "Full Time"
    },
    {
        value: "part-time",
        label: "Part Time"
    },
    {
        value: "custom",
        label: "Custom"
    }
];
const rateMap = new Map(RATE_OPTIONS.map((option)=>[
        option.value,
        option
    ]));
const durationMap = new Map(DURATION_OPTIONS.map((option)=>[
        option.value,
        option
    ]));
const scheduleMap = new Map(SCHEDULE_OPTIONS.map((option)=>[
        option.value,
        option
    ]));
const createInitialState = (variant, message)=>{
    const baseState = {
        rateValue: "$45/hr",
        rateSelection: "logo-design",
        durationValue: "4 months",
        durationSelection: "custom-duration",
        durationUnit: "Months",
        scheduleSelection: "full-time",
        scheduleValue: "Full Time",
        startDateValue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parse$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parse"])("February 5th, 2026", "MMMM do, yyyy", new Date()),
        messageValue: message ?? "",
        rateSelectOpen: false,
        durationSelectOpen: false,
        scheduleSelectOpen: false,
        showCustomRateInput: false,
        showCustomDurationInput: false,
        showCustomScheduleInput: false
    };
    switch(variant){
        case "rate-dropdown-custom":
            return {
                ...baseState,
                durationValue: "4 Months",
                rateSelection: "custom-rate",
                rateSelectOpen: true
            };
        case "custom-rate":
            return {
                ...baseState,
                durationValue: "4 Months",
                rateValue: "",
                showCustomRateInput: true
            };
        case "duration-dropdown-custom":
            return {
                ...baseState,
                durationValue: "4 Months",
                durationSelection: "custom-duration",
                durationSelectOpen: true
            };
        case "duration-dropdown-selected":
            return {
                ...baseState,
                durationValue: "6 Months",
                durationSelection: "6-months",
                durationSelectOpen: true
            };
        case "rate-dropdown-selected":
            return {
                ...baseState,
                durationValue: "4 Months",
                rateValue: "$70/hr",
                rateSelection: "web-development",
                rateSelectOpen: true
            };
        case "custom-duration":
            return {
                ...baseState,
                durationValue: "",
                showCustomDurationInput: true
            };
        default:
            return baseState;
    }
};
function CounterOfferDialog({ open, onOpenChange, variant, data, message, submitDisabled = false, onMessageChange, onCancel, onReview }) {
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](()=>createInitialState(variant, message));
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"](()=>{
        setState(createInitialState(variant, message));
    }, [
        message,
        variant
    ]);
    const updateState = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((updater)=>{
        setState((previous)=>updater(previous));
    }, []);
    const handleRateChange = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((value)=>{
        const nextValue = value;
        if (nextValue === "custom-rate") {
            updateState((previous)=>({
                    ...previous,
                    rateSelection: nextValue,
                    rateSelectOpen: false,
                    showCustomRateInput: true,
                    rateValue: ""
                }));
            return;
        }
        const option = rateMap.get(nextValue);
        updateState((previous)=>({
                ...previous,
                rateSelection: nextValue,
                rateSelectOpen: false,
                showCustomRateInput: false,
                rateValue: option?.rate ?? previous.rateValue
            }));
    }, [
        updateState
    ]);
    const handleDurationChange = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((value)=>{
        const nextValue = value;
        if (nextValue === "custom-duration") {
            updateState((previous)=>({
                    ...previous,
                    durationSelection: nextValue,
                    durationSelectOpen: false,
                    showCustomDurationInput: true,
                    durationValue: ""
                }));
            return;
        }
        const option = durationMap.get(nextValue);
        updateState((previous)=>({
                ...previous,
                durationSelection: nextValue,
                durationSelectOpen: false,
                showCustomDurationInput: false,
                durationValue: option?.label ?? previous.durationValue
            }));
    }, [
        updateState
    ]);
    const handleScheduleChange = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((value)=>{
        const nextValue = value;
        if (nextValue === "custom") {
            updateState((previous)=>({
                    ...previous,
                    scheduleSelection: nextValue,
                    scheduleSelectOpen: false,
                    showCustomScheduleInput: true,
                    scheduleValue: ""
                }));
            return;
        }
        const option = scheduleMap.get(nextValue);
        updateState((previous)=>({
                ...previous,
                scheduleSelection: nextValue,
                scheduleSelectOpen: false,
                showCustomScheduleInput: false,
                scheduleValue: option?.label ?? previous.scheduleValue
            }));
    }, [
        updateState
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
            variant: "unanimated",
            className: "pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none",
            onPointerDown: (event)=>{
                if (event.target === event.currentTarget) {
                    onOpenChange(false);
                }
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex h-[68px] items-start justify-between border-b border-gray-100 px-6 py-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-0.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                        className: "text-[18px] font-semibold leading-7 text-dark-blue-400",
                                        children: "Make a Counter Offer"
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 291,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[15px] leading-6 text-gray-500",
                                        children: "Propose new terms that work for you."
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 294,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                lineNumber: 290,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                    variant: "ghost",
                                    visual: "gray",
                                    size: "md",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                        className: "size-5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 301,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                    lineNumber: 300,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                lineNumber: 299,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/counter-offer-dialog.tsx",
                        lineNumber: 289,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-8 px-6 py-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4 border-b border-gray-100 pb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-[156px_1fr] items-start gap-x-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] leading-7 text-gray-500",
                                                        children: "Offer Rate"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 310,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                        children: data.offerRate
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 313,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 309,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2",
                                                children: state.showCustomRateInput ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                                            autoFocus: true,
                                                            placeholder: "Enter rate",
                                                            value: state.rateValue,
                                                            onChange: (event)=>updateState((previous)=>({
                                                                        ...previous,
                                                                        rateValue: event.target.value
                                                                    }))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 321,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-end",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                variant: "link",
                                                                visual: "gray",
                                                                onClick: ()=>updateState((previous)=>({
                                                                            ...previous,
                                                                            showCustomRateInput: false,
                                                                            rateValue: "$45/hr",
                                                                            rateSelection: "logo-design"
                                                                        })),
                                                                children: "Cancel"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                lineNumber: 333,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 332,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                                                    open: state.rateSelectOpen,
                                                    onOpenChange: (nextOpen)=>updateState((previous)=>({
                                                                ...previous,
                                                                rateSelectOpen: nextOpen
                                                            })),
                                                    value: state.rateSelection,
                                                    onValueChange: handleRateChange,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                            className: "w-full text-left text-[15px] leading-7 text-dark-blue-400",
                                                            children: state.rateValue
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 361,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                            children: [
                                                                RATE_OPTIONS.slice(0, 3).map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                        value: option.value,
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "flex w-full items-center justify-between gap-4",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    children: option.label
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                                    lineNumber: 368,
                                                                                    columnNumber: 31
                                                                                }, this),
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                                    className: "font-semibold text-dark-blue-400",
                                                                                    children: option.rate
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                                    lineNumber: 369,
                                                                                    columnNumber: 31
                                                                                }, this)
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                            lineNumber: 367,
                                                                            columnNumber: 29
                                                                        }, this)
                                                                    }, option.value, false, {
                                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                        lineNumber: 366,
                                                                        columnNumber: 27
                                                                    }, this)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectSeparator"], {}, void 0, false, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 375,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                    value: "custom-rate",
                                                                    children: RATE_OPTIONS[3].label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 376,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 364,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                    lineNumber: 350,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 318,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 308,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-[156px_1fr] items-start gap-x-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] leading-7 text-gray-500",
                                                        children: "Contract Duration"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 387,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                        children: data.duration
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 390,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 386,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2",
                                                children: state.showCustomDurationInput ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "grid grid-cols-[1fr_110px] gap-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                                                    autoFocus: true,
                                                                    placeholder: "Enter duration",
                                                                    value: state.durationValue,
                                                                    onChange: (event)=>updateState((previous)=>({
                                                                                ...previous,
                                                                                durationValue: event.target.value
                                                                            }))
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 399,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                                                                    value: state.durationUnit,
                                                                    onValueChange: (value)=>updateState((previous)=>({
                                                                                ...previous,
                                                                                durationUnit: value
                                                                            })),
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                                            className: "text-left text-[15px] leading-7 text-dark-blue-400",
                                                                            children: state.durationUnit
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                            lineNumber: 419,
                                                                            columnNumber: 27
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                                            children: CUSTOM_DURATION_UNITS.map((unit)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                                    value: unit,
                                                                                    children: unit
                                                                                }, unit, false, {
                                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                                    lineNumber: 424,
                                                                                    columnNumber: 31
                                                                                }, this))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                            lineNumber: 422,
                                                                            columnNumber: 27
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 410,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 398,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex",
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                variant: "link",
                                                                visual: "gray",
                                                                onClick: ()=>updateState((previous)=>({
                                                                            ...previous,
                                                                            showCustomDurationInput: false,
                                                                            durationValue: "4 months",
                                                                            durationSelection: "custom-duration"
                                                                        })),
                                                                children: "Cancel"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                lineNumber: 432,
                                                                columnNumber: 25
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 431,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                                                    open: state.durationSelectOpen,
                                                    onOpenChange: (nextOpen)=>updateState((previous)=>({
                                                                ...previous,
                                                                durationSelectOpen: nextOpen
                                                            })),
                                                    value: state.durationSelection,
                                                    onValueChange: handleDurationChange,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                            className: "w-full text-left text-[15px] leading-7 text-dark-blue-400",
                                                            children: state.durationValue
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 460,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                            children: [
                                                                DURATION_OPTIONS.slice(0, 6).map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                        value: option.value,
                                                                        children: option.label
                                                                    }, option.value, false, {
                                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                        lineNumber: 465,
                                                                        columnNumber: 27
                                                                    }, this)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectSeparator"], {}, void 0, false, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 469,
                                                                    columnNumber: 25
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                    value: "custom-duration",
                                                                    children: DURATION_OPTIONS[6].label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                    lineNumber: 470,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 463,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/counter-offer-dialog.tsx",
                                                    lineNumber: 449,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 395,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 385,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-[156px_1fr] items-start gap-x-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] leading-7 text-gray-500",
                                                        children: "Work Schedule"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 481,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                        children: data.schedule
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 484,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 480,
                                                columnNumber: 17
                                            }, this),
                                            state.showCustomScheduleInput ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$input$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                                        autoFocus: true,
                                                        placeholder: "Enter schedule",
                                                        value: state.scheduleValue,
                                                        onChange: (event)=>updateState((previous)=>({
                                                                    ...previous,
                                                                    scheduleValue: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 491,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-end",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            variant: "link",
                                                            visual: "gray",
                                                            onClick: ()=>updateState((previous)=>({
                                                                        ...previous,
                                                                        showCustomScheduleInput: false,
                                                                        scheduleSelection: "full-time",
                                                                        scheduleValue: "Full Time"
                                                                    })),
                                                            children: "Cancel"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/counter-offer-dialog.tsx",
                                                            lineNumber: 503,
                                                            columnNumber: 23
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 502,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 490,
                                                columnNumber: 19
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Select"], {
                                                open: state.scheduleSelectOpen,
                                                onOpenChange: (nextOpen)=>updateState((previous)=>({
                                                            ...previous,
                                                            scheduleSelectOpen: nextOpen
                                                        })),
                                                value: state.scheduleSelection,
                                                onValueChange: handleScheduleChange,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectTrigger"], {
                                                        className: "w-full text-left text-[15px] leading-7 text-dark-blue-400",
                                                        children: state.scheduleValue
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 531,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectContent"], {
                                                        children: SCHEDULE_OPTIONS.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$select$2f$select$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SelectItem"], {
                                                                value: option.value,
                                                                children: option.label
                                                            }, option.value, false, {
                                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                                lineNumber: 536,
                                                                columnNumber: 25
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 534,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 520,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 479,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-[156px_1fr] items-start gap-x-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] leading-7 text-gray-500",
                                                        children: "Start Date"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 547,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                        children: data.startDate
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                                        lineNumber: 550,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 546,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$date$2d$picker$2f$date$2d$picker$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DatePicker"], {
                                                value: state.startDateValue,
                                                onValueChange: (value)=>updateState((previous)=>({
                                                            ...previous,
                                                            startDateValue: value
                                                        })),
                                                placeholder: "Select a date",
                                                displayFormat: "MMMM do, yyyy",
                                                indicator: null,
                                                inputClassName: "w-full justify-start px-[14px] text-left text-[15px] font-normal leading-7 text-gray-500"
                                            }, void 0, false, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 555,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 545,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                lineNumber: 307,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                        children: "Add a message (optional)"
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 572,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Textarea"], {
                                                placeholder: "Add a short note...",
                                                rows: 7,
                                                value: state.messageValue,
                                                onChange: (event)=>{
                                                    const nextValue = event.target.value.slice(0, 500);
                                                    updateState((previous)=>({
                                                            ...previous,
                                                            messageValue: nextValue
                                                        }));
                                                    onMessageChange?.(nextValue);
                                                }
                                            }, void 0, false, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 577,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-right text-sm leading-5 text-gray-400",
                                                children: [
                                                    state.messageValue.length,
                                                    "/500"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                                lineNumber: 590,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 576,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                lineNumber: 571,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-end gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        variant: "ghost",
                                        visual: "gray",
                                        onClick: onCancel,
                                        children: "Cancel"
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 597,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        disabled: submitDisabled,
                                        onClick: onReview,
                                        children: "Review Counter Offer"
                                    }, void 0, false, {
                                        fileName: "[project]/components/counter-offer-dialog.tsx",
                                        lineNumber: 600,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/counter-offer-dialog.tsx",
                                lineNumber: 596,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/counter-offer-dialog.tsx",
                        lineNumber: 306,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/counter-offer-dialog.tsx",
                lineNumber: 288,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/counter-offer-dialog.tsx",
            lineNumber: 279,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/counter-offer-dialog.tsx",
        lineNumber: 278,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/next-link.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NextLink",
    ()=>NextLink,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/react-utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/nprogress/nprogress.js [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
const NextLink = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].forwardRef(({ onClick, href, ...props }, ref)=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        ...props,
        onClick: (event)=>{
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shouldTriggerStartEvent"])(href.toString(), event)) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].configure({
                    showSpinner: false
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].start();
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].set(0);
            }
            if (onClick) onClick(event);
        },
        ref: ref
    }, void 0, false, {
        fileName: "[project]/components/next-link.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
});
NextLink.displayName = "NextLink";
const __TURBOPACK__default__export__ = NextLink;
}),
"[project]/components/offer-flow-dialog.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OfferFlowDialog",
    ()=>OfferFlowDialog
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/badge/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$checkbox$2f$checkbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/checkbox/checkbox.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dialog/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/textarea/textarea.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
const DECLINE_REASONS = [
    "Budget doesn’t work",
    "Start date doesn’t work",
    "Requirements are unclear",
    "Not a fit for my skills",
    "Too busy right now",
    "Need different terms"
];
const INLINE_LINK_CLASS = "inline text-primary-500 underline-offset-2 hover:underline";
function OfferFlowDialog({ open, onOpenChange, variant, data, acceptanceMessage, termsAccepted, declineMessage, selectedDeclineReason, acceptLoading = false, declineLoading = false, onAcceptanceMessageChange, onTermsAcceptedChange, onDeclineMessageChange, onDeclineReasonChange, onViewJob, onMessage, onCounterOffer, onDecline, onAccept, onBack, onCancelAccept, onCancelDecline }) {
    const isAcceptState = variant === "accept-offer-empty" || variant === "accept-offer-ready";
    const isDeclineState = variant === "decline-offer-empty" || variant === "decline-offer-ready";
    const isHistoryState = variant === "offer-details-history";
    const resolvedAcceptanceMessage = acceptanceMessage ?? (variant === "accept-offer-ready" ? "Excited to get started!" : "");
    const resolvedTermsAccepted = termsAccepted ?? variant === "accept-offer-ready";
    const resolvedDeclineMessage = declineMessage ?? (variant === "decline-offer-ready" ? "Too busy right now" : "");
    const resolvedDeclineReason = selectedDeclineReason ?? (variant === "decline-offer-ready" ? "Too busy right now" : "");
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
        open: open,
        onOpenChange: onOpenChange,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
            variant: "unanimated",
            className: "pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none",
            onPointerDown: (event)=>{
                if (event.target === event.currentTarget) {
                    onOpenChange(false);
                }
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]",
                children: isAcceptState ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    className: "text-[18px] font-semibold leading-7 text-dark-blue-400",
                                    children: "Accept This Offer"
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 120,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        variant: "ghost",
                                        visual: "gray",
                                        size: "md",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                            className: "size-5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 126,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/offer-flow-dialog.tsx",
                                        lineNumber: 125,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 124,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 119,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-8 px-6 py-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                            children: "Message to client (optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 133,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Textarea"], {
                                                    value: resolvedAcceptanceMessage,
                                                    onChange: (event)=>onAcceptanceMessageChange?.(event.target.value.slice(0, 500)),
                                                    placeholder: "Add a short note...",
                                                    rows: 7
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 138,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right text-sm leading-5 text-gray-400",
                                                    children: [
                                                        resolvedAcceptanceMessage.length,
                                                        "/500"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 148,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 137,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 132,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                            children: "Agree to terms"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 155,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            htmlFor: "accept-offer-terms",
                                            className: "flex cursor-pointer items-start gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$checkbox$2f$checkbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Checkbox"], {
                                                    id: "accept-offer-terms",
                                                    size: "lg",
                                                    checked: resolvedTermsAccepted,
                                                    onCheckedChange: (checked)=>onTermsAcceptedChange?.(checked === true)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 163,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "pt-0.5 text-[15px] leading-8 text-gray-700",
                                                    children: [
                                                        "I agree to Marketeq's",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/terms",
                                                            className: INLINE_LINK_CLASS,
                                                            onClick: (event)=>event.stopPropagation(),
                                                            children: "Terms of Service"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 173,
                                                            columnNumber: 23
                                                        }, this),
                                                        ",",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/privacy",
                                                            className: INLINE_LINK_CLASS,
                                                            onClick: (event)=>event.stopPropagation(),
                                                            children: "Privacy Policy"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 181,
                                                            columnNumber: 23
                                                        }, this),
                                                        ",",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/terms?section=dispute-policy",
                                                            className: INLINE_LINK_CLASS,
                                                            onClick: (event)=>event.stopPropagation(),
                                                            children: "Dispute Policy"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 189,
                                                            columnNumber: 23
                                                        }, this),
                                                        ", and",
                                                        " ",
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: "/community-guidelines",
                                                            className: INLINE_LINK_CLASS,
                                                            onClick: (event)=>event.stopPropagation(),
                                                            children: "Work Protection Guidelines"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 197,
                                                            columnNumber: 23
                                                        }, this),
                                                        "."
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 171,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 159,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-2 text-sm leading-6 text-gray-400",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Info"], {
                                                    className: "size-4 shrink-0"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 209,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Once you accept, this offer becomes an active contract."
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 210,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 208,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 154,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-end gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "ghost",
                                            visual: "gray",
                                            onClick: onCancelAccept,
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 217,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            disabled: !resolvedTermsAccepted || acceptLoading,
                                            onClick: onAccept,
                                            children: acceptLoading ? "Accepting..." : "Accept Offer"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 224,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 216,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 131,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true) : isDeclineState ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    className: "text-[18px] font-semibold leading-7 text-dark-blue-400",
                                    children: "Decline This Offer"
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 236,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        variant: "ghost",
                                        visual: "gray",
                                        size: "md",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                            className: "size-5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 242,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/offer-flow-dialog.tsx",
                                        lineNumber: 241,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 240,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 235,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-8 px-6 py-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[15px] leading-7 text-dark-blue-400",
                                            children: "Help us understand why you’re declining. If you’re still interested but need different terms, you can make a counter offer."
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 249,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$textarea$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Textarea"], {
                                                    value: resolvedDeclineMessage,
                                                    onChange: (event)=>onDeclineMessageChange?.(event.target.value.slice(0, 500)),
                                                    rows: 7
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 256,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-right text-sm leading-5 text-gray-400",
                                                    children: [
                                                        resolvedDeclineMessage.length,
                                                        "/500"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 265,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 255,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 248,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-3",
                                    children: DECLINE_REASONS.map((reason)=>{
                                        const selected = resolvedDeclineReason === reason;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: selected ? "light" : "outlined",
                                            visual: selected ? "primary" : "gray",
                                            size: "sm",
                                            className: "justify-start",
                                            onClick: ()=>onDeclineReasonChange?.(reason),
                                            children: reason
                                        }, reason, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 275,
                                            columnNumber: 23
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 271,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "ghost",
                                            visual: "gray",
                                            onClick: onCancelDecline,
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 290,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    onClick: onCounterOffer,
                                                    children: "Counter Offer"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 299,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    visual: "error",
                                                    disabled: declineLoading,
                                                    onClick: onDecline,
                                                    children: declineLoading ? "Declining..." : "Decline Offer"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 306,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 298,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 289,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 247,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        isHistoryState ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                            variant: "ghost",
                                            visual: "gray",
                                            size: "md",
                                            onClick: onBack,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowLeft"], {
                                                className: "size-5"
                                            }, void 0, false, {
                                                fileName: "[project]/components/offer-flow-dialog.tsx",
                                                lineNumber: 328,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 322,
                                            columnNumber: 21
                                        }, this) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                            className: "text-[18px] font-semibold leading-7 text-dark-blue-400",
                                            children: [
                                                data.senderDisplayName,
                                                " ",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-primary-500",
                                                    children: data.senderUsername
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 334,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 332,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 320,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dialog$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogClose"], {
                                    asChild: true,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        variant: "ghost",
                                        visual: "gray",
                                        size: "md",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                                            className: "size-5"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 340,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/offer-flow-dialog.tsx",
                                        lineNumber: 339,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 338,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 319,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-8 px-6 py-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-start justify-between gap-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0 flex-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                            variant: "rounded",
                                                            visual: "gray",
                                                            size: "sm",
                                                            children: data.offerType
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 349,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-sm leading-5 text-gray-500",
                                                            children: [
                                                                "Received on ",
                                                                data.receivedLabel
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 352,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 348,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-3 text-[18px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.offerTitle
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 357,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "link",
                                                    visual: "primary",
                                                    className: "mt-3 underline-offset-2 hover:underline",
                                                    leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Briefcase"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/offer-flow-dialog.tsx",
                                                        lineNumber: 365,
                                                        columnNumber: 33
                                                    }, this),
                                                    onClick: onViewJob,
                                                    children: "View Job"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 361,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 347,
                                            columnNumber: 19
                                        }, this),
                                        isHistoryState ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "inline-flex items-center gap-2 pt-1 text-[15px] leading-7 text-gray-500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Repeat"], {
                                                    className: "size-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 374,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Offer History"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 375,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 373,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            variant: "outlined",
                                            visual: "gray",
                                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["User"], {
                                                className: "size-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/offer-flow-dialog.tsx",
                                                lineNumber: 381,
                                                columnNumber: 33
                                            }, this),
                                            onClick: onMessage,
                                            children: "Message"
                                        }, void 0, false, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 378,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 346,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-4 border-y border-gray-100 py-8",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-[170px_1fr] gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: "Offer Rate"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 391,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.offerRate
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 394,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 390,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-[170px_1fr] gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] leading-7 text-gray-500",
                                                    children: "Role"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 400,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.role
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 403,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 399,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-[170px_1fr] gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] leading-7 text-gray-500",
                                                    children: "Contract Duration"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 409,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.duration
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 412,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 408,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-[170px_1fr] gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] leading-7 text-gray-500",
                                                    children: "Work Schedule"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 418,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.schedule
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 421,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 417,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid grid-cols-[170px_1fr] gap-4",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] leading-7 text-gray-500",
                                                    children: "Start Date"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 427,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[15px] font-semibold leading-7 text-dark-blue-400",
                                                    children: data.startDate
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 430,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 426,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 389,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "space-y-6",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm leading-6 text-gray-400",
                                            children: [
                                                "This offer expires ",
                                                data.expiresLabel
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 437,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-between gap-3",
                                            children: [
                                                isHistoryState ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    onClick: onCounterOffer,
                                                    children: "Counter Offer"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 443,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-3",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            variant: "ghost",
                                                            visual: "gray",
                                                            disabled: declineLoading,
                                                            onClick: onDecline,
                                                            children: declineLoading ? "Declining..." : "Decline Offer"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 453,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            onClick: onAccept,
                                                            children: "Accept Offer"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                                            lineNumber: 461,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                                    lineNumber: 452,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/offer-flow-dialog.tsx",
                                            lineNumber: 441,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/offer-flow-dialog.tsx",
                                    lineNumber: 436,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/offer-flow-dialog.tsx",
                            lineNumber: 345,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true)
            }, void 0, false, {
                fileName: "[project]/components/offer-flow-dialog.tsx",
                lineNumber: 116,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/offer-flow-dialog.tsx",
            lineNumber: 107,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/offer-flow-dialog.tsx",
        lineNumber: 106,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/three-horizontal-lines.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThreeHorizontalLines",
    ()=>ThreeHorizontalLines
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const ThreeHorizontalLines = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-5 h-[14px]", className),
        viewBox: "0 0 20 14",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M19 7C19 7 13.8007 7 8.33333 7M19 1L1 1M19 13H4.66667",
            stroke: "currentColor",
            strokeWidth: 1.5,
            strokeLinecap: "round",
            strokeLinejoin: "round"
        }, void 0, false, {
            fileName: "[project]/components/three-horizontal-lines.tsx",
            lineNumber: 16,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/three-horizontal-lines.tsx",
        lineNumber: 9,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
}),
"[project]/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/lib/api.ts
__turbopack_context__.s([
    "API_BASE",
    ()=>API_BASE,
    "apiFetch",
    ()=>apiFetch
]);
const API_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100/api") || "";
async function apiFetch(path, { body, headers, ...opts } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            ...headers || {}
        },
        body: body != null ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    // Handle empty responses (e.g. 204 No Content from DELETE)
    if (res.status === 204 || res.headers.get("content-length") === "0") {
        return undefined;
    }
    const text = await res.text();
    if (!text) return undefined;
    return JSON.parse(text);
}
}),
"[project]/utils/auth.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAccessToken",
    ()=>getAccessToken,
    "getCurrentUser",
    ()=>getCurrentUser
]);
// utils/auth.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jwt$2d$decode$2f$build$2f$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jwt-decode/build/esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-ssr] (ecmascript)");
;
;
function getAccessToken() {
    const cookie = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("access_token") || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("accessToken");
    if (cookie) return cookie;
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
const getCurrentUser = ()=>{
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
    const token = undefined;
};
function getOtherParticipantId(conv, me) {
    return conv.participantIds?.find((id)=>id !== me);
}
}),
"[externals]/net [external] (net, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("net", () => require("net"));

module.exports = mod;
}),
"[externals]/tls [external] (tls, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("tls", () => require("tls"));

module.exports = mod;
}),
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[externals]/dns [external] (dns, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("dns", () => require("dns"));

module.exports = mod;
}),
"[project]/utils/useNotificationChannel.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNotificationChannel",
    ()=>useNotificationChannel
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably-node.js [app-ssr] (ecmascript)");
;
;
;
;
function useNotificationChannel(handlers) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(handlers);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        ref.current = handlers;
    }, [
        handlers
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) return;
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
                        cb("Ably realtime is not configured for this environment.", null);
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
            if (msg.name === "notification:new") {
                ref.current.onNotificationNew?.(msg.data);
            }
            if (msg.name === "notification:badge") {
                ref.current.onBadgeCount?.(msg.data);
            }
        });
        return ()=>{
            channel.unsubscribe();
            client.close();
        };
    }, []);
}
}),
"[project]/app/top-most-header.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TopMostHeader",
    ()=>TopMostHeader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/auth.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/libs/autocomplete/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$hooks$2f$useAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/autocomplete/hooks/useAutocomplete.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/libs/notifications.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$dev$2d$login$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api/dev-login.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$contracts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api/contracts.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/notifications.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/user.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types/user.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/icons/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$campaigns$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/campaigns.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2d$3$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/logo-3.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$project$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/project.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$talent$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/talent.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$invite$2d$window$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/invite-window.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$counter$2d$offer$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/counter-offer-dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$offer$2d$flow$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/offer-flow-dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$three$2d$horizontal$2d$lines$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/three-horizontal-lines.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/combobox/combobox.tsx [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$listbox$2f$listbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/listbox/listbox.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/popover/popover.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$transitions$2f$transitions$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/transitions/transitions.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/scroll-aria/scroll-area.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tabs/tabs.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useNotificationChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/useNotificationChannel.ts [app-ssr] (ecmascript)");
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
const OFFER_NOTIFICATION_EVENT = "contract.offer.received";
const readMetadataString = (metadata, key)=>{
    const value = metadata?.[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};
const ensureUsernameHandle = (value)=>{
    if (!value) return undefined;
    return value.startsWith("@") ? value : `@${value}`;
};
const formatOfferDate = (value, fallback)=>{
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
};
const formatOfferStartDate = (value, fallback)=>{
    if (!value) return fallback;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return fallback;
    const day = parsed.getDate();
    const remainder = day % 10;
    const suffix = day >= 11 && day <= 13 ? "th" : remainder === 1 ? "st" : remainder === 2 ? "nd" : remainder === 3 ? "rd" : "th";
    return `${parsed.toLocaleDateString("en-US", {
        month: "short"
    })} ${day}${suffix}, ${parsed.getFullYear()}`;
};
const getOfferNotificationDetails = (item)=>{
    const metadata = item.metadata;
    const senderUsername = ensureUsernameHandle(readMetadataString(metadata, "senderUsername")) || ensureUsernameHandle(item.title.match(/@[\w.]+/)?.[0]) || "@lauradesign21";
    const senderDisplayName = readMetadataString(metadata, "senderDisplayName") || "Offer from";
    const offerTitle = readMetadataString(metadata, "offerTitle") || readMetadataString(metadata, "projectTitle") || "The Ultimate Mobile App Experience";
    const receivedLabel = formatOfferDate(readMetadataString(metadata, "receivedAt") || undefined, formatOfferDate(new Date().toISOString(), "Feb 1, 2025")) || "Feb 1, 2025";
    const expiresLabel = formatOfferDate(readMetadataString(metadata, "expiresAt") || undefined, "Sep 19, 2025") || "Sep 19, 2025";
    return {
        contractId: readMetadataString(metadata, "contractId"),
        senderUsername,
        senderDisplayName,
        offerType: readMetadataString(metadata, "offerType") || "Project",
        receivedLabel,
        offerTitle,
        viewJobHref: readMetadataString(metadata, "jobHref") || readMetadataString(metadata, "projectHref") || item.href || "/inbox",
        messageHref: readMetadataString(metadata, "messageHref") || "/inbox",
        offerRate: readMetadataString(metadata, "offerRate") || "$45/hr",
        role: readMetadataString(metadata, "role") || "UX Designer",
        duration: readMetadataString(metadata, "duration") || "4 Months",
        schedule: readMetadataString(metadata, "scheduleLabel") || readMetadataString(metadata, "schedule") || "Full Time over 30 hrs/week",
        startDate: formatOfferStartDate(readMetadataString(metadata, "startDate") || undefined, "Feb 5th, 2025") || "Feb 5th, 2025",
        expiresLabel
    };
};
const Notifications = ()=>{
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const [open, setOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [offerDialogOpen, setOfferDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [offerDialogMode, setOfferDialogMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("details");
    const [selectedOfferNotification, setSelectedOfferNotification] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [offerAcceptanceNote, setOfferAcceptanceNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [offerTermsAccepted, setOfferTermsAccepted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [offerDeclineNote, setOfferDeclineNote] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [offerDeclineReason, setOfferDeclineReason] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [offerActionLoading, setOfferActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("Notifications");
    const [allNotifications, setAllNotifications] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [unreadBadgeCount, setUnreadBadgeCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(0);
    const loadNotifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (allowSeed = true)=>{
        try {
            setLoading(true);
            if ("TURBOPACK compile-time truthy", 1) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$dev$2d$login$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ensureDevAuth"])();
            }
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].list({
                limit: 8
            });
            const items = Array.isArray(response?.data?.data) ? response.data.data.map(__TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapApiNotificationToUi"]) : [];
            if (allowSeed && items.length === 0 && ("TURBOPACK compile-time value", "development") === "development" && typeof __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].seedDev === "function") {
                await __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].seedDev();
                return loadNotifications(false);
            }
            setAllNotifications(items);
            setUnreadBadgeCount(items.filter((item)=>!item.read).length);
        } catch (error) {
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTransientNotificationsApiError"])(error)) {
                console.error("Failed to load header notifications:", error);
            }
            setAllNotifications([]);
            setUnreadBadgeCount(0);
        } finally{
            setLoading(false);
        }
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadNotifications();
    }, [
        loadNotifications
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!open) return;
        loadNotifications(false);
    }, [
        open,
        loadNotifications
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$useNotificationChannel$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useNotificationChannel"])({
        onNotificationNew: (payload)=>{
            const nextItem = (0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mapAblyNotificationToUi"])(payload);
            setAllNotifications((prev)=>{
                const deduped = prev.filter((item)=>item.id !== nextItem.id);
                return [
                    nextItem,
                    ...deduped
                ].slice(0, 8);
            });
            setUnreadBadgeCount((prev)=>prev + 1);
            setActiveTab("Messages");
        },
        onBadgeCount: ({ unreadCount })=>{
            setUnreadBadgeCount(unreadCount);
        }
    });
    const messageNotifications = allNotifications.filter((item)=>item.kind === "message");
    const selectedOfferDetails = selectedOfferNotification ? getOfferNotificationDetails(selectedOfferNotification) : null;
    const resetOfferDialogState = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        setOfferDialogMode("details");
        setOfferAcceptanceNote("");
        setOfferTermsAccepted(false);
        setOfferDeclineNote("");
        setOfferDeclineReason("");
        setOfferActionLoading(null);
    }, []);
    const offerDialogVariant = offerDialogMode === "details" ? "offer-details" : offerDialogMode === "accept" ? offerAcceptanceNote.trim().length > 0 && offerTermsAccepted ? "accept-offer-ready" : "accept-offer-empty" : offerDeclineNote.trim().length > 0 || offerDeclineReason.trim().length > 0 ? "decline-offer-ready" : "decline-offer-empty";
    const markNotificationRead = async (item)=>{
        try {
            if (!item.read) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].markRead(item.id);
                setAllNotifications((prev)=>prev.map((notification)=>notification.id === item.id ? {
                            ...notification,
                            read: true
                        } : notification));
                setUnreadBadgeCount((prev)=>Math.max(0, prev - 1));
            }
        } catch (error) {
            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$notifications$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["isTransientNotificationsApiError"])(error)) {
                console.error(`Failed to mark notification ${item.id} as read:`, error);
            }
        }
    };
    const handleOfferResponse = async (accepted)=>{
        const details = selectedOfferNotification ? getOfferNotificationDetails(selectedOfferNotification) : null;
        if (!selectedOfferNotification || !details?.contractId || !user?.id) {
            setOfferDialogOpen(false);
            return;
        }
        setOfferActionLoading(accepted ? "accept" : "decline");
        try {
            const response = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$contracts$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["respondToContract"])(details.contractId, {
                accepted,
                talentId: user.id
            });
            if (response) {
                setOfferDialogOpen(false);
                setSelectedOfferNotification(null);
                resetOfferDialogState();
                await loadNotifications(false);
            }
        } finally{
            setOfferActionLoading(null);
        }
    };
    const handleNotificationClick = async (item)=>{
        await markNotificationRead(item);
        if (item.event === OFFER_NOTIFICATION_EVENT) {
            setSelectedOfferNotification(item);
            resetOfferDialogState();
            setOpen(false);
            setOfferDialogOpen(true);
            return;
        }
        router.push(item.href);
    };
    const renderNotificationItem = (item, showCategory)=>{
        const accent = item.kind === "project" ? {
            label: "Project",
            className: "bg-[#FEF3F2] text-[#B42318]",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FileCheck02"]
        } : item.kind === "team" ? {
            label: "Team",
            className: "bg-[#ECFDF3] text-[#027A48]",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Users"]
        } : item.kind === "message" ? {
            label: "Message",
            className: "bg-primary-50 text-primary-500",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["User"]
        } : {
            label: "System",
            className: "bg-[#EEF4FF] text-[#3538CD]",
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bell"]
        };
        const AccentIcon = accent.icon;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            className: "w-full text-left hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-3 transition-colors",
            onClick: ()=>handleNotificationClick(item),
            children: [
                item.isUserNotification ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                    size: "md",
                    isOnline: true,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                            src: item.avatarSrc,
                            alt: item.avatarAlt
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 406,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                            children: item.title.slice(0, 1)
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 407,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/top-most-header.tsx",
                    lineNumber: 405,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("inline-flex size-10 shrink-0 items-center justify-center rounded-full", accent.className),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AccentIcon, {
                        className: "size-[18px]"
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 416,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/app/top-most-header.tsx",
                    lineNumber: 410,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-auto min-w-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between gap-x-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0",
                                    children: [
                                        showCategory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]", accent.className),
                                            children: accent.label
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 424,
                                            columnNumber: 17
                                        }, ("TURBOPACK compile-time value", void 0)) : null,
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-sm leading-[16.94px] font-semibold text-dark-blue-400 truncate",
                                            children: item.title
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 433,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 422,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs leading-[14.06px] text-[#585C65] whitespace-nowrap",
                                    children: item.timeLabel
                                }, void 0, false, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 438,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 421,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-1 text-sm leading-[16.94px] text-gray-700",
                            children: item.description
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 443,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 text-xs font-semibold text-primary-500",
                            children: item.ctaLabel
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 446,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/top-most-header.tsx",
                    lineNumber: 420,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, item.id, true, {
            fileName: "[project]/app/top-most-header.tsx",
            lineNumber: 398,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Popover"], {
                open: open,
                onOpenChange: setOpen,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PopoverTrigger"], {
                        asChild: true,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                            className: "rounded-full",
                            size: "md",
                            variant: "ghost",
                            visual: "gray",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bell"], {
                                className: "size-[18px]"
                            }, void 0, false, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 464,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 458,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 457,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$popover$2f$popover$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PopoverContent"], {
                        className: "w-[370px] bg-white border border-gray-100 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]",
                        align: "end",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tabs"], {
                            value: activeTab,
                            onValueChange: (value)=>setActiveTab(value),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsList"], {
                                    className: "w-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                            value: "Notifications",
                                            children: [
                                                "Notifications",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500",
                                                    children: unreadBadgeCount
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 475,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 473,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                            value: "Messages",
                                            children: [
                                                "Messages",
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500",
                                                    children: messageNotifications.filter((item)=>!item.read).length
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 481,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 479,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 472,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsContent"], {
                                    value: "Notifications",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "py-3 border-b border-gray-100 flex flex-col gap-y-1",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                                className: "h-[328px]",
                                                scrollBar: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollBar"], {
                                                    className: "w-4 px-1"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 491,
                                                    columnNumber: 30
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "px-2",
                                                    children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-3 py-6 text-sm text-gray-500",
                                                        children: "Loading notifications..."
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 495,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)) : allNotifications.length > 0 ? allNotifications.map((item)=>renderNotificationItem(item, false)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-3 py-6 text-sm text-gray-500",
                                                        children: "No notifications to show"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 501,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 493,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 489,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 488,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "py-3.5 grid",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium",
                                                onClick: ()=>router.push("/notifications"),
                                                children: "View All"
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 510,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 509,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 487,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsContent"], {
                                    value: "Messages",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "py-3 border-b border-gray-100 flex flex-col gap-y-1",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                                className: "h-[328px]",
                                                scrollBar: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollBar"], {
                                                    className: "w-4 px-1"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 519,
                                                    columnNumber: 30
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "px-2",
                                                    children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-3 py-6 text-sm text-gray-500",
                                                        children: "Loading messages..."
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 523,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0)) : messageNotifications.length > 0 ? messageNotifications.map((item)=>renderNotificationItem(item, false)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "px-3 py-6 text-sm text-gray-500",
                                                        children: "No messages to show"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 529,
                                                        columnNumber: 23
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 521,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 517,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 516,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "py-3.5 grid",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                className: "focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium",
                                                onClick: ()=>router.push("/inbox"),
                                                children: "View All"
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 537,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 536,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 515,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 471,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 467,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/top-most-header.tsx",
                lineNumber: 456,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            selectedOfferDetails && offerDialogMode !== "counter" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$offer$2d$flow$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OfferFlowDialog"], {
                open: offerDialogOpen,
                onOpenChange: (nextOpen)=>{
                    setOfferDialogOpen(nextOpen);
                    if (!nextOpen) {
                        setSelectedOfferNotification(null);
                        resetOfferDialogState();
                    }
                },
                variant: offerDialogVariant,
                data: selectedOfferDetails,
                acceptanceMessage: offerAcceptanceNote,
                termsAccepted: offerTermsAccepted,
                declineMessage: offerDeclineNote,
                selectedDeclineReason: offerDeclineReason,
                acceptLoading: offerActionLoading === "accept",
                declineLoading: offerActionLoading === "decline",
                onAcceptanceMessageChange: setOfferAcceptanceNote,
                onTermsAcceptedChange: setOfferTermsAccepted,
                onDeclineMessageChange: setOfferDeclineNote,
                onDeclineReasonChange: setOfferDeclineReason,
                onViewJob: ()=>router.push(selectedOfferDetails.viewJobHref),
                onMessage: ()=>{
                    setOfferDialogOpen(false);
                    setSelectedOfferNotification(null);
                    resetOfferDialogState();
                    router.push(selectedOfferDetails.messageHref);
                },
                onCounterOffer: ()=>setOfferDialogMode("counter"),
                onDecline: ()=>{
                    if (offerDialogMode === "decline") {
                        void handleOfferResponse(false);
                        return;
                    }
                    setOfferDialogMode("decline");
                },
                onAccept: ()=>{
                    if (offerDialogMode === "details") {
                        setOfferDialogMode("accept");
                        return;
                    }
                    void handleOfferResponse(true);
                },
                onCancelAccept: ()=>setOfferDialogMode("details"),
                onCancelDecline: ()=>setOfferDialogMode("details")
            }, void 0, false, {
                fileName: "[project]/app/top-most-header.tsx",
                lineNumber: 547,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : null,
            selectedOfferDetails && offerDialogMode === "counter" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$counter$2d$offer$2d$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CounterOfferDialog"], {
                open: offerDialogOpen,
                onOpenChange: (nextOpen)=>{
                    setOfferDialogOpen(nextOpen);
                    if (!nextOpen) {
                        setSelectedOfferNotification(null);
                        resetOfferDialogState();
                    }
                },
                variant: "default",
                data: selectedOfferDetails,
                onCancel: ()=>setOfferDialogMode("details"),
                onReview: ()=>{}
            }, void 0, false, {
                fileName: "[project]/app/top-most-header.tsx",
                lineNumber: 596,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : null
        ]
    }, void 0, true);
};
const options = [
    {
        value: "$1,540",
        currencyCode: "USD"
    },
    {
        value: "$1,440",
        currencyCode: "USD"
    },
    {
        value: "$1,340",
        currencyCode: "USD"
    },
    {
        value: "$1,240",
        currencyCode: "USD"
    }
];
const [{ value: defaultValue }] = options;
// Fixed "Browse ..." suggestions shown in the empty-state dropdown.
// `route` marks these as navigation targets — the Combobox onChange handler
// routes to `route` instead of treating `value` as a search term.
//
// Routes point at the dedicated L1 browse pages restored from
// `archive/backup_old_structure/level-1/` into the app routing tree.
const fixedSuggestions = [
    {
        id: 1,
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$talent$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Talent"],
        value: "Browse Talent",
        route: "/talent"
    },
    {
        id: 2,
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$project$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Project"],
        value: "Browse Projects",
        route: "/projects"
    },
    {
        id: 3,
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$campaigns$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Campaigns"],
        value: "Browse Services",
        route: "/services"
    },
    {
        id: 4,
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Users"],
        value: "Browse Teams",
        route: "/teams"
    },
    {
        id: 5,
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMd"],
        value: "Find Jobs",
        route: "/find-jobs"
    }
];
const suggestions = [
    {
        id: 1,
        value: "UX Architect"
    },
    {
        id: 2,
        value: "Bulma developer"
    },
    {
        id: 3,
        value: "React"
    },
    {
        id: 4,
        value: "Golang framework"
    },
    {
        id: 5,
        value: "Mobile applications"
    },
    {
        id: 6,
        value: "Magento development"
    }
];
const listingTypes = [
    "Projects",
    "Services",
    "Talent",
    "Teams",
    "Jobs"
];
const SearchBar = ()=>{
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])();
    const [selected, setSelected] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState();
    const [query, setQuery] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState("");
    // Nonce used as `key` on the Combobox wrapper. Incrementing it forces
    // Headless UI to unmount/remount, which reliably resets its internal open
    // state. Used to force-close the dropdown after a search submit even when
    // the keyword hasn't changed (router.push to same URL is a no-op).
    const [resetNonce, setResetNonce] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(0);
    // Ref to the hidden ComboboxButton so we can click-through from the input
    // and explicitly open the dropdown on focus/click (industry standard).
    const openButtonRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const inputRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
    // Industry-standard behavior (Amazon/Upwork/Fiverr):
    //  • On /search → show the active query term in the bar (from ?q=)
    //  • On any other route → clear the bar so the next search starts fresh
    const searchParamsHook = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        if (pathname?.startsWith("/search")) {
            const qParam = searchParamsHook?.get("q") ?? "";
            setQuery(qParam);
            // Mirror into `selected` so Headless UI's displayValue renders the term
            setSelected(qParam ? {
                id: -1,
                value: qParam
            } : undefined);
        } else {
            setQuery("");
            setSelected(undefined);
        }
    }, [
        pathname,
        searchParamsHook
    ]);
    // Imperative flag set while submitting a search, so `onFocus` knows not
    // to re-open the combobox during the final blur/navigation step.
    const submittingRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(false);
    const closeDropdown = ()=>{
        // Force-close by remounting the Combobox via a key change. This is the
        // only reliable way to close when the search URL doesn't change (e.g.
        // user hits Enter with the same keyword — router.push is a no-op, so
        // effect-based closes never fire). The remount also resets Headless
        // UI's internal focus/active-index state.
        submittingRef.current = true;
        inputRef.current?.blur();
        setResetNonce((n)=>n + 1);
        // Release the re-open guard flag after React flushes the remount.
        setTimeout(()=>{
            submittingRef.current = false;
        }, 300);
    };
    const submitSearch = (term)=>{
        const trimmed = term.trim();
        if (!trimmed) return;
        const params = new URLSearchParams();
        params.set("q", trimmed);
        if (state) params.set("category", state.toLowerCase());
        closeDropdown();
        router.push(`/search?${params.toString()}`);
    };
    const searchPlaceholder = (()=>{
        switch(state){
            case "Projects":
                return "Search by skills or project type";
            case "Services":
                return "Search by skills or service type";
            case "Teams":
                return "Search by skills or team type";
            case "Talent":
                return "Search by skills or expertise";
            default:
                return "Search by skills or keyword";
        }
    })();
    // Live autocomplete from backend — debounced at 250ms, hits
    // /autocomplete/{type}. Falls back to /public/mock/{type}.json on error.
    // Type depends on the category selector: Talent/Projects → job_titles,
    // Teams/Services → skills, default (All) → skills.
    const autocompleteType = (()=>{
        switch(state){
            case "Talent":
            case "Projects":
                return "job_titles";
            case "Teams":
            case "Services":
                return "skills";
            default:
                return "skills";
        }
    })();
    const { suggestions: liveSuggestions } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$libs$2f$autocomplete$2f$hooks$2f$useAutocomplete$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAutocomplete"])(autocompleteType, query);
    const filteredSuggestions = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>{
        if (Array.isArray(liveSuggestions) && liveSuggestions.length > 0) {
            return liveSuggestions.slice(0, 10).map((s, i)=>({
                    id: typeof s?.id === "number" ? s.id : i + 1000,
                    value: s?.label ?? s?.value ?? String(s)
                }));
        }
        // Static fallback: preserves the previous UX when the API is unreachable
        return query === "" ? suggestions : suggestions.filter((industry)=>industry.value.toLowerCase().replace(/\s+/g, "").includes(query.toLowerCase().replace(/\s+/g, "")));
    }, [
        liveSuggestions,
        query
    ]);
    // Only clear the input text when the dropdown closes after an explicit
    // submit. Switching the category Listbox also triggers afterLeave — we
    // must NOT erase the user's query in that case. (Amazon, Upwork, Google
    // all preserve the search term when toggling the category selector.)
    const reset = ()=>{
        if (submittingRef.current) {
            setQuery("");
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Combobox"], {
        className: "group/root w-auto flex-auto",
        value: selected,
        onChange: (value)=>{
            if (!value) return;
            // Fixed "Browse ..." items have a route — navigate instead of searching.
            if (value.route) {
                closeDropdown();
                setSelected(undefined);
                router.push(value.route);
                return;
            }
            if (value.value) {
                submitSearch(value.value);
                // Do NOT persist the selected object — pathname effect will reset
                // on the next route, and we want the bar to show the term via the
                // pathname-synced query instead.
                setSelected(undefined);
            }
        },
        children: ({ open })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    open && typeof document !== "undefined" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "fixed inset-0 bg-black/40 z-40 pointer-events-none animate-in fade-in duration-150",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 824,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)), document.body),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxTrigger"], {
                        className: "relative z-50 flex h-[34px] lg:h-10 rounded-[5px] items-center gap-x-3 border border-gray-300 bg-white ui-open:rounded-b-none py-[7px] lg:py-2 pl-2.5 pr-3 lg:px-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2 flex-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchMd"], {
                                        className: "size-4 shrink-0 text-gray-400"
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 832,
                                        columnNumber: 11
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxInput"], {
                                        ref: inputRef,
                                        placeholder: searchPlaceholder,
                                        className: "p-0 border-0 text-xs leading-5 h-auto rounded-none hover:ring-0 hover:border-gray-300 focus:ring-0 focus:border-gray-300 ui-open:rounded-b-none",
                                        size: "lg",
                                        displayValue: (value)=>value?.value ?? "",
                                        onChange: (event)=>setQuery(event.target.value),
                                        onFocus: ()=>{
                                            // Open the dropdown the moment the user focuses the input
                                            // (industry-standard behavior — Amazon, Upwork, Fiverr all do this).
                                            // Guard against double-firing: only click the hidden trigger if
                                            // the options aren't already open, otherwise we'd toggle it shut.
                                            // Also skip if we're in the middle of submitting a search, so
                                            // the dropdown doesn't reopen right as it's closing.
                                            if (submittingRef.current) return;
                                            const btn = openButtonRef.current;
                                            if (btn && btn.getAttribute("aria-expanded") !== "true") {
                                                btn.click();
                                            }
                                        },
                                        onKeyDownCapture: (e)=>{
                                            // Capture-phase so we intercept Enter before Headless UI's own
                                            // keydown handler tries to "select the highlighted option"
                                            // (which would otherwise swallow the event when nothing is
                                            // highlighted, or submit the wrong term if something is).
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                submitSearch(query);
                                            } else if (e.key === "Escape") {
                                                // Standard: Escape clears the input without submitting
                                                setQuery("");
                                                setSelected(undefined);
                                            }
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 833,
                                        columnNumber: 11
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxButton"], {
                                        ref: openButtonRef,
                                        className: "hidden",
                                        "aria-hidden": "true",
                                        tabIndex: -1
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 875,
                                        columnNumber: 11
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 831,
                                columnNumber: 9
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "w-px h-4 shrink-0 inline-block bg-gray-200"
                            }, void 0, false, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 882,
                                columnNumber: 9
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$listbox$2f$listbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Listbox"], {
                                className: "w-auto",
                                value: state,
                                onChange: setState,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$listbox$2f$listbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListboxButton"], {
                                        className: "p-0 border-0 text-[11px] leading-[16.67px] lg:text-sm lg:leading-5 font-semibold gap-x-[6.67px] lg:gap-x-1.5 w-auto h-auto rounded-none hover:ring-0 focus:ring-0",
                                        placeholder: "View All",
                                        iconClassName: "size-[12.5px]"
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 884,
                                        columnNumber: 11
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$listbox$2f$listbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListboxOptions"], {
                                        className: "w-[160px] -right-3 left-auto mt-3.5 rounded-lg border border-gray-100 shadow-lg overflow-hidden",
                                        viewportClassName: "max-h-none",
                                        wrapperClassName: "p-1 space-y-0",
                                        children: listingTypes.map((type)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$listbox$2f$listbox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListboxOption"], {
                                                value: type,
                                                className: "rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 ui-active:bg-gray-50",
                                                children: type
                                            }, type, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 895,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 889,
                                        columnNumber: 11
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 883,
                                columnNumber: 9
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 830,
                        columnNumber: 7
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$transitions$2f$transitions$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScaleOutIn"], {
                        afterLeave: reset,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxOptions"], {
                            className: "px-0 mt-0 space-y-0 border border-gray-300 border-t-0 rounded-t-none bg-white",
                            children: query === "" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3",
                                        children: fixedSuggestions.map((fixedSuggestion)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxOption"], {
                                                value: fixedSuggestion,
                                                className: "text-xs flex items-center gap-x-3 leading-[13.3px] text-gray-400",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(fixedSuggestion.icon, {
                                                        className: "size-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 918,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    fixedSuggestion.value
                                                ]
                                            }, fixedSuggestion.id, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 913,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 911,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-1 p-3 border-t border-gray-100",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "px-3 flex items-center justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                                        className: "text-[13px] leading-6 font-semibold text-dark-blue-400",
                                                        children: "Recent Searches"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 926,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                        className: "opacity-50 hover:opacity-100",
                                                        variant: "link",
                                                        visual: "gray",
                                                        children: "Clear Search History"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 930,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 925,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                                viewportClassName: "max-h-[360px]",
                                                children: suggestions.map((suggestion)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxOption"], {
                                                        value: suggestion,
                                                        children: suggestion.value
                                                    }, suggestion.id, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 940,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 938,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 924,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true) : /* Typing state: live autocomplete matches only */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$scroll$2d$aria$2f$scroll$2d$area$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ScrollArea"], {
                                    viewportClassName: "max-h-[360px]",
                                    children: filteredSuggestions.length > 0 ? filteredSuggestions.map((suggestion)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$combobox$2f$combobox$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ComboboxOption"], {
                                            value: suggestion,
                                            children: suggestion.value
                                        }, suggestion.id, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 953,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "px-3 py-2 text-xs text-gray-400",
                                        children: "No matches"
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 958,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/app/top-most-header.tsx",
                                    lineNumber: 950,
                                    columnNumber: 15
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 949,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 907,
                            columnNumber: 9
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 906,
                        columnNumber: 7
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true)
    }, resetNonce, false, {
        fileName: "[project]/app/top-most-header.tsx",
        lineNumber: 793,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const PATHNAMES = [
    "/talent-dashboard",
    "/client-dashboard",
    "/talent-profile"
];
// Pages that have a secondary nav bar below the primary nav — shadow should only appear on the secondary nav, not the primary
const HAS_SECONDARY_NAV = [
    "/",
    "/talent-profile",
    "/my-team",
    "/favorite-projects",
    "/favorite-talent",
    "/browser-history",
    "/search",
    "/talent-search",
    "/projects",
    "/services",
    "/teams",
    "/talent",
    "/find-jobs"
];
const ONBOARDING = "/onboarding";
const TopMostHeader = ({ showShadow = true })=>{
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const [menuOpen, setMenuOpen] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    const [secondaryNavHidden, setSecondaryNavHidden] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const { logoutHandler, user, setUser } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    // Job details pages use the same marketplace secondary nav shell as the
    // homepage/category surfaces, so the primary header must coordinate with it.
    const hasSecondaryNav = HAS_SECONDARY_NAV.includes(pathname) || pathname.startsWith("/c/") || pathname.startsWith("/project-details/") || pathname.startsWith("/job-details/");
    // Listen for secondary nav visibility changes
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        if (!hasSecondaryNav) return;
        const observer = new MutationObserver(()=>{
            const val = document.documentElement.dataset.secondaryNav;
            setSecondaryNavHidden(val === "hidden");
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: [
                "data-secondary-nav"
            ]
        });
        return ()=>observer.disconnect();
    }, [
        hasSecondaryNav
    ]);
    if (pathname.startsWith(ONBOARDING)) {
        return null;
    }
    // Show shadow: always on pages without secondary nav, or when secondary nav is hidden (scrolled away)
    const showNavShadow = !hasSecondaryNav || secondaryNavHidden;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(// Keep the primary nav pinned to the viewport so iOS/macOS overscroll
        // bounce only affects page content, not the header itself.
        "fixed inset-x-0 top-0 px-3.5 md:px-6 lg:px-[50px] bg-white flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5 z-50", showNavShadow ? "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]" : "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] md:shadow-none", PATHNAMES.includes(pathname) && "md:max-lg:pb-2.5"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-between md:gap-x-3 lg:gap-x-[50px] md:pt-2 md:pb-1 lg:py-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        className: "focus-visible:outline-none",
                        href: "/",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2d$3$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Logo3"], {
                            className: "h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]"
                        }, void 0, false, {
                            fileName: "[project]/app/top-most-header.tsx",
                            lineNumber: 1028,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 1027,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-auto gap-x-3 xs:max-lg:ml-3 xs:max-md:hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SearchBar, {}, void 0, false, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 1032,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            className: "gap-x-2 xs:max-lg:h-[34px] xs:max-lg:px-[12.6px] xs:max-lg:py-[7.2px] bg-white",
                                            visual: "gray",
                                            variant: "outlined",
                                            size: "md",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-x-[7.2px] lg:gap-x-1 text-[12.6px] leading-5 lg:text-base lg:leading-6 font-light",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-semibold",
                                                            children: "$ 1,540"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/top-most-header.tsx",
                                                            lineNumber: 1043,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        " USD"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 1042,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                                    className: "text-gray-500 size-[13.5px] lg:size-[15px]"
                                                }, void 0, false, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 1045,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 1036,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1035,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                        className: "w-[174px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>router.push("/add-funds"),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Plus"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1050,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " Add Funds"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1049,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>router.push("/transfer-funds"),
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Repeat"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1053,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    " Transfer Funds"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1052,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1048,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 1034,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 1031,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$invite$2d$window$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["InviteWindowTrigger"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                            className: "rounded-full",
                                            size: "md",
                                            variant: "ghost",
                                            visual: "gray",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Plus"], {
                                                className: "size-[18px]"
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1068,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 1062,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1061,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Notifications, {}, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1071,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                        className: "rounded-full lg:hidden",
                                        size: "md",
                                        variant: "ghost",
                                        visual: "gray",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$three$2d$horizontal$2d$lines$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ThreeHorizontalLines"], {
                                            className: "text-dark-blue-400"
                                        }, void 0, false, {
                                            fileName: "[project]/app/top-most-header.tsx",
                                            lineNumber: 1078,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1072,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 1060,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                open: menuOpen,
                                onOpenChange: setMenuOpen,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                        className: "hidden lg:inline-flex items-center gap-x-2 px-3 py-1.5 rounded-[8px] hover:bg-gray-100 focus-visible:outline-none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "inline-flex items-center gap-x-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                                                src: user?.avatarUrl ?? "",
                                                                alt: user?.firstName ?? "User"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1086,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                                                suppressHydrationWarning: true,
                                                                children: user?.firstName?.[0]?.toUpperCase()
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1090,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1085,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-col text-left",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-xs font-semibold leading-[15px] text-gray-700",
                                                                suppressHydrationWarning: true,
                                                                children: `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1095,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-[9px] leading-[14px] text-gray-500",
                                                                suppressHydrationWarning: true,
                                                                children: user?.email
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1098,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1094,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1084,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                                className: "size-4 shrink-0"
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1104,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1083,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                        className: "w-[278px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuLabel"], {
                                                className: "font-normal",
                                                size: "md",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-col gap-y-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex flex-col",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-xs leading-5 text-gray-700",
                                                                    children: "User ID: 2459749"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/top-most-header.tsx",
                                                                    lineNumber: 1110,
                                                                    columnNumber: 21
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-[13px] leading-5 text-primary-500",
                                                                    suppressHydrationWarning: true,
                                                                    children: user?.email
                                                                }, void 0, false, {
                                                                    fileName: "[project]/app/top-most-header.tsx",
                                                                    lineNumber: 1113,
                                                                    columnNumber: 21
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/app/top-most-header.tsx",
                                                            lineNumber: 1109,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            className: "w-full",
                                                            onClick: ()=>{
                                                                setMenuOpen(false);
                                                                router.push("/settings");
                                                            },
                                                            children: "My Account"
                                                        }, void 0, false, {
                                                            fileName: "[project]/app/top-most-header.tsx",
                                                            lineNumber: 1118,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/app/top-most-header.tsx",
                                                    lineNumber: 1108,
                                                    columnNumber: 17
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1107,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1121,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/talent-profile");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["User"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1123,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Profile"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1122,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push(user?.accountType === "TALENT" ? "/talent-dashboard" : "/client-dashboard");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LayoutGrid02"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1127,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Dashboard"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1126,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            user?.accountType === "TALENT" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/my-listings");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["List"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1132,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Listings"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1131,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/my-contracts");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FileCheck02"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1137,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Contracts"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1136,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/my-team");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Users"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1141,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Team"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1140,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/favorites");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1145,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "My Favorites"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1144,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/billing");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CoinStack"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1149,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "Billing"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1148,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onSelect: ()=>{
                                                    setMenuOpen(false);
                                                    router.push("/settings");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Settings"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1153,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    "Settings"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1152,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1156,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                onClick: async ()=>{
                                                    setMenuOpen(false);
                                                    const newType = user?.accountType === "TALENT" ? "client" : "talent";
                                                    const newDashboard = newType === "client" ? "/client-dashboard" : "/talent-dashboard";
                                                    // Optimistically update local user so the dropdown label flips immediately,
                                                    // even if the backend doesn't accept the userType change.
                                                    setUser((prev)=>prev ? {
                                                            ...prev,
                                                            userType: newType,
                                                            accountType: newType === "talent" ? __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ROLE"].TALENT : __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ROLE"].CLIENT
                                                        } : prev);
                                                    if (user?.id) {
                                                        __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UserAPI"].updateProfile(user.id, {
                                                            userType: newType
                                                        }).catch(()=>{});
                                                    }
                                                    router.push(newDashboard);
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Repeat"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1169,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    user?.accountType === "TALENT" ? "Switch to Client" : "Switch to Talent"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1157,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1172,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid grid-cols-2 gap-x-[9px]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LifeBuoy"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1175,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "Help Center"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1174,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        onClick: ()=>logoutHandler(),
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LogOut"], {
                                                                className: "size-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/app/top-most-header.tsx",
                                                                lineNumber: 1179,
                                                                columnNumber: 19
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "Log out"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/app/top-most-header.tsx",
                                                        lineNumber: 1178,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/app/top-most-header.tsx",
                                                lineNumber: 1173,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/top-most-header.tsx",
                                        lineNumber: 1106,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/top-most-header.tsx",
                                lineNumber: 1082,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/top-most-header.tsx",
                        lineNumber: 1059,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/app/top-most-header.tsx",
                lineNumber: 1026,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SearchBar, {}, void 0, false, {
                    fileName: "[project]/app/top-most-header.tsx",
                    lineNumber: 1189,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/app/top-most-header.tsx",
                lineNumber: 1188,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/app/top-most-header.tsx",
        lineNumber: 1015,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/utils/useOnlineUsers.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OnlineUsersProvider",
    ()=>OnlineUsersProvider,
    "useOnlineUsers",
    ()=>useOnlineUsers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/ably/build/ably-node.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/auth.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
// Global presence channel — every authenticated client joins on mount and
// observes who else is online. Drives the avatar dot in the inbox left/right
// sidebars and the chat header (replacing the previous per-thread-only check
// which only worked when both users were viewing the same thread).
const PRESENCE_CHANNEL = "presence:online";
const OnlineUsersContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    isOnline: ()=>false,
    onlineIds: new Set()
});
function OnlineUsersProvider({ children }) {
    const [onlineIds, setOnlineIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(new Set());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getCurrentUser"])();
        if (!currentUser) return;
        let cancelled = false;
        let entered = false;
        const client = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$ably$2f$build$2f$ably$2d$node$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Realtime"]({
            authCallback: async (_tokenParams, callback)=>{
                try {
                    const token = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$auth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getAccessToken"])();
                    // No threadId — backend returns a token with the global
                    // `presence:online` capability (plus `user:${userId}`).
                    const tokenDetails = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["apiFetch"])("/v1/threads/ably-token", {
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
                    callback(err instanceof Error ? err.message : String(err), null);
                }
            },
            clientId: currentUser.id
        });
        const channel = client.channels.get(PRESENCE_CHANNEL);
        const sync = async ()=>{
            if (cancelled) return;
            try {
                const present = await channel.presence.get();
                if (cancelled) return;
                setOnlineIds(new Set(present.map((m)=>m.clientId)));
            } catch  {
            // detached during cleanup; ignore.
            }
        };
        const handle = (_msg)=>{
            if (!cancelled) void sync();
        };
        channel.presence.subscribe(handle).catch(()=>{});
        (async ()=>{
            try {
                await channel.presence.enter({
                    online: true
                });
                if (cancelled) return;
                entered = true;
                await sync();
            } catch (err) {
                if (!cancelled) {
                    console.warn("[useOnlineUsers] enter failed:", err);
                }
            }
        })();
        return ()=>{
            cancelled = true;
            try {
                channel.presence.unsubscribe(handle);
            } catch  {}
            ;
            (async ()=>{
                try {
                    if (entered) await channel.presence.leave();
                } catch  {}
                try {
                    client.close();
                } catch  {}
            })();
        };
    }, []);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            onlineIds,
            isOnline: (userId)=>!!userId && onlineIds.has(userId)
        }), [
        onlineIds
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(OnlineUsersContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/utils/useOnlineUsers.tsx",
        lineNumber: 119,
        columnNumber: 5
    }, this);
}
function useOnlineUsers() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(OnlineUsersContext);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0nbxiga._.js.map