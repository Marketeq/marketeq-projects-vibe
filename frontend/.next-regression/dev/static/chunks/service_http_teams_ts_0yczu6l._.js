(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/service/http/teams.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TeamsAPI",
    ()=>TeamsAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/index.ts [app-client] (ecmascript)");
;
// Teams service runs on port 3003 (user-service), accessed through gateway
const TEAMS_BASE = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_TEAMS_URL ?? "/teams";
const AFFILIATED_TEAMS_BASE = "/affiliated-teams";
const TeamsAPI = {
    getTalentUserByUsername: (username)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`/talent/users/${username}`);
    },
    // Get all members of a team
    getTeamMembers: (teamId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${TEAMS_BASE}/${teamId}/members`);
    },
    // Add a member to a team
    addTeamMember: (teamId, userId, role = "member")=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`${TEAMS_BASE}/${teamId}/members`, {
            userId,
            role
        });
    },
    // Remove a member from a team
    removeTeamMember: (teamId, userId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].del(`${TEAMS_BASE}/${teamId}/members/${userId}`);
    },
    getMyTeam: ()=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${TEAMS_BASE}/my-team`);
    },
    getAffiliatedTeams: ()=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(AFFILIATED_TEAMS_BASE);
    },
    createAffiliatedTeam: (dto)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(AFFILIATED_TEAMS_BASE, dto);
    },
    getTeam: (teamId)=>{
        return __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(`${AFFILIATED_TEAMS_BASE}/${teamId}`);
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=service_http_teams_ts_0yczu6l._.js.map