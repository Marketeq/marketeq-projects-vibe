module.exports = [
"[project]/src/lib/listing-urls.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Centralized URL helpers for all listing detail pages.
 *
 * Use these everywhere a card/link navigates to a listing detail page so that
 * if the routing ever changes we only need to update one place.
 */ __turbopack_context__.s([
    "editProjectListingUrl",
    ()=>editProjectListingUrl,
    "jobDetailsUrl",
    ()=>jobDetailsUrl,
    "projectDetailsUrl",
    ()=>projectDetailsUrl,
    "serviceDetailsUrl",
    ()=>serviceDetailsUrl,
    "talentProfileUrl",
    ()=>talentProfileUrl,
    "teamDetailsUrl",
    ()=>teamDetailsUrl
]);
;
function projectDetailsUrl(slugOrId, id) {
    if (id) {
        const shortId = id.split("-")[0];
        return `/project-details/${slugOrId}-${shortId}`;
    }
    return `/project-details/${slugOrId}`;
}
function serviceDetailsUrl(slugOrId, id) {
    return projectDetailsUrl(slugOrId, id);
}
function jobDetailsUrl(slugOrId) {
    return `/job-details/${slugOrId}`;
}
function talentProfileUrl(username) {
    return `/talent-profile?username=${encodeURIComponent(username)}`;
}
function teamDetailsUrl(id) {
    return `/team-profile?teamId=${encodeURIComponent(id)}`;
}
function editProjectListingUrl(draftId) {
    return `/publish-project?type=project&draftId=${draftId}`;
}
}),
"[project]/components/blocks-1.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Blocks1",
    ()=>Blocks1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
;
const Blocks1 = (props)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        width: "167",
        height: "183",
        viewBox: "0 0 167 183",
        fill: "none",
        xmlns: "http://www.w3.org/2000/svg",
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M105.494 64.0732H68.5464L59.7617 81.1259V118.073H97.2258L105.494 99.7287V64.0732Z",
                fill: "#14FF00"
            }, void 0, false, {
                fileName: "[project]/components/blocks-1.tsx",
                lineNumber: 12,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M46.4938 128.073H9.54641L0.761719 145.126V182.073H38.2258L46.4938 163.729V128.073Z",
                fill: "#14FF00"
            }, void 0, false, {
                fileName: "[project]/components/blocks-1.tsx",
                lineNumber: 16,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: "M165.494 1.07324H128.546L119.762 18.1259V55.0732H157.226L165.494 36.7287V1.07324Z",
                fill: "#14FF00"
            }, void 0, false, {
                fileName: "[project]/components/blocks-1.tsx",
                lineNumber: 20,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                fillRule: "evenodd",
                clipRule: "evenodd",
                d: "M158.291 54.2851C157.975 54.9994 157.268 55.4612 156.487 55.4637H140.64V63.387H164.41L164.428 63.3868L164.458 63.387C165.539 63.4001 166.404 64.2871 166.391 65.3679V99.0421C166.389 99.3204 166.328 99.595 166.213 99.8483L158.305 117.64L158.291 117.672C157.975 118.386 157.268 118.848 156.487 118.85H120.832C119.738 118.85 118.851 117.964 118.851 116.87V101.023H106.353L98.8795 117.839L98.8656 117.87C98.5492 118.585 97.8425 119.046 97.0611 119.049H81.2144V126.972H104.984C105 126.972 105.016 126.972 105.032 126.972C106.113 126.985 106.978 127.872 106.965 128.953V162.627C106.963 162.906 106.902 163.18 106.787 163.433L98.8795 181.225L98.8656 181.257C98.5492 181.971 97.8425 182.433 97.0611 182.436H61.406C60.3121 182.436 59.4252 181.549 59.4252 180.455V164.608H46.8468L39.4543 181.225L39.4405 181.257C39.124 181.971 38.4174 182.433 37.6359 182.436H1.98084C0.88692 182.436 0 181.549 0 180.455V144.8C0.00420928 144.491 0.0822048 144.187 0.227796 143.914H0.207988L8.13134 128.068C8.46685 127.396 9.15345 126.972 9.90419 126.972H17.8275V119.049H1.98084C0.88692 119.049 0 118.162 0 117.068V81.4129C0.00420928 81.1039 0.0822048 80.8003 0.227796 80.5275H0.207988L8.13134 64.6807C8.46685 64.0092 9.15345 63.5851 9.90419 63.5853H45.5593C45.5751 63.5851 45.5912 63.5851 45.6071 63.5853C46.6879 63.5985 47.5532 64.4854 47.5401 65.5662V97.2596H59.4252V81.4129C59.4252 81.3989 59.4254 81.3849 59.4258 81.3709V81.2146C59.43 80.9055 59.508 80.602 59.6536 80.3291H59.6338L67.5571 64.4824C67.8926 63.8109 68.5792 63.3868 69.33 63.387H77.2533V55.4637H61.4066C60.3127 55.4637 59.4258 54.5767 59.4258 53.4828V17.8277C59.43 17.5187 59.508 17.2152 59.6536 16.9423H59.6338L67.5571 1.09559C67.8926 0.424085 68.5792 -6.19012e-05 69.33 0.000185704H104.985C105.001 -6.19012e-05 105.017 -6.19012e-05 105.033 0.000185704C106.114 0.0133088 106.979 0.900229 106.966 1.98102V33.6744H118.851V17.8277C118.852 17.5195 118.927 17.2159 119.069 16.9423H119.049L126.972 1.09559C127.31 0.420866 128.001 -0.00402358 128.755 0.000185704H164.41C164.426 -6.19012e-05 164.442 -6.19012e-05 164.458 0.000185704C165.539 0.0133088 166.404 0.900229 166.391 1.98102V35.6553C166.389 35.9336 166.328 36.2082 166.213 36.4615L158.305 54.2534L158.291 54.2851ZM158.468 44.1491L162.429 35.2353V10.3719L158.468 18.2952V44.1491ZM161.205 3.96186H129.979L124.037 15.8469H155.263L161.205 3.96186ZM99.0426 18.2952V33.6744H103.004V10.3719L99.0426 18.2952ZM99.0426 44.1491L101.937 37.6361H99.0426V44.1491ZM101.78 3.96186H70.5541L64.6116 15.8469H95.8376L101.78 3.96186ZM63.3875 19.8086V51.502H95.0809V37.6361H77.2533V33.6744H95.0809V19.8086H63.3875ZM101.681 67.547L95.8376 79.2337H81.215H77.2533H64.7102L70.5535 67.547H77.2533V73.0229H81.215V67.547H101.681ZM95.0803 114.889H63.3875V83.3937H95.0803V114.889ZM99.0426 101.023V107.536L101.937 101.023H99.0426ZM103.004 97.0613V73.957L99.0426 81.8791V97.0613H103.004ZM119.069 80.3291H119.049L126.972 64.4824C127.31 63.8077 128.001 63.3828 128.755 63.387H136.678V55.4637H120.832C119.738 55.4637 118.851 54.5767 118.851 53.4828V37.6361H106.273L98.8801 54.2534L98.8663 54.2851C98.5498 54.9994 97.8432 55.4612 97.0617 55.4637H81.215V63.387H104.985C105.001 63.3868 105.017 63.3868 105.033 63.387C106.114 63.4001 106.979 64.2871 106.966 65.3679V97.0613H118.851V81.2146C118.852 80.9063 118.927 80.6027 119.069 80.3291ZM136.678 79.2337V67.3487H129.979L124.037 79.2337H136.678ZM122.813 114.889H154.506V83.1954H122.813V97.0613H140.64V101.023H122.813V114.889ZM158.468 107.536L162.429 98.6222V73.7587L158.468 81.682V107.536ZM155.263 79.2337L161.205 67.3487H140.64V79.2337H155.263ZM136.678 51.502V33.6744H140.64V51.502H154.506V19.8086H122.813V51.502H136.678ZM39.6168 81.8804V97.2596H43.5784V73.957L39.6168 81.8804ZM39.6168 107.734L42.5108 101.221H39.6168V107.734ZM42.3543 67.547H11.1284L5.18584 79.4321H36.4118L42.3543 67.547ZM3.96168 83.3937V115.087H35.6551V101.221H17.8275V97.2596H35.6551V83.3937H3.96168ZM17.8275 130.934H11.1284L5.18584 142.819H17.8275V130.934ZM3.96168 178.474H35.6551V146.781H21.7892V164.608H17.8275V146.781H3.96168V178.474ZM21.7892 142.819H36.4118L42.3543 130.934H21.7892V142.819ZM39.6168 164.608V171.121L42.5108 164.608H39.6168ZM39.6168 160.646H43.5784V137.344L39.6168 145.267V160.646ZM59.6431 143.914H59.6232L67.5466 128.068C67.8838 127.393 68.5749 126.968 69.3294 126.972H77.2527V119.049H61.406C60.3121 119.049 59.4252 118.162 59.4252 117.068V101.221H46.8468L39.4543 117.839L39.4405 117.87C39.124 118.585 38.4174 119.046 37.6359 119.049H21.7892V126.972H45.5593C45.5751 126.972 45.5912 126.972 45.6071 126.972C46.6879 126.985 47.5532 127.872 47.5401 128.953V160.646H59.4252V144.8C59.4264 144.491 59.5009 144.188 59.6431 143.914ZM77.2527 142.819V130.934H70.5535L64.611 142.819H77.2527ZM63.3868 178.474H95.0803V146.781H63.3868V160.646H81.2144V164.608H63.3868V178.474ZM99.0419 171.121L103.004 162.207V137.344L99.0419 145.267V171.121ZM95.8369 142.819L101.779 130.934H81.2144V142.819H95.8369Z",
                fill: "white"
            }, void 0, false, {
                fileName: "[project]/components/blocks-1.tsx",
                lineNumber: 24,
                columnNumber: 5
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/blocks-1.tsx",
        lineNumber: 4,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
}),
"[project]/components/money.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Money",
    ()=>SvgComponent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
