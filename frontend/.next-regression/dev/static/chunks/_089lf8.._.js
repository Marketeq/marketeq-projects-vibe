(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/service/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
/* eslint-disable no-param-reassign */ /* eslint-disable no-underscore-dangle */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-client] (ecmascript)");
;
;
const BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
const getAccessToken = ()=>{
    const cookieToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("access_token") || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("accessToken");
    if (cookieToken) return cookieToken;
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return window.localStorage.getItem("access_token") || window.localStorage.getItem("token") || undefined;
};
__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].defaults.baseURL = BASE;
const axiosInstance = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: BASE,
    timeout: 30000
});
axiosInstance.interceptors.request.use(async (config)=>{
    const access_token = getAccessToken();
    if (access_token) {
        config.headers.Authorization = `Bearer ${access_token}`;
    } else if (config.headers?.Authorization) {
        delete config.headers.Authorization;
    }
    return Promise.resolve(config);
}, (err)=>{
    return Promise.reject(err);
});
// Auto-refresh: if a request gets 401, try refreshing the token and retry once
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error, token = null)=>{
    failedQueue.forEach((prom)=>{
        if (token) prom.resolve(token);
        else prom.reject(error);
    });
    failedQueue = [];
};
axiosInstance.interceptors.response.use((response)=>response, async (error)=>{
    const originalRequest = error.config;
    // Only intercept 401s, skip if already retried or if this IS the refresh call
    if (error?.response?.status !== 401 || originalRequest._retry || originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
        return Promise.reject(error);
    }
    const refreshToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("refresh_token");
    if (!refreshToken) {
        return Promise.reject(error);
    }
    if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject)=>{
            failedQueue.push({
                resolve: (token)=>{
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    originalRequest._retry = true;
                    resolve(axiosInstance(originalRequest));
                },
                reject: (err)=>reject(err)
            });
        });
    }
    isRefreshing = true;
    originalRequest._retry = true;
    try {
        const AUTH_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
        const res = await axiosInstance.post(`${AUTH_BASE}/auth/refresh`, {
            refresh_token: refreshToken
        });
        const newAccessToken = res?.data?.access_token;
        const newRefreshToken = res?.data?.refresh_token;
        if (newAccessToken) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set("access_token", newAccessToken, {
                path: "/"
            });
            if (newRefreshToken) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set("refresh_token", newRefreshToken, {
                    path: "/"
                });
            }
            if (res?.data?.sessionId) {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set("session_id", res.data.sessionId, {
                    path: "/"
                });
            }
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            processQueue(null, newAccessToken);
            return axiosInstance(originalRequest);
        }
        processQueue(error, null);
        return Promise.reject(error);
    } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — clear tokens, user will need to re-login
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("access_token", {
            path: "/"
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("refresh_token", {
            path: "/"
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("session_id", {
            path: "/"
        });
        return Promise.reject(refreshError);
    } finally{
        isRefreshing = false;
    }
});
const get = (url, config = {})=>axiosInstance.get(url, config);
const post = (url, data, config = {})=>axiosInstance.post(url, data, config);
const put = (url, data, config = {})=>axiosInstance.put(url, data, config);
const patch = (url, data, config = {})=>axiosInstance.patch(url, data, config);
const del = (url, config = {})=>axiosInstance.delete(url, config);
const AxiosRequest = {
    get,
    post,
    put,
    patch,
    del
};
const __TURBOPACK__default__export__ = AxiosRequest;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/service/http/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthAPI",
    ()=>AuthAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-client] (ecmascript)");
