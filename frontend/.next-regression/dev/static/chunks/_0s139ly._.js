(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/marketplace-footer.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketplaceFooter",
    ()=>MarketplaceFooter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$social$2d$solid$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/social-solid.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/icons/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$linkedin$2d$solid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/linkedin-solid.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2d$3$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/icons/logo-3.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/next-link.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const DEFAULT_MARKETPLACE_FOOTER_DATA = {
    footerNav: [
        {
            heading: "About",
            links: [
                {
                    label: "Why Marketeq?",
                    url: "/about"
                },
                {
                    label: "Careers",
                    url: "/careers"
                },
                {
                    label: "Partnerships",
                    url: "/partnerships"
                },
                {
                    label: "Support",
                    url: "/support"
                },
                {
                    label: "Core Values",
                    url: "/about#values"
                },
                {
                    label: "Events",
                    url: "/events"
                }
            ]
        },
        {
            heading: "Solutions",
            links: [
                {
                    label: "User Experience (UX)",
                    url: "/c/design/ui-ux-design"
                },
                {
                    label: "Interactive Prototyping",
                    url: "/c/design/prototyping"
                },
                {
                    label: "Mobile Development",
                    url: "/c/development/mobile"
                },
                {
                    label: "Software Engineering",
                    url: "/c/development"
                },
                {
                    label: "Digital Marketing",
                    url: "/c/marketing/digital-marketing"
                },
                {
                    label: "Growth Strategy",
                    url: "/c/marketing/growth"
                },
                {
                    label: "Q/A Testing",
                    url: "/c/development/qa-testing"
                }
            ]
        },
        {
            heading: "Industries",
            links: [
                {
                    label: "Logistics",
                    url: "/industries/logistics"
                },
                {
                    label: "Retail",
                    url: "/industries/retail"
                },
                {
                    label: "Government",
                    url: "/industries/government"
                },
                {
                    label: "Enterprise",
                    url: "/industries/enterprise"
                },
                {
                    label: "Fintech",
                    url: "/industries/fintech"
                },
                {
                    label: "Medical",
                    url: "/industries/medical"
                },
                {
                    label: "Marketing",
                    url: "/industries/marketing"
                }
            ]
        },
        {
            heading: "Resources",
            links: [
                {
                    label: "Help Center",
                    url: "/help"
                },
                {
                    label: "Video Library",
                    url: "/resources/videos"
                },
                {
                    label: "Articles",
                    url: "/blog"
                },
                {
                    label: "Inspiration",
                    url: "/resources/inspiration"
                },
                {
                    label: "Project Templates",
                    url: "/resources/templates"
                },
                {
                    label: "PartnerUp Offers",
                    url: "/partnerships/offers"
                }
            ]
        }
    ],
    talentNetworkCta: {
        headline: "Marketeq Talent Network",
        description: "Want the freedom of working from home without competing with overseas rates? Join our national talent network and get a chance to work on exciting projects from top corporations and disruptive startups.",
        ctaLabel: "Join the talent network",
        ctaUrl: "/sign-up?role=talent"
    }
};
const HOMEPAGE_API_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:4100") || "http://localhost:4000";
let cachedFooterData = null;
let footerDataRequest = null;
async function loadMarketplaceFooterData() {
    if (cachedFooterData) return cachedFooterData;
    if (!footerDataRequest) {
        footerDataRequest = fetch(`${HOMEPAGE_API_BASE}/homepage`).then(async (response)=>{
            if (!response.ok) return null;
            const data = await response.json();
            const footerData = {
                footerNav: Array.isArray(data.footerNav) ? data.footerNav : DEFAULT_MARKETPLACE_FOOTER_DATA.footerNav,
                talentNetworkCta: data.talentNetworkCta && typeof data.talentNetworkCta.headline === "string" ? data.talentNetworkCta : DEFAULT_MARKETPLACE_FOOTER_DATA.talentNetworkCta
            };
            cachedFooterData = footerData;
            return footerData;
        }).catch(()=>null).finally(()=>{
            footerDataRequest = null;
        });
    }
    return footerDataRequest;
}
function MarketplaceFooter({ columns: columnsProp, talentCta: talentCtaProp }) {
    _s();
    const [cmsFooterData, setCmsFooterData] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useState(cachedFooterData);
    const shouldLoadCmsData = columnsProp === undefined || talentCtaProp === undefined;
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "MarketplaceFooter.useEffect": ()=>{
            let isActive = true;
            if (!shouldLoadCmsData) return;
            loadMarketplaceFooterData().then({
                "MarketplaceFooter.useEffect": (data)=>{
                    if (!isActive || !data) return;
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].startTransition({
                        "MarketplaceFooter.useEffect": ()=>{
                            setCmsFooterData(data);
                        }
                    }["MarketplaceFooter.useEffect"]);
                }
            }["MarketplaceFooter.useEffect"]);
            return ({
                "MarketplaceFooter.useEffect": ()=>{
                    isActive = false;
                }
            })["MarketplaceFooter.useEffect"];
        }
    }["MarketplaceFooter.useEffect"], [
        shouldLoadCmsData
    ]);
    const columns = columnsProp ?? cmsFooterData?.footerNav ?? DEFAULT_MARKETPLACE_FOOTER_DATA.footerNav;
    const talentCta = talentCtaProp === undefined ? cmsFooterData?.talentNetworkCta ?? DEFAULT_MARKETPLACE_FOOTER_DATA.talentNetworkCta : talentCtaProp;
    if (columns.length === 0 && !talentCta?.headline) return null;
    const year = new Date().getFullYear();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
        className: "bg-white",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-y border-gray-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: ()=>window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        }),
                    className: "flex w-full items-center justify-center gap-x-2 py-[22px] text-sm font-medium text-dark-blue-400 transition-colors hover:bg-gray-50 focus-visible:outline-none",
                    "aria-label": "Back to top",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ArrowUp"], {
                            className: "size-[15px]"
                        }, void 0, false, {
                            fileName: "[project]/components/marketplace-footer.tsx",
                            lineNumber: 175,
                            columnNumber: 11
                        }, this),
                        "Back to Top"
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/marketplace-footer.tsx",
                    lineNumber: 169,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/marketplace-footer.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto max-w-[1440px] px-[50px] pt-10 lg:pt-[50px]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col gap-y-10 md:gap-y-20 lg:flex-row lg:items-start lg:gap-x-[100px]",
                        children: [
                            columns.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid flex-auto grid-cols-2 items-start gap-y-10 md:flex md:justify-between",
                                children: columns.map((column)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col gap-y-[15px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block text-sm font-medium leading-[16.94px] text-dark-blue-600",
                                                children: column.heading
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 189,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                                className: "space-y-[15px]",
                                                children: column.links.map((link)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            href: link.url,
                                                            className: "text-[13px] font-light leading-[15.73px] text-dark-blue-600 hover:underline focus-visible:outline-none",
                                                            children: link.label
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/marketplace-footer.tsx",
                                                            lineNumber: 196,
                                                            columnNumber: 25
                                                        }, this)
                                                    }, `${column.heading}-${link.label}`, false, {
                                                        fileName: "[project]/components/marketplace-footer.tsx",
                                                        lineNumber: 195,
                                                        columnNumber: 23
                                                    }, this))
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 193,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, column.heading, true, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 185,
                                        columnNumber: 17
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/components/marketplace-footer.tsx",
                                lineNumber: 183,
                                columnNumber: 13
                            }, this),
                            talentCta?.headline && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "w-full max-w-[363px] lg:ml-auto",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-base font-medium leading-[19.36px] text-dark-blue-400",
                                        children: talentCta.headline
                                    }, void 0, false, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 212,
                                        columnNumber: 15
                                    }, this),
                                    talentCta.description && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-3 whitespace-pre-line text-[13px] font-light leading-[15.73px] text-gray-700",
                                        children: talentCta.description
                                    }, void 0, false, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 217,
                                        columnNumber: 17
                                    }, this),
                                    talentCta.ctaLabel && talentCta.ctaUrl && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: talentCta.ctaUrl,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            className: "mt-[30px] border-primary-500 text-primary-500 hover:bg-primary-50",
                                            variant: "outlined",
                                            visual: "gray",
                                            children: [
                                                talentCta.ctaLabel,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ArrowRight"], {
                                                    className: "size-[15px]"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 230,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/marketplace-footer.tsx",
                                            lineNumber: 224,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 223,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/marketplace-footer.tsx",
                                lineNumber: 211,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/marketplace-footer.tsx",
                        lineNumber: 181,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-10 flex flex-col items-center justify-between gap-y-10 border-t border-gray-200 py-10 md:py-5 lg:mt-[50px] lg:flex-row",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-y-5 md:flex-row md:gap-x-[57px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$logo$2d$3$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Logo3"], {
                                        className: "h-[17.62px] w-[120px] shrink-0"
                                    }, void 0, false, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 240,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "inline-block text-[13px] font-light leading-[15.73px] text-dark-blue-600",
                                        children: [
                                            "© 2011 - ",
                                            year,
                                            " Marketeq Digital Inc. All Rights Reserved."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 241,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/marketplace-footer.tsx",
                                lineNumber: 239,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-col items-center gap-10 md:flex-row lg:gap-x-[50px]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/terms",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    className: "text-dark-blue-400",
                                                    variant: "link",
                                                    children: "Terms & Conditions"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 248,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "inline-block h-4 w-px shrink-0 bg-gray-200"
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 254,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/privacy",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                    className: "text-dark-blue-400",
                                                    variant: "link",
                                                    children: "Privacy Policy"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 257,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 256,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 247,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-x-[16.6px]",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "#",
                                                "aria-label": "Facebook",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    className: "size-[30px] rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$social$2d$solid$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FacebookSolid"], {
                                                        className: "size-3.5 text-dark-blue-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/marketplace-footer.tsx",
                                                        lineNumber: 270,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 265,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 264,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "#",
                                                "aria-label": "Twitter",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    className: "size-[30px] rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$social$2d$solid$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TwitterSolid"], {
                                                        className: "size-3.5 text-dark-blue-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/marketplace-footer.tsx",
                                                        lineNumber: 279,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 274,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 273,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "#",
                                                "aria-label": "Instagram",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    className: "size-[30px] rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$social$2d$solid$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InstagramSolid"], {
                                                        className: "size-3.5 text-dark-blue-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/marketplace-footer.tsx",
                                                        lineNumber: 288,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 283,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 282,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$next$2d$link$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "#",
                                                "aria-label": "LinkedIn",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                    variant: "outlined",
                                                    visual: "gray",
                                                    className: "size-[30px] rounded-full",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$icons$2f$linkedin$2d$solid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LinkedinSolid"], {
                                                        className: "size-3.5 text-dark-blue-400"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/marketplace-footer.tsx",
                                                        lineNumber: 297,
                                                        columnNumber: 19
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/components/marketplace-footer.tsx",
                                                    lineNumber: 292,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/marketplace-footer.tsx",
                                                lineNumber: 291,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/marketplace-footer.tsx",
                                        lineNumber: 263,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/marketplace-footer.tsx",
                                lineNumber: 246,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/marketplace-footer.tsx",
                        lineNumber: 238,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/marketplace-footer.tsx",
                lineNumber: 180,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/marketplace-footer.tsx",
        lineNumber: 167,
        columnNumber: 5
    }, this);
}
_s(MarketplaceFooter, "5dvGu3Si0E2jA0xWB/2O8hVjrUE=");
_c = MarketplaceFooter;
var _c;
__turbopack_context__.k.register(_c, "MarketplaceFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/navigation/marketplace-secondary-nav.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarketplaceSecondaryNavShell",
    ()=>MarketplaceSecondaryNavShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/contexts/auth.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/service/http/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropdown-menu/dropdown-menu.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const mobileSecondaryNavItems = [
    {
        label: "Research",
        href: "/c/research"
    },
    {
        label: "Design",
        href: "/c/design"
    },
    {
        label: "Development",
        href: "/c/development"
    },
    {
        label: "Testing",
        href: "/c/testing"
    },
    {
        label: "Security",
        href: "/c/security"
    },
    {
        label: "Maintenance",
        href: "/c/maintenance"
    },
    {
        label: "Digital Marketing",
        href: "/c/digital-marketing"
    }
];
const TeamMemberLink = ()=>{
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [teamCount, setTeamCount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TeamMemberLink.useEffect": ()=>{
            if (!user?.id) return;
            __TURBOPACK__imported__module__$5b$project$5d2f$service$2f$http$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UserAPI"].listUsers(50).then({
                "TeamMemberLink.useEffect": (res)=>{
                    const users = Array.isArray(res?.data) ? res.data : [];
                    setTeamCount(users.length);
                }
            }["TeamMemberLink.useEffect"]).catch({
                "TeamMemberLink.useEffect": ()=>{}
            }["TeamMemberLink.useEffect"]);
        }
    }["TeamMemberLink.useEffect"], [
        user?.id
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
        className: "gap-x-0.5 text-[11px] leading-6 lg:text-[13px] lg:leading-6 text-dark-blue-400",
        variant: "link",
        visual: "gray",
        onClick: ()=>router.push("/my-team"),
        children: [
            teamCount,
            " team member",
            teamCount !== 1 ? "s" : "",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronRight"], {
                className: "size-3 lg:size-3.5"
            }, void 0, false, {
                fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s(TeamMemberLink, "trUHFbm1YOLrR0wMwoIkj1zdeqQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = TeamMemberLink;
function MarketplaceSecondaryNavShell({ children }) {
    _s1();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [showSecondaryNav, setShowSecondaryNav] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const lastScrollY = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    // Keep the homepage-style secondary nav behavior consistent everywhere this
    // shell is used: every route change starts at the top with the nav visible.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MarketplaceSecondaryNavShell.useEffect": ()=>{
            window.scrollTo(0, 0);
            setShowSecondaryNav(true);
            lastScrollY.current = 0;
            const raf = requestAnimationFrame({
                "MarketplaceSecondaryNavShell.useEffect.raf": ()=>window.scrollTo(0, 0)
            }["MarketplaceSecondaryNavShell.useEffect.raf"]);
            return ({
                "MarketplaceSecondaryNavShell.useEffect": ()=>cancelAnimationFrame(raf)
            })["MarketplaceSecondaryNavShell.useEffect"];
        }
    }["MarketplaceSecondaryNavShell.useEffect"], [
        pathname
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MarketplaceSecondaryNavShell.useEffect": ()=>{
            const handleScroll = {
                "MarketplaceSecondaryNavShell.useEffect.handleScroll": ()=>{
                    const currentY = window.scrollY;
                    if (currentY < 10) {
                        setShowSecondaryNav(true);
                    } else if (currentY < lastScrollY.current) {
                        setShowSecondaryNav(true);
                    } else if (currentY > lastScrollY.current) {
                        setShowSecondaryNav(false);
                    }
                    lastScrollY.current = currentY;
                }
            }["MarketplaceSecondaryNavShell.useEffect.handleScroll"];
            window.addEventListener("scroll", handleScroll, {
                passive: true
            });
            return ({
                "MarketplaceSecondaryNavShell.useEffect": ()=>window.removeEventListener("scroll", handleScroll)
            })["MarketplaceSecondaryNavShell.useEffect"];
        }
    }["MarketplaceSecondaryNavShell.useEffect"], []);
    // The primary header reads this attribute to decide when it should carry the
    // shadow itself versus letting the secondary nav own that visual treatment.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "MarketplaceSecondaryNavShell.useEffect": ()=>{
            document.documentElement.dataset.secondaryNav = showSecondaryNav ? "visible" : "hidden";
            return ({
                "MarketplaceSecondaryNavShell.useEffect": ()=>{
                    delete document.documentElement.dataset.secondaryNav;
                }
            })["MarketplaceSecondaryNavShell.useEffect"];
        }
    }["MarketplaceSecondaryNavShell.useEffect"], [
        showSecondaryNav
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-x-0 top-[62px] lg:top-[65px] px-3.5 md:px-6 lg:px-[50px] bg-white shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] xs:max-md:hidden z-40 transition-transform duration-300",
                style: {
                    transform: showSecondaryNav ? "translateY(0)" : "translateY(-100%)"
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pt-0.5 pb-3.5 lg:py-3 flex items-end gap-x-6 lg:justify-between lg:gap-x-[30px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-col",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "inline-block text-[10px] leading-[12.1px] lg:text-xs lg:leading-[16.34px] text-dark-blue-400",
                                    children: "You currently have"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 116,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TeamMemberLink, {}, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 120,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                            lineNumber: 115,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-x-6 lg:gap-x-[54.17px] lg:ml-[26.5px]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/research"),
                                    children: "Research"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 124,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/design"),
                                    children: "Design"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 132,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/development"),
                                    children: "Development"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 140,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/testing"),
                                    children: "Testing"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 148,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/security"),
                                    children: "Security"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 156,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/maintenance"),
                                    children: "Maintenance"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 164,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/c/digital-marketing"),
                                    children: "Digital Marketing"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 172,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                            asChild: true,
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                className: "text-[11px] lg:text-[13px] leading-6 opacity-60 hover:opacity-100 lg:hidden",
                                                variant: "link",
                                                visual: "gray",
                                                children: [
                                                    "More ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ChevronDown"], {
                                                        className: "size-[15px]"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                                        lineNumber: 188,
                                                        columnNumber: 24
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                                lineNumber: 183,
                                                columnNumber: 17
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                            lineNumber: 182,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                            align: "end",
                                            children: mobileSecondaryNavItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropdown$2d$menu$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                                    onClick: ()=>router.push(item.href),
                                                    children: item.label
                                                }, item.href, false, {
                                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                                    lineNumber: 193,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                            lineNumber: 191,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 181,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                            lineNumber: 123,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-x-[18px] ml-auto xs:max-lg:hidden",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push("/favorites"),
                                    children: "My Favorites"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 205,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "inline-block h-4 w-px shrink-0 bg-gray-300"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 213,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                    className: "text-[13px] leading-6 opacity-60 hover:opacity-100",
                                    variant: "link",
                                    visual: "gray",
                                    onClick: ()=>router.push(user?.accountType === "TALENT" ? "/talent-dashboard" : "/client-dashboard"),
                                    children: "My Dashboard"
                                }, void 0, false, {
                                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                                    lineNumber: 214,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                            lineNumber: 204,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                    lineNumber: 114,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "xs:max-md:pt-0 pt-[52px] lg:pt-[57px]",
                children: children
            }, void 0, false, {
                fileName: "[project]/components/navigation/marketplace-secondary-nav.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s1(MarketplaceSecondaryNavShell, "eqWovdd1d2MlAgwVdL0tTDKtYlY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$contexts$2f$auth$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c1 = MarketplaceSecondaryNavShell;
var _c, _c1;
__turbopack_context__.k.register(_c, "TeamMemberLink");
__turbopack_context__.k.register(_c1, "MarketplaceSecondaryNavShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/(group)/(group)/layout.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MarketPlaceLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$marketplace$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/marketplace-footer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$navigation$2f$marketplace$2d$secondary$2d$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/navigation/marketplace-secondary-nav.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
function MarketPlaceLayout({ children }) {
    _s();
    // The marketplace homepage (`/`) renders its own CMS-driven Footer
    // (homepage-client.tsx) sourced from the Homepages collection's footerNav
    // and talentNetworkCta data. Skip the static layout footer there to avoid
    // a double render. Sibling pages (project-details, services, talent, etc.)
    // continue to use this static footer.
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const showStaticFooter = pathname !== "/";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$navigation$2f$marketplace$2d$secondary$2d$nav$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MarketplaceSecondaryNavShell"], {
                children: children
            }, void 0, false, {
                fileName: "[project]/app/(group)/(group)/layout.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            showStaticFooter && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$marketplace$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MarketplaceFooter"], {}, void 0, false, {
                fileName: "[project]/app/(group)/(group)/layout.tsx",
                lineNumber: 26,
                columnNumber: 28
            }, this)
        ]
    }, void 0, true);
}
_s(MarketPlaceLayout, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = MarketPlaceLayout;
var _c;
__turbopack_context__.k.register(_c, "MarketPlaceLayout");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/@blend-metrics/icons/dist/social-solid.mjs [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AngelListSolid",
    ()=>AngelListSolid,
    "AppleSolid",
    ()=>AppleSolid,
    "ClubhouseSolid",
    ()=>ClubhouseSolid,
    "DiscordSolid",
    ()=>DiscordSolid,
    "DribbbleSolid",
    ()=>DribbbleSolid,
    "FacebookSolid",
    ()=>FacebookSolid,
    "FigmaSolid",
    ()=>FigmaSolid,
    "GitHubSolid",
    ()=>GitHubSolid,
    "GoogleSolid",
    ()=>GoogleSolid,
    "InstagramSolid",
    ()=>InstagramSolid,
    "LinkedInSolid",
    ()=>LinkedInSolid,
    "PinterestSolid",
    ()=>PinterestSolid,
    "RedditSolid",
    ()=>RedditSolid,
    "SignalSolid",
    ()=>SignalSolid,
    "SnapchatSolid",
    ()=>SnapchatSolid,
    "TelegramSolid",
    ()=>TelegramSolid,
    "TikTokSolid",
    ()=>TikTokSolid,
    "TumblrSolid",
    ()=>TumblrSolid,
    "TwitterSolid",
    ()=>TwitterSolid,
    "YouTubeSolid",
    ()=>YouTubeSolid
]);
// build/social-solid/angel-list-solid.tsx
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
function AngelListSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M17.77 10.097c.549-1.528 2.128-5.949 2.128-7.364 0-1.247-.735-2.292-2.048-2.292-2.09 0-3.966 6.173-4.552 7.645C12.844 6.75 10.716 0 8.841 0 7.383 0 6.698 1.073 6.698 2.423c0 1.655 1.604 5.944 2.185 7.594-.296-.108-.614-.201-.938-.201-1.097 0-2.264 1.364-2.264 2.465 0 .417.23 1.003.375 1.392-1.73.47-2.395 1.622-2.395 3.361C3.656 20.42 6.862 24 11.37 24c5.532 0 8.973-4.153 8.973-9.51 0-2.021-.324-3.845-2.574-4.393Zm-1.66-5.034c.188-.577.99-3.015 1.74-3.015.403 0 .51.418.51.75 0 .896-1.808 5.841-2.207 6.938l-1.594-.281 1.552-4.393ZM8.17 2.264c0-.558.68-2.142 2.17 2.208l1.623 4.701c-.732-.06-1.299-.14-1.66.066-.51-1.35-2.133-5.61-2.133-6.975Zm-.108 9.174c1.374 0 3.146 4.434 3.146 5.034 0 .239-.23.534-.497.534-.98 0-3.605-3.604-3.605-4.58.005-.36.596-.989.956-.989Zm8.64 8.732c-1.365 1.5-3.108 2.278-5.143 2.278-2.784 0-4.982-1.528-6.042-4.139-.801-2.034.178-3.201.966-3.201.534 0 2.545 2.826 2.545 3.426 0 .23-.36.39-.548.39-.755 0-1.05-.727-2.396-2.41-1.392 1.392.961 4.073 2.733 4.073 1.224 0 2.02-1.134 1.781-1.968.174 0 .39.014.549-.028.051 1.27.426 2.784 1.954 2.892 0-.042.094-.333.094-.347 0-.816-.497-1.528-.497-2.358 0-1.326 1.018-2.61 2.049-3.36.375-.282.83-.455 1.27-.615.455-.173.938-.375 1.285-.722-.052-.525-.268-.989-.793-.989-1.298 0-5.653.188-5.653-1.86 0-.315.005-.615.816-.615 1.514 0 5.358.375 6.483 1.364.848.755 1.139 5.307-1.454 8.19Zm-4.622-5.906c.454.145.923.188 1.392.281a6.113 6.113 0 0 0-.952.896c-.131-.399-.29-.788-.44-1.177Z"
    }));
}
;
function AppleSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M20.843 17.145a11.957 11.957 0 0 1-1.183 2.127c-.622.886-1.131 1.5-1.524 1.841-.608.56-1.26.846-1.958.862-.501 0-1.106-.142-1.809-.432-.706-.287-1.354-.43-1.947-.43-.622 0-1.29.143-2.003.43-.714.29-1.29.44-1.73.455-.67.029-1.337-.266-2.003-.885-.425-.37-.956-1.006-1.593-1.907-.683-.961-1.245-2.076-1.685-3.347-.472-1.373-.708-2.703-.708-3.99 0-1.474.319-2.746.957-3.811A5.612 5.612 0 0 1 5.66 6.03a5.39 5.39 0 0 1 2.71-.764c.53 0 1.228.164 2.095.487.863.325 1.418.489 1.661.489.182 0 .799-.192 1.843-.576.988-.355 1.822-.502 2.505-.444 1.85.149 3.241.879 4.166 2.193-1.655 1.003-2.474 2.408-2.458 4.21.015 1.404.524 2.572 1.525 3.5.454.43.96.763 1.524 1-.122.354-.251.693-.388 1.019ZM16.598.44c0 1.1-.402 2.128-1.204 3.079-.966 1.13-2.136 1.783-3.404 1.68a3.417 3.417 0 0 1-.026-.417c0-1.056.46-2.186 1.277-3.11A4.914 4.914 0 0 1 14.796.504C15.423.198 16.015.03 16.573 0c.017.147.023.294.023.44Z"
    }));
}
;
function ClubhouseSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M1.742 17.875c-.959 0-1.742.783-1.742 1.742 0 .958.783 1.741 1.742 1.741a1.74 1.74 0 1 0 0-3.483ZM23.183 2.667l-10.966 3.5V2.708L.392 6.483v10.025l10.2-3.258v3.442L24 12.417l-3.633-3.55 2.816-6.2Zm-12.591 8.866-8.567 2.734V7.675l8.567-2.733v6.591Zm10.375.142-8.75 2.792V7.883l8.058-2.575-1.85 3.9 2.542 2.467Z"
    }));
}
;
function DiscordSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M9.888 10.068c-.684 0-1.224.6-1.224 1.332 0 .732.552 1.332 1.224 1.332.684 0 1.224-.6 1.224-1.332.012-.732-.54-1.332-1.224-1.332Zm4.38 0c-.684 0-1.224.6-1.224 1.332 0 .732.552 1.332 1.224 1.332.684 0 1.224-.6 1.224-1.332 0-.732-.54-1.332-1.224-1.332Z"
    }), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M20.1 0H4.02a2.466 2.466 0 0 0-2.46 2.472v16.224a2.466 2.466 0 0 0 2.46 2.472h13.608l-.636-2.22 1.536 1.428 1.452 1.344L22.56 24V2.472A2.466 2.466 0 0 0 20.1 0Zm-4.632 15.672s-.432-.516-.792-.972c1.572-.444 2.172-1.428 2.172-1.428-.492.324-.96.552-1.38.708-.6.252-1.176.42-1.74.516a8.406 8.406 0 0 1-3.108-.012 10.073 10.073 0 0 1-1.764-.516 7.032 7.032 0 0 1-.876-.408c-.036-.024-.072-.036-.108-.06a.166.166 0 0 1-.048-.036 4.21 4.21 0 0 1-.336-.204s.576.96 2.1 1.416c-.36.456-.804.996-.804.996-2.652-.084-3.66-1.824-3.66-1.824 0-3.864 1.728-6.996 1.728-6.996 1.728-1.296 3.372-1.26 3.372-1.26l.12.144c-2.16.624-3.156 1.572-3.156 1.572s.264-.144.708-.348c1.284-.564 2.304-.72 2.724-.756.072-.012.132-.024.204-.024a9.782 9.782 0 0 1 6.036 1.128s-.948-.9-2.988-1.524l.168-.192s1.644-.036 3.372 1.26c0 0 1.728 3.132 1.728 6.996 0 0-1.02 1.74-3.672 1.824Z"
    }));
}
;
function DribbbleSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M12 0C5.375 0 0 5.375 0 12s5.375 12 12 12c6.612 0 12-5.375 12-12S18.612 0 12 0Zm7.926 5.531a10.202 10.202 0 0 1 2.317 6.378c-.338-.065-3.722-.755-7.132-.325-.079-.17-.144-.352-.222-.534a30.53 30.53 0 0 0-.676-1.484c3.774-1.536 5.492-3.748 5.713-4.035ZM12 1.771c2.603 0 4.985.975 6.794 2.576-.182.26-1.731 2.33-5.375 3.696-1.68-3.084-3.54-5.61-3.827-6A10.424 10.424 0 0 1 12 1.77Zm-4.36.962c.273.365 2.095 2.903 3.8 5.922-4.79 1.276-9.02 1.25-9.475 1.25.664-3.176 2.812-5.818 5.675-7.172Zm-5.896 9.28v-.312c.443.013 5.414.078 10.53-1.458.299.573.572 1.158.832 1.744-.13.039-.273.078-.403.117-5.284 1.705-8.096 6.364-8.33 6.755a10.226 10.226 0 0 1-2.629-6.846ZM12 22.256c-2.369 0-4.555-.807-6.286-2.16.182-.378 2.264-4.387 8.043-6.404.026-.013.04-.013.065-.026 1.445 3.735 2.03 6.872 2.187 7.77-1.237.534-2.59.82-4.009.82Zm5.714-1.757c-.104-.625-.651-3.618-1.992-7.302 3.215-.507 6.026.326 6.378.443-.443 2.85-2.083 5.31-4.386 6.859Z",
        clipRule: "evenodd"
    }));
}
;
function FacebookSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#FacebookSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.469h-2.796v8.385C19.612 22.954 24 17.99 24 12Z"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "FacebookSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function FigmaSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M8.16 0h7.68a4.321 4.321 0 0 1 1.98 8.16 4.321 4.321 0 0 1-1.98 8.16 4.313 4.313 0 0 1-3.36-1.605v4.965A4.321 4.321 0 0 1 8.16 24a4.321 4.321 0 0 1-1.98-8.16 4.321 4.321 0 0 1 0-7.68A4.321 4.321 0 0 1 8.16 0ZM4.8 4.32A3.361 3.361 0 0 1 8.16.96h3.36v6.72H8.15A3.361 3.361 0 0 1 4.8 4.32Zm6.72 7.634v3.406H8.16A3.361 3.361 0 0 1 4.8 12c0-1.851 1.5-3.354 3.35-3.36H11.52v3.314Zm.96.086v-.08a3.361 3.361 0 0 1 3.346-3.32h.024A3.361 3.361 0 0 1 19.2 12a3.361 3.361 0 0 1-3.36 3.36 3.362 3.362 0 0 1-3.36-3.32Zm.645-3.4a4.35 4.35 0 0 0-.645.645V8.64h.645Zm2.725-.96H12.48V.96h3.36a3.362 3.362 0 0 1 3.36 3.36c0 1.851-1.5 3.354-3.35 3.36Zm-7.69 8.64a3.362 3.362 0 0 0-3.36 3.36 3.361 3.361 0 0 0 3.36 3.36 3.361 3.361 0 0 0 3.36-3.36v-3.36H8.16Z",
        clipRule: "evenodd"
    }));
}
;
function GitHubSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#GitHubSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M12 0C5.372 0 0 5.38 0 12.02a12.02 12.02 0 0 0 8.207 11.405c.6.11.818-.26.818-.58 0-.284-.01-1.041-.015-2.043-3.339.726-4.043-1.612-4.043-1.612-.545-1.39-1.332-1.759-1.332-1.759-1.09-.744.083-.73.083-.73 1.203.085 1.837 1.239 1.837 1.239 1.07 1.836 2.809 1.306 3.492.998.11-.776.42-1.305.763-1.605-2.664-.304-5.466-1.336-5.466-5.941 0-1.312.468-2.386 1.235-3.226-.124-.304-.535-1.526.117-3.18 0 0 1.008-.324 3.3 1.231A11.477 11.477 0 0 1 12 5.813c1.02.005 2.046.138 3.005.404 2.29-1.555 3.296-1.232 3.296-1.232.655 1.655.243 2.877.12 3.181.768.84 1.234 1.914 1.234 3.226 0 4.617-2.807 5.634-5.48 5.931.431.371.814 1.104.814 2.226 0 1.606-.014 2.903-.014 3.297 0 .321.216.696.825.578A12.023 12.023 0 0 0 24 12.02C24 5.38 18.626 0 12 0Z",
        clipRule: "evenodd"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "GitHubSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function GoogleSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#GoogleSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M16.842 6.548a6.52 6.52 0 0 0-4.603-1.8c-3.13 0-5.79 2.113-6.737 4.957a7.188 7.188 0 0 0 0 4.594h.004c.952 2.84 3.607 4.952 6.737 4.952 1.616 0 3.004-.413 4.08-1.143v-.003a5.554 5.554 0 0 0 2.398-3.647h-6.482v-4.62h11.319c.14.802.207 1.622.207 2.438 0 3.65-1.304 6.735-3.574 8.825l.002.002C18.205 22.937 15.475 24 12.24 24a12.002 12.002 0 0 1-10.724-6.61 12.01 12.01 0 0 1 0-10.776A11.998 11.998 0 0 1 12.24 0a11.533 11.533 0 0 1 8.03 3.122l-3.427 3.426Z",
        clipRule: "evenodd"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "GoogleSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function InstagramSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        fill: "currentColor",
        clipPath: "url(#InstagramSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        d: "M12 2.16c3.206 0 3.586.015 4.847.071 1.172.052 1.805.249 2.226.413a3.71 3.71 0 0 1 1.379.895c.421.422.68.82.895 1.378.164.422.36 1.06.412 2.227.057 1.265.07 1.645.07 4.847 0 3.206-.013 3.586-.07 4.846-.051 1.172-.248 1.805-.412 2.227-.216.558-.478.961-.895 1.378a3.69 3.69 0 0 1-1.379.895c-.421.165-1.059.361-2.226.413-1.266.056-1.645.07-4.847.07-3.206 0-3.586-.014-4.847-.07-1.172-.052-1.805-.248-2.226-.413a3.71 3.71 0 0 1-1.379-.895 3.691 3.691 0 0 1-.895-1.378c-.164-.422-.36-1.06-.412-2.227-.057-1.265-.07-1.645-.07-4.846 0-3.207.013-3.586.07-4.847.051-1.172.248-1.805.412-2.227.216-.558.478-.96.895-1.378.422-.422.82-.68 1.379-.895.421-.164 1.059-.361 2.226-.413 1.261-.056 1.64-.07 4.847-.07ZM12 0C8.742 0 8.334.014 7.055.07 5.78.127 4.903.333 4.144.628a5.857 5.857 0 0 0-2.128 1.388A5.88 5.88 0 0 0 .628 4.139C.333 4.903.127 5.775.07 7.05.014 8.334 0 8.742 0 12s.014 3.666.07 4.945c.057 1.275.263 2.152.558 2.911.31.792.717 1.463 1.388 2.128a5.866 5.866 0 0 0 2.123 1.383c.764.296 1.636.502 2.911.558 1.28.056 1.688.07 4.945.07 3.258 0 3.666-.014 4.946-.07 1.275-.056 2.151-.262 2.91-.558a5.866 5.866 0 0 0 2.124-1.383 5.866 5.866 0 0 0 1.383-2.123c.295-.764.501-1.636.558-2.911.056-1.28.07-1.688.07-4.945 0-3.258-.014-3.666-.07-4.946-.057-1.275-.263-2.151-.558-2.91a5.62 5.62 0 0 0-1.374-2.133A5.866 5.866 0 0 0 19.861.633C19.097.338 18.225.13 16.95.075 15.666.015 15.258 0 12 0Z"
    }), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        d: "M12 5.836A6.166 6.166 0 0 0 5.836 12 6.166 6.166 0 0 0 12 18.164 6.166 6.166 0 0 0 18.164 12 6.166 6.166 0 0 0 12 5.836Zm0 10.162A3.999 3.999 0 1 1 12.001 8 3.999 3.999 0 0 1 12 15.998ZM19.847 5.592a1.44 1.44 0 1 1-2.879 0 1.44 1.44 0 0 1 2.879 0Z"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "InstagramSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function LinkedInSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#LinkedInSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M22.223 0H1.772C.792 0 0 .773 0 1.73v20.536C0 23.222.792 24 1.772 24h20.451c.98 0 1.777-.778 1.777-1.73V1.73C24 .773 23.203 0 22.223 0ZM7.12 20.452H3.558V8.995H7.12v11.457ZM5.34 7.434a2.064 2.064 0 1 1 0-4.125 2.063 2.063 0 0 1 0 4.125Zm15.112 13.018h-3.558v-5.57c0-1.326-.024-3.037-1.852-3.037-1.851 0-2.133 1.449-2.133 2.944v5.663H9.356V8.995h3.413v1.566h.047c.473-.9 1.636-1.852 3.365-1.852 3.605 0 4.27 2.372 4.27 5.457v6.286Z"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "LinkedInSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function PinterestSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#PinterestSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M12 0C5.372 0 0 5.372 0 12c0 5.086 3.164 9.427 7.627 11.175-.104-.952-.202-2.405.042-3.44.22-.938 1.406-5.963 1.406-5.963s-.36-.717-.36-1.781c0-1.67.965-2.916 2.17-2.916 1.021 0 1.518.769 1.518 1.692 0 1.031-.656 2.569-.994 3.994-.28 1.195.6 2.17 1.777 2.17 2.133 0 3.773-2.25 3.773-5.494 0-2.873-2.062-4.884-5.01-4.884-3.413 0-5.42 2.56-5.42 5.208 0 1.031.4 2.137.896 2.737a.359.359 0 0 1 .084.343c-.089.38-.295 1.195-.332 1.359-.052.22-.174.267-.404.16-1.5-.7-2.437-2.888-2.437-4.65 0-3.788 2.752-7.262 7.926-7.262 4.163 0 7.397 2.968 7.397 6.933 0 4.135-2.606 7.463-6.225 7.463-1.214 0-2.357-.633-2.751-1.378 0 0-.6 2.292-.745 2.854-.272 1.04-1.004 2.349-1.491 3.146C9.572 23.812 10.763 24 12 24c6.628 0 12-5.372 12-12S18.628 0 12 0Z"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "PinterestSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function RedditSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12Zm-5.754-1.754c.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614.027.168.042.337.042.52 0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.003-2.176-7.003-4.87 0-.183.014-.366.042-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.464 0 .899.196 1.207.49 1.208-.883 2.878-1.43 4.744-1.487l.885-4.182a.341.341 0 0 1 .14-.197c.07-.042.154-.056.239-.042l2.905.618a1.214 1.214 0 0 1 1.109-.702c.687 0 1.249.561 1.249 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.825.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491ZM9.249 12C8.561 12 8 12.561 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249Zm2.765 5.46c.477 0 2.105-.056 2.961-.913a.36.36 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.534-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.33.33 0 0 0-.463 0 .33.33 0 0 0 0 .463c.842.843 2.484.913 2.961.913Zm1.488-4.21c0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.561-1.249-1.25-1.249-.687 0-1.248.561-1.248 1.25Z",
        clipRule: "evenodd"
    }));
}
;
function SignalSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "m9.12.35.268 1.091A10.896 10.896 0 0 0 6.375 2.69l-.577-.965A11.851 11.851 0 0 1 9.12.35Zm5.76 0-.269 1.091c1.062.263 2.078.683 3.014 1.248l.583-.965A11.936 11.936 0 0 0 14.881.35ZM1.725 5.795A11.916 11.916 0 0 0 .35 9.119l1.091.27A10.896 10.896 0 0 1 2.69 6.374l-.965-.58ZM1.124 12c0-.546.041-1.09.123-1.63L.136 10.2a12 12 0 0 0 0 3.597l1.111-.167A10.893 10.893 0 0 1 1.124 12Zm17.078 10.272-.577-.961c-.934.565-1.95.986-3.01 1.248l.27 1.09a11.942 11.942 0 0 0 3.317-1.377ZM22.876 12c0 .546-.041 1.09-.123 1.63l1.111.167a12 12 0 0 0 0-3.597l-1.111.17c.082.54.123 1.085.123 1.63Zm.774 2.877-1.091-.269a10.874 10.874 0 0 1-1.248 3.017l.965.58a11.893 11.893 0 0 0 1.374-3.327Zm-10.02 7.876c-1.08.164-2.18.164-3.26 0l-.167 1.111c1.191.181 2.403.181 3.594 0l-.167-1.11Zm7.125-4.302a10.845 10.845 0 0 1-2.304 2.3l.668.908a12.108 12.108 0 0 0 2.543-2.534l-.907-.674ZM18.451 3.245c.88.648 1.656 1.425 2.304 2.305l.907-.675a12.09 12.09 0 0 0-2.537-2.537l-.674.907ZM3.245 5.55A10.862 10.862 0 0 1 5.55 3.245l-.676-.907a12.09 12.09 0 0 0-2.536 2.537l.907.675Zm19.03.245-.964.58c.565.934.986 1.95 1.248 3.01l1.09-.27c-.287-1.17-.75-2.29-1.373-3.32ZM10.37 1.247a10.88 10.88 0 0 1 3.26 0l.167-1.111a11.977 11.977 0 0 0-3.594 0l.167 1.111ZM3.821 21.959l-2.322.538.542-2.321-1.094-.256-.542 2.322a1.125 1.125 0 0 0 1.35 1.353l2.322-.535-.256-1.101Zm-2.642-3.041 1.098.252.375-1.61a10.78 10.78 0 0 1-1.21-2.952l-1.092.27c.246.994.617 1.953 1.105 2.853l-.276 1.187Zm5.25 2.434-1.61.375.257 1.098 1.183-.276c.9.489 1.859.86 2.853 1.104l.27-1.09a10.794 10.794 0 0 1-2.943-1.218l-.01.007ZM12 2.249c-5.387.004-9.747 4.371-9.747 9.754a9.774 9.774 0 0 0 1.496 5.183l-.937 4.002 3.999-.937c4.558 2.867 10.58 1.5 13.446-3.055 2.868-4.555 1.504-10.576-3.05-13.447A9.775 9.775 0 0 0 12 2.25Z"
    }));
}
;
function SnapchatSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M23.913 17.457c-.165-.454-.484-.699-.846-.895-.067-.037-.128-.073-.183-.098l-.331-.165c-1.128-.6-2.01-1.348-2.617-2.243a5.096 5.096 0 0 1-.448-.797c-.055-.147-.049-.233-.012-.313a.5.5 0 0 1 .147-.153c.196-.128.392-.257.527-.343.24-.16.435-.282.558-.368.46-.325.784-.668.987-1.054.288-.54.325-1.17.104-1.74-.307-.81-1.066-1.306-1.992-1.306-.196 0-.386.019-.582.062l-.153.036a17.947 17.947 0 0 0-.055-1.71c-.172-2.016-.883-3.07-1.619-3.91a6.473 6.473 0 0 0-1.642-1.323C14.641.499 13.372.174 11.993.174S9.352.5 8.236 1.137c-.619.349-1.17.796-1.642 1.323-.736.84-1.44 1.9-1.618 3.91a17.96 17.96 0 0 0-.055 1.71 2.63 2.63 0 0 0-.73-.098c-.925 0-1.685.503-1.991 1.306-.221.57-.184 1.2.104 1.74.202.386.527.73.987 1.054.122.086.312.209.557.368.129.086.319.208.509.33a.533.533 0 0 1 .165.166c.037.08.043.166-.018.325-.123.27-.27.533-.441.779-.595.87-1.453 1.611-2.544 2.206-.576.306-1.176.509-1.434 1.201-.19.521-.067 1.11.417 1.612.178.184.386.343.613.466.472.257.974.46 1.501.6.11.03.209.074.3.135.178.153.154.386.387.73.116.177.27.33.441.453.496.343 1.054.361 1.643.386.533.018 1.133.043 1.826.27.288.092.582.275.925.49.828.509 1.955 1.201 3.849 1.201 1.894 0 3.027-.698 3.861-1.207.343-.209.637-.392.913-.484.687-.227 1.293-.252 1.826-.27.589-.024 1.146-.043 1.643-.386.208-.147.38-.331.503-.552.171-.288.165-.49.324-.63a.838.838 0 0 1 .282-.13 6.79 6.79 0 0 0 1.52-.606c.24-.129.46-.3.644-.503l.006-.006c.478-.49.594-1.066.404-1.569Zm-1.679.901c-1.024.564-1.71.502-2.237.846-.453.288-.184.913-.509 1.14-.404.275-1.593-.019-3.125.49-1.269.417-2.072 1.624-4.351 1.624-2.28 0-3.065-1.201-4.352-1.624-1.532-.509-2.72-.209-3.125-.49-.325-.227-.062-.852-.509-1.14-.533-.344-1.213-.282-2.237-.846-.656-.362-.282-.582-.067-.686 3.714-1.796 4.308-4.572 4.333-4.78.03-.252.067-.448-.209-.7-.263-.245-1.44-.974-1.771-1.2-.54-.38-.778-.754-.6-1.22.122-.319.422-.441.735-.441.098 0 .196.012.294.03.594.129 1.17.423 1.502.509.042.012.08.018.122.018.178 0 .24-.092.227-.294-.037-.65-.129-1.912-.025-3.095.141-1.624.662-2.433 1.287-3.144.3-.343 1.704-1.826 4.394-1.826 2.691 0 4.094 1.477 4.395 1.82.625.711 1.146 1.52 1.287 3.144.104 1.183.012 2.445-.03 3.095-.013.214.048.294.226.294.043 0 .08-.006.122-.018.331-.08.907-.38 1.502-.509a1.2 1.2 0 0 1 .294-.03c.313 0 .613.122.736.44.177.466-.062.84-.601 1.22-.325.227-1.502.956-1.771 1.202-.276.25-.24.447-.209.698.025.209.62 2.985 4.333 4.78.22.105.589.331-.061.693Z"
    }));
}
;
function TelegramSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#TelegramSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        fillRule: "evenodd",
        d: "M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12ZM12.43 8.859c-1.167.485-3.5 1.49-6.998 3.014-.568.226-.866.447-.893.663-.046.366.412.51 1.034.705.085.027.173.054.263.084.613.199 1.437.432 1.865.441.389.008.823-.152 1.302-.48 3.268-2.207 4.955-3.322 5.061-3.346.075-.017.179-.039.249.024.07.062.063.18.056.212-.046.193-1.84 1.862-2.77 2.726-.29.269-.495.46-.537.504-.094.097-.19.19-.282.279-.57.548-.996.96.024 1.632.49.323.882.59 1.273.856.427.291.853.581 1.405.943.14.092.274.187.405.28.497.355.944.673 1.496.623.32-.03.652-.331.82-1.23.397-2.126 1.179-6.73 1.36-8.628a2.123 2.123 0 0 0-.02-.472.506.506 0 0 0-.172-.325c-.143-.117-.365-.142-.465-.14-.451.008-1.143.249-4.476 1.635Z",
        clipRule: "evenodd"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "TelegramSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M0 0h24v24H0z"
    }))));
}
;
function TikTokSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M17.073 0h-4.045v16.348c0 1.948-1.556 3.548-3.492 3.548s-3.491-1.6-3.491-3.548c0-1.913 1.52-3.478 3.388-3.548V8.696C5.319 8.766 2 12.139 2 16.348 2 20.59 5.388 24 9.57 24c4.184 0 7.572-3.444 7.572-7.652V7.965A9.366 9.366 0 0 0 22.5 9.774V5.67c-3.042-.105-5.427-2.61-5.427-5.67Z"
    }));
}
;
function TumblrSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("g", {
        clipPath: "url(#TumblrSolid_svg__a)"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M14.6 24c-3.6 0-6.3-1.85-6.3-6.3v-7.1H5V6.75C8.6 5.8 10.1 2.7 10.3 0h3.75v6.1h4.35v4.5h-4.35v6.2c0 1.85.95 2.5 2.45 2.5h2.1V24h-4Z"
    })), /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("defs", null, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("clipPath", {
        id: "TumblrSolid_svg__a"
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "#fff",
        d: "M5 0h13.6v24H5z"
    }))));
}
;
function TwitterSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M7.55 21.75c9.055 0 14.008-7.503 14.008-14.008 0-.211-.004-.427-.014-.638A10 10 0 0 0 24 4.555c-.898.4-1.85.66-2.826.774a4.95 4.95 0 0 0 2.165-2.723A9.897 9.897 0 0 1 20.213 3.8a4.93 4.93 0 0 0-8.394 4.49A13.985 13.985 0 0 1 1.673 3.15a4.93 4.93 0 0 0 1.523 6.57 4.93 4.93 0 0 1-2.23-.614v.06a4.922 4.922 0 0 0 3.95 4.829 4.895 4.895 0 0 1-2.221.084 4.934 4.934 0 0 0 4.597 3.422A9.875 9.875 0 0 1 0 19.538a13.969 13.969 0 0 0 7.55 2.212Z"
    }));
}
;
function YouTubeSolid(props) {
    return /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        width: "1.5rem",
        height: "1.5rem",
        fill: "none",
        viewBox: "0 0 24 24",
        ...props
    }, /* @__PURE__ */ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"]("path", {
        fill: "currentColor",
        d: "M23.76 7.2s-.233-1.655-.955-2.381c-.914-.956-1.936-.961-2.405-1.017-3.356-.244-8.395-.244-8.395-.244h-.01s-5.039 0-8.395.244c-.469.056-1.49.06-2.405 1.017C.473 5.545.244 7.2.244 7.2S0 9.145 0 11.086v1.819c0 1.94.24 3.886.24 3.886s.233 1.654.95 2.38c.915.957 2.115.924 2.65 1.027 1.92.183 8.16.24 8.16.24s5.044-.01 8.4-.249c.469-.056 1.49-.06 2.405-1.017.722-.727.956-2.381.956-2.381S24 14.85 24 12.905v-1.819c0-1.94-.24-3.886-.24-3.886ZM9.52 15.113V8.367l6.483 3.385-6.483 3.36Z"
    }));
}
;
}),
]);

//# sourceMappingURL=_0s139ly._.js.map