;
;
const SvgComponent = ({ className, ...props })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("size-[18px]", className),
        fill: "none",
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
            d: "M10.3391 10.5C10.3859 10.6326 10.4834 10.7411 10.6102 10.8017C10.673 10.8317 10.7411 10.8491 10.8106 10.8528C10.8801 10.8565 10.9497 10.8465 11.0153 10.8233C11.0809 10.8001 11.1413 10.7642 11.1931 10.7177C11.2448 10.6712 11.2869 10.6149 11.317 10.5521C11.347 10.4894 11.3643 10.4213 11.368 10.3518C11.3717 10.2823 11.3617 10.2127 11.3385 10.1471L11.3385 10.1471C11.2028 9.76297 10.9512 9.4304 10.6186 9.19519C10.2995 8.96962 9.92096 8.84425 9.53111 8.83441V8.40386V8.35386H9.48111H8.52126H8.47126V8.40386V8.83442C7.96699 8.84721 7.48606 9.05311 7.12847 9.4107C6.75908 9.78009 6.55156 10.2811 6.55156 10.8035C6.55156 11.3259 6.75908 11.8269 7.12847 12.1963C7.48606 12.5539 7.96699 12.7598 8.47126 12.7726V14.5915C8.09759 14.5713 7.78346 14.3258 7.66301 13.9871C7.64129 13.9199 7.60637 13.8578 7.56029 13.8043C7.51405 13.7506 7.45751 13.7067 7.39402 13.6753C7.33053 13.6438 7.26137 13.6254 7.19064 13.6212C7.11992 13.6169 7.04905 13.6269 6.98224 13.6505C6.91543 13.6741 6.85404 13.7108 6.80169 13.7586C6.74933 13.8063 6.70709 13.8641 6.67745 13.9285C6.64781 13.9928 6.63137 14.0625 6.62912 14.1333C6.62688 14.2039 6.63876 14.2742 6.66407 14.3401C6.79989 14.7239 7.05133 15.0563 7.38381 15.2913C7.70284 15.5169 8.08142 15.6423 8.47126 15.6521V16.0827V16.1327H8.52126H9.48111H9.53111V16.0827V15.6521C10.0354 15.6393 10.5163 15.4334 10.8739 15.0758C11.2433 14.7064 11.4508 14.2054 11.4508 13.683C11.4508 13.1606 11.2433 12.6596 10.8739 12.2903C10.5163 11.9327 10.0354 11.7268 9.53111 11.714V9.895C9.70164 9.90434 9.86648 9.96153 10.0065 10.0605C10.1601 10.1691 10.2764 10.3226 10.3391 10.5ZM10.3391 10.5L10.3863 10.4834M10.3391 10.5C10.3391 10.5 10.3391 10.5 10.3391 10.5001L10.3863 10.4834M10.3863 10.4834C10.4286 10.6034 10.517 10.7017 10.6318 10.7566C10.6887 10.7838 10.7503 10.7995 10.8133 10.8028C10.8762 10.8062 10.9392 10.7971 10.9986 10.7761C11.0581 10.7551 11.1128 10.7227 11.1597 10.6805C11.2065 10.6384 11.2447 10.5874 11.2718 10.5306C11.299 10.4737 11.3147 10.412 11.3181 10.3491C11.3215 10.2862 11.3124 10.2232 11.2914 10.1637L9.53111 9.84493C9.71199 9.85432 9.8869 9.91473 10.0354 10.0197C10.1975 10.1342 10.3201 10.2962 10.3863 10.4834ZM9.01996 1.15508C6.89547 1.15508 4.95565 1.83951 3.77353 2.41805L3.44364 2.58733C3.23702 2.6974 3.06347 2.80132 2.92635 2.89096L2.88374 2.91881L2.91235 2.96091L4.65106 5.51922C3.62756 6.60209 2.67066 7.94673 1.98637 9.35695C1.29616 10.7794 0.881596 12.2722 0.959311 13.6321C1.03715 14.9943 1.60907 16.2221 2.88777 17.1076C4.16419 17.9915 6.13995 18.531 9.01996 18.531C11.9001 18.531 13.8707 17.9815 15.1398 17.0849C16.4111 16.1867 16.9733 14.9439 17.0426 13.572C17.1118 12.2023 16.69 10.7046 15.9968 9.28956C15.3098 7.88725 14.3545 6.56257 13.3399 5.51883L15.0896 2.96104L15.1181 2.9193L15.0761 2.89122C14.8733 2.75588 14.5863 2.58973 14.2316 2.4143L14.2312 2.41414L14.165 2.38199C12.9891 1.81112 11.1002 1.15508 9.01996 1.15508ZM9.16726 4.3064L9.16729 4.30639C10.6372 3.88082 12.1615 3.57645 13.4552 3.47335L12.1041 5.44865C10.1479 6.13968 7.83837 6.13969 5.8827 5.44773L5.04447 4.21353C5.27924 4.2718 5.51573 4.323 5.75361 4.36704L5.75364 4.36705C6.86884 4.57274 8.0772 4.62131 9.16726 4.3064ZM2.0169 13.5718L2.0169 13.5718C1.95277 12.4555 2.29488 11.1478 2.93918 9.81948C3.54846 8.56394 4.39693 7.35442 5.30991 6.36551C7.61555 7.24645 10.3763 7.2464 12.6819 6.36442C13.6327 7.37191 14.4288 8.51487 15.0443 9.75603C15.6909 11.0751 16.0407 12.3895 15.9837 13.5184C15.9287 14.6054 15.5022 15.5306 14.5275 16.2195C13.5089 16.9392 11.7877 17.4711 9.01948 17.4711C6.24826 17.4711 4.51869 16.9483 3.49041 16.2365C2.50854 15.5565 2.07803 14.6437 2.0169 13.5718ZM7.8779 10.1601C8.03671 10.0013 8.24818 9.90728 8.47126 9.89501V11.712C8.24818 11.6997 8.03671 11.6057 7.8779 11.4469C7.70727 11.2762 7.61141 11.0448 7.61141 10.8035C7.61141 10.5622 7.70727 10.3308 7.8779 10.1601ZM10.1245 14.3264C9.96567 14.4852 9.7542 14.5793 9.53111 14.5915V12.7746C9.7542 12.7868 9.96567 12.8809 10.1245 13.0397C10.2951 13.2103 10.391 13.4417 10.391 13.683C10.391 13.9243 10.2951 14.1558 10.1245 14.3264ZM8.87208 3.28746C7.99931 3.54026 6.97321 3.51349 5.94555 3.32422C5.58815 3.25805 5.23509 3.17326 4.89426 3.07607C5.96187 2.63811 7.44023 2.21493 9.01948 2.21493C10.0131 2.21493 10.9636 2.38262 11.7948 2.61604C10.8085 2.78335 9.83261 3.00752 8.87208 3.28746Z",
            fill: "#306CFE",
            stroke: "#306CFE",
            strokeWidth: 0.1
        }, void 0, false, {
            fileName: "[project]/components/money.tsx",
            lineNumber: 12,
            columnNumber: 5
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/money.tsx",
        lineNumber: 6,
        columnNumber: 3
    }, ("TURBOPACK compile-time value", void 0));