;
const AUTH_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
const AuthAPI = {
    SignUpWithEmail: (data)=>{
        // email-only signup
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/register-email`, {
            email: data.email
        });
    },
    LoginWithEmail: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/login`, data);
    },
    LoginWithGoogle: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/google`, data);
    },
    LoginWithLinkedIn: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/linkedin`, data);
    },
    CheckUsername: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/check-username`, data);
    },
    CreatePassword: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`${AUTH_BASE}/auth/set-password`, data);
    },
    Logout: (refreshToken)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/logout`, refreshToken ? {
            refresh_token: refreshToken
        } : null, {
            withCredentials: true
        });
    },
    ForgotPassword: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/forgot-password`, data);
    },
    ResetPassword: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/reset-password`, data);
    },
    GenerateTwoFactor: ()=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/generate`, {});
    },
    EnableTwoFactor: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/enable`, data);
    },
    GenerateSmsTwoFactor: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/generate-sms`, data);
    },
    ResendTwoFactorCode: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/resend`, data);
    },
    DisableTwoFactor: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/disable`, data);
    },
    VerifyTwoFactor: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/verify`, data);
    },
    RegenerateBackupCodes: (data)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/2fa/backup-codes`, data);
    },
    GetSessions: (currentSessionId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${AUTH_BASE}/auth/sessions?currentSessionId=${encodeURIComponent(currentSessionId)}`);
    },
    RevokeSession: (sessionId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${AUTH_BASE}/auth/sessions/${sessionId}`);
    },
    Heartbeat: ()=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${AUTH_BASE}/auth/sessions/heartbeat`, {});
    },
    RevokeAllOtherSessions: (currentSessionId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${AUTH_BASE}/auth/sessions?currentSessionId=${encodeURIComponent(currentSessionId)}`);
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/service/http/user.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "UserAPI",
    ()=>UserAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-client] (ecmascript)");
;
;
const USER_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") ?? "";
const authHeaders = ()=>{
    const token = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("access_token");
    return token ? {
        Authorization: `Bearer ${token}`
    } : {};
};
const UserAPI = {
    // Existing
    me: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${USER_BASE}/user/me`),
    handleSkip: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`${USER_BASE}/user/onboarding-dismissed`, data),
    // List users
    listUsers: (limit = 50, offset = 0)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${USER_BASE}/v1/users?limit=${limit}&offset=${offset}`, {
            headers: authHeaders()
        }),
    // Profile
    getProfile: (userId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${USER_BASE}/v1/users/${userId}`, {
            headers: authHeaders()
        }),
    getByUsername: (username)=>// Public endpoint served by TalentController (no auth required).
        // Returns the user plus loaded skills/experiences for the talent
        // profile card view.
        __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${USER_BASE}/talent/users/${username}`),
    updateProfile: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`${USER_BASE}/v1/users/${userId}`, data, {
            headers: authHeaders()
        }),
    dismissOnboarding: (userId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].patch(`${USER_BASE}/v1/users/${userId}/onboarding/dismiss`, {}, {
            headers: authHeaders()
        }),
    // Education
    addEducation: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/education`, data, {
            headers: authHeaders()
        }),
    updateEducation: (userId, eduId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`${USER_BASE}/v1/users/${userId}/education/${eduId}`, data, {
            headers: authHeaders()
        }),
    removeEducation: (userId, eduId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/education/${eduId}`, {
            headers: authHeaders()
        }),
    // Experience
    addExperience: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/work`, data, {
            headers: authHeaders()
        }),
    updateExperience: (userId, workId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`${USER_BASE}/v1/users/${userId}/work/${workId}`, data, {
            headers: authHeaders()
        }),
    removeExperience: (userId, workId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/work/${workId}`, {
            headers: authHeaders()
        }),
    // Skills
    addSkill: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/skills`, data, {
            headers: authHeaders()
        }),
    updateSkill: (userId, skillId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`${USER_BASE}/v1/users/${userId}/skills/${skillId}`, data, {
            headers: authHeaders()
        }),
    removeSkill: (userId, skillId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/skills/${skillId}`, {
            headers: authHeaders()
        }),
    // Languages
    addLanguage: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/languages`, data, {
            headers: authHeaders()
        }),
    updateLanguage: (userId, langId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`${USER_BASE}/v1/users/${userId}/languages/${langId}`, data, {
            headers: authHeaders()
        }),
    removeLanguage: (userId, langId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/languages/${langId}`, {
            headers: authHeaders()
        }),
    // Certifications
    addCertification: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/certifications`, data, {
            headers: authHeaders()
        }),
    updateCertification: (userId, certId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`${USER_BASE}/v1/users/${userId}/certifications/${certId}`, data, {
            headers: authHeaders()
        }),
    removeCertification: (userId, certId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/certifications/${certId}`, {
            headers: authHeaders()
        }),
    // Industries
    addIndustry: (userId, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${USER_BASE}/v1/users/${userId}/industries`, data, {
            headers: authHeaders()
        }),
    removeIndustry: (userId, industryId)=>__TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${USER_BASE}/v1/users/${userId}/industries/${industryId}`, {
            headers: authHeaders()
        })
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/service/http/invitations.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InvitationsAPI",
    ()=>InvitationsAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-client] (ecmascript)");
;
const INVITATIONS_BASE = "/invitations";
const InvitationsAPI = {
    createInvitations: (dto)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${INVITATIONS_BASE}`, dto);
    },
    createInvitationLink: (dto)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${INVITATIONS_BASE}/link`, dto);
    },
    listInvitations: (params)=>{
        const query = new URLSearchParams();
        if (params?.teamId) query.set("teamId", params.teamId);
        if (params?.invitedEmail) query.set("invitedEmail", params.invitedEmail);
        if (params?.status) query.set("status", params.status);
        if (params?.limit) query.set("limit", params.limit.toString());
        if (params?.cursor) query.set("cursor", params.cursor);
        const queryString = query.toString();
        const url = queryString ? `${INVITATIONS_BASE}?${queryString}` : INVITATIONS_BASE;
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(url);
    },
    getInvitation: (id)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${INVITATIONS_BASE}/${id}`);
    },
    resendInvitation: (id)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${INVITATIONS_BASE}/${id}/resend`, {});
    },
    cancelInvitation: (id)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${INVITATIONS_BASE}/${id}/cancel`);
    },
    acceptInvitation: (inviteToken)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${INVITATIONS_BASE}/accept`, {
            token: inviteToken
        });
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/types/user.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTH_PROVIDERS",
    ()=>AUTH_PROVIDERS,
    "ROLE",
    ()=>ROLE
]);
var AUTH_PROVIDERS = /*#__PURE__*/ function(AUTH_PROVIDERS) {
    AUTH_PROVIDERS["EMAIL"] = "EMAIL";
    AUTH_PROVIDERS["GOOGLE"] = "GOOGLE";
    AUTH_PROVIDERS["LINKEDIN"] = "LINKEDIN";
    return AUTH_PROVIDERS;
}({});
var ROLE = /*#__PURE__*/ function(ROLE) {
    ROLE["ADMIN"] = "ADMIN";
    ROLE["CLIENT"] = "CLIENT";
    ROLE["TALENT"] = "TALENT";
    return ROLE;
}({});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/functions.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EmojiProperties",
    ()=>EmojiProperties,
    "abs",
    ()=>abs,
    "add",
    ()=>add,
    "callAll",
    ()=>callAll,
    "capitalize",
    ()=>capitalize,
    "cn",
    ()=>cn,
    "computeCircumference",
    ()=>computeCircumference,
    "computePercentage",
    ()=>computePercentage,
    "containsNumberOfChars",
    ()=>containsNumberOfChars,
    "containsOneLowerCaseLetter",
    ()=>containsOneLowerCaseLetter,
    "containsOneNumber",
    ()=>containsOneNumber,
    "containsOneSymbol",
    ()=>containsOneSymbol,
    "containsOneUpperCaseLetter",
    ()=>containsOneUpperCaseLetter,
    "convertByteToMb",
    ()=>convertByteToMb,
    "convertToKbOrMb",
    ()=>convertToKbOrMb,
    "convertToTitleCase",
    ()=>convertToTitleCase,
    "countCharacters",
    ()=>countCharacters,
    "debounce",
    ()=>debounce,
    "emojiUnified",
    ()=>emojiUnified,
    "first",
    ()=>first,
    "flatten",
    ()=>flatten,
    "formatDate",
    ()=>formatDate,
    "formatDateArticle",
    ()=>formatDateArticle,
    "formatDatePosting",
    ()=>formatDatePosting,
    "fromLength",
    ()=>fromLength,
    "generateArray",
    ()=>generateArray,
    "get2DArray",
    ()=>get2DArray,
    "getDate",
    ()=>getDate,
    "getDays",
    ()=>getDays,
    "getDynamicallyStackableRootIndex",
    ()=>getDynamicallyStackableRootIndex,
    "getFirstItem",
    ()=>getFirstItem,
    "getId",
    ()=>getId,
    "getIsEmpty",
    ()=>getIsEmpty,
    "getIsNotEmpty",
    ()=>getIsNotEmpty,
    "getLastItem",
    ()=>getLastItem,
    "getMatched",
    ()=>getMatched,
    "getMiddleIndex",
    ()=>getMiddleIndex,
    "getNameParts",
    ()=>getNameParts,
    "getStringValue",
    ()=>getStringValue,
    "getUnmatched",
    ()=>getUnmatched,
    "hookFormHasError",
    ()=>hookFormHasError,
    "isArray",
    ()=>isArray,
    "isDoc",
    ()=>isDoc,
    "isEmpty",
    ()=>isEmpty,
    "isFn",
    ()=>isFn,
    "isImg",
    ()=>isImg,
    "isNaturalNumber",
    ()=>isNaturalNumber,
    "isNotEmpty",
    ()=>isNotEmpty,
    "isNotUndefined",
    ()=>isNotUndefined,
    "isNull",
    ()=>isNull,
    "isNumber",
    ()=>isNumber,
    "isString",
    ()=>isString,
    "isUndefined",
    ()=>isUndefined,
    "isVideo",
    ()=>isVideo,
    "keys",
    ()=>keys,
    "last",
    ()=>last,
    "max",
    ()=>max,
    "min",
    ()=>min,
    "noop",
    ()=>noop,
    "nope",
    ()=>nope,
    "omit",
    ()=>omit,
    "pick",
    ()=>pick,
    "strToArray",
    ()=>strToArray,
    "toDeg",
    ()=>toDeg,
    "toNumber",
    ()=>toNumber,
    "toPercentage",
    ()=>toPercentage,
    "toPxIfNumber",
    ()=>toPxIfNumber,
    "toString",
    ()=>toString,
    "values",
    ()=>values,
    "verifyFileType",
    ()=>verifyFileType,
    "withId",
    ()=>withId
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/date-fns/format.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/parseISO.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-hook-form/dist/index.esm.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-client] (ecmascript) <export * as z>");
;
;
;
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(...inputs));
}
function isNumber(arg) {
    return typeof arg === "number";
}
function toDeg(value) {
    if (isNumber(value)) {
        return `${value}deg`;
    }
    return value;
}
function toPxIfNumber(value) {
    if (isNumber(value)) {
        return `${value}px`;
    }
    return value;
}
function generateArray(values) {
    return Array.from({
        length: values
    }, (_, index)=>index + 1);
}
const getDays = (date)=>{
    const givenDate = new Date(date);
    const today = new Date();
    const timeDifference = today.getTime() - givenDate.getTime();
    const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    return daysDifference;
};
const getDate = (date)=>{
    const givenDate = new Date(date);
    return givenDate;
};
const formatDatePosting = (postedDate)=>{
    return getDays(postedDate) == 0 ? "Today" : getDays(postedDate) == 1 ? "Yesterday" : `${getDays(postedDate)} Days Ago`;
};
function noop() {}
const getId = ((id = 0)=>()=>id++)();
function callAll(...cbs) {
    return (...args)=>cbs.forEach((cb)=>cb?.(...args));
}
function formatDate(date) {
    return date ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$format$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["format"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$parseISO$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseISO"])(date), "MMMM d, yyyy") : undefined;
}
function formatDateArticle(isoDateStr) {
    const date = new Date(isoDateStr) // Parse the ISO date string
    ;
    const options = {
        year: "numeric",
        month: "long",
        day: "2-digit"
    };
    return date.toLocaleDateString("en-US", options);
}
function hookFormHasError({ errors, name }) {
    const error = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$hook$2d$form$2f$dist$2f$index$2e$esm$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["get"])(errors, name);
    return error ? true : false;
}
function convertByteToMb(kb) {
    const mb = kb / 1024 / 1024;
    return Number(mb.toFixed(2));
}
const getStringValue = (value)=>{
    return typeof value === "string" ? value : "";
};
function getFirstItem(value) {
    const firstItem = typeof value === "string" ? value.slice(0, 1) : value[0];
    return firstItem;
}
function getLastItem(value) {
    const firstItem = typeof value === "string" ? value.slice(-1) : value[value.length - 1];
    return firstItem;
}
function getIsEmpty(value) {
    const len = Number(value?.length);
    return len <= 0;
}
function getIsNotEmpty(value) {
    const len = Number(value?.length);
    return len > 0;
}
function capitalize(str) {
    if (!str) return "" // Check if the string is empty or undefined
    ;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
function debounce(cb, wait) {
    let timeoutId = setTimeout(cb, wait);
    function cancel() {
        clearTimeout(timeoutId);
        timeoutId = undefined;
    }
    function flush() {
        cancel();
        cb();
    }
    return {
        cancel,
        flush
    };
}
const getDynamicallyStackableRootIndex = ({ numberToAdd, value })=>{
    if (value) {
        return value.length + numberToAdd;
    }
    return numberToAdd;
};
function getUnmatched({ value, query }) {
    const lowercasedValue = value.toLowerCase();
    const lowercasedQuery = query.toLowerCase();
    let i = 0;
    while(i < lowercasedQuery.length && i < lowercasedValue.length){
        if (lowercasedQuery[i] !== lowercasedValue[i]) break;
        i++;
    }
    return value.slice(i);
}
function getMatched({ value, query }) {
    const lowercasedValue = value.toLowerCase();
    const lowercasedQuery = query.toLowerCase();
    let i = 0;
    while(i < lowercasedQuery.length && i < lowercasedValue.length){
        if (lowercasedQuery[i] !== lowercasedValue[i]) break;
        i++;
    }
    return value.slice(0, i);
}
const containsNumberOfChars = (options)=>{
    const { numberOfChars, value } = options;
    const { success } = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(numberOfChars).safeParse(value);
    return success;
};
const containsOneNumber = (value)=>{
    const { success } = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((data)=>/\d/.test(data)).safeParse(value);
    return success;
};
function getNameParts(fullName) {
    const [firstName, ...lastName] = fullName.split(" ");
    return {
        firstName,
        lastName: lastName.join(" ")
    };
}
const containsOneLowerCaseLetter = (value)=>{
    const { success } = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((data)=>/(?=.*[a-z])/.test(data)).safeParse(value);
    return success;
};
const containsOneUpperCaseLetter = (value)=>{
    const { success } = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((data)=>/(?=.*[A-Z])/.test(data)).safeParse(value);
    return success;
};
const containsOneSymbol = (value)=>{
    const { success } = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((data)=>/(?=.*[-+_!@#$%^&*., ?])/.test(data)).safeParse(value);
    return success;
};
const isFn = (value)=>typeof value === "function";
function computePercentage(value, percentage) {
    return value * percentage / 100;
}
function computeCircumference(radius) {
    return 2 * Math.PI * radius;
}
function nope() {}
function isString(arg) {
    return typeof arg === "string";
}
function first(arg) {
    return arg[0];
}
function last(arg) {
    return arg[0];
}
function verifyFileType(fileName, extensions) {
    if (extensions.length === 0) {
        return false;
    }
    const [extension, ...remainExtensions] = extensions;
    return fileName.endsWith(extension) ? true : verifyFileType(fileName, remainExtensions);
}
const isImg = (name)=>{
    return verifyFileType(name, [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".svg",
        ".bmp",
        ".ico",
        ".tif",
        ".tiff",
        ".avif"
    ]);
};
const isVideo = (name)=>{
    return verifyFileType(name, [
        ".mp4",
        ".mpeg",
        ".ogv",
        ".ts",
        ".webm",
        ".3gp",
        ".3g2",
        ".avi"
    ]);
};
const isDoc = (name)=>{
    return verifyFileType(name, [
        ".pdf"
    ]);
};
function convertToKbOrMb(bytes) {
    const kbs = bytes / 1000;
    return kbs < 1000 ? `${kbs.toFixed(2)}KB` : `${(kbs / 1000).toFixed(2)}MB`;
}
function isArray(arg) {
    return Array.isArray(arg);
}
function countCharacters(arg) {
    if (isNull(arg) || isUndefined(arg)) {
        return 0;
    } else if (isNumber(arg)) {
        return arg;
    } else if (isString(arg)) {
        return arg.length;
    } else if (isArray(arg)) {
        return arg.length;
    }
    return 1;
}
function isUndefined(arg) {
    return typeof arg === "undefined";
}
function isNotUndefined(arg) {
    return typeof arg !== "undefined";
}
function isNull(arg) {
    return arg === null;
}
function toPercentage(arg) {
    return `${arg}%`;
}
function get2DArray(arr, size = 2) {
    if (isEmpty(arr) || size < 1) {
        return [];
    }
    const recursion = (arr, size, result = [])=>{
        if (size >= arr.length) {
            return [
                ...result,
                [
                    ...arr
                ]
            ];
        }
        const remain = arr.slice(size);
        const slice = arr.slice(0, size);
        return recursion(remain, size, [
            ...result,
            slice
        ]);
    };
    return recursion(arr, size);
}
function add(...nums) {
    function recursion(nums, left = 0, result = 0) {
        if (nums.length === left) {
            return result;
        }
        const newResult = result + nums[left];
        return recursion(nums, left + 1, newResult);
    }
    return recursion(nums);
}
function isEmpty(arr) {
    return arr.length === 0;
}
function isNotEmpty(arr) {
    return arr.length > 0;
}
function flatten(arr) {
    return arr.flat(1);
}
function keys(record) {
    return Object.keys(record);
}
function withId(arr) {
    let id = 0;
    return arr.map((value)=>({
            value,
            id: id++
        }));
}
function pick(record, ...keys) {
    if (!record) {
        return;
    }
    let result = {};
    keys.forEach((key)=>{
        if (record[key] !== undefined) {
            result = {
                ...result,
                [key]: record[key]
            };
        }
    });
    return result;
}
function values(record) {
    return Object.values(record);
}
function isNaturalNumber(number) {
    if (isUndefined(number)) {
        return false;
    }
    return number > 0;
}
function toString(value) {
    if (!value) return;
    return `${value}`;
}
const min = (...values)=>{
    return Math.min(...values);
};
const abs = (value)=>{
    return Math.abs(value);
};
const max = (...values)=>{
    return Math.max(...values);
};
const toNumber = (value)=>{
    return Number(value);
};
const convertToTitleCase = (str)=>{
    // Handle snake_case
    str = str.replace(/_/g, " ");
    // Handle camelCase
    str = str.replace(/([A-Z])/g, " $1");
    // Capitalize the first letter of each word and trim any extra spaces
    return str.split(" ").map((word)=>word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ").trim();
};
var EmojiProperties = /*#__PURE__*/ function(EmojiProperties) {
    EmojiProperties["name"] = "n";
    EmojiProperties["unified"] = "u";
    EmojiProperties["variations"] = "v";
    EmojiProperties["added_in"] = "a";
    EmojiProperties["imgUrl"] = "imgUrl";
    return EmojiProperties;
}({});
const emojiUnified = (emoji)=>{
    const unified = emoji["u"];
    return unified;
};
function omit(obj, ...keys) {
    const result = {
        ...obj
    };
    keys.forEach((key)=>delete result[key]);
    return result;
}
function getMiddleIndex(value) {
    return Math.round(value.length / 2);
}
function strToArray(value) {
    if (typeof value === "string") {
        return value.split(",").map((item)=>item.trim());
    }
}
function fromLength(length) {
    return Array.from({
        length
    }, (_, index)=>index);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/react-utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createContext",
    ()=>createContext,
    "createStrictContext",
    ()=>createStrictContext,
    "getValidChildren",
    ()=>getValidChildren,
    "mergeRefs",
    ()=>mergeRefs,
    "shouldTriggerStartEvent",
    ()=>shouldTriggerStartEvent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$add$2d$base$2d$path$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/add-base-path.js [app-client] (ecmascript)");
"use client";
;
;
const createContext = ({ displayName, value, errorMessage } = {})=>{
    var _s = __turbopack_context__.k.signature();
    const Context = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](value);
    Context.displayName = displayName;
    const useContext = ()=>{
        _s();
        const context = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](Context);
        if (context === undefined) {
            throw new Error(errorMessage);
        }
        return context;
    };
    _s(useContext, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
    return [
        Context.Provider,
        useContext,
        Context.Consumer
    ];
};
const createStrictContext = ({ value, displayName, errorMessage, strict = false })=>{
    var _s = __turbopack_context__.k.signature();
    const Context = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](value);
    Context.displayName = displayName;
    const useContext = ()=>{
        _s();
        const context = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](Context);
        if (context === undefined && strict) {
            throw new Error(errorMessage);
        }
        return context;
    };
    _s(useContext, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
    return [
        Context.Provider,
        useContext
    ];
};
function getValidChildren(children) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Children"].toArray(children).filter((child)=>/*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidElement"](child));
}
function mergeRefs(refs) {
    return (value)=>{
        refs.forEach((ref)=>{
            if (typeof ref === "function") {
                ref(value);
            } else if (ref != null) {
                ;
                ref.current = value;
            }
        });
    };
}
function getURL(href) {
    return new URL((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$add$2d$base$2d$path$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addBasePath"])(href), location.href);
}
function isModifiedEvent(event) {
    const eventTarget = event.currentTarget;
    const target = eventTarget.getAttribute("target");
    return target && target !== "_self" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.nativeEvent && event.nativeEvent.button === 1;
}
function shouldTriggerStartEvent(href, clickEvent) {
    const current = window.location;
    const target = getURL(href);
    if (clickEvent && isModifiedEvent(clickEvent)) return false // modified events: fallback to browser behaviour
    ;
    if (current.origin !== target.origin) return false // external URL
    ;
    if (current.pathname === target.pathname && current.search === target.search) return false // same URL
    ;
    return true;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/dom-utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addEvent",
    ()=>addEvent,
    "getComputedStyle",
    ()=>getComputedStyle,
    "getCoordinates",
    ()=>getCoordinates,
    "getFileName",
    ()=>getFileName,
    "getHasExtension",
    ()=>getHasExtension,
    "getPreview",
    ()=>getPreview,
    "getSize",
    ()=>getSize,
    "isElement",
    ()=>isElement,
    "matchesExtensions",
    ()=>matchesExtensions,
    "preventDefault",
    ()=>preventDefault,
    "reload",
    ()=>reload,
    "scrollToTop",
    ()=>scrollToTop,
    "stopPropagation",
    ()=>stopPropagation
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
;
function preventDefault(value) {
    return value.preventDefault();
}
function stopPropagation(value) {
    return value.stopPropagation();
}
function scrollToTop({ behavior = "smooth", left, top = 0 } = {}) {
    scroll({
        behavior,
        left,
        top
    });
}
function reload() {
    return window.location.reload();
}
function getFileName(file) {
    const { name } = file;
    return name;
}
function getHasExtension({ extensions, meta }) {
    const value = getFileName(meta);
    return extensions.some((extension)=>value.endsWith(extension));
}
function matchesExtensions({ extensions, file }) {
    const value = getFileName(file);
    return extensions.some((extension)=>value.endsWith(extension));
}
function getPreview(file, onComplete) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isUndefined"])(file)) {
        onComplete(undefined);
        return ()=>{};
    }
    const onLoadEnd = (reader, onComplete)=>{
        return ()=>{
            const result = reader.result;
            if (result) {
                onComplete(result);
            } else {
                onComplete(undefined);
            }
        };
    };
    const reader = new FileReader();
    const handleLoadEnd = onLoadEnd(reader, onComplete);
    reader.addEventListener("loadend", handleLoadEnd);
    reader.readAsDataURL(file);
    return ()=>reader.removeEventListener("loadend", handleLoadEnd);
}
function addEvent({ target, event, listener, options }) {
    target.addEventListener(event, listener, options);
    return ()=>{
        target.removeEventListener(event, listener, options);
    };
}
const getBoundingClientRect = (element)=>{
    return element.getBoundingClientRect();
};
const getComputedStyle = (element)=>{
    return window.getComputedStyle(element);
};
const getCoordinates = (element)=>{
    const { x, y } = element.getBoundingClientRect();
    const scrollX = window.scrollX ?? document.documentElement.scrollLeft;
    const scrollY = window.scrollY ?? document.documentElement.scrollTop;
    return {
        x: x + scrollX,
        y: y + scrollY
    };
};
const getSize = (element)=>{
    const { width, height } = getBoundingClientRect(element);
    return {
        width,
        height
    };
};
const isElement = (element)=>{
    return element instanceof Element;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/hooks.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAddEvent",
    ()=>useAddEvent,
    "useArray",
    ()=>useArray,
    "useBoolean",
    ()=>useBoolean,
    "useCallbackRef",
    ()=>useCallbackRef,
    "useClickOutside",
    ()=>useClickOutside,
    "useControllableProp",
    ()=>useControllableProp,
    "useControllableState",
    ()=>useControllableState,
    "useDebounce",
    ()=>useDebounce,
    "useDeferredValue",
    ()=>useDeferredValue,
    "useDocument",
    ()=>useDocument,
    "useFirstMountState",
    ()=>useFirstMountState,
    "useHeadingObserver",
    ()=>useHeadingObserver,
    "useIsomorphicLayoutEffect",
    ()=>useIsomorphicLayoutEffect,
    "useKeyboard",
    ()=>useKeyboard,
    "useLocalStorage",
    ()=>useLocalStorage,
    "useMakeFixedBehaveSticky",
    ()=>useMakeFixedBehaveSticky,
    "useNumberOfForms",
    ()=>useNumberOfForms,
    "usePosition",
    ()=>usePosition,
    "usePrevious",
    ()=>usePrevious,
    "usePreviousValue",
    ()=>usePreviousValue,
    "useRouter",
    ()=>useRouter,
    "useRouterChangeComplete",
    ()=>useRouterChangeComplete,
    "useScrollDirection",
    ()=>useScrollDirection,
    "useShrinkThanLg",
    ()=>useShrinkThanLg,
    "useShrinkThanMd",
    ()=>useShrinkThanMd,
    "useShrinkThanMdLg",
    ()=>useShrinkThanMdLg,
    "useSize",
    ()=>useSize,
    "useStateMachine",
    ()=>useStateMachine,
    "useStepper",
    ()=>useStepper,
    "useTimeSelector",
    ()=>useTimeSelector,
    "useToggle",
    ()=>useToggle,
    "useUncontrolledState",
    ()=>useUncontrolledState,
    "useUnmountEffect",
    ()=>useUnmountEffect,
    "useUpdateEffect",
    ()=>useUpdateEffect,
    "useView",
    ()=>useView,
    "useWiderThanMd",
    ()=>useWiderThanMd,
    "useWiderThanMdLg",
    ()=>useWiderThanMdLg,
    "useWindow",
    ()=>useWindow,
    "useWindowScroll",
    ()=>useWindowScroll
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$internationalized$2f$date$2f$dist$2f$string$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@internationalized/date/dist/string.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$headless$2d$stepper$2f$dist$2f$chunk$2d$DOVZV5YB$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/headless-stepper/dist/chunk-DOVZV5YB.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/nprogress/nprogress.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useMedia.js [app-client] (ecmascript) <export default as useMedia>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useMount.js [app-client] (ecmascript) <export default as useMount>");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/dom-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature(), _s7 = __turbopack_context__.k.signature(), _s8 = __turbopack_context__.k.signature(), _s9 = __turbopack_context__.k.signature(), _s10 = __turbopack_context__.k.signature(), _s11 = __turbopack_context__.k.signature(), _s12 = __turbopack_context__.k.signature(), _s13 = __turbopack_context__.k.signature(), _s14 = __turbopack_context__.k.signature(), _s15 = __turbopack_context__.k.signature(), _s16 = __turbopack_context__.k.signature(), _s17 = __turbopack_context__.k.signature(), _s18 = __turbopack_context__.k.signature(), _s19 = __turbopack_context__.k.signature(), _s20 = __turbopack_context__.k.signature(), _s21 = __turbopack_context__.k.signature(), _s22 = __turbopack_context__.k.signature(), _s23 = __turbopack_context__.k.signature(), _s24 = __turbopack_context__.k.signature(), _s25 = __turbopack_context__.k.signature(), _s26 = __turbopack_context__.k.signature(), _s27 = __turbopack_context__.k.signature(), _s28 = __turbopack_context__.k.signature(), _s29 = __turbopack_context__.k.signature(), _s30 = __turbopack_context__.k.signature(), _s31 = __turbopack_context__.k.signature(), _s32 = __turbopack_context__.k.signature(), _s33 = __turbopack_context__.k.signature(), _s34 = __turbopack_context__.k.signature(), _s35 = __turbopack_context__.k.signature(), _s36 = __turbopack_context__.k.signature(), _s37 = __turbopack_context__.k.signature();
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
function useDebounce(value, wait) {
    _s();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](value);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useDebounce.useEffect": ()=>{
            const { cancel } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["debounce"])({
                "useDebounce.useEffect": ()=>setState(value)
            }["useDebounce.useEffect"], wait);
            return ({
                "useDebounce.useEffect": ()=>cancel()
            })["useDebounce.useEffect"];
        }
    }["useDebounce.useEffect"], [
        value,
        wait
    ]);
    return state;
}
_s(useDebounce, "D4KFpolq5TZC72VizpKzKmipny8=");
function useCallbackRef(callback, deps = []) {
    _s1();
    const callbackRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](callback);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useCallbackRef.useEffect": ()=>{
            callbackRef.current = callback;
        }
    }["useCallbackRef.useEffect"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useCallbackRef.useCallback": (...args)=>callbackRef.current?.(...args)
    }["useCallbackRef.useCallback"], deps);
}
_s1(useCallbackRef, "MFKcrhz68MV6vBRSG0NNzdX94Gw=");
function useControllableProp(prop, state) {
    _s2();
    const controlled = typeof prop !== "undefined";
    const value = controlled ? prop : state;
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "useControllableProp.useMemo": ()=>[
                controlled,
                value
            ]
    }["useControllableProp.useMemo"], [
        controlled,
        value
    ]);
}
_s2(useControllableProp, "nwk+m61qLgjDVUp4IGV/072DDN4=");
function useControllableState(props) {
    _s3();
    const { value: valueProp, defaultValue, onChange, shouldUpdate = (prev, next)=>prev !== next } = props;
    const onChangeProp = useCallbackRef(onChange);
    const shouldUpdateProp = useCallbackRef(shouldUpdate);
    const [uncontrolledState, setUncontrolledState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultValue);
    const controlled = valueProp !== undefined;
    const value = controlled ? valueProp : uncontrolledState;
    const setValue = useCallbackRef({
        "useControllableState.useCallbackRef[setValue]": (next)=>{
            const setter = next;
            const nextValue = typeof next === "function" ? setter(value) : next;
            if (!shouldUpdateProp(value, nextValue)) {
                return;
            }
            if (!controlled) {
                setUncontrolledState(nextValue);
            }
            onChangeProp(nextValue);
        }
    }["useControllableState.useCallbackRef[setValue]"], [
        controlled,
        onChangeProp,
        value,
        shouldUpdateProp
    ]);
    return [
        value,
        setValue
    ];
}
_s3(useControllableState, "SAYT/Mi5CycLoCLf2AmCaEpCGvA=", false, function() {
    return [
        useCallbackRef,
        useCallbackRef,
        useCallbackRef
    ];
});
const usePrevious = (state)=>{
    _s4();
    const previous = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](state);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "usePrevious.useEffect": ()=>{
            previous.current = state;
        }
    }["usePrevious.useEffect"]);
    return previous;
};
_s4(usePrevious, "JvIZ6aC6Eo4Ce3kAx+KIHv2roI8=");
const useWindowScroll = ()=>{
    _s5();
    const [dimensions, setDimensions] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        x: 0,
        y: 0
    });
    useIsomorphicLayoutEffect({
        "useWindowScroll.useIsomorphicLayoutEffect": ()=>{
            const handleScroll = {
                "useWindowScroll.useIsomorphicLayoutEffect.handleScroll": ()=>{
                    setDimensions({
                        x: window.scrollX,
                        y: window.scrollY
                    });
                }
            }["useWindowScroll.useIsomorphicLayoutEffect.handleScroll"];
            handleScroll();
            window.addEventListener("scroll", handleScroll);
            return ({
                "useWindowScroll.useIsomorphicLayoutEffect": ()=>window.removeEventListener("scroll", handleScroll)
            })["useWindowScroll.useIsomorphicLayoutEffect"];
        }
    }["useWindowScroll.useIsomorphicLayoutEffect"], []);
    return dimensions;
};
_s5(useWindowScroll, "gIeTquz823IarPaFrwInuxYly2U=", false, function() {
    return [
        useIsomorphicLayoutEffect
    ];
});
const useShrinkThanMdLg = (query = "(max-width:1144px)")=>{
    _s6();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"])(query, false);
};
_s6(useShrinkThanMdLg, "DYc0EYAqnnp2d4d8Xg/+3Yur0PM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"]
    ];
});
const useShrinkThanLg = (query = "(max-width:1440px)")=>{
    _s7();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"])(query, false);
};
_s7(useShrinkThanLg, "DYc0EYAqnnp2d4d8Xg/+3Yur0PM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"]
    ];
});
const useWiderThanMd = (query = "(min-width:768px)")=>{
    _s8();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"])(query, false);
};
_s8(useWiderThanMd, "DYc0EYAqnnp2d4d8Xg/+3Yur0PM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"]
    ];
});
const useShrinkThanMd = (query = "(max-width:768px)")=>{
    _s9();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"])(query, false);
};
_s9(useShrinkThanMd, "DYc0EYAqnnp2d4d8Xg/+3Yur0PM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"]
    ];
});
const useWiderThanMdLg = (query = "(min-width:1144px)")=>{
    _s10();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"])(query, false);
};
_s10(useWiderThanMdLg, "DYc0EYAqnnp2d4d8Xg/+3Yur0PM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMedia$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMedia$3e$__["useMedia"]
    ];
});
const usePreviousValue = (value)=>{
    _s11();
    const prevValueRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"]({
        current: value,
        previous: value
    });
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "usePreviousValue.useEffect": ()=>{
            if (value !== prevValueRef.current.current) {
                prevValueRef.current.previous = prevValueRef.current.current;
                prevValueRef.current.current = value;
            }
        }
    }["usePreviousValue.useEffect"], [
        prevValueRef,
        value
    ]);
    return prevValueRef;
};
_s11(usePreviousValue, "KcoRQrXHUiWZhLZfoHsiNCtr7iM=");
const useScrollDirection = ()=>{
    _s12();
    const [direction, setDirection] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]("bottom");
    const coordinates = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"]({});
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useScrollDirection.useEffect": ()=>{
            coordinates.current.current = window.scrollY;
            coordinates.current.previous = window.scrollY;
            const handleScroll = {
                "useScrollDirection.useEffect.handleScroll": ()=>{
                    if (coordinates.current.current !== window.scrollY) {
                        coordinates.current.previous = coordinates.current.current;
                        coordinates.current.current = window.scrollY;
                    }
                    if (coordinates.current.current !== undefined && coordinates.current.previous !== undefined) {
                        const hasScrolledToBottom = coordinates.current.current > coordinates.current.previous;
                        const hasScrolledToTop = coordinates.current.current < coordinates.current.previous;
                        if (hasScrolledToBottom) setDirection("bottom");
                        if (hasScrolledToTop) setDirection("top");
                    }
                }
            }["useScrollDirection.useEffect.handleScroll"];
            window.addEventListener("scroll", handleScroll);
            return ({
                "useScrollDirection.useEffect": ()=>{
                    window.removeEventListener("scroll", handleScroll);
                }
            })["useScrollDirection.useEffect"];
        }
    }["useScrollDirection.useEffect"], [
        setDirection
    ]);
    return direction;
};
_s12(useScrollDirection, "VOXwsbuf5nBxWP1zgHmh/JZck8w=");
const usePosition = ()=>{
    _s13();
    const [position, setPosition] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        bottom: 0,
        left: 0,
        right: 0,
        top: 0
    });
    const ref = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](null);
    useIsomorphicLayoutEffect({
        "usePosition.useIsomorphicLayoutEffect": ()=>{
            const element = ref.current;
            if (!element) return;
            const onReposition = {
                "usePosition.useIsomorphicLayoutEffect.onReposition": ()=>{
                    const { bottom, left, right, top } = element.getBoundingClientRect();
                    setPosition({
                        left,
                        right,
                        top: top + window.scrollY || document.documentElement.scrollTop,
                        bottom: bottom + window.scrollY || document.documentElement.scrollTop
                    });
                }
            }["usePosition.useIsomorphicLayoutEffect.onReposition"];
            onReposition();
            window.addEventListener("scroll", onReposition);
            window.addEventListener("resize", onReposition);
            return ({
                "usePosition.useIsomorphicLayoutEffect": ()=>{
                    window.removeEventListener("scroll", onReposition);
                    window.removeEventListener("resize", onReposition);
                }
            })["usePosition.useIsomorphicLayoutEffect"];
        }
    }["usePosition.useIsomorphicLayoutEffect"], [
        setPosition,
        ref
    ]);
    return [
        ref,
        position
    ];
};
_s13(usePosition, "D5rzIwNbPI9QdrSMJaJC2aDqJks=", false, function() {
    return [
        useIsomorphicLayoutEffect
    ];
});
function useUncontrolledState({ defaultValue, onChange: onChangeProp }) {
    _s14();
    const uncontrolledState = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultValue);
    const onChange = useCallbackRef(onChangeProp);
    const [uncontrolledValue] = uncontrolledState;
    const prevValue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(uncontrolledValue);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useUncontrolledState.useEffect": ()=>{
            if (prevValue.current !== uncontrolledValue) {
                prevValue.current = uncontrolledValue;
                onChange(uncontrolledValue);
            }
        }
    }["useUncontrolledState.useEffect"], [
        uncontrolledValue,
        onChange,
        prevValue
    ]);
    return uncontrolledState;
}
_s14(useUncontrolledState, "UqYdAO6qd7ZN3WAtd04Nlqk9BPw=", false, function() {
    return [
        useCallbackRef
    ];
});
const useRouterChangeComplete = ({ onComplete: onCompleteOption })=>{
    _s15();
    const onComplete = useCallbackRef(onCompleteOption);
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useRouterChangeComplete.useEffect": ()=>{
            onComplete();
        }
    }["useRouterChangeComplete.useEffect"], [
        onComplete,
        pathname,
        searchParams
    ]);
};
_s15(useRouterChangeComplete, "xYDWEUQ9goPV8hy7EQuMzY9ajzU=", false, function() {
    return [
        useCallbackRef,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
function useFirstMountState({ shouldUpdate }) {
    _s16();
    const isFirst = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(true);
    if (isFirst.current && shouldUpdate?.(isFirst.current)) {
        isFirst.current = false;
    }
    return isFirst.current;
}
_s16(useFirstMountState, "VMrsbHwAsi+3jYEGunylQRYlhpQ=");
function useStateMachine(initialState, machine) {
    _s17();
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useReducer"]({
        "useStateMachine.useReducer": (state, event)=>{
            const nextState = machine[state][event];
            return nextState ?? state;
        }
    }["useStateMachine.useReducer"], initialState);
}
_s17(useStateMachine, "skVOqNGrFQuDFh+lpttAJ2AZFeA=");
function useClickOutside(refs, onClickOutside) {
    _s18();
    const onClickOutsideOption = useCallbackRef(onClickOutside);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useClickOutside.useEffect": ()=>{
            const handler = {
                "useClickOutside.useEffect.handler": (event)=>{
                    const { target } = event;
                    target && !refs.some({
                        "useClickOutside.useEffect.handler": (ref)=>ref.current?.contains(target)
                    }["useClickOutside.useEffect.handler"]) && onClickOutsideOption();
                }
            }["useClickOutside.useEffect.handler"];
            document.addEventListener("mousedown", handler);
            document.addEventListener("touchstart", handler);
            return ({
                "useClickOutside.useEffect": ()=>{
                    document.removeEventListener("mousedown", handler);
                    document.removeEventListener("touchstart", handler);
                }
            })["useClickOutside.useEffect"];
        }
    }["useClickOutside.useEffect"], // eslint-disable-next-line react-hooks/exhaustive-deps
    [
        ...refs,
        onClickOutsideOption
    ]);
}
_s18(useClickOutside, "gpRmkVv44w6N2fIasCuie+ULRD4=", false, function() {
    return [
        useCallbackRef
    ];
});
function useLocalStorage({ defaultValue, keyName, onChange, deserializer, serializer }) {
    _s19();
    const [uncontrollableState, setUncontrollableState] = useUncontrolledState({
        defaultValue,
        onChange: {
            "useLocalStorage.useUncontrolledState": (value)=>{
                onChange?.(value);
                try {
                    const serializedValue = serializer ? serializer(value) : JSON.stringify(value);
                    localStorage.setItem(keyName, serializedValue);
                } catch  {}
            }
        }["useLocalStorage.useUncontrolledState"]
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"])({
        "useLocalStorage.useMount": ()=>{
            try {
                const value = localStorage.getItem(keyName);
                if (value !== null) {
                    const deserializerValue = deserializer ? deserializer(value) : JSON.parse(value);
                    setUncontrollableState(deserializerValue);
                }
            } catch  {}
        }
    }["useLocalStorage.useMount"]);
    return [
        uncontrollableState,
        setUncontrollableState
    ];
}
_s19(useLocalStorage, "RA7kv93gnXAl6yedIAMzNwNBhnM=", false, function() {
    return [
        useUncontrolledState,
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"]
    ];
});
const useView = (options = {})=>{
    _s20();
    const { defaultView = "grid" } = options;
    const [state, send] = useStateMachine(defaultView, {
        grid: {
            LIST_VIEW: "list"
        },
        list: {
            GRID_VIEW: "grid"
        }
    });
    return [
        state,
        send
    ];
};
_s20(useView, "jzL0W5qu0DS+bU+JK9xDFFcLUMw=", false, function() {
    return [
        useStateMachine
    ];
});
const useNumberOfForms = (values)=>{
    _s21();
    const id = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useId"]();
    const [numberOfForms, setNumberOfForms] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](values ?? [
        id
    ]);
    const insert = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useNumberOfForms.useCallback[insert]": (index)=>{
            setNumberOfForms({
                "useNumberOfForms.useCallback[insert]": (prev)=>{
                    const newNumberOfForms = [
                        ...prev
                    ];
                    newNumberOfForms.splice(index, 0, (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getId"])());
                    return newNumberOfForms;
                }
            }["useNumberOfForms.useCallback[insert]"]);
        }
    }["useNumberOfForms.useCallback[insert]"], [
        setNumberOfForms
    ]);
    const remove = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useNumberOfForms.useCallback[remove]": (id)=>{
            setNumberOfForms({
                "useNumberOfForms.useCallback[remove]": (prev)=>{
                    return prev.filter({
                        "useNumberOfForms.useCallback[remove]": (value)=>value !== id
                    }["useNumberOfForms.useCallback[remove]"]);
                }
            }["useNumberOfForms.useCallback[remove]"]);
        }
    }["useNumberOfForms.useCallback[remove]"], [
        setNumberOfForms
    ]);
    return {
        numberOfForms,
        insert,
        remove
    };
};
_s21(useNumberOfForms, "KQ2BgYIxR+agaDSKuj7FA2tV9nw=");
const startProgress = (value = 0)=>{
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].configure({
        showSpinner: false
    });
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].start();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$nprogress$2f$nprogress$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set(value);
};
const useRouter = ()=>{
    _s22();
    const { push, replace, ...methods } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    return {
        ...methods,
        push: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
            "useRouter.useCallback": (href, options)=>{
                startProgress();
                push(href, options);
            }
        }["useRouter.useCallback"], [
            push
        ]),
        replace: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
            "useRouter.useCallback": (href, options)=>{
                startProgress();
                replace(href, options);
            }
        }["useRouter.useCallback"], [
            replace
        ])
    };
};
_s22(useRouter, "bd1BCcBLn/f+LJNMcTgjFu4LnME=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
function useHeadingObserver(slugs) {
    _s23();
    const observer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [activeHeading, setActiveHeading] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]();
    const [visibleHeadings, setVisibleHeadings] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]([]);
    const selectors = slugs.join(", ");
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useHeadingObserver.useEffect": ()=>{
            const handleObserver = {
                "useHeadingObserver.useEffect.handleObserver": (entries)=>{
                    entries.forEach({
                        "useHeadingObserver.useEffect.handleObserver": (entry)=>{
                            if (entry?.isIntersecting) {
                                // Add entry.target.id to the state array
                                setVisibleHeadings({
                                    "useHeadingObserver.useEffect.handleObserver": (prevState)=>[
                                            ...prevState,
                                            entry.target.id
                                        ]
                                }["useHeadingObserver.useEffect.handleObserver"]);
                            } else {
                                // Remove entry.target.id from the state array
                                setVisibleHeadings({
                                    "useHeadingObserver.useEffect.handleObserver": (prevState)=>prevState.filter({
                                            "useHeadingObserver.useEffect.handleObserver": (id)=>id !== entry.target.id
                                        }["useHeadingObserver.useEffect.handleObserver"])
                                }["useHeadingObserver.useEffect.handleObserver"]);
                            }
                        }
                    }["useHeadingObserver.useEffect.handleObserver"]);
                }
            }["useHeadingObserver.useEffect.handleObserver"];
            if (!selectors) return;
            const elements = document.querySelectorAll(selectors);
            observer.current = new IntersectionObserver(handleObserver, {
                rootMargin: "-100px 0px -25% 0px",
                threshold: 1
            });
            elements.forEach({
                "useHeadingObserver.useEffect": (element)=>{
                    observer.current?.observe(element);
                }
            }["useHeadingObserver.useEffect"]);
            return ({
                "useHeadingObserver.useEffect": ()=>{
                    observer.current?.disconnect();
                }
            })["useHeadingObserver.useEffect"];
        }
    }["useHeadingObserver.useEffect"], [
        selectors
    ]);
    /**
   * Rearrange visible headings based on incoming slugs' order,
   * and return the first one as the activeHeading.
   */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useHeadingObserver.useEffect": ()=>{
            const sortedVisibleHeadings = visibleHeadings.sort({
                "useHeadingObserver.useEffect.sortedVisibleHeadings": (a, b)=>{
                    const aIndex = slugs.findIndex({
                        "useHeadingObserver.useEffect.sortedVisibleHeadings.aIndex": (slug)=>slug === `#${a}`
                    }["useHeadingObserver.useEffect.sortedVisibleHeadings.aIndex"]);
                    const bIndex = slugs.findIndex({
                        "useHeadingObserver.useEffect.sortedVisibleHeadings.bIndex": (slug)=>slug === `#${b}`
                    }["useHeadingObserver.useEffect.sortedVisibleHeadings.bIndex"]);
                    if (aIndex === -1) {
                        return bIndex === -1 ? 0 : 1 // Keep b if a not found
                        ;
                    } else if (bIndex === -1) {
                        return -1 // Move a before b if b not found
                        ;
                    }
                    return aIndex - bIndex // Sort based on index difference
                    ;
                }
            }["useHeadingObserver.useEffect.sortedVisibleHeadings"]);
            if (sortedVisibleHeadings[0]) {
                // Set the first ordered visible heading as the active one
                setActiveHeading(sortedVisibleHeadings[0]);
            }
        }
    }["useHeadingObserver.useEffect"], [
        slugs,
        visibleHeadings
    ]);
    return {
        activeHeading
    };
}
_s23(useHeadingObserver, "qPY2Gly/vzCx3KED17/73Myo5U0=");
const useBoolean = (defaultValue = false)=>{
    _s24();
    const [isOn, setIsOn] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultValue);
    const off = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useBoolean.useCallback[off]": ()=>setIsOn(false)
    }["useBoolean.useCallback[off]"], []);
    const on = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useBoolean.useCallback[on]": ()=>setIsOn(true)
    }["useBoolean.useCallback[on]"], []);
    const toggle = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useBoolean.useCallback[toggle]": (on)=>setIsOn({
                "useBoolean.useCallback[toggle]": (prev)=>on !== undefined ? on : !prev
            }["useBoolean.useCallback[toggle]"])
    }["useBoolean.useCallback[toggle]"], []);
    return [
        isOn,
        {
            off,
            on,
            toggle
        }
    ];
};
_s24(useBoolean, "0+TAF6rLYDSOpoJGF2re1Yb/t9c=");
const useToggle = (defaultValue = false)=>{
    _s25();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultValue);
    const off = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useToggle.useCallback[off]": ()=>setState(false)
    }["useToggle.useCallback[off]"], []);
    const on = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useToggle.useCallback[on]": ()=>setState(true)
    }["useToggle.useCallback[on]"], []);
    const toggle = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useToggle.useCallback[toggle]": ()=>setState({
                "useToggle.useCallback[toggle]": (prevState)=>!prevState
            }["useToggle.useCallback[toggle]"])
    }["useToggle.useCallback[toggle]"], []);
    return [
        state,
        {
            on,
            off,
            toggle
        }
    ];
};
_s25(useToggle, "g4trWd795Wp9PFytntACDLBhjcM=");
const useIsomorphicLayoutEffect = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLayoutEffect"];
function useUpdateEffect(callback, deps) {
    _s26();
    const renderCycleRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](false);
    const effectCycleRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useUpdateEffect.useEffect": ()=>{
            const mounted = renderCycleRef.current;
            const run = mounted && effectCycleRef.current;
            if (run) {
                return callback();
            }
            effectCycleRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["useUpdateEffect.useEffect"], deps);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useUpdateEffect.useEffect": ()=>{
            renderCycleRef.current = true;
            return ({
                "useUpdateEffect.useEffect": ()=>{
                    renderCycleRef.current = false;
                }
            })["useUpdateEffect.useEffect"];
        }
    }["useUpdateEffect.useEffect"], []);
}
_s26(useUpdateEffect, "AISTx5vJRg2MmxqEoxEar3LI7c4=");
function useAddEvent({ event, listener, target, options }) {
    _s27();
    const listenerCallbackRef = useCallbackRef(listener);
    const optionsRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](options);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useAddEvent.useEffect": ()=>{
            optionsRef.current = options;
        }
    }["useAddEvent.useEffect"]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useAddEvent.useEffect": ()=>{
            const cleanup = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addEvent"])({
                target,
                event,
                listener: listenerCallbackRef,
                options: optionsRef.current
            });
            return ({
                "useAddEvent.useEffect": ()=>cleanup()
            })["useAddEvent.useEffect"];
        }
    }["useAddEvent.useEffect"], [
        target,
        event,
        optionsRef,
        listenerCallbackRef
    ]);
}
_s27(useAddEvent, "4CW5tLuXxWYsBPr4ciI4QBW0KD4=", false, function() {
    return [
        useCallbackRef
    ];
});
function useDocument(event, listener) {
    _s28();
    useAddEvent({
        target: document,
        event,
        listener
    });
}
_s28(useDocument, "MutRx5Dome5YFMN+hQE8EY5aqMg=", false, function() {
    return [
        useAddEvent
    ];
});
function useWindow(event, listener) {
    _s29();
    useAddEvent({
        target: window,
        event,
        listener
    });
}
_s29(useWindow, "MutRx5Dome5YFMN+hQE8EY5aqMg=", false, function() {
    return [
        useAddEvent
    ];
});
function useKeyboard({ onKeyDown, onKeyUp } = {}) {
    _s30();
    useDocument("keydown", onKeyDown);
    useDocument("keyup", onKeyUp);
}
_s30(useKeyboard, "rjUNZyM/0URqe9jEPn7QB4ecm+0=", false, function() {
    return [
        useDocument,
        useDocument
    ];
});
function useUnmountEffect(cleanup) {
    _s31();
    const cleanupCallbackRef = useCallbackRef(cleanup);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useUnmountEffect.useEffect": ()=>cleanupCallbackRef
    }["useUnmountEffect.useEffect"], [
        cleanupCallbackRef
    ]);
}
_s31(useUnmountEffect, "DVlgAei+yU9jmfajfo7iscBJGLg=", false, function() {
    return [
        useCallbackRef
    ];
});
const useArray = (defaultState)=>{
    _s32();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultState);
    const remove = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useArray.useCallback[remove]": (index)=>setState({
                "useArray.useCallback[remove]": (prev)=>prev?.filter({
                        "useArray.useCallback[remove]": (_, i)=>i !== index
                    }["useArray.useCallback[remove]"])
            }["useArray.useCallback[remove]"])
    }["useArray.useCallback[remove]"], []);
    const prepend = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useArray.useCallback[prepend]": (value)=>setState({
                "useArray.useCallback[prepend]": (prev)=>prev ? [
                        ...prev,
                        value
                    ] : [
                        value
                    ]
            }["useArray.useCallback[prepend]"])
    }["useArray.useCallback[prepend]"], []);
    const append = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useArray.useCallback[append]": (value)=>setState({
                "useArray.useCallback[append]": (prev)=>prev ? [
                        value,
                        ...prev
                    ] : [
                        value
                    ]
            }["useArray.useCallback[append]"])
    }["useArray.useCallback[append]"], []);
    const clear = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useArray.useCallback[clear]": ()=>setState(undefined)
    }["useArray.useCallback[clear]"], []);
    return [
        state,
        {
            remove,
            prepend,
            append,
            patch: setState,
            clear
        }
    ];
};
_s32(useArray, "KjsBoMIEG4qfyn8ssBNcYvJ0ypQ=");
const useSize = ()=>{
    _s33();
    const ref = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](null);
    const [size, setSize] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        width: 0,
        height: 0
    });
    useIsomorphicLayoutEffect({
        "useSize.useIsomorphicLayoutEffect": ()=>{
            const element = ref.current;
            if (!element) return;
            const size = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSize"])(element);
            setSize(size);
            const observer = new MutationObserver({
                "useSize.useIsomorphicLayoutEffect": (mutations)=>mutations.forEach({
                        "useSize.useIsomorphicLayoutEffect": (mutation)=>{
                            const element = mutation.target;
                            if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isElement"])(element)) return;
                            const size = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSize"])(element);
                            setSize(size);
                        }
                    }["useSize.useIsomorphicLayoutEffect"])
            }["useSize.useIsomorphicLayoutEffect"]);
            observer.observe(element, {
                attributes: true
            });
            return ({
                "useSize.useIsomorphicLayoutEffect": ()=>observer.disconnect()
            })["useSize.useIsomorphicLayoutEffect"];
        }
    }["useSize.useIsomorphicLayoutEffect"], []);
    return [
        ref,
        size
    ];
};
_s33(useSize, "lINSWylwtl9VfNnnnHvrOx/Shw4=", false, function() {
    return [
        useIsomorphicLayoutEffect
    ];
});
const useStepper = ({ steps, currentStep, orientation })=>{
    _s34();
    const [stepsState, setStepsState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](steps);
    const { stepperProps: stepTriggerControlProps, stepsProps: stepTriggersProps, ...rest } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$headless$2d$stepper$2f$dist$2f$chunk$2d$DOVZV5YB$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStepper"])({
        steps: stepsState,
        currentStep,
        orientation
    });
    const toggleStepValidation = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useStepper.useCallback[toggleStepValidation]": (index)=>({
                "useStepper.useCallback[toggleStepValidation]": (isValid)=>{
                    setStepsState({
                        "useStepper.useCallback[toggleStepValidation]": (steps)=>{
                            const nextStep = index + 1;
                            const isNotValid = !isValid;
                            return steps.map({
                                "useStepper.useCallback[toggleStepValidation]": (step, stepIndex)=>{
                                    if (stepIndex === index) {
                                        return {
                                            ...step,
                                            isValid
                                        };
                                    } else if (stepIndex === nextStep && isValid) {
                                        return {
                                            ...step,
                                            disabled: false
                                        };
                                    } else if (stepIndex > index && isNotValid) {
                                        return {
                                            ...step,
                                            disabled: true
                                        };
                                    }
                                    return step;
                                }
                            }["useStepper.useCallback[toggleStepValidation]"]);
                        }
                    }["useStepper.useCallback[toggleStepValidation]"]);
                }
            })["useStepper.useCallback[toggleStepValidation]"]
    }["useStepper.useCallback[toggleStepValidation]"], [
        setStepsState
    ]);
    return {
        ...rest,
        stepTriggerControlProps,
        stepTriggersProps,
        toggleStepValidation,
        stepsState
    };
};
_s34(useStepper, "/a8J2aGJkJV14W44Q7x9cEosjqo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$headless$2d$stepper$2f$dist$2f$chunk$2d$DOVZV5YB$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStepper"]
    ];
});
const useTimeSelector = ({ defaultValue, onValueChange } = {})=>{
    _s35();
    const uncontrolledState = useUncontrolledState({
        defaultValue,
        onChange: {
            "useTimeSelector.useUncontrolledState[uncontrolledState]": (value)=>{
                if (value) onValueChange?.((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$internationalized$2f$date$2f$dist$2f$string$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseTime"])(value));
            }
        }["useTimeSelector.useUncontrolledState[uncontrolledState]"]
    });
    return uncontrolledState;
};
_s35(useTimeSelector, "9i9p/uFrGtUFlcSACkQpaDkNGS4=", false, function() {
    return [
        useUncontrolledState
    ];
});
const useDeferredValue = (value, delay = 1_000)=>{
    _s36();
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](value);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useDeferredValue.useEffect": ()=>{
            const timeout = setTimeout({
                "useDeferredValue.useEffect.timeout": ()=>{
                    setState(value);
                }
            }["useDeferredValue.useEffect.timeout"], delay);
            return ({
                "useDeferredValue.useEffect": ()=>{
                    clearTimeout(timeout);
                }
            })["useDeferredValue.useEffect"];
        }
    }["useDeferredValue.useEffect"], [
        delay,
        value
    ]);
    return state;
};
_s36(useDeferredValue, "D4KFpolq5TZC72VizpKzKmipny8=");
const useMakeFixedBehaveSticky = (top = 0)=>{
    _s37();
    const ref = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"](null);
    const [isSticky, setIsSticky] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useMakeFixedBehaveSticky.useEffect": ()=>{
            const element = ref.current;
            if (element) {
                const handleScroll = {
                    "useMakeFixedBehaveSticky.useEffect.handleScroll": ()=>{
                        const scrollPosition = window.scrollY || document.documentElement.scrollTop;
                        const rect = element.getBoundingClientRect();
                        const originalTop = rect.top + window.scrollY;
                        if (scrollPosition > originalTop - top) setIsSticky(true);
                        else setIsSticky(false);
                    }
                }["useMakeFixedBehaveSticky.useEffect.handleScroll"];
                window.addEventListener("scroll", handleScroll);
                return ({
                    "useMakeFixedBehaveSticky.useEffect": ()=>{
                        window.removeEventListener("scroll", handleScroll);
                    }
                })["useMakeFixedBehaveSticky.useEffect"];
            }
        }
    }["useMakeFixedBehaveSticky.useEffect"], [
        top
    ]);
    return [
        ref,
        isSticky
    ];
};
_s37(useMakeFixedBehaveSticky, "Xudx1VtabY/uowfDAQQnf3lU8rA=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/utils/constants.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Categories",
    ()=>Categories,
    "DAY_PERIODS",
    ()=>DAY_PERIODS,
    "HOT_KEYS",
    ()=>HOT_KEYS,
    "HTTPS",
    ()=>HTTPS,
    "IMAGE_QUALITY",
    ()=>IMAGE_QUALITY,
    "ONE_SECOND",
    ()=>ONE_SECOND,
    "TIMES",
    ()=>TIMES,
    "configByCategory",
    ()=>configByCategory
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const ONE_SECOND = 1000;
const IMAGE_QUALITY = (()=>{
    if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_IMAGE_QUALITY !== undefined) {
        const parsed = parseFloat(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_IMAGE_QUALITY);
        return Number.isNaN(parsed) ? 75 : parsed;
    }
    return 75;
})();
const HOT_KEYS = {
    ENTER: "Enter",
    SPACE: " "
};
const DAY_PERIODS = [
    "PM",
    "AM"
];
const TIMES = [
    "01:00",
    "01:30",
    "02:00",
    "02:30",
    "03:00",
    "03:30",
    "04:00",
    "04:30",
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00",
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30"
];
var Categories = /*#__PURE__*/ function(Categories) {
    Categories["SUGGESTED"] = "suggested";
    Categories["CUSTOM"] = "custom";
    Categories["SMILEYS_PEOPLE"] = "smileys_people";
    Categories["ANIMALS_NATURE"] = "animals_nature";
    Categories["FOOD_DRINK"] = "food_drink";
    Categories["TRAVEL_PLACES"] = "travel_places";
    Categories["ACTIVITIES"] = "activities";
    Categories["OBJECTS"] = "objects";
    Categories["SYMBOLS"] = "symbols";
    Categories["FLAGS"] = "flags";
    return Categories;
}({});
const configByCategory = {
    ["suggested"]: {
        category: "suggested",
        name: "Frequently Used"
    },
    ["custom"]: {
        category: "custom",
        name: "Custom Emojis"
    },
    ["smileys_people"]: {
        category: "smileys_people",
        name: "Smileys & People"
    },
    ["animals_nature"]: {
        category: "animals_nature",
        name: "Animals & Nature"
    },
    ["food_drink"]: {
        category: "food_drink",
        name: "Food & Drink"
    },
    ["travel_places"]: {
        category: "travel_places",
        name: "Travel & Places"
    },
    ["activities"]: {
        category: "activities",
        name: "Activities"
    },
    ["objects"]: {
        category: "objects",
        name: "Objects"
    },
    ["symbols"]: {
        category: "symbols",
        name: "Symbols"
    },
    ["flags"]: {
        category: "flags",
        name: "Flags"
    }
};
const HTTPS = "https://";
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/contexts/auth.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "hasCompletedOnboarding",
    ()=>hasCompletedOnboarding,
    "mergeDashboardUserFields",
    ()=>mergeDashboardUserFields,
    "resolveDashboardRole",
    ()=>resolveDashboardRole,
    "resolveDashboardRoute",
    ()=>resolveDashboardRoute,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/types/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2f$use$2d$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/toast/use-toast.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
