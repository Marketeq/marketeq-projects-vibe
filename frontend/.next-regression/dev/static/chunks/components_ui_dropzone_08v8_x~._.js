(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/ui/dropzone/dropzone.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CircularProgressDropzone",
    ()=>CircularProgressDropzone,
    "Dropzone",
    ()=>Dropzone,
    "ONE_MB",
    ()=>ONE_MB,
    "SquareShapeDropzone",
    ()=>SquareShapeDropzone
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/constants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/dom-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/functions.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/utils/hooks.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@blend-metrics/icons/dist/icons.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/react-dropzone/dist/es/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$utils$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react-dropzone/dist/es/utils/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useMount.js [app-client] (ecmascript) <export default as useMount>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__ = __turbopack_context__.i("[project]/node_modules/react-use/esm/useToggle.js [app-client] (ecmascript) <export default as useToggle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/button/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/button/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/icon-button/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/icon-button/icon-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/ui/progress/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/progress/progress.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature();
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
const ACCEPTED_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg"
];
const ONE_MB = 1024 * 1024;
const Success = ({ progress, meta, onRemove, open })=>{
    _s();
    const [showPreview, { off, on }] = __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToggle"](false);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "Success.useEffect": ()=>{
            if (progress === 100) {
                const timeout = setTimeout(on, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ONE_SECOND"]);
                return ({
                    "Success.useEffect": ()=>clearTimeout(timeout)
                })["Success.useEffect"];
            }
        }
    }["Success.useEffect"], [
        progress,
        off,
        on
    ]);
    const [preview, setPreview] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "Success.useEffect": ()=>{
            const unsubscribe = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getPreview"])(meta, setPreview);
            return unsubscribe;
        }
    }["Success.useEffect"], [
        meta
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: showPreview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "group h-[336px] rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 overflow-hidden relative",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0",
                children: [
                    preview ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                        className: "size-full object-cover",
                        src: preview,
                        alt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
                    }, void 0, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 83,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0)) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute opacity-0 transition duration-300 group-hover:opacity-100 inset-x-0 top-1/2 -translate-y-1 flex justify-center items-center gap-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "hover:bg-black inline-flex text-sm items-center font-semibold text-white gap-x-2 py-2 px-3.5 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] bg-black/40 focus-visible:outline-none",
                                onClick: open,
                                type: "button",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Repeat04"], {
                                        className: "size-[15px]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 96,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    " Change Image"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 91,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "hover:bg-black hover:text-error-500 inline-flex text-sm items-center font-semibold text-white gap-x-2 py-2 px-3.5 rounded-[5px] shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)] bg-black/40 focus-visible:outline-none",
                                onClick: onRemove,
                                type: "button",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash01"], {
                                        className: "size-[15px]"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 103,
                                        columnNumber: 17
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    " Remove"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 98,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 90,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 81,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
            lineNumber: 80,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-[100px] rounded-lg bg-gray-50 border-2 border-dashed border-gray-200 hover:border-gray-300 overflow-hidden relative",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-lg p-2 pb-4 pl-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-auto pt-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-auto flex-col",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "inline-block text-sm font-medium text-gray-700",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 114,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "inline-block text-sm text-gray-500",
                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertToKbOrMb"])(meta.size)
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 117,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 113,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 112,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            progress === 100 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pr-2 pt-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Check"], {
                                        className: "h-2.5 w-2.5 text-white"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 126,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 125,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 124,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                onClick: onRemove,
                                className: "text-gray-500 hover:text-error-500",
                                variant: "ghost",
                                visual: "error",
                                type: "button",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                    className: "h-5 w-5"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 137,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 130,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 111,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 flex items-center gap-x-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex-auto py-1.5",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Progress"], {
                                    value: progress
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 144,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 143,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-sm font-medium text-gray-700",
                                children: [
                                    progress,
                                    "%"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 146,
                                columnNumber: 15
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 142,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 110,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
            lineNumber: 109,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0))
    }, void 0, false);
};
_s(Success, "8eF6l4m5GnG+T8H92sF1HTa3i/k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToggle"]
    ];
});
_c = Success;
const Dropzone = ({ maxFiles = 1, maxSize = ONE_MB * 2, onError, value: valueProp, onValueChange, onRetry: onRetryProp, acceptedExtensions = ACCEPTED_EXTENSIONS, onBlur, className, icon, size })=>{
    _s1();
    const [, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        onChange: {
            "Dropzone.useControllableState": (errors)=>{
                onError?.(errors?.join(" "));
            }
        }["Dropzone.useControllableState"]
    });
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        value: valueProp,
        onChange: onValueChange
    });
    const [isDragAccept, toggleIsDragAccept] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    const [hasValidationError, toggleHasValidationError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"])({
        "Dropzone.useMount": ()=>{
            const controlled = value !== undefined;
            if (controlled) {
                toggleIsDragAccept(true);
            }
        }
    }["Dropzone.useMount"]);
    const onDropRejected = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "Dropzone.useCallback[onDropRejected]": (fileRejections)=>{
            const errors = fileRejections.reduce({
                "Dropzone.useCallback[onDropRejected].errors": (prevValue, { errors })=>{
                    toggleIsDragAccept(false);
                    toggleHasValidationError(true);
                    const { message } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFirstItem"])([
                        ...errors
                    ]);
                    const hasMessageAlready = prevValue.includes(message);
                    return hasMessageAlready ? prevValue : [
                        ...prevValue,
                        message
                    ];
                }
            }["Dropzone.useCallback[onDropRejected].errors"], []);
            setErrors(errors);
        }
    }["Dropzone.useCallback[onDropRejected]"], [
        setErrors,
        toggleIsDragAccept,
        toggleHasValidationError
    ]);
    const onDropAccept = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "Dropzone.useCallback[onDropAccept]": (acceptedFiles)=>{
            const value = acceptedFiles.reduce({
                "Dropzone.useCallback[onDropAccept].value": (prevValue, currentValue)=>{
                    toggleIsDragAccept(true);
                    setErrors(undefined);
                    toggleHasValidationError(false);
                    return [
                        ...prevValue,
                        {
                            meta: currentValue,
                            hasError: false,
                            progress: 0
                        }
                    ];
                }
            }["Dropzone.useCallback[onDropAccept].value"], []);
            setValue(value);
        }
    }["Dropzone.useCallback[onDropAccept]"], [
        setValue,
        toggleIsDragAccept,
        setErrors,
        toggleHasValidationError
    ]);
    const onDrop = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "Dropzone.useCallback[onDrop]": (acceptedFiles, fileRejections)=>{
            const isEmpty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsEmpty"])(fileRejections);
            if (isEmpty) onDropAccept(acceptedFiles);
            else onDropRejected(fileRejections);
        }
    }["Dropzone.useCallback[onDrop]"], [
        onDropAccept,
        onDropRejected
    ]);
    const validator = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "Dropzone.useCallback[validator]": (file)=>{
            const hasExtension = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHasExtension"])({
                extensions: acceptedExtensions,
                meta: file
            });
            if (hasExtension) return null;
            else return {
                code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$utils$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ErrorCode"].FileInvalidType,
                message: `Must be in ${acceptedExtensions.join(" ")} format(s)`
            };
        }
    }["Dropzone.useCallback[validator]"], [
        acceptedExtensions
    ]);
    const onRemove = (index)=>{
        setValue((prev)=>{
            const nextState = prev?.filter((item, i)=>i !== index);
            const isEmpty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsEmpty"])(nextState);
            if (isEmpty) {
                toggleIsDragAccept(false);
                return undefined;
            }
            return nextState;
        });
    };
    const { getInputProps, getRootProps, open } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"])({
        noKeyboard: true,
        onDrop: onDrop,
        validator,
        maxSize,
        maxFiles,
        multiple: maxFiles > 1,
        noClick: true
    });
    const onRetryPropRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"])(onRetryProp);
    const onRetry = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "Dropzone.useCallback[onRetry]": (index)=>{
            onRetryPropRef();
            setValue({
                "Dropzone.useCallback[onRetry]": (prev)=>prev?.reduce({
                        "Dropzone.useCallback[onRetry]": (prevValue, currentValue, currentIndex)=>currentIndex == index ? [
                                ...prevValue,
                                {
                                    ...currentValue,
                                    hasError: false
                                }
                            ] : [
                                ...prevValue,
                                currentValue
                            ]
                    }["Dropzone.useCallback[onRetry]"], [])
            }["Dropzone.useCallback[onRetry]"]);
        }
    }["Dropzone.useCallback[onRetry]"], [
        onRetryPropRef,
        setValue
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ...getRootProps({
            onBlur
        }),
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg focus-visible:outline-none", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ...getInputProps()
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 312,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            isDragAccept ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: value?.map(({ hasError, progress, meta }, idx)=>{
                    const category = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isImg"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)) ? "img" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isVideo"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)) ? "video" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isDoc"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)) ? "doc" : "other";
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: size === "sm" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: hasError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-error-300 bg-error-25 p-2 pb-4 pl-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-auto gap-x-4 pt-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-error-50 bg-error-100 text-error-500",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                                        className: "h-4 w-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                        lineNumber: 333,
                                                        columnNumber: 31
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 332,
                                                    columnNumber: 29
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-auto flex-col items-start",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-block text-sm font-medium text-error-500",
                                                            children: "Upload failed, please try again"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 336,
                                                            columnNumber: 31
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-block text-sm text-error-500",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 339,
                                                            columnNumber: 31
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "mt-1 text-sm font-semibold text-error-500 hover:underline focus:outline-none",
                                                            onClick: ()=>onRetry(idx),
                                                            children: "Try again"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 342,
                                                            columnNumber: 31
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 335,
                                                    columnNumber: 29
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 331,
                                            columnNumber: 27
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                            onClick: ()=>onRemove(idx),
                                            variant: "ghost",
                                            visual: "error",
                                            type: "button",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                                className: "h-5 w-5"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 356,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 350,
                                            columnNumber: 27
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 330,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 329,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-gray-200 bg-white p-2 pb-4 pl-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-auto gap-x-4 pt-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-primary-25 bg-primary-50 text-primary-500",
                                                        children: [
                                                            category === "img" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Image"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 366,
                                                                columnNumber: 33
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            category === "video" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Video"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 369,
                                                                columnNumber: 33
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            category === "doc" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["File"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 372,
                                                                columnNumber: 33
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            category === "other" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                                                className: "h-4 w-4"
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 375,
                                                                columnNumber: 33
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                        lineNumber: 364,
                                                        columnNumber: 29
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-auto flex-col",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-block text-sm font-medium text-gray-700",
                                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 379,
                                                                columnNumber: 31
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-block text-sm text-gray-500",
                                                                children: size
                                                            }, void 0, false, {
                                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                                lineNumber: 382,
                                                                columnNumber: 31
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                        lineNumber: 378,
                                                        columnNumber: 29
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 363,
                                                columnNumber: 27
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            progress === 100 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "pr-2 pt-2",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Check"], {
                                                        className: "h-2.5 w-2.5 text-white"
                                                    }, void 0, false, {
                                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                        lineNumber: 391,
                                                        columnNumber: 33
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 390,
                                                    columnNumber: 31
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 389,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                onClick: ()=>onRemove(idx),
                                                variant: "ghost",
                                                visual: "error",
                                                type: "button",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                                    className: "h-5 w-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 401,
                                                    columnNumber: 31
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 395,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 362,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-1 flex items-center gap-x-3 pl-12",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-auto py-1.5",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Progress"], {
                                                    value: progress
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 408,
                                                    columnNumber: 29
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 407,
                                                columnNumber: 27
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-sm font-medium text-gray-700",
                                                children: [
                                                    progress,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 410,
                                                columnNumber: 27
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 406,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 361,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: hasError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-[100px] rounded-lg bg-gray-50 border-2 border-dashed hover:border-gray-300 overflow-hidden relative border-error-300",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "rounded-lg p-2 pb-4 pl-4",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex flex-auto pt-2",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-auto flex-col items-start",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-block text-sm font-medium text-error-500",
                                                            children: "Upload failed, please try again"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 425,
                                                            columnNumber: 33
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-block text-sm text-error-500",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 428,
                                                            columnNumber: 33
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            className: "mt-1 text-sm font-semibold text-error-500 hover:underline focus:outline-none",
                                                            onClick: ()=>onRetry(idx),
                                                            children: "Try again"
                                                        }, void 0, false, {
                                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                            lineNumber: 431,
                                                            columnNumber: 33
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 424,
                                                    columnNumber: 31
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 423,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                                onClick: ()=>onRemove(idx),
                                                variant: "ghost",
                                                visual: "error",
                                                type: "button",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                                    className: "h-5 w-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 445,
                                                    columnNumber: 31
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 439,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 422,
                                        columnNumber: 27
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 421,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 420,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Success, {
                                open: open,
                                meta: meta,
                                progress: progress,
                                onRemove: ()=>onRemove(idx)
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 451,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false)
                    }, idx, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 325,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 314,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: size === "sm" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg border border-gray-200 bg-white px-[25px] py-[17px]", {
                        "border-error-500": hasValidationError
                    }),
                    children: [
                        icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mb-3 flex items-center justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "inline-flex size-10 items-center justify-center rounded-full border-[6px] border-gray-50 bg-gray-100",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                    className: "size-5 text-gray-500"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 478,
                                    columnNumber: 21
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 477,
                                columnNumber: 19
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 476,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-center gap-x-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    className: "text-center text-sm font-semibold text-primary-500 hover:underline focus:outline-none",
                                    onClick: open,
                                    type: "button",
                                    children: "Click to upload"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 483,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-center text-sm text-gray-600",
                                    children: "or drag and drop"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 490,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 482,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-1 flex justify-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-center text-sm leading-[18px] text-gray-600",
                                children: acceptedExtensions.join(" ")
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 495,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 494,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                    lineNumber: 467,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-[5px]",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("py-10 md:py-[100px] px-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg", {
                                "border-error-500": hasValidationError
                            }),
                            children: [
                                icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mb-3 flex items-center justify-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "inline-flex size-[52px] items-center justify-center rounded-full border-[6px] border-gray-100 bg-white",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                            className: "size-5 text-gray-500"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 513,
                                            columnNumber: 23
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 512,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 511,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-center items-center gap-x-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "text-xs leading-5 text-gray-600",
                                            children: "Drag and drop a cover image or"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 519,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                            size: "md",
                                            variant: "link",
                                            onClick: open,
                                            type: "button",
                                            children: "Choose a File"
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 522,
                                            columnNumber: 19
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 518,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 max-w-[408px] mx-auto text-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs leading-[14.52px] font-light text-gray-500",
                                        children: "Upload a cover photo that will help your potential clients understand your project and increase your chance of getting featured."
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 528,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 527,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "mt-3 flex items-center justify-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-center leading-[14.52px] text-gray-500",
                                        children: "Recommended Size: 1600px x 1200px"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 536,
                                        columnNumber: 19
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 535,
                                    columnNumber: 17
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 502,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs leading-[14.52px] text-gray-500 block",
                            children: [
                                "Supported formats:",
                                " ",
                                acceptedExtensions.map((item)=>item.toUpperCase()).join(", ")
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 542,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                    lineNumber: 501,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
        lineNumber: 306,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s1(Dropzone, "ffBUJbNsLnn1B0l10sWYiwJykao=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"]
    ];
});
_c1 = Dropzone;
const SquareShapeDropzoneSuccess = ({ meta, onRemove, open })=>{
    _s2();
    const [dataUrl, setDataUrl] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]();
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "SquareShapeDropzoneSuccess.useEffect": ()=>{
            const reader = new FileReader();
            const onLoad = {
                "SquareShapeDropzoneSuccess.useEffect.onLoad": ()=>{
                    setDataUrl(reader.result);
                }
            }["SquareShapeDropzoneSuccess.useEffect.onLoad"];
            reader.addEventListener("load", onLoad);
            reader.readAsDataURL(meta);
            return ({
                "SquareShapeDropzoneSuccess.useEffect": ()=>{
                    reader.removeEventListener("load", onLoad);
                }
            })["SquareShapeDropzoneSuccess.useEffect"];
        }
    }["SquareShapeDropzoneSuccess.useEffect"], [
        meta
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "group relative border-2 border-gray-300 rounded-[5px] h-[100px] overflow-hidden",
        children: [
            dataUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                className: "size-full object-cover",
                src: dataUrl,
                alt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFileName"])(meta)
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 581,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 bg-black/20 opacity-0 transition duration-300 group-hover:opacity-100",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-x-2 px-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "hover:bg-black inline-flex text-xs items-center font-semibold text-white gap-x-1.5 py-1.5 px-2.5 rounded-[5px] bg-black/40 focus-visible:outline-none",
                            onClick: open,
                            type: "button",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Repeat04"], {
                                    className: "size-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 595,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                " Change Image"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 590,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "hover:bg-black hover:text-error-500 inline-flex text-xs items-center font-semibold text-white gap-x-1.5 py-1.5 px-2.5 rounded-[5px] bg-black/40 focus-visible:outline-none",
                            onClick: onRemove,
                            type: "button",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash01"], {
                                    className: "size-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 602,
                                    columnNumber: 13
                                }, ("TURBOPACK compile-time value", void 0)),
                                " Remove"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 597,
                            columnNumber: 11
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                    lineNumber: 589,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 588,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                className: "absolute right-2.5 transition duration-300 group-hover:opacity-100 opacity-0 text-white hover:text-error-500 top-2.5 size-7 focus-visible:outline-none bg-black/20 hover:bg-black rounded-full inline-flex items-center justify-center",
                onClick: onRemove,
                type: "button",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash01"], {
                    className: "size-4"
                }, void 0, false, {
                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                    lineNumber: 612,
                    columnNumber: 9
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 607,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
        lineNumber: 579,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s2(SquareShapeDropzoneSuccess, "xlV6dsvOqPfCMxXhx7SOi7WD4G0=");
_c2 = SquareShapeDropzoneSuccess;
const SquareShapeDropzone = ({ maxFiles = 1, maxSize = ONE_MB * 2, onError, value: valueProp, onValueChange, onRetry: onRetryProp, acceptedExtensions = ACCEPTED_EXTENSIONS, onBlur, className })=>{
    _s3();
    const [, setErrors] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        onChange: {
            "SquareShapeDropzone.useControllableState": (errors)=>{
                onError?.(errors?.join(" "));
            }
        }["SquareShapeDropzone.useControllableState"]
    });
    const [value, setValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        value: valueProp,
        onChange: onValueChange
    });
    const [isDragAccept, toggleIsDragAccept] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    const [hasValidationError, toggleHasValidationError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"])({
        "SquareShapeDropzone.useMount": ()=>{
            const controlled = value !== undefined;
            if (controlled) {
                toggleIsDragAccept(true);
            }
        }
    }["SquareShapeDropzone.useMount"]);
    const onDropRejected = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SquareShapeDropzone.useCallback[onDropRejected]": (fileRejections)=>{
            const errors = fileRejections.reduce({
                "SquareShapeDropzone.useCallback[onDropRejected].errors": (prevValue, { errors })=>{
                    toggleIsDragAccept(false);
                    toggleHasValidationError(true);
                    const { message } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getFirstItem"])([
                        ...errors
                    ]);
                    const hasMessageAlready = prevValue.includes(message);
                    return hasMessageAlready ? prevValue : [
                        ...prevValue,
                        message
                    ];
                }
            }["SquareShapeDropzone.useCallback[onDropRejected].errors"], []);
            setErrors(errors);
        }
    }["SquareShapeDropzone.useCallback[onDropRejected]"], [
        setErrors,
        toggleIsDragAccept,
        toggleHasValidationError
    ]);
    const onDropAccept = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SquareShapeDropzone.useCallback[onDropAccept]": (acceptedFiles)=>{
            const value = acceptedFiles.reduce({
                "SquareShapeDropzone.useCallback[onDropAccept].value": (prevValue, currentValue)=>{
                    toggleIsDragAccept(true);
                    setErrors(undefined);
                    toggleHasValidationError(false);
                    return [
                        ...prevValue,
                        {
                            meta: currentValue,
                            hasError: false,
                            progress: 0
                        }
                    ];
                }
            }["SquareShapeDropzone.useCallback[onDropAccept].value"], []);
            setValue(value);
        }
    }["SquareShapeDropzone.useCallback[onDropAccept]"], [
        setValue,
        toggleIsDragAccept,
        setErrors,
        toggleHasValidationError
    ]);
    const onDrop = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SquareShapeDropzone.useCallback[onDrop]": (acceptedFiles, fileRejections)=>{
            const isEmpty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsEmpty"])(fileRejections);
            if (isEmpty) onDropAccept(acceptedFiles);
            else onDropRejected(fileRejections);
        }
    }["SquareShapeDropzone.useCallback[onDrop]"], [
        onDropAccept,
        onDropRejected
    ]);
    const validator = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SquareShapeDropzone.useCallback[validator]": (file)=>{
            const hasExtension = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$dom$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHasExtension"])({
                extensions: acceptedExtensions,
                meta: file
            });
            if (hasExtension) return null;
            else return {
                code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$utils$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ErrorCode"].FileInvalidType,
                message: `Must be in ${acceptedExtensions.join(" ")} format(s)`
            };
        }
    }["SquareShapeDropzone.useCallback[validator]"], [
        acceptedExtensions
    ]);
    const onRemove = (index)=>{
        setValue((prev)=>{
            const nextState = prev?.filter((item, i)=>i !== index);
            const isEmpty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getIsEmpty"])(nextState);
            if (isEmpty) {
                toggleIsDragAccept(false);
                return undefined;
            }
            return nextState;
        });
    };
    const { getInputProps, getRootProps, open } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"])({
        noKeyboard: true,
        onDrop: onDrop,
        validator,
        maxSize,
        maxFiles,
        multiple: maxFiles > 1,
        noClick: true
    });
    const onRetryPropRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"])(onRetryProp);
    const onRetry = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SquareShapeDropzone.useCallback[onRetry]": (index)=>{
            onRetryPropRef();
            setValue({
                "SquareShapeDropzone.useCallback[onRetry]": (prev)=>prev?.reduce({
                        "SquareShapeDropzone.useCallback[onRetry]": (prevValue, currentValue, currentIndex)=>currentIndex == index ? [
                                ...prevValue,
                                {
                                    ...currentValue,
                                    hasError: false
                                }
                            ] : [
                                ...prevValue,
                                currentValue
                            ]
                    }["SquareShapeDropzone.useCallback[onRetry]"], [])
            }["SquareShapeDropzone.useCallback[onRetry]"]);
        }
    }["SquareShapeDropzone.useCallback[onRetry]"], [
        onRetryPropRef,
        setValue
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ...getRootProps({
            onBlur
        }),
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg focus-visible:outline-none", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ...getInputProps()
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 769,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            isDragAccept ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: value?.map(({ hasError, progress, meta }, idx)=>{
                    const hasUploaded = progress === 100;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: hasError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "h-[100px] shrink-0 grid place-items-center rounded-[5px] border-2 border-error-300 border-dashed bg-error-25",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$button$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                visual: "error",
                                variant: "link",
                                onClick: ()=>onRetry(idx),
                                type: "button",
                                children: "Try again"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 779,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 778,
                            columnNumber: 19
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: hasUploaded ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SquareShapeDropzoneSuccess, {
                                meta: meta,
                                onRemove: ()=>onRemove(idx),
                                open: open
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 791,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "border-2 border-gray-300 border-dashed rounded-[5px] h-[100px]",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "pt-[25px]",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center justify-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CircularProgress"], {
                                                size: 32,
                                                strokeWidth: 3,
                                                value: progress,
                                                show: false
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 800,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 799,
                                            columnNumber: 27
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "mt-[7px] text-sm text-gray-500 text-center",
                                            children: [
                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertToKbOrMb"])(meta.size),
                                                " - ",
                                                progress,
                                                "%"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 808,
                                            columnNumber: 27
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 798,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 797,
                                columnNumber: 23
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false)
                    }, idx, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 776,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0));
                })
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 771,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group h-[100px] w-full focus-visible:outline-none rounded-[5px] border-2 border-gray-200 border-dashed hover:border-gray-400 bg-gray-50 transition hover:bg-gray-100 flex flex-col gap-y-2 p-5 items-center justify-center", {
                        "border-error-500 hover:border-error-500": hasValidationError
                    }),
                    onClick: open,
                    type: "button",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Plus"], {
                            className: "size-6 transition text-gray-500 group-aria-checked:hover:text-gray-600"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 832,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm leading-50 font-semibold transition text-gray-500 group-hover:text-gray-600",
                            children: "Image"
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 834,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                    lineNumber: 822,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
        lineNumber: 763,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s3(SquareShapeDropzone, "ffBUJbNsLnn1B0l10sWYiwJykao=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useToggle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useToggle$3e$__["useToggle"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$use$2f$esm$2f$useMount$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__useMount$3e$__["useMount"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallbackRef"]
    ];
});
_c3 = SquareShapeDropzone;
const CircularProgressDropzone = ({ value, onChange, className, onBlur, onTryAgain, maxFiles = 0, icon = false, accepted = [
    ".svg",
    ".png",
    ".gif",
    ".jpg"
] })=>{
    _s4();
    const [isDragAccept, { off, on }] = __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToggle"]();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"])({
        value,
        onChange
    });
    const clear = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "CircularProgressDropzone.useCallback[clear]": ()=>setState(undefined)
    }["CircularProgressDropzone.useCallback[clear]"], [
        setState
    ]);
    const update = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "CircularProgressDropzone.useCallback[update]": (cb)=>setState({
                "CircularProgressDropzone.useCallback[update]": (prev)=>prev?.map({
                        "CircularProgressDropzone.useCallback[update]": (value)=>cb(value)
                    }["CircularProgressDropzone.useCallback[update]"])
            }["CircularProgressDropzone.useCallback[update]"])
    }["CircularProgressDropzone.useCallback[update]"], [
        setState
    ]);
    const onDropAccepted = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "CircularProgressDropzone.useCallback[onDropAccepted]": (files)=>{
            setState({
                "CircularProgressDropzone.useCallback[onDropAccepted]": ()=>files.map({
                        "CircularProgressDropzone.useCallback[onDropAccepted]": (data)=>{
                            const { name, size } = data;
                            const category = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isImg"])(name) ? "img" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isVideo"])(name) ? "video" : (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isDoc"])(name) ? "doc" : "other";
                            return {
                                category,
                                name,
                                data,
                                hasError: false,
                                id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getId"])(),
                                progress: 0,
                                size: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertToKbOrMb"])(size)
                            };
                        }
                    }["CircularProgressDropzone.useCallback[onDropAccepted]"])
            }["CircularProgressDropzone.useCallback[onDropAccepted]"]);
            on();
        }
    }["CircularProgressDropzone.useCallback[onDropAccepted]"], [
        on,
        setState
    ]);
    const onDropRejected = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "CircularProgressDropzone.useCallback[onDropRejected]": ()=>{
            off();
            clear();
        }
    }["CircularProgressDropzone.useCallback[onDropRejected]"], [
        off,
        clear
    ]);
    const onDelete = (id)=>{
        if (!state) return;
        const result = state.filter((value)=>value.id !== id);
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isEmpty"])(result)) {
            setState(undefined);
            off();
        } else {
            setState(result);
        }
    };
    const onRecover = (id)=>{
        update((value)=>value.id === id ? {
                ...value,
                hasError: false
            } : value);
        onTryAgain?.();
    };
    const { getInputProps, getRootProps, open } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"])({
        noClick: true,
        noKeyboard: true,
        maxFiles,
        onDropAccepted,
        onDropRejected,
        multiple: maxFiles > 1,
        validator: {
            "CircularProgressDropzone.useDropzone": (data)=>{
                if (!accepted) return null;
                const isValid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["verifyFileType"])(data.name, accepted);
                return isValid ? null : {
                    code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$utils$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ErrorCode"].FileInvalidType,
                    message: "Its type is invalid"
                };
            }
        }["CircularProgressDropzone.useDropzone"]
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ...getRootProps({
            onBlur
        }),
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-lg focus-visible:outline-none", className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ...getInputProps()
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 973,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0)),
            isDragAccept ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3",
                children: state?.map(({ category, hasError, id, name, progress, size })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: hasError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex gap-x-1 rounded-lg border border-error-300 bg-error-25 pb-4 pl-4 pr-2 pt-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex flex-auto gap-x-4 pt-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-error-50 bg-error-100 text-error-500",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 982,
                                                columnNumber: 23
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 981,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex-auto",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-sm font-medium text-error-500",
                                                    children: name
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 985,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block text-sm text-error-500",
                                                    children: [
                                                        size,
                                                        " - ",
                                                        progress,
                                                        "% uploaded"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 988,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                    className: "ml-1 text-sm font-semibold text-error-500 hover:underline focus-visible:outline-none",
                                                    onClick: ()=>onRecover(id),
                                                    children: "Try again"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 991,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 984,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 980,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$icon$2d$button$2f$icon$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["IconButton"], {
                                    variant: "ghost",
                                    visual: "error",
                                    onClick: ()=>onDelete(id),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trash2"], {
                                        className: "h-5 w-5"
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 1004,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 999,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 979,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "relative rounded-lg border border-gray-200 bg-white p-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "absolute inset-0 overflow-hidden rounded-lg",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "h-full w-full translate-x-[--translate-x] bg-gray-50 transition duration-500",
                                        style: {
                                            ...{
                                                "--translate-x": (0, __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$functions$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toPercentage"])(-(100 - progress))
                                            }
                                        }
                                    }, void 0, false, {
                                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                        lineNumber: 1010,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 1009,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "relative flex items-start",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "inline-flex h-8 w-8 flex-none items-center justify-center rounded-full border-[4px] border-primary-25 bg-primary-50 text-primary-500",
                                            children: [
                                                category === "img" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Image"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1021,
                                                    columnNumber: 46
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                category === "doc" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["File"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1022,
                                                    columnNumber: 46
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                category === "video" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Video"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1023,
                                                    columnNumber: 48
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                category === "other" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1025,
                                                    columnNumber: 25
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 1020,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "ml-4 flex-auto",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-sm font-medium text-gray-700",
                                                    children: name
                                                }, void 0, false, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1029,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "block text-sm text-gray-600",
                                                    children: [
                                                        size,
                                                        " - ",
                                                        progress,
                                                        "% uploaded"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                    lineNumber: 1032,
                                                    columnNumber: 23
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 1028,
                                            columnNumber: 21
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        progress === 100 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "ml-4 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary-500",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Check"], {
                                                className: "h-2.5 w-2.5 text-white"
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 1038,
                                                columnNumber: 25
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 1037,
                                            columnNumber: 23
                                        }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "ml-2 flex-none",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$progress$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CircularProgress"], {
                                                show: false,
                                                value: progress,
                                                size: 32,
                                                strokeWidth: 4
                                            }, void 0, false, {
                                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                                lineNumber: 1042,
                                                columnNumber: 25
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                            lineNumber: 1041,
                                            columnNumber: 23
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                    lineNumber: 1019,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 1008,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0))
                    }, id, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 977,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)))
            }, void 0, false, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 975,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-lg border border-gray-200 bg-white px-6 py-4 hover:border-primary-500 hover:ring-1 hover:ring-primary-500",
                children: [
                    icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex items-center justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "inline-flex h-10 w-10 items-center justify-center rounded-full border-[6px] border-gray-50 bg-gray-100",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$blend$2d$metrics$2f$icons$2f$dist$2f$icons$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UploadCloud"], {
                                className: "h-5 w-5 text-gray-500"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 1061,
                                columnNumber: 17
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 1060,
                            columnNumber: 15
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 1059,
                        columnNumber: 13
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-center gap-x-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                className: "text-center text-sm font-semibold text-primary-500 hover:underline focus:outline-none",
                                onClick: open,
                                type: "button",
                                children: "Click to upload"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 1066,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-center text-sm text-gray-600",
                                children: "or drag and drop"
                            }, void 0, false, {
                                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                                lineNumber: 1073,
                                columnNumber: 13
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 1065,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 flex justify-center",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-center text-sm leading-[18px] text-gray-600",
                            children: accepted.join(" ")
                        }, void 0, false, {
                            fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                            lineNumber: 1078,
                            columnNumber: 13
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                        lineNumber: 1077,
                        columnNumber: 11
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/components/ui/dropzone/dropzone.tsx",
                lineNumber: 1057,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/components/ui/dropzone/dropzone.tsx",
        lineNumber: 967,
        columnNumber: 5
    }, ("TURBOPACK compile-time value", void 0));
};
_s4(CircularProgressDropzone, "NSk0U9nJS16x8LAULmFeoXLVUC8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useToggle"],
        __TURBOPACK__imported__module__$5b$project$5d2f$utils$2f$hooks$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useControllableState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2d$dropzone$2f$dist$2f$es$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useDropzone"]
    ];
});
_c4 = CircularProgressDropzone;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "Success");
__turbopack_context__.k.register(_c1, "Dropzone");
__turbopack_context__.k.register(_c2, "SquareShapeDropzoneSuccess");
__turbopack_context__.k.register(_c3, "SquareShapeDropzone");
__turbopack_context__.k.register(_c4, "CircularProgressDropzone");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ui/dropzone/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ui$2f$dropzone$2f$dropzone$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ui/dropzone/dropzone.tsx [app-client] (ecmascript)");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_ui_dropzone_08v8_x~._.js.map