;
}),
"[project]/src/lib/api/favorites.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addFavorite",
    ()=>addFavorite,
    "createGroup",
    ()=>createGroup,
    "deleteGroup",
    ()=>deleteGroup,
    "findFavoriteByItemId",
    ()=>findFavoriteByItemId,
    "getAllFavorites",
    ()=>getAllFavorites,
    "getAllFavoritesGrouped",
    ()=>getAllFavoritesGrouped,
    "getFavoritesByGroup",
    ()=>getFavoritesByGroup,
    "getFavoritesCount",
    ()=>getFavoritesCount,
    "getGroups",
    ()=>getGroups,
    "getProjectFavorites",
    ()=>getProjectFavorites,
    "getServiceFavorites",
    ()=>getServiceFavorites,
    "getTalentFavorites",
    ()=>getTalentFavorites,
    "getTeamFavorites",
    ()=>getTeamFavorites,
    "isFavorited",
    ()=>isFavorited,
    "moveFavorite",
    ()=>moveFavorite,
    "removeFavorite",
    ()=>removeFavorite,
    "renameGroup",
    ()=>renameGroup
]);
// frontend/src/lib/api/favorites.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/js-cookie/dist/js.cookie.mjs [app-ssr] (ecmascript)");
;
const FAVORITES_API_URL = ("TURBOPACK compile-time value", "http://127.0.0.1:4100/favorites") || "http://localhost:3012/favorites";
function authHeaders() {
    const token = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$js$2d$cookie$2f$dist$2f$js$2e$cookie$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get("access_token");
    return {
        "Content-Type": "application/json",
        ...token ? {
            Authorization: `Bearer ${token}`
        } : {}
    };
}
async function createGroup(dto) {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/groups`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error creating group:", error);
        return null;
    }
}
async function getGroups() {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/groups`, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Error fetching groups:", error);
        return [];
    }
}
async function renameGroup(groupId, dto) {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/groups/${groupId}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error renaming group:", error);
        return null;
    }
}
async function deleteGroup(groupId) {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/groups/${groupId}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        return res.ok;
    } catch (error) {
        console.error("Error deleting group:", error);
        return false;
    }
}
async function getAllFavoritesGrouped(type) {
    try {
        const url = type ? `${FAVORITES_API_URL}?type=${type}` : FAVORITES_API_URL;
        const res = await fetch(url, {
            headers: authHeaders(),
            cache: "no-store"
        });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Error fetching favorites:", error);
        return [];
    }
}
async function getAllFavorites(type) {
    const groups = await getAllFavoritesGrouped(type);
    return groups.flatMap((g)=>g.favorites);
}
async function addFavorite(dto) {
    try {
        const res = await fetch(FAVORITES_API_URL, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error adding favorite:", error);
        return null;
    }
}
async function moveFavorite(favoriteId, dto) {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/${favoriteId}`, {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify(dto)
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Error moving favorite:", error);
        return null;
    }
}
async function removeFavorite(favoriteId) {
    try {
        const res = await fetch(`${FAVORITES_API_URL}/${favoriteId}`, {
            method: "DELETE",
            headers: authHeaders()
        });
        return res.ok;
    } catch (error) {
        console.error("Error removing favorite:", error);
        return false;
    }
}
async function findFavoriteByItemId(itemId) {
    try {
        const favorites = await getAllFavorites();
        return favorites.find((fav)=>fav.itemId === itemId) || null;
    } catch (error) {
        console.error("Error finding favorite:", error);
        return null;
    }
}
async function isFavorited(itemId) {
    const favorite = await findFavoriteByItemId(itemId);
    return favorite !== null;
}
async function getFavoritesByGroup(groupId) {
    try {
        const groups = await getGroups();
        const group = groups.find((g)=>g.id === groupId);
        return group?.favorites ?? [];
    } catch (error) {
        console.error("Error getting group favorites:", error);
        return [];
    }
}
async function getFavoritesCount() {
    const favorites = await getAllFavorites();
    return favorites.length;
}
async function getProjectFavorites() {
    return getAllFavorites("project");
}
async function getServiceFavorites() {
    return getAllFavorites("service");
}
async function getTeamFavorites() {
    return getAllFavorites("team");
}
async function getTalentFavorites() {
    return getAllFavorites("talent");
}
}),
"[project]/components/talent-search-card.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TalentSearchCard",
    ()=>TalentSearchCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$favorites$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api/favorites.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-image.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/favorite/favorite.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tooltip/tooltip.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
const defaultSkills = [
    "UX Research",
    "Web Design",
    "Web Design",
    "Content Design",
    "Frontend Development",
    "Service Design",
    "Marketing Design",
    "Motion Design",
    "Interaction Design",
    "Prototyping",
    "User Testing",
    "Figma"
];
/**
 * Measures how many skill labels fit in the container
 * while always reserving 8px gap + "More..." width at the end.
 */ function useVisibleSkills(skills) {
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [visibleCount, setVisibleCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(skills.length);
    const measure = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const el = containerRef.current;
        if (!el) return;
        const GAP = 8 // gap-x-2
        ;
        const PAD = 32 // px-4 each side
        ;
        // Measure "More..." span (last child)
        const children = Array.from(el.children);
        const moreEl = children[children.length - 1];
        const moreWidth = moreEl.offsetWidth;
        const available = el.offsetWidth - PAD;
        let used = 0;
        let count = 0;
        for(let i = 0; i < skills.length; i++){
            const child = children[i];
            if (!child) break;
            const w = child.scrollWidth;
            const next = used + (count > 0 ? GAP : 0) + w;
            // Always reserve space for gap + "More..."
            if (next + GAP + moreWidth > available && count > 0) break;
            used = next;
            count++;
        }
        setVisibleCount(count);
    }, [
        skills
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        measure();
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return ()=>ro.disconnect();
    }, [
        measure
    ]);
    return {
        containerRef,
        visibleCount
    };
}
const TalentSearchCard = ({ id, name = "Ngozi", handle = "@BlueberryBelle", role = "Marketing Technologist", photo = "/man.jpg", rate = "$85 - $120", experience = "5 years of experience", country = "Australia", localTime = "7:30pm local time", rating = 4.7, projects = 2, allStars = true, skills: skillsList = defaultSkills, profileHref = "#", isFavorited = false, onFavoriteChange, imageLoading = "lazy", showOptionsMenu = false, onRemove })=>{
    const { containerRef, visibleCount } = useVisibleSkills(skillsList);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] overflow-hidden flex flex-col",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: profileHref,
                                className: "block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative h-[140px] overflow-hidden rounded-[6px] group",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        src: photo,
                                        sizes: "25vw",
                                        fill: true,
                                        loading: imageLoading,
                                        className: "object-cover group-hover:scale-150 transition [transition-duration:3000ms]",
                                        alt: name
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 154,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/talent-search-card.tsx",
                                    lineNumber: 153,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 152,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center absolute px-2.5 pt-2.5 justify-between top-0 inset-x-0 pointer-events-none",
                                children: [
                                    allStars ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "font-bold rounded-[5px] py-0.5 px-1.5 bg-black/[.57] inline-flex items-center gap-x-1 text-white text-[10px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star02"], {}, void 0, false, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 167,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            " All Stars"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 166,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {}, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 170,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    showOptionsMenu ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "pointer-events-auto size-5 inline-flex items-center justify-center text-white hover:text-gray-200 focus-visible:outline-none",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MoreHorizontal"], {
                                                        className: "size-5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 177,
                                                        columnNumber: 21
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/talent-search-card.tsx",
                                                    lineNumber: 176,
                                                    columnNumber: 19
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 175,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                                align: "end",
                                                className: "w-[165px]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Edit03"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/talent-search-card.tsx",
                                                                lineNumber: 182,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " Edit"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 181,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Copy"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/talent-search-card.tsx",
                                                                lineNumber: 185,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " Duplicate"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 184,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 187,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                        visual: "destructive",
                                                        onClick: onRemove,
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Trash2"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/talent-search-card.tsx",
                                                                lineNumber: 189,
                                                                columnNumber: 21
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            " Remove"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 188,
                                                        columnNumber: 19
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 180,
                                                columnNumber: 17
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 174,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star01"], {
                                        className: "size-5 text-white"
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 194,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 164,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "bg-success-500 flex items-center justify-center rounded-full text-white",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Check"], {
                                        className: "size-[13.97px]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 200,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/talent-search-card.tsx",
                                    lineNumber: 199,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 198,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/talent-search-card.tsx",
                        lineNumber: 151,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-sm font-bold leading-none text-dark-blue-400",
                                children: [
                                    rate,
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-[10px] leading-none font-light",
                                        children: "/hr"
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 208,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 206,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: profileHref,
                                className: "block mt-3 hover:underline",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                    className: "text-sm font-bold leading-none text-dark-blue-400",
                                    children: [
                                        name,
                                        " ",
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-[12px] text-gray-500 leading-none font-light",
                                            children: handle
                                        }, void 0, false, {
                                            fileName: "[project]/components/talent-search-card.tsx",
                                            lineNumber: 214,
                                            columnNumber: 15
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/talent-search-card.tsx",
                                    lineNumber: 212,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 211,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5",
                                children: role
                            }, void 0, false, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 219,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[11px] text-dark-blue-400 leading-none font-light mt-2",
                                children: experience
                            }, void 0, false, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 222,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center text-gray-500 gap-x-1 mt-3.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MarkerPin02"], {
                                        className: "size-3"
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 226,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[10px] leading-5 font-semibold",
                                        children: [
                                            country,
                                            " ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-light",
                                                children: [
                                                    "(",
                                                    localTime,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 229,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 227,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 225,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-3.5 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-x-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-x-[3px]",
                                                            children: [
                                                                1,
                                                                2,
                                                                3,
                                                                4,
                                                                5
                                                            ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                                    className: `size-3 shrink-0 ${i <= Math.round(rating) ? "text-primary-500 fill-primary-500" : "text-gray-200 fill-gray-200"}`
                                                                }, i, false, {
                                                                    fileName: "[project]/components/talent-search-card.tsx",
                                                                    lineNumber: 239,
                                                                    columnNumber: 23
                                                                }, ("TURBOPACK compile-time value", void 0)))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/talent-search-card.tsx",
                                                            lineNumber: 237,
                                                            columnNumber: 19
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 236,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-xs font-semibold leading-none text-dark-blue-400",
                                                        children: rating
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                        lineNumber: 250,
                                                        columnNumber: 17
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 235,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-xs font-semibold leading-none text-dark-blue-400",
                                                children: [
                                                    projects,
                                                    " Projects"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 254,
                                                columnNumber: 15
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 234,
                                        columnNumber: 13
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    !showOptionsMenu && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FavoriteRoot"], {
                                        value: isFavorited,
                                        onValueChange: async (pressed)=>{
                                            if (pressed) {
                                                onFavoriteChange?.(true);
                                                if (id) {
                                                    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$favorites$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["addFavorite"])({
                                                        type: "talent",
                                                        itemId: String(id)
                                                    });
                                                    if (!result) {
                                                        onFavoriteChange?.(false);
                                                    }
                                                }
                                            } else {
                                                onFavoriteChange?.(false);
                                                if (id) {
                                                    const favorite = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$favorites$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["findFavoriteByItemId"])(String(id));
                                                    if (favorite) {
                                                        const success = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2f$favorites$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["removeFavorite"])(favorite.id);
                                                        if (!success) {
                                                            onFavoriteChange?.(true);
                                                        }
                                                    }
                                                }
                                            }
                                        },
                                        children: ({ pressed })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                                                delayDuration: 75,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                                                            asChild: true,
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-block",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Favorite"], {}, void 0, false, {
                                                                    fileName: "[project]/components/talent-search-card.tsx",
                                                                    lineNumber: 293,
                                                                    columnNumber: 27
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/talent-search-card.tsx",
                                                                lineNumber: 292,
                                                                columnNumber: 25
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/talent-search-card.tsx",
                                                            lineNumber: 291,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                                                            children: pressed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex items-center gap-x-1",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Check"], {
                                                                        className: "size-[15px] shrink-0 text-green-500"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/components/talent-search-card.tsx",
                                                                        lineNumber: 299,
                                                                        columnNumber: 29
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Saved"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/components/talent-search-card.tsx",
                                                                lineNumber: 298,
                                                                columnNumber: 27
                                                            }, ("TURBOPACK compile-time value", void 0)) : "Save to favorites"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/talent-search-card.tsx",
                                                            lineNumber: 296,
                                                            columnNumber: 23
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/talent-search-card.tsx",
                                                    lineNumber: 290,
                                                    columnNumber: 21
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/talent-search-card.tsx",
                                                lineNumber: 289,
                                                columnNumber: 19
                                            }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/talent-search-card.tsx",
                                        lineNumber: 260,
                                        columnNumber: 15
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/talent-search-card.tsx",
                                lineNumber: 233,
                                columnNumber: 11
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/talent-search-card.tsx",
                        lineNumber: 205,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/talent-search-card.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                ref: containerRef,
                className: "mt-auto px-4 py-2.5 flex flex-wrap gap-x-2 gap-y-1 border-t border-gray-200 bg-[#122A4B]/[.02] items-center",
                children: [
                    skillsList.map((skill, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs leading-5 font-semibold text-gray-500/60 hover:text-gray-500 cursor-pointer whitespace-nowrap",
                            style: index >= visibleCount ? {
                                position: "absolute",
                                visibility: "hidden",
                                pointerEvents: "none"
                            } : undefined,
                            children: skill
                        }, index, false, {
                            fileName: "[project]/components/talent-search-card.tsx",
                            lineNumber: 320,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: profileHref ? `${profileHref}#skills` : "#",
                        className: "text-xs leading-5 font-bold text-gray-500/60 hover:text-gray-500 hover:underline cursor-pointer whitespace-nowrap",
                        children: "More..."
                    }, void 0, false, {
                        fileName: "[project]/components/talent-search-card.tsx",
                        lineNumber: 328,
                        columnNumber: 9
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/talent-search-card.tsx",
                lineNumber: 315,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/talent-search-card.tsx",
        lineNumber: 149,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
}),
"[project]/components/listing-card.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ListingCard",
    ()=>ListingCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * Master ListingCard component.
 *
 * Single entry point for rendering project / service / talent / team cards
 * across the app. Navigation hrefs are computed from `kind` + identifiers so
 * every call site lands on the correct detail page without hardcoding routes.
 *
 * Project/service cards share a layout and support two modes:
 *   - "browse": shows the favorite star (default).
 *   - "owned":  shows a status badge + edit icon (used in /my-listings).
 *
 * Talent cards forward to the existing TalentSearchCard which already
 * implements the full grid layout with skills, rating, avatar, etc.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$money$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/money.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-image.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/listing-urls.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar/avatar.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2d$group$2f$avatar$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/avatar-group/avatar-group.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/badge/badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$talent$2d$search$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/talent-search-card.tsx [app-ssr] (ecmascript)");
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
function ListingCard(props) {
    if (props.kind === "talent") {
        const href = props.href ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["talentProfileUrl"])(props.username);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$talent$2d$search$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TalentSearchCard"], {
            id: props.id,
            name: props.name,
            handle: props.handle,
            role: props.role,
            photo: props.photo,
            rate: props.rate,
            experience: props.experience,
            country: props.country,
            localTime: props.localTime,
            rating: props.rating,
            projects: props.projects,
            allStars: props.allStars,
            skills: props.skills,
            profileHref: href,
            isFavorited: props.isFavorited,
            onFavoriteChange: props.onFavoriteChange,
            showOptionsMenu: props.showOptionsMenu,
            onRemove: props.onRemove
        }, void 0, false, {
            fileName: "[project]/components/listing-card.tsx",
            lineNumber: 157,
            columnNumber: 7
        }, this);
    }
    if (props.kind === "team") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TeamListingCard, {
            ...props
        }, void 0, false, {
            fileName: "[project]/components/listing-card.tsx",
            lineNumber: 181,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ProjectListingCard, {
        ...props
    }, void 0, false, {
        fileName: "[project]/components/listing-card.tsx",
        lineNumber: 184,
        columnNumber: 10
    }, this);
}
/* ─── Project / Service card ──────────────────────────────────────────── */ function ProjectListingCard({ kind, id, title, description, mediaUrl, budget, duration, rating, reviewCount, status, collaborators, avatarsSlot, badge, href, mode = "browse", onEdit, favoriteSlot, cardVariant = "default" }) {
    const computedHref = href ?? (cardVariant === "job" || cardVariant === "job-grid" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobDetailsUrl"])(id) : mode === "owned" && status && status !== "Active" ? `/publish-project?type=${kind}&draftId=${id}` : kind === "service" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serviceDetailsUrl"])(id) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["projectDetailsUrl"])(id));
    const getStableVariantIndex = (value, total)=>{
        let hash = 0;
        for (const char of value){
            hash = hash * 31 + char.charCodeAt(0) >>> 0;
        }
        return hash % total;
    };
    // Jobs search reuses the shared ListingCard entry point, but swaps to this
    // grid layout when the shared search toggle is in grid mode.
    if (cardVariant === "job-grid") {
        const jobDescription = description || "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.";
        const primarySkills = [
            "Visual Design",
            "Tailwind CSS",
            "Next.js"
        ];
        const secondarySkills = [
            "Wireframing",
            "Figma"
        ];
        const gridVariantIndex = getStableVariantIndex(id, 4);
        const earningsVariantIndex = getStableVariantIndex(`${id}-earnings`, 3);
        const showPaymentVerified = gridVariantIndex === 1 || gridVariantIndex === 3;
        const showNdaRequired = gridVariantIndex === 2 || gridVariantIndex === 3;
        const showServiceBadge = gridVariantIndex === 0 || gridVariantIndex === 3;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
            className: "flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start justify-between gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                            href: computedHref,
                            className: "max-w-[195px] text-[16px] font-bold leading-normal text-dark-blue-400 focus-visible:outline-none hover:underline",
                            children: title || "The Ultimate Mobile App Experience"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 245,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "shrink-0 self-start text-right",
                            children: [
                                earningsVariantIndex === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[18px] font-bold leading-7 text-dark-blue-400",
                                            children: "$90,200"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 255,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[13px] font-light leading-5 text-gray-500",
                                            children: "Earnings Opportunity"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 258,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true),
                                earningsVariantIndex === 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "inline-flex items-center justify-end gap-2 pt-1 text-xs font-medium leading-[18px] text-dark-blue-400",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HelpCircle"], {
                                            className: "size-[14px] shrink-0 text-gray-400"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 266,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: "Earnings Unavailable"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 267,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 265,
                                    columnNumber: 15
                                }, this),
                                earningsVariantIndex === 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[18px] font-bold leading-7 text-dark-blue-400",
                                            children: "$90,200/mo"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 273,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "text-[13px] font-light leading-5 text-gray-500",
                                            children: "Earnings Opportunity"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 276,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 252,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 244,
                    columnNumber: 9
                }, this),
                (showPaymentVerified || showNdaRequired) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-4 flex flex-wrap items-center gap-2",
                    children: [
                        showPaymentVerified && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            variant: "outlined",
                            visual: "gray",
                            size: "sm",
                            className: "h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none",
                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DollarSign"], {
                                className: "size-[14px] text-success-600"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 293,
                                columnNumber: 27
                            }, this),
                            children: "Payment Verified"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 287,
                            columnNumber: 15
                        }, this),
                        showNdaRequired && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            variant: "outlined",
                            visual: "gray",
                            size: "sm",
                            className: "h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none",
                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File02"], {
                                className: "size-[14px] text-primary-500"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 306,
                                columnNumber: 27
                            }, this),
                            children: "NDA Required"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 300,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 285,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-4 flex flex-wrap items-center gap-x-2 gap-y-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-[13px] font-medium leading-5 text-dark-blue-400",
                            children: "1 matching role"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 315,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                            href: computedHref,
                            className: "text-sm font-semibold leading-5 text-primary-500 focus-visible:outline-none hover:underline",
                            children: "UX Researcher"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 318,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 314,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-4 text-sm font-light leading-normal text-dark-blue-400",
                    children: jobDescription
                }, void 0, false, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 326,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-auto pt-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-[13px] font-medium leading-5 text-dark-blue-400",
                            children: "2 of 9 skills match"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 331,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-3 flex flex-wrap gap-2",
                            children: primarySkills.map((skill, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                    className: "gap-x-1.5 bg-gray-100 text-dark-blue-400",
                                    visual: "gray",
                                    children: [
                                        index < 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Check"], {
                                            className: "size-3.5 text-primary-500"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 342,
                                            columnNumber: 31
                                        }, this),
                                        skill
                                    ]
                                }, skill, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 337,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 335,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-2 flex flex-wrap items-center gap-2",
                            children: [
                                secondarySkills.map((skill)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                        className: "bg-gray-100 text-dark-blue-400",
                                        visual: "gray",
                                        children: skill
                                    }, skill, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 350,
                                        columnNumber: 15
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "link",
                                    visual: "gray",
                                    className: "font-medium text-dark-blue-400 no-underline hover:no-underline",
                                    children: "+ 10 more"
                                }, void 0, false, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 358,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 348,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-6 flex items-center justify-between gap-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-wrap items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "outlined",
                                            visual: "gray",
                                            size: "sm",
                                            className: "h-auto rounded-full px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none",
                                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File02"], {
                                                className: "size-[14px] text-gray-400"
                                            }, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 376,
                                                columnNumber: 27
                                            }, this),
                                            children: "Mobile Application"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 370,
                                            columnNumber: 15
                                        }, this),
                                        showServiceBadge && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "outlined",
                                            visual: "gray",
                                            size: "sm",
                                            className: "h-auto rounded-[5px] px-3 py-1 text-xs font-semibold leading-[18px] text-primary-500 shadow-none",
                                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RefreshCw01"], {
                                                className: "size-[14px]"
                                            }, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 388,
                                                columnNumber: 29
                                            }, this),
                                            children: "Service"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 382,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 369,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                    variant: "ghost",
                                    visual: "gray",
                                    size: "sm",
                                    className: "h-auto w-auto p-0 text-gray-300 hover:bg-transparent hover:text-gray-400 focus:bg-transparent",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                        className: "size-[18px]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 401,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 395,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 368,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 330,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/listing-card.tsx",
            lineNumber: 243,
            columnNumber: 7
        }, this);
    }
    // Jobs search reuses the shared ListingCard entry point, but swaps to this
    // landscape layout so /find-jobs can evolve independently from project cards.
    if (cardVariant === "job") {
        const jobDescription = description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.";
        const jobSkills = [
            "Visual Design",
            "Tailwind CSS",
            "Next.js",
            "E-commerce"
        ];
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
            className: "overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-6",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "min-w-0 flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap items-center gap-x-4 gap-y-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                                                    href: computedHref,
                                                    className: "truncate text-base font-bold leading-normal text-dark-blue-400 focus-visible:outline-none hover:underline",
                                                    children: title || "Corporate Dashboard Project"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 423,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-sm leading-5 text-gray-500",
                                                    children: "2 days ago"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 430,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 422,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "mt-2 flex flex-wrap items-center gap-x-2 gap-y-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[13px] font-medium leading-5 text-dark-blue-400",
                                                    children: "1 matching role"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 434,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                                                    href: computedHref,
                                                    className: "text-sm font-semibold leading-5 text-primary-500 focus-visible:outline-none hover:underline",
                                                    children: "UX Researcher"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 437,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 433,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 421,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex shrink-0 flex-wrap items-center gap-5",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "outlined",
                                            visual: "gray",
                                            size: "sm",
                                            className: "h-auto rounded-full px-3 py-1 text-xs font-semibold leading-[18px] text-dark-blue-400 shadow-none",
                                            leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["File02"], {
                                                className: "size-[14px] text-gray-400"
                                            }, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 453,
                                                columnNumber: 27
                                            }, this),
                                            children: "Mobile Application"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 447,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "inline-flex items-center gap-x-2 text-xs font-medium leading-[18px] text-dark-blue-400",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HelpCircle"], {
                                                    className: "size-[14px] text-gray-400"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 459,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Earnings Unavailable"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 460,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 458,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 446,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 420,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-4 text-sm font-light leading-normal text-dark-blue-400",
                            children: jobDescription
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 465,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex min-w-0 flex-1 flex-wrap items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "mr-2 text-[13px] font-medium leading-5 text-dark-blue-400",
                                            children: "2 of 9 skills match"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 471,
                                            columnNumber: 15
                                        }, this),
                                        jobSkills.map((skill, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                                className: "gap-x-1.5 bg-gray-100 text-dark-blue-400",
                                                visual: "gray",
                                                children: [
                                                    index < 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Check"], {
                                                        className: "size-3.5 text-primary-500"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/listing-card.tsx",
                                                        lineNumber: 481,
                                                        columnNumber: 33
                                                    }, this),
                                                    skill
                                                ]
                                            }, skill, true, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 476,
                                                columnNumber: 17
                                            }, this)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            type: "button",
                                            variant: "link",
                                            visual: "gray",
                                            className: "font-medium text-dark-blue-400 no-underline hover:no-underline",
                                            children: "+ 10 more"
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 486,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 470,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "outlined",
                                    visual: "gray",
                                    size: "sm",
                                    className: "h-auto shrink-0 px-3 py-1 text-xs font-semibold leading-[18px] text-primary-500 shadow-none",
                                    leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["RefreshCw01"], {
                                        className: "size-[14px]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 502,
                                        columnNumber: 25
                                    }, this),
                                    children: "Service"
                                }, void 0, false, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 496,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 469,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 419,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "border-t border-gray-200 bg-gray-50 px-6 py-3 md:h-11 md:overflow-x-auto md:py-0",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex min-h-5 flex-col gap-3 text-[13px] leading-5 md:h-full md:w-full md:flex-row md:flex-nowrap md:items-center md:justify-between md:gap-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2 whitespace-nowrap md:shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-light text-gray-500",
                                        children: "Open Roles"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 512,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold text-dark-blue-400",
                                        children: "7"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 513,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 511,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "hidden h-5 w-px shrink-0 bg-gray-200 md:block"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 516,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2 whitespace-nowrap md:shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-light text-gray-500",
                                        children: "Duration"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 519,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold text-dark-blue-400",
                                        children: "Ongoing"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 520,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 518,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "hidden h-5 w-px shrink-0 bg-gray-200 md:block"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 523,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2 whitespace-nowrap md:shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-light text-gray-500",
                                        children: "Work Schedule"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 526,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold text-dark-blue-400",
                                        children: "Full-Time"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 527,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 525,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "hidden h-5 w-px shrink-0 bg-gray-200 md:block"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 530,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2 whitespace-nowrap md:shrink-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-light text-gray-500",
                                        children: "Client Rating"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 533,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                        className: "size-4 text-gray-400"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 534,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-bold text-dark-blue-400",
                                        children: "4.8"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 535,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 532,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "hidden h-5 w-px shrink-0 bg-gray-200 md:block"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 538,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center whitespace-nowrap md:shrink-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                type: "button",
                                                variant: "link",
                                                visual: "gray",
                                                size: "sm",
                                                className: "h-auto gap-x-1.5 px-0 py-0 text-[13px] font-semibold leading-5 text-dark-blue-400 hover:text-dark-blue-400",
                                                leftIcon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                    className: "size-[18px] text-gray-300"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 548,
                                                    columnNumber: 29
                                                }, this),
                                                children: "Save"
                                            }, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 542,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                                asChild: true,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    variant: "ghost",
                                                    visual: "gray",
                                                    size: "sm",
                                                    className: "h-auto w-auto p-0 text-gray-500 hover:bg-transparent focus:bg-transparent",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                                        className: "size-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/listing-card.tsx",
                                                        lineNumber: 560,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 554,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 553,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 541,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                        align: "end",
                                        side: "bottom",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioGroup"], {
                                                value: "",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                        value: "digital-marketing",
                                                        children: "Digital Marketing"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/listing-card.tsx",
                                                        lineNumber: 567,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                        value: "customer-service",
                                                        children: "Customer Service"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/listing-card.tsx",
                                                        lineNumber: 570,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuRadioTrigger"], {
                                                        value: "email-marketing",
                                                        children: "Email Marketing"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/listing-card.tsx",
                                                        lineNumber: 573,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 566,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 577,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 565,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 540,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 510,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 509,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/listing-card.tsx",
            lineNumber: 418,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "h-full flex flex-col p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                href: computedHref,
                className: "block focus-visible:outline-none group/card",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer",
                        children: [
                            mediaUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextImage"], {
                                className: "object-cover group-hover:scale-150 transition [transition-duration:3000ms]",
                                src: mediaUrl,
                                alt: title,
                                fill: true,
                                sizes: "33vw"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 594,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute inset-0 flex items-center justify-center bg-gray-50",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Briefcase"], {
                                    className: "size-10 text-gray-300"
                                }, void 0, false, {
                                    fileName: "[project]/components/listing-card.tsx",
                                    lineNumber: 603,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 602,
                                columnNumber: 13
                            }, this),
                            badge?.trim() && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "absolute top-2 right-2 inline-flex max-w-[60%] items-center truncate rounded-md bg-dark-blue-400/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow",
                                children: badge
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 607,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 592,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex items-start gap-x-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-bold flex-auto text-base leading-none text-dark-blue-400 group-hover/card:underline",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 614,
                                columnNumber: 11
                            }, this),
                            mode === "owned" && status && status !== "Active" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium", status === "In Review" ? "bg-amber-100 text-amber-700" : status === "Needs Update" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"),
                                children: status
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 619,
                                columnNumber: 13
                            }, this),
                            typeof rating === "number" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "inline-flex items-center gap-x-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                        className: "size-[15px] text-primary-500 fill-primary-500"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 635,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium",
                                        children: [
                                            rating.toFixed(1),
                                            " ",
                                            typeof reviewCount === "number" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "font-extralight",
                                                children: [
                                                    "(",
                                                    reviewCount,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/listing-card.tsx",
                                                lineNumber: 639,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 636,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 634,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 613,
                        columnNumber: 9
                    }, this),
                    description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-3 text-sm leading-[1.4] font-extralight text-dark-blue-400 line-clamp-2",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 647,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-[14.5px] flex flex-col gap-y-3",
                        children: [
                            duration && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-[6.4px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Clock"], {
                                        className: "size-[18px] shrink-0 text-primary-500"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 655,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium text-sm leading-none text-dark-blue-400",
                                        children: duration
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 656,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 654,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-[6.4px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$money$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Money"], {
                                        className: "size-[18px] shrink-0 text-primary-500"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 663,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium text-sm leading-none text-dark-blue-400",
                                        children: budget
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 664,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 662,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 652,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/listing-card.tsx",
                lineNumber: 588,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-auto pt-5 flex items-end justify-between",
                children: [
                    avatarsSlot ?? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2d$group$2f$avatar$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarGroup"], {
                        max: 5,
                        size: "sm",
                        excess: true,
                        excessClassName: "border-gray-300 text-gray-500",
                        children: (collaborators && collaborators.length > 0 ? collaborators : [
                            "/woman.jpg"
                        ]).map((src, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                size: "sm",
                                className: "border-2 border-white hover:ring-0 active:ring-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                        src: src,
                                        alt: "Collaborator"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 688,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                        children: "·"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 689,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 683,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 673,
                        columnNumber: 11
                    }, this),
                    mode === "owned" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                        className: "rounded-full text-gray-400 hover:text-gray-800",
                        visual: "gray",
                        variant: "ghost",
                        onClick: onEdit,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Edit03"], {
                            className: "size-4"
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card.tsx",
                            lineNumber: 702,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 696,
                        columnNumber: 11
                    }, this) : favoriteSlot
                ]
            }, void 0, true, {
                fileName: "[project]/components/listing-card.tsx",
                lineNumber: 671,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/listing-card.tsx",
        lineNumber: 587,
        columnNumber: 5
    }, this);
}
/* ─── Team card (rich) ────────────────────────────────────────────────── */ function TeamListingCard({ id, name, handle, tagline, experience, rate, locations, rating, projectCount, skills, memberAvatars, previousClientLogos, href, favoriteSlot }) {
    const computedHref = href ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["teamDetailsUrl"])(id);
    const avatars = memberAvatars && memberAvatars.length > 0 ? memberAvatars : [
        "/woman.jpg"
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "h-full flex flex-col p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2d$group$2f$avatar$2d$group$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarGroup"], {
                        max: 3,
                        size: "md",
                        excess: true,
                        excessClassName: "border-gray-300 text-gray-500",
                        children: avatars.map((src, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Avatar"], {
                                size: "md",
                                className: "border-2 border-white hover:ring-0 active:ring-0",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                        src: src,
                                        alt: "Team member"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 751,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$avatar$2f$avatar$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                        children: "T"
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 752,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 746,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 739,
                        columnNumber: 9
                    }, this),
                    favoriteSlot
                ]
            }, void 0, true, {
                fileName: "[project]/components/listing-card.tsx",
                lineNumber: 738,
                columnNumber: 7
            }, this),
            rate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5 flex items-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "text-sm font-bold text-dark-blue-400 leading-none",
                    children: rate
                }, void 0, false, {
                    fileName: "[project]/components/listing-card.tsx",
                    lineNumber: 761,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/listing-card.tsx",
                lineNumber: 760,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NextLink"], {
                        href: computedHref,
                        className: "focus-visible:outline-none text-base leading-none text-dark-blue-400 font-bold hover:underline",
                        children: [
                            name,
                            handle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-light text-gray-500",
                                children: [
                                    " ",
                                    handle
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 774,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 768,
                        columnNumber: 9
                    }, this),
                    tagline && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "mt-0.5 text-xs font-medium text-dark-blue-400 leading-none",
                        children: tagline
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 779,
                        columnNumber: 11
                    }, this),
                    experience && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-[11px] font-light leading-none text-dark-blue-400",
                        children: experience
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 785,
                        columnNumber: 11
                    }, this),
                    locations && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3.5 flex items-center gap-x-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MarkerPin02"], {
                                className: "size-3 text-gray-500"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 792,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "leading-4 text-[10px] font-medium text-gray-500",
                                children: locations
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 793,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 791,
                        columnNumber: 11
                    }, this),
                    (typeof rating === "number" || typeof projectCount === "number") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3.5 flex items-center gap-x-2",
                        children: [
                            typeof rating === "number" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-x-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-x-[3px]",
                                            children: Array.from({
                                                length: 5
                                            }).map((_, k)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Star"], {
                                                    className: "size-3 text-primary-500 fill-primary-500 shrink-0"
                                                }, k, false, {
                                                    fileName: "[project]/components/listing-card.tsx",
                                                    lineNumber: 806,
                                                    columnNumber: 23
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 804,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 803,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-semibold leading-none text-dark-blue-400",
                                        children: rating.toFixed(1)
                                    }, void 0, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 813,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 802,
                                columnNumber: 15
                            }, this),
                            typeof projectCount === "number" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-xs font-semibold leading-none text-dark-blue-400",
                                children: [
                                    projectCount,
                                    " ",
                                    projectCount === 1 ? "Project" : "Projects"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 819,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 800,
                        columnNumber: 11
                    }, this),
                    skills && skills.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5 flex gap-2 flex-wrap",
                        children: skills.map((skill)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$badge$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
                                className: "bg-transparent",
                                visual: "gray",
                                children: skill
                            }, skill, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 829,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 827,
                        columnNumber: 11
                    }, this),
                    previousClientLogos && previousClientLogos.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "block text-[11px] font-light text-dark-blue-400",
                                children: "Previous clients"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 838,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 flex items-center flex-wrap gap-3",
                                children: previousClientLogos.map((logo, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "size-[25px] rounded-full shrink-0 relative bg-gray-50 overflow-hidden flex items-center justify-center",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: logo,
                                            alt: "Previous client",
                                            width: 25,
                                            height: 25,
                                            loading: "lazy",
                                            decoding: "async",
                                            className: "size-full object-contain",
                                            onError: (e)=>{
                                                e.currentTarget.style.display = "none";
                                            }
                                        }, void 0, false, {
                                            fileName: "[project]/components/listing-card.tsx",
                                            lineNumber: 847,
                                            columnNumber: 19
                                        }, this)
                                    }, `${logo}-${i}`, false, {
                                        fileName: "[project]/components/listing-card.tsx",
                                        lineNumber: 843,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card.tsx",
                                lineNumber: 841,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card.tsx",
                        lineNumber: 837,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/listing-card.tsx",
                lineNumber: 767,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/listing-card.tsx",
        lineNumber: 737,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/listing-card-compact.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ListingCardCompact",
    ()=>ListingCardCompact
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
/**
 * ListingCardCompact — master compact card for list/grid views.
 *
 * Small horizontal layout used in "Recently Viewed", "Newest Additions",
 * "Most Popular" sections on the homepage and elsewhere:
 *
 *   [ 100px thumb ]  Title
 *                    Short description (2 lines max)
 *                    Budget · Duration
 *
 * Both the thumbnail and the title link to the project/service details
 * page, computed from `kind + id + slug` via listing-urls helpers. The
 * thumbnail zooms on hover to match the behavior of the larger
 * ListingCard for visual consistency.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-image.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/listing-urls.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
function ListingCardCompact({ kind, id, slug, title, description, mediaUrl, budget, duration, href }) {
    const computedHref = href ?? (kind === "service" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serviceDetailsUrl"])(slug ?? id, slug ? id : undefined) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["projectDetailsUrl"])(slug ?? id, slug ? id : undefined));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
        className: "flex items-start gap-x-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                href: computedHref,
                className: "relative size-[100px] overflow-hidden rounded-lg shrink-0 block focus-visible:outline-none group/thumb",
                "aria-label": title,
                children: mediaUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    className: "object-cover group-hover/thumb:scale-150 transition [transition-duration:3000ms]",
                    src: mediaUrl,
                    alt: title,
                    sizes: "25vw",
                    fill: true
                }, void 0, false, {
                    fileName: "[project]/components/listing-card-compact.tsx",
                    lineNumber: 63,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-0 flex items-center justify-center bg-gray-50",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Briefcase"], {
                        className: "size-6 text-gray-300"
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card-compact.tsx",
                        lineNumber: 72,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/listing-card-compact.tsx",
                    lineNumber: 71,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/listing-card-compact.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "pr-[45.54px] min-w-0",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: computedHref,
                        className: "focus-visible:outline-none block",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "cursor-pointer hover:underline transition duration-300 text-base font-bold leading-tight line-clamp-2 text-dark-blue-400",
                            children: title
                        }, void 0, false, {
                            fileName: "[project]/components/listing-card-compact.tsx",
                            lineNumber: 82,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card-compact.tsx",
                        lineNumber: 78,
                        columnNumber: 9
                    }, this),
                    description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-2 text-sm font-light text-dark-blue-400 line-clamp-2",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/components/listing-card-compact.tsx",
                        lineNumber: 88,
                        columnNumber: 11
                    }, this),
                    (budget || duration) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-3 flex items-center gap-x-3",
                        children: [
                            budget && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium leading-none text-dark-blue-400",
                                children: budget
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card-compact.tsx",
                                lineNumber: 96,
                                columnNumber: 15
                            }, this),
                            budget && duration && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-block shrink-0 rounded-full size-1 bg-gray-300"
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card-compact.tsx",
                                lineNumber: 101,
                                columnNumber: 15
                            }, this),
                            duration && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium leading-none text-dark-blue-400",
                                children: duration
                            }, void 0, false, {
                                fileName: "[project]/components/listing-card-compact.tsx",
                                lineNumber: 104,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/listing-card-compact.tsx",
                        lineNumber: 94,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/listing-card-compact.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/listing-card-compact.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/swiper.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SwiperContent",
    ()=>SwiperContent,
    "SwiperFadeContainer",
    ()=>SwiperFadeContainer,
    "SwiperNextTrigger",
    ()=>SwiperNextTrigger,
    "SwiperPrevTrigger",
    ()=>SwiperPrevTrigger,
    "SwiperRoot",
    ()=>SwiperRoot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/react-utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/swiper/modules/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$navigation$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__ = __turbopack_context__.i("[project]/node_modules/swiper/modules/navigation.mjs [app-ssr] (ecmascript) <export default as Navigation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$free$2d$mode$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FreeMode$3e$__ = __turbopack_context__.i("[project]/node_modules/swiper/modules/free-mode.mjs [app-ssr] (ecmascript) <export default as FreeMode>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$mousewheel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mousewheel$3e$__ = __turbopack_context__.i("[project]/node_modules/swiper/modules/mousewheel.mjs [app-ssr] (ecmascript) <export default as Mousewheel>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$swiper$2d$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/swiper/swiper-react.mjs [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
const [SwiperRootProvider, useSwiperRootContext] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$react$2d$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    displayName: "SwiperRootContext",
    errorMessage: `useSwiperRootContext returned is 'undefined'. Seems you forgot to wrap the components in "<SwiperRoot />"`
});
const SwiperRoot = ({ children, className })=>{
    const [state, setState] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](null);
    const [isBeginning, setIsBeginning] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](true);
    const [isEnd, setIsEnd] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"](false);
    const onSwiperChange = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((swiper)=>{
        setState(swiper);
        setIsBeginning(swiper.isBeginning);
        setIsEnd(swiper.isEnd);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SwiperRootProvider, {
        value: {
            swiper: state,
            onSwiperChange,
            isBeginning,
            isEnd
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: `group/carousel ${className || ""}`,
            children: children
        }, void 0, false, {
            fileName: "[project]/components/swiper.tsx",
            lineNumber: 34,
            columnNumber: 7
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false, {
        fileName: "[project]/components/swiper.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const SwiperContent = (props)=>{
    const { onSwiperChange, ...ctx } = useSwiperRootContext();
    const updateEdgeState = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"]((swiper)=>{
        // Parent context tracks edge state for fade masks
        onSwiperChange(swiper);
    }, [
        onSwiperChange
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$swiper$2d$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Swiper"], {
        modules: [
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$navigation$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Navigation$3e$__["Navigation"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$free$2d$mode$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__FreeMode$3e$__["FreeMode"],
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$modules$2f$mousewheel$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mousewheel$3e$__["Mousewheel"]
        ],
        freeMode: {
            enabled: true,
            momentum: true,
            momentumRatio: 0.6,
            sticky: true
        },
        mousewheel: {
            forceToAxis: true
        },
        grabCursor: false,
        simulateTouch: false,
        ...props,
        onSwiper: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onSwiper, updateEdgeState),
        onSlideChange: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onSlideChange, updateEdgeState),
        onProgress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onProgress, updateEdgeState),
        onReachBeginning: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onReachBeginning, updateEdgeState),
        onReachEnd: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onReachEnd, updateEdgeState),
        onTouchEnd: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onTouchEnd, updateEdgeState),
        onTransitionEnd: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onTransitionEnd, updateEdgeState),
        onScroll: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["callAll"])(props.onScroll, updateEdgeState)
    }, void 0, false, {
        fileName: "[project]/components/swiper.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
const SwiperFadeContainer = ({ children })=>{
    const { isBeginning, isEnd } = useSwiperRootContext();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            !isEnd && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-white to-transparent"
            }, void 0, false, {
                fileName: "[project]/components/swiper.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            !isBeginning && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-white to-transparent"
            }, void 0, false, {
                fileName: "[project]/components/swiper.tsx",
                lineNumber: 80,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/components/swiper.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
function getVisibleSlideCount(swiper) {
    const containerWidth = swiper.width;
    const slideWidth = swiper.slides[0]?.offsetWidth || 355;
    return Math.max(1, Math.floor(containerWidth / slideWidth));
}
function SwiperNextTrigger({ asChild = false, ...props }) {
    const { swiper, isEnd } = useSwiperRootContext();
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-state": !isEnd ? "active" : "inactive",
        ...props,
        onClick: ()=>{
            if (!swiper) return;
            const jump = getVisibleSlideCount(swiper);
            const target = Math.min(swiper.slides.length - 1, swiper.activeIndex + jump);
            swiper.slideTo(target, 300);
        }
    }, void 0, false, {
        fileName: "[project]/components/swiper.tsx",
        lineNumber: 101,
        columnNumber: 5
    }, this);
}
function SwiperPrevTrigger({ asChild = false, ...props }) {
    const { swiper, isBeginning } = useSwiperRootContext();
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-state": !isBeginning ? "active" : "inactive",
        ...props,
        onClick: ()=>{
            if (!swiper) return;
            const jump = getVisibleSlideCount(swiper);
            const target = Math.max(0, swiper.activeIndex - jump);
            swiper.slideTo(target, 300);
        }
    }, void 0, false, {
        fileName: "[project]/components/swiper.tsx",
        lineNumber: 122,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/(group)/(group)/homepage-client.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HomepageClient",
    ()=>HomepageClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/node_modules/styled-jsx/style.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/lib/listing-urls.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$swiper$2d$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/swiper/swiper-react.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$blocks$2d$1$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/blocks-1.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/listing-card.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2d$compact$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/listing-card-compact.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$marketplace$2d$footer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/marketplace-footer.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-image.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$swiper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/swiper.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/favorite/favorite.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tabs/tabs.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/tooltip/tooltip.tsx [app-ssr] (ecmascript)");
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
// ── Hero ────────────────────────────────────────────────────────────────────
// Multi-slide rotating hero with cross-fade, Ken Burns zoom, staggered text
// reveal, and a bottom-left navigator with filling progress bars. Falls back
// to legacy single-slide fields when `hero.slides` is not provided.
function Hero({ hero }) {
    // Resolve slides — prefer the new `slides` array; otherwise wrap legacy fields.
    const slides = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>{
        if (hero.slides && hero.slides.length > 0) return hero.slides;
        if (hero.headline) {
            return [
                {
                    eyebrow: "Featured",
                    title: hero.headline,
                    description: hero.subheadline ?? "",
                    ctaLabel: hero.ctaLabel ?? "Browse Projects",
                    ctaUrl: hero.ctaUrl ?? "/c/development",
                    image: hero.backgroundImage ?? "/sending-emails.png"
                }
            ];
        }
        return [];
    }, [
        hero
    ]);
    const intervalMs = hero.intervalMs ?? 7000;
    const [active, setActive] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(0);
    const [paused, setPaused] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    // Incrementing key forces the content stagger animation to replay whenever
    // the active slide changes (including on manual clicks).
    const [tick, setTick] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(0);
    const timerRef = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useRef(null);
    const goTo = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useCallback((index)=>{
        if (slides.length === 0) return;
        setActive((prev)=>{
            const next = (index + slides.length) % slides.length;
            if (next !== prev) setTick((t)=>t + 1);
            return next;
        });
    }, [
        slides.length
    ]);
    // Auto-advance with pause-on-hover. Re-schedules on every slide change so
    // manual navigation resets the timer (feels less janky than a fixed tick).
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useEffect(()=>{
        if (paused || slides.length <= 1) return;
        timerRef.current = setTimeout(()=>{
            setActive((prev)=>(prev + 1) % slides.length);
            setTick((t)=>t + 1);
        }, intervalMs);
        return ()=>{
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [
        active,
        paused,
        slides.length,
        intervalMs
    ]);
    if (slides.length === 0) return null;
    const current = slides[active];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        onMouseEnter: ()=>setPaused(true),
        onMouseLeave: ()=>setPaused(false),
        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
            [
                "ac080d467fe26139",
                [
                    intervalMs + 1500
                ]
            ]
        ]) + " " + "group/hero relative rounded-lg overflow-hidden h-[350px] isolate",
        children: [
            slides.map((slide, i)=>{
                const isActive = i === active;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        transitionDuration: "1200ms"
                    },
                    "aria-hidden": !isActive,
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                        [
                            "ac080d467fe26139",
                            [
                                intervalMs + 1500
                            ]
                        ]
                    ]) + " " + ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute inset-0 transition-opacity ease-out", isActive ? "opacity-100" : "opacity-0") || ""),
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "ac080d467fe26139",
                                    [
                                        intervalMs + 1500
                                    ]
                                ]
                            ]) + " " + ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute inset-0 will-change-transform", isActive && "hero-kenburns") || ""),
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                className: "object-cover",
                                src: slide.image,
                                alt: slide.title,
                                fill: true,
                                sizes: "100vw",
                                priority: i === 0
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 140,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 134,
                            columnNumber: 13
                        }, this),
                        slide.accent && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "ac080d467fe26139",
                                    [
                                        intervalMs + 1500
                                    ]
                                ]
                            ]) + " " + ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute inset-0 bg-gradient-to-br mix-blend-multiply", slide.accent) || "")
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 150,
                            columnNumber: 15
                        }, this)
                    ]
                }, `${slide.image}-${i}`, true, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 125,
                    columnNumber: 11
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                    [
                        "ac080d467fe26139",
                        [
                            intervalMs + 1500
                        ]
                    ]
                ]) + " " + "absolute inset-0 bg-[linear-gradient(100deg,rgba(11,28,58,0.35)_0%,rgba(11,28,58,0.55)_45%,rgba(11,28,58,0.78)_100%)]"
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 164,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                    [
                        "ac080d467fe26139",
                        [
                            intervalMs + 1500
                        ]
                    ]
                ]) + " " + "absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)_100%)] pointer-events-none"
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 166,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                    [
                        "ac080d467fe26139",
                        [
                            intervalMs + 1500
                        ]
                    ]
                ]) + " " + "absolute inset-0 flex",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                        [
                            "ac080d467fe26139",
                            [
                                intervalMs + 1500
                            ]
                        ]
                    ]) + " " + "ml-auto p-[75px] max-w-[643px] flex flex-col justify-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "ac080d467fe26139",
                                    [
                                        intervalMs + 1500
                                    ]
                                ]
                            ]) + " " + "hero-reveal hero-reveal-eyebrow inline-flex items-center gap-x-2 text-[11px] leading-none font-semibold uppercase tracking-[0.18em] text-white/80",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                        [
                                            "ac080d467fe26139",
                                            [
                                                intervalMs + 1500
                                            ]
                                        ]
                                    ]) + " " + "inline-block h-px w-6 bg-white/60"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 176,
                                    columnNumber: 13
                                }, this),
                                current.eyebrow
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 175,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "ac080d467fe26139",
                                    [
                                        intervalMs + 1500
                                    ]
                                ]
                            ]) + " " + "hero-reveal hero-reveal-title text-[36px] leading-[43.57px] font-bold text-white mt-3",
                            children: current.title
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 179,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                [
                                    "ac080d467fe26139",
                                    [
                                        intervalMs + 1500
                                    ]
                                ]
                            ]) + " " + "hero-reveal hero-reveal-desc text-lg leading-[21.78px] mt-[7px] text-white/90 font-light",
                            children: current.description
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 182,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                            href: current.ctaUrl,
                            className: "hero-reveal hero-reveal-cta group/cta self-start focus-visible:outline-none whitespace-nowrap shrink-0 mt-[38px] border-2 h-10 border-white px-4 rounded-[5px] inline-flex items-center justify-center gap-x-2 text-[13px] leading-6 font-semibold text-white backdrop-blur-[2px] hover:bg-white hover:text-dark-blue-400 transition-colors duration-300",
                            children: [
                                current.ctaLabel,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronRight"], {
                                    className: "size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 190,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 185,
                            columnNumber: 11
                        }, this)
                    ]
                }, tick, true, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 171,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 170,
                columnNumber: 7
            }, this),
            slides.length > 1 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                    [
                        "ac080d467fe26139",
                        [
                            intervalMs + 1500
                        ]
                    ]
                ]) + " " + "absolute left-[50px] bottom-[38px] flex flex-col gap-y-4 text-white select-none",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "ac080d467fe26139",
                                [
                                    intervalMs + 1500
                                ]
                            ]
                        ]) + " " + "flex items-end gap-x-2 leading-none tabular-nums",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                    [
                                        "ac080d467fe26139",
                                        [
                                            intervalMs + 1500
                                        ]
                                    ]
                                ]) + " " + "hero-reveal hero-reveal-num text-[44px] font-bold tracking-tight",
                                children: String(active + 1).padStart(2, "0")
                            }, `num-${active}`, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 199,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                    [
                                        "ac080d467fe26139",
                                        [
                                            intervalMs + 1500
                                        ]
                                    ]
                                ]) + " " + "text-[15px] font-light text-white/60 pb-1.5",
                                children: [
                                    "/ ",
                                    String(slides.length).padStart(2, "0")
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 205,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "ac080d467fe26139",
                                [
                                    intervalMs + 1500
                                ]
                            ]
                        ]) + " " + "flex items-center gap-x-2",
                        children: slides.map((slide, i)=>{
                            const isActive = i === active;
                            const isPast = i < active;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                "aria-label": `Go to slide ${i + 1}: ${slide.title}`,
                                onClick: ()=>goTo(i),
                                className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                    [
                                        "ac080d467fe26139",
                                        [
                                            intervalMs + 1500
                                        ]
                                    ]
                                ]) + " " + "group/dot relative h-[3px] w-10 overflow-hidden rounded-full bg-white/25 hover:bg-white/40 transition-colors",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    style: isActive && !paused ? {
                                        animationDuration: `${intervalMs}ms`
                                    } : undefined,
                                    className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                                        [
                                            "ac080d467fe26139",
                                            [
                                                intervalMs + 1500
                                            ]
                                        ]
                                    ]) + " " + ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("absolute inset-y-0 left-0 bg-white rounded-full", isActive && !paused && "hero-progress", isActive && paused && "w-full", isPast && "w-full", !isActive && !isPast && "w-0") || "")
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 222,
                                    columnNumber: 19
                                }, this)
                            }, `${slide.image}-bar-${i}`, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 215,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 210,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].dynamic([
                            [
                                "ac080d467fe26139",
                                [
                                    intervalMs + 1500
                                ]
                            ]
                        ]) + " " + "hero-reveal hero-reveal-label text-[11px] font-medium uppercase tracking-[0.14em] text-white/70",
                        children: [
                            current.eyebrow,
                            " · Featured"
                        ]
                    }, `label-${active}`, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 241,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 197,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f$styled$2d$jsx$2f$style$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                id: "ac080d467fe26139",
                dynamic: [
                    intervalMs + 1500
                ],
                children: `@keyframes hero-kenburns{0%{transform:scale(1)translate(0)}to{transform:scale(1.08)translate(-1%,-1%)}}.hero-kenburns{animation:cubic-bezier(.22,.61,.36,1) forwards hero-kenburns;animation-timeline:${intervalMs + 1500}ms}@keyframes hero-reveal-up{0%{opacity:0;filter:blur(4px);transform:translateY(14px)}to{opacity:1;filter:blur();transform:translate(0)}}.hero-reveal{animation:.9s cubic-bezier(.22,.61,.36,1) both hero-reveal-up}.hero-reveal-eyebrow{animation-delay:80ms}.hero-reveal-title{animation-delay:.16s}.hero-reveal-desc{animation-delay:.26s}.hero-reveal-cta{animation-delay:.38s}.hero-reveal-num{animation-delay:.12s}.hero-reveal-label{animation-delay:.3s}@keyframes hero-progress{0%{width:0%}to{width:100%}}.hero-progress{animation:linear forwards hero-progress}@media (prefers-reduced-motion:reduce){.hero-kenburns,.hero-reveal,.hero-progress{animation:none!important}}`
            }, void 0, false, void 0, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
// ── Banner ───────────────────────────────────────────────────────────────────
function Banner({ banner }) {
    const [dismissed, setDismissed] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useState(false);
    if (!banner.enabled || dismissed) return null;
    if (banner.expiresAt) {
        const expiry = new Date(banner.expiresAt);
        if (!isNaN(expiry.getTime()) && expiry < new Date()) return null;
    }
    const colors = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        promo: "bg-primary-50 border-primary-200 text-primary-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800"
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("rounded-lg border px-4 py-3 flex items-center gap-x-3", colors[banner.bannerType]),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AlertCircle"], {
                className: "size-5 shrink-0"
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 347,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "text-sm font-medium flex-auto",
                children: banner.message
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 348,
                columnNumber: 7
            }, this),
            banner.ctaLabel && banner.ctaUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                href: banner.ctaUrl,
                className: "text-sm font-semibold underline shrink-0",
                children: banner.ctaLabel
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 350,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setDismissed(true),
                className: "shrink-0 p-1 rounded hover:bg-black/5",
                "aria-label": "Dismiss banner",
                type: "button",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["X"], {
                    className: "size-4"
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 363,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 357,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 341,
        columnNumber: 5
    }, this);
}
// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, ctaLabel, ctaUrl, rightSlot }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-start justify-between gap-x-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "text-[28px] leading-none font-bold text-dark-blue-400",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 387,
                        columnNumber: 9
                    }, this),
                    subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]",
                        children: subtitle
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 391,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 386,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-x-3",
                children: [
                    ctaLabel && ctaUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: ctaUrl,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            className: "underline",
                            variant: "link",
                            visual: "gray",
                            children: [
                                ctaLabel,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                    className: "size-[15px]"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 401,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 399,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 398,
                        columnNumber: 11
                    }, this),
                    rightSlot
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 396,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 385,
        columnNumber: 5
    }, this);
}
// ── Favorite button helper ──────────────────────────────────────────────────
function FavoriteButton() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FavoriteRoot"], {
        children: ({ pressed })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipProvider"], {
                delayDuration: 75,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                            asChild: true,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-block",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$favorite$2f$favorite$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Favorite"], {}, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 421,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 420,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 419,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tooltip$2f$tooltip$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TooltipContent"], {
                            children: pressed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "inline-flex items-center gap-x-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Check"], {
                                        className: "size-[15px] shrink-0 text-green-500"
                                    }, void 0, false, {
                                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                        lineNumber: 427,
                                        columnNumber: 19
                                    }, this),
                                    "Saved"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 426,
                                columnNumber: 17
                            }, this) : "Save to favorites"
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 424,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 418,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 417,
                columnNumber: 9
            }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 415,
        columnNumber: 5
    }, this);
}
// ── Format helpers ──────────────────────────────────────────────────────────
function formatBudget(budget) {
    if (budget == null) return "Budget TBD";
    return `Starting at $${budget.toLocaleString()}`;
}
function formatDuration(duration) {
    if (!duration) return "";
    return `Starting from ${duration}`;
}
function formatPrice(min, max) {
    if (min == null && max == null) return "Contact for pricing";
    if (min != null && max != null) return `$${min.toLocaleString()} – $${max.toLocaleString()}/mo`;
    const price = min ?? max;
    if (price == null) return "Contact for pricing";
    return `$${price.toLocaleString()}/mo`;
}
// ── Card renderers ──────────────────────────────────────────────────────────
// Fallback avatar group — matches the static page's visual: 6 stacked
// placeholder avatars so the ListingCard always renders an AvatarGroup.
// When the backend starts populating `item.collaborators`, the real values
// take precedence.
const FALLBACK_COLLABORATORS = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["fromLength"])(6).map(()=>"/woman.jpg");
function renderProjectCarousel(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCard"], {
        kind: "project",
        id: item.id,
        href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["projectDetailsUrl"])(item.slug ?? item.id, item.slug ? item.id : undefined),
        title: item.title,
        description: item.shortDescription ?? item.description,
        mediaUrl: item.thumbnail ?? undefined,
        budget: formatBudget(item.budget),
        duration: formatDuration(item.duration),
        rating: item.rating ?? 4.9,
        reviewCount: item.reviewCount ?? 5,
        collaborators: item.collaborators && item.collaborators.length > 0 ? item.collaborators : FALLBACK_COLLABORATORS,
        favoriteSlot: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FavoriteButton, {}, void 0, false, {
            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
            lineNumber: 491,
            columnNumber: 21
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 472,
        columnNumber: 5
    }, this);
}
function renderServiceCarousel(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCard"], {
        kind: "service",
        id: item.id,
        href: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$listing$2d$urls$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serviceDetailsUrl"])(item.slug ?? item.id, item.slug ? item.id : undefined),
        title: item.title,
        description: item.shortDescription ?? item.description,
        mediaUrl: item.thumbnail ?? undefined,
        budget: formatPrice(item.priceMin, item.priceMax),
        duration: item.deliveryTime ? `Delivery: ${item.deliveryTime}` : undefined,
        rating: item.rating,
        reviewCount: item.reviewCount,
        favoriteSlot: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(FavoriteButton, {}, void 0, false, {
            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
            lineNumber: 514,
            columnNumber: 21
        }, this)
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 498,
        columnNumber: 5
    }, this);
}
function renderTeamCard(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCard"], {
        kind: "team",
        id: item.id,
        name: item.name,
        tagline: item.specializations?.join(" · "),
        rating: item.rating,
        projectCount: item.completedProjects,
        memberAvatars: item.logo ? [
            item.logo
        ] : undefined
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 521,
        columnNumber: 5
    }, this);
}
function renderTalentCard(item) {
    const name = [
        item.firstName,
        item.lastName
    ].filter(Boolean).join(" ") || item.username;
    const rate = item.rateMin != null ? `$${item.rateMin}/hr` : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCard"], {
        kind: "talent",
        id: item.id,
        username: item.username,
        name: name,
        role: item.title ?? undefined,
        photo: item.avatarUrl ?? undefined,
        rate: rate,
        skills: item.skills,
        country: item.location ?? undefined
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 538,
        columnNumber: 5
    }, this);
}
// Grid sections (Newest Additions, Most Popular) use the compact horizontal
// card — matches the static page's RecentlyViewedSection which deliberately
// uses ListingCardCompact (image-left, title+description+budget+duration on
// the right, no rating/team/favorite). Only carousel sections get the full
// vertical ListingCard.
function renderProjectGrid(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2d$compact$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCardCompact"], {
        kind: "project",
        id: item.id,
        slug: item.slug ?? undefined,
        title: item.title,
        description: item.shortDescription ?? item.description,
        mediaUrl: item.thumbnail ?? undefined,
        budget: formatBudget(item.budget),
        duration: item.duration ?? undefined
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 559,
        columnNumber: 5
    }, this);
}
function renderServiceGrid(item) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$listing$2d$card$2d$compact$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ListingCardCompact"], {
        kind: "service",
        id: item.id,
        slug: item.slug ?? undefined,
        title: item.title,
        description: item.shortDescription ?? item.description,
        mediaUrl: item.thumbnail ?? undefined,
        budget: formatPrice(item.priceMin, item.priceMax),
        duration: item.deliveryTime ?? undefined
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 574,
        columnNumber: 5
    }, this);
}
// ── Block renderer ──────────────────────────────────────────────────────────
function renderBlockItem(block, item, layout) {
    if (block.entity === "projects") {
        return layout === "carousel" ? renderProjectCarousel(item) : renderProjectGrid(item);
    }
    if (block.entity === "services") {
        return layout === "carousel" ? renderServiceCarousel(item) : renderServiceGrid(item);
    }
    if (block.entity === "teams") return renderTeamCard(item);
    if (block.entity === "talent") return renderTalentCard(item);
    return null;
}
/** Shared icon-button styling for the in-header swiper nav. */ const NAV_BUTTON_CLASS = "rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400";
function CarouselNavButtons() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-x-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$swiper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SwiperPrevTrigger"], {
                asChild: true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                    className: NAV_BUTTON_CLASS,
                    visual: "gray",
                    variant: "outlined",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronLeft"], {
                        className: "size-[18px]"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 622,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 617,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 616,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$swiper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SwiperNextTrigger"], {
                asChild: true,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["IconButton"], {
                    className: NAV_BUTTON_CLASS,
                    visual: "gray",
                    variant: "outlined",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ChevronRight"], {
                        className: "size-[18px]"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 631,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 626,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 625,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 615,
        columnNumber: 5
    }, this);
}
/** Carousel section: title + nav buttons in the same header row. */ function CarouselSectionView({ section, block }) {
    if (block.items.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$swiper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SwiperRoot"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SectionHeader, {
                title: section.title,
                subtitle: section.subtitle,
                ctaLabel: section.ctaLabel,
                ctaUrl: section.ctaUrl,
                rightSlot: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CarouselNavButtons, {}, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 655,
                    columnNumber: 20
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 650,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-6",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$swiper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SwiperContent"], {
                    slidesPerView: "auto",
                    spaceBetween: 20,
                    children: block.items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$swiper$2f$swiper$2d$react$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SwiperSlide"], {
                            className: "w-[355px]",
                            children: renderBlockItem(block, item, "carousel")
                        }, `${block.entity}-${item.id}`, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 660,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 658,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 657,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 649,
        columnNumber: 5
    }, this);
}
function GridBlockBody({ block }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[42px] gap-y-10",
        children: block.items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: renderBlockItem(block, item, "grid")
            }, `${block.entity}-${item.id}`, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 677,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 675,
        columnNumber: 5
    }, this);
}
/** Tabbed section view — pill tabs across the top, each tab swaps the block. */ function TabbedSectionView({ section }) {
    // Group blocks by tabSlug so we render one TabsContent per tab.
    const tabBlocks = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].useMemo(()=>{
        const map = new Map();
        for (const block of section.blocks){
            if (!block.tabSlug) continue;
            const existing = map.get(block.tabSlug);
            if (existing) {
                existing.blocks.push(block);
            } else {
                map.set(block.tabSlug, {
                    label: block.tabLabel ?? block.tabSlug,
                    blocks: [
                        block
                    ]
                });
            }
        }
        return Array.from(map.entries()).map(([slug, v])=>({
                slug,
                ...v
            }));
    }, [
        section.blocks
    ]);
    if (tabBlocks.length === 0) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-end justify-between gap-x-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600",
                                children: section.title
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 711,
                                columnNumber: 11
                            }, this),
                            section.subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]",
                                children: section.subtitle
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 715,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 710,
                        columnNumber: 9
                    }, this),
                    section.ctaLabel && (section.ctaUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: section.ctaUrl,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            className: "underline",
                            variant: "link",
                            visual: "gray",
                            children: [
                                section.ctaLabel,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                    className: "size-[15px]"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 725,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 723,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 722,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        className: "underline",
                        variant: "link",
                        visual: "gray",
                        children: [
                            section.ctaLabel,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                className: "size-[15px]"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 731,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 729,
                        columnNumber: 13
                    }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 709,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tabs"], {
                className: "mt-[29px]",
                defaultValue: tabBlocks[0].slug,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsList"], {
                        className: "px-0 w-full justify-start gap-x-3 border-b-0",
                        children: tabBlocks.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsTrigger"], {
                                value: t.slug,
                                showUnderline: false,
                                variant: "unstyled",
                                className: "inline-flex items-center justify-center h-8 rounded-full border border-gray-300 bg-white px-3.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-50 focus-visible:outline-none data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400",
                                children: t.label
                            }, t.slug, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 739,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 737,
                        columnNumber: 9
                    }, this),
                    tabBlocks.map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$tabs$2f$tabs$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TabsContent"], {
                            value: t.slug,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-[29px] space-y-10",
                                children: t.blocks.map((block)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GridBlockBody, {
                                        block: block
                                    }, block.key, false, {
                                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                        lineNumber: 754,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 752,
                                columnNumber: 13
                            }, this)
                        }, t.slug, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 751,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 736,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 708,
        columnNumber: 5
    }, this);
}
/** Plain grid section (no tabs). Mirrors the static page's RecentlyViewedSection:
 *  smaller 24px heading with a plain top-right "View All" button, followed by
 *  a 3-col compact-card grid. Spec 05-HP §5 (Newest Additions). */ function GridSectionView({ section }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-start justify-between gap-x-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-[24px] leading-none text-dark-blue-400 font-bold",
                                children: section.title
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 772,
                                columnNumber: 11
                            }, this),
                            section.subtitle && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-base leading-[19.36px] font-light text-gray-500 max-w-[800px]",
                                children: section.subtitle
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 776,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 771,
                        columnNumber: 9
                    }, this),
                    section.ctaLabel && (section.ctaUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: section.ctaUrl,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            className: "underline",
                            variant: "link",
                            visual: "gray",
                            children: [
                                section.ctaLabel,
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                    className: "size-[15px]"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 786,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 784,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 783,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        className: "underline",
                        variant: "link",
                        visual: "gray",
                        children: [
                            section.ctaLabel,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                className: "size-[15px]"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 792,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 790,
                        columnNumber: 13
                    }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 770,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-[29px] space-y-10",
                children: section.blocks.map((block)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GridBlockBody, {
                        block: block
                    }, block.key, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 798,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 796,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 769,
        columnNumber: 5
    }, this);
}
// ── Section renderer ────────────────────────────────────────────────────────
function HomepageSectionRenderer({ section }) {
    // Tabbed section: any block carries a tabSlug
    const isTabbed = section.blocks.some((b)=>b.tabSlug);
    if (isTabbed) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(TabbedSectionView, {
        section: section
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 810,
        columnNumber: 24
    }, this);
    // Carousel section: first block is a carousel
    const firstBlock = section.blocks[0];
    if (firstBlock?.type === "carousel") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CarouselSectionView, {
            section: section,
            block: firstBlock
        }, void 0, false, {
            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
            lineNumber: 815,
            columnNumber: 12
        }, this);
    }
    // Otherwise: plain grid section
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(GridSectionView, {
        section: section
    }, void 0, false, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 819,
        columnNumber: 10
    }, this);
}
// ── More Categories ─────────────────────────────────────────────────────────
// Featured "promo" category blocks — dark image-backed feature cards mixed
// with white spotlight cards. Labels/hrefs come from data.moreCategoriesList.
function CategoryImageFeatureCard({ category }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: `/c/${category.slug}`,
        className: "group flex rounded-lg overflow-hidden relative p-5 lg:px-[50px] lg:py-[55px] bg-white shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])] min-h-[260px] lg:min-h-[340px]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    className: "object-cover transition-transform duration-500 group-hover:scale-105",
                    src: "/working-2.jpeg",
                    alt: category.name,
                    sizes: "50vw",
                    fill: true
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 833,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 832,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-[linear-gradient(180deg,rgba(18,42,75,0.48)_0%,rgba(22,97,246,0.31)_100%),linear-gradient(0deg,rgba(18,42,75,0.71),rgba(18,42,75,0.71))]"
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 841,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative mt-auto flex flex-col gap-y-[31px] items-start lg:flex-row lg:items-end lg:justify-between w-full",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-[22px] leading-none lg:text-[44px] lg:leading-[50px] font-bold text-white max-w-[60%]",
                        children: category.name
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 843,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-white",
                        children: "Browse Projects"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 846,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 842,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 828,
        columnNumber: 5
    }, this);
}
function CategoryBlocksFeatureCard({ category }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: `/c/${category.slug}`,
        className: "group relative overflow-hidden flex xs:max-md:flex-col lg:flex-col rounded-lg p-5 lg:pt-[55px] lg:px-[50px] lg:pb-[7.56px] bg-black shadow-[0px_2px_5px_0px_theme(colors.black/[0.04])] min-h-[260px] lg:min-h-[340px]",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:max-lg:pb-[124px] flex md:flex-col md:max-lg:gap-y-[31px] lg:flex-row items-center md:items-start xs:max-md:justify-between lg:justify-between w-full",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-[22px] leading-none lg:text-[44px] lg:leading-[50px] font-bold text-white max-w-[70%]",
                        children: category.name
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 861,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "whitespace-nowrap shrink-0 border-2 h-10 border-white px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-white",
                        children: "Browse Projects"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 864,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 860,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "md:-bottom-[92.44px] xs:max-md:flex xs:max-md:justify-end xs:max-md:mt-[75px] md:-right-8 md:max-lg:absolute lg:mr-[76.8px] self-end pointer-events-none",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$blocks$2d$1$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Blocks1"], {}, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 869,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 868,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 856,
        columnNumber: 5
    }, this);
}
function CategorySpotlightCard({ category, className }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: `/c/${category.slug}`,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("group relative rounded-lg p-5 lg:p-[30px] overflow-hidden flex items-center bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] border border-[#122A4B]/[.15] min-h-[140px] hover:shadow-md transition-shadow", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-5 flex-auto",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-lg leading-[21.78px] lg:text-[28px] lg:leading-[34px] font-bold text-dark-blue-600",
                        children: category.name
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 891,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "whitespace-nowrap shrink-0 border-2 h-10 border-primary-500 px-3.5 rounded-[5px] inline-flex items-center justify-center text-[13px] leading-6 font-semibold text-primary-500",
                        children: "Browse Projects"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 894,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 890,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative shrink-0 xs:max-md:absolute xs:max-md:top-5 xs:max-md:right-[-115.26px]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$image$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    className: "object-contain mx-auto",
                    src: "/cpu-1.png",
                    alt: category.name,
                    sizes: "25vw",
                    width: 206.15,
                    height: 150
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 899,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 898,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 883,
        columnNumber: 5
    }, this);
}
function MoreCategories({ categories }) {
    if (categories.length === 0) return null;
    // Layout has 6 slots in a two-column featured grid. If fewer than 6
    // categories are provided, cycle through what we have so each visible
    // slot still maps back to a real category (instead of repeating only
    // the first one, which would produce 5 identical links).
    const cats = Array.from({
        length: 6
    }, (_, i)=>categories[i % categories.length]);
    const [imageFeature, spotlightA, spotlightB, spotlightC, spotlightD, blocksFeature] = cats;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-end justify-between",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                className: "text-2xl leading-[29.05px] lg:text-4xl lg:leading-[43.57px] font-bold text-dark-blue-600",
                                children: "More Categories"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 937,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-lg leading-[21.78px] font-light text-gray-500",
                                children: "Find more ways to maximize your results with Marketeq's curated project teams"
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 940,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 936,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        href: "/categories",
                        className: "xs:max-lg:hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            className: "underline",
                            visual: "gray",
                            variant: "link",
                            children: [
                                "View All Categories",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                    className: "size-[15px]"
                                }, void 0, false, {
                                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                    lineNumber: 948,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 946,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 945,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 935,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mt-8 lg:mt-[42px] grid md:grid-cols-2 gap-3 lg:gap-x-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "contents md:grid gap-y-3 lg:gap-y-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategoryImageFeatureCard, {
                                category: imageFeature
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 955,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategorySpotlightCard, {
                                category: spotlightA
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 956,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategorySpotlightCard, {
                                category: spotlightB
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 957,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 954,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "contents md:grid gap-y-3 lg:gap-y-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategorySpotlightCard, {
                                category: spotlightC
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 960,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategorySpotlightCard, {
                                category: spotlightD
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 961,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(CategoryBlocksFeatureCard, {
                                category: blocksFeature
                            }, void 0, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 962,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 959,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 953,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center mt-[29px] justify-center lg:hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    href: "/categories",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                        visual: "gray",
                        variant: "ghost",
                        children: "View More"
                    }, void 0, false, {
                        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                        lineNumber: 968,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 967,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 966,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 934,
        columnNumber: 5
    }, this);
}
function HomepageClient({ data }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex flex-col bg-gray-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "py-[50px] flex-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "max-w-[1440px] mx-auto px-[50px] space-y-[50px]",
                    children: [
                        data.banner && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Banner, {
                            banner: data.banner
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 988,
                            columnNumber: 27
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Hero, {
                            hero: data.hero
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 989,
                            columnNumber: 11
                        }, this),
                        data.sections.map((section)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(HomepageSectionRenderer, {
                                section: section
                            }, section.key, false, {
                                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                                lineNumber: 994,
                                columnNumber: 13
                            }, this)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(MoreCategories, {
                            categories: data.moreCategoriesList
                        }, void 0, false, {
                            fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                            lineNumber: 996,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                    lineNumber: 987,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 986,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$marketplace$2d$footer$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["MarketplaceFooter"], {
                columns: data.footerNav,
                talentCta: data.talentNetworkCta
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
                lineNumber: 1000,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(group)/(group)/homepage-client.tsx",
        lineNumber: 985,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=_0plsc1-._.js.map