const resolveDashboardRole = (user)=>{
    const normalizedUserType = user?.userType?.toLowerCase?.();
    const normalizedAccountType = user?.accountType?.toUpperCase?.();
    const normalizedRole = user?.role?.toUpperCase?.();
    // `role` is the active session (account switcher toggles this) — check it first.
    // `accountType` / `userType` are profile labels a user may own both of.
    if (normalizedRole === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].TALENT || normalizedAccountType === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].TALENT || normalizedUserType === "talent") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].TALENT;
    }
    if (normalizedRole === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].CLIENT || normalizedAccountType === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].CLIENT || normalizedUserType === "client") {
        return __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].CLIENT;
    }
    return undefined;
};
const hasCompletedOnboarding = (user)=>user?.hasCompletedOnboarding === true || user?.onboardingDismissed === true || user?.onboardedAt != null;
const resolveDashboardRoute = (user)=>{
    const dashboardRole = resolveDashboardRole(user);
    if (dashboardRole === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].TALENT) {
        return "/talent-dashboard";
    }
    if (dashboardRole === __TURBOPACK__imported__module__$5b$project$5d2f$types$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ROLE"].CLIENT) {
        return "/client-dashboard";
    }
    // Returning users who have already completed/dismissed onboarding must
    // never be bounced back to /onboarding just because the /me payload is
    // missing role/accountType/userType. Default them to client-dashboard
    // — the account switcher can flip them to talent if needed.
    if (hasCompletedOnboarding(user)) {
        return "/client-dashboard";
    }
    return "/onboarding";
};
const mergeDashboardUserFields = (authUser, profileUser)=>{
    if (!authUser || !profileUser || typeof profileUser !== "object") {
        return authUser;
    }
    const merged = {
        ...authUser,
        ...profileUser
    };
    for (const key of [
        "role",
        "accountType",
        "userType",
        "onboardingDismissed",
        "hasCompletedOnboarding",
        "onboardedAt"
    ]){
        const authValue = authUser[key];
        if (merged[key] == null && authValue != null) {
            merged[key] = authValue;
        }
    }
    return merged;
};
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
    isLoading: true,
    isAuthChecked: false,
    user: null,
    setUser: ()=>{},
    logoutHandler: ()=>{}
});
const mergeUserAuthFields = (prev, next)=>{
    if (!next) return next;
    return {
        ...prev,
        ...next,
        provider: next.provider ?? prev?.provider,
        hasPassword: next.hasPassword ?? prev?.hasPassword,
        socialId: next.socialId ?? prev?.socialId,
        emailVerified: next.emailVerified ?? prev?.emailVerified,
        deletedAt: next.deletedAt ?? prev?.deletedAt ?? null
    };
};
function useProvideAuth() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { toast } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2f$use$2d$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"])();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isAuthChecked, setIsAuthChecked] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const getUser = ()=>{
        setIsLoading(true);
        const accessToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("access_token");
        if (!accessToken) {
            setUser(null);
            setIsAuthChecked(true);
            setIsLoading(false);
            return;
        }
        // Ensure cookie is always set with path="/" so it's available on all routes
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].set("access_token", accessToken, {
            path: "/"
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UserAPI"].me().then((response)=>{
            if (response?.status === 200) {
                const nextUser = response?.data?.user ?? response?.data?.data?.user ?? response?.data;
                if (nextUser && typeof nextUser === "object") {
                    // Merge localStorage onboarding flag in case the API didn't persist it
                    if (!nextUser.onboardingDismissed && ("TURBOPACK compile-time value", "object") !== "undefined" && window.localStorage.getItem("marketeq-onboarding-dismissed") === "true") {
                        nextUser.onboardingDismissed = true;
                    }
                    setUser(nextUser);
                }
            }
        }).catch((error)=>{
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                console.warn("[auth] /user/me unauthorized; clearing local session");
                // Session is dead — clear user and cookies so AuthenticatedRoute redirects to sign-in
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("access_token", {
                    path: "/"
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("refresh_token", {
                    path: "/"
                });
                setUser(null);
            } else if (!status) {
                // Backend unavailable/offline during local dev; avoid noisy error-level logs.
                console.warn("[auth] /user/me unavailable:", error?.message);
            } else {
                console.warn("[auth] /user/me request failed:", status, error?.message);
            }
            setIsAuthChecked(true);
            setIsLoading(false);
        }).finally(()=>{
            setIsLoading(false);
            setIsAuthChecked(true);
        });
    };
    const logoutHandler = async ()=>{
        try {
            const refreshToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("refresh_token");
            await __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthAPI"].Logout(refreshToken);
            document.cookie = "access_token=; Path=/; Max-Age=0; SameSite=None; Secure";
            document.cookie = "accessToken=; Path=/; Max-Age=0; SameSite=None; Secure";
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("access_token", {
                path: "/"
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("accessToken", {
                path: "/"
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("refresh_token", {
                path: "/"
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("session_id", {
                path: "/"
            });
            try {
                window.localStorage.removeItem("marketeq-onboarding-dismissed");
            } catch  {}
        } catch (err) {
            toast({
                title: err?.response?.data?.message || err?.message || "Something went wrong",
                variant: "destructive"
            });
        } finally{
            setUser(null);
            router.push("/sign-in");
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useProvideAuth.useEffect": ()=>{
            getUser();
        }
    }["useProvideAuth.useEffect"], []);
    // Heartbeat: keeps session alive and detects revocation
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useProvideAuth.useEffect": ()=>{
            const accessToken = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("access_token");
            const sessionId = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get("session_id");
            if (!accessToken || !sessionId) return;
            const tick = {
                "useProvideAuth.useEffect.tick": ()=>{
                    __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthAPI"].Heartbeat().catch({
                        "useProvideAuth.useEffect.tick": (err)=>{
                            if (err?.response?.status === 401) {
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("access_token", {
                                    path: "/"
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("refresh_token", {
                                    path: "/"
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].remove("session_id", {
                                    path: "/"
                                });
                                setUser(null);
                                router.push("/sign-in");
                            }
                        }
                    }["useProvideAuth.useEffect.tick"]);
                }
            }["useProvideAuth.useEffect.tick"];
            // First heartbeat immediately so lastActiveAt is fresh
            tick();
            const id = setInterval(tick, 60_000);
            return ({
                "useProvideAuth.useEffect": ()=>clearInterval(id)
            })["useProvideAuth.useEffect"];
        }
    }["useProvideAuth.useEffect"], [
        user
    ]);
    return {
        isLoading,
        isAuthChecked,
        user,
        setUser,
        logoutHandler
    };
}
_s(useProvideAuth, "FHoeBW0WjsNKYikPl5Q8ovHu6v0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$toast$2f$use$2d$toast$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToast"]
    ];
});
function AuthProvider({ children }) {
    _s1();
    const auth = useProvideAuth();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: auth,
        children: children
    }, void 0, false, {
        fileName: "[project]/contexts/auth.tsx",
        lineNumber: 277,
        columnNumber: 10
    }, this);
}
_s1(AuthProvider, "XNU4Jn8u4aVzJknlKOHFJq03xMo=", false, function() {
    return [
        useProvideAuth
    ];
});
_c = AuthProvider;
const useAuth = ()=>{
    _s2();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
};
_s2(useAuth, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/shared/query-provider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function QueryProvider({ children }) {
    _s();
    const [client] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        retry: 2,
                        refetchOnWindowFocus: false
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: client,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/features/shared/query-provider.tsx",
        lineNumber: 18,
        columnNumber: 10
    }, this);
}
_s(QueryProvider, "JXvhDEo+YVEMI58Y1S/su3J4cDY=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_089lf8.._.js.map