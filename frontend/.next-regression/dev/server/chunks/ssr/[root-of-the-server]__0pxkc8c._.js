module.exports = [
"[project]/node_modules/jwt-decode/build/esm/index.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InvalidTokenError",
    ()=>InvalidTokenError,
    "jwtDecode",
    ()=>jwtDecode
]);
class InvalidTokenError extends Error {
}
InvalidTokenError.prototype.name = "InvalidTokenError";
function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).replace(/(.)/g, (m, p)=>{
        let code = p.charCodeAt(0).toString(16).toUpperCase();
        if (code.length < 2) {
            code = "0" + code;
        }
        return "%" + code;
    }));
}
function base64UrlDecode(str) {
    let output = str.replace(/-/g, "+").replace(/_/g, "/");
    switch(output.length % 4){
        case 0:
            break;
        case 2:
            output += "==";
            break;
        case 3:
            output += "=";
            break;
        default:
            throw new Error("base64 string is not of the correct length");
    }
    try {
        return b64DecodeUnicode(output);
    } catch (err) {
        return atob(output);
    }
}
function jwtDecode(token, options) {
    if (typeof token !== "string") {
        throw new InvalidTokenError("Invalid token specified: must be a string");
    }
    options || (options = {});
    const pos = options.header === true ? 0 : 1;
    const part = token.split(".")[pos];
    if (typeof part !== "string") {
        throw new InvalidTokenError(`Invalid token specified: missing part #${pos + 1}`);
    }
    let decoded;
    try {
        decoded = base64UrlDecode(part);
    } catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid base64 for part #${pos + 1} (${e.message})`);
    }
    try {
        return JSON.parse(decoded);
    } catch (e) {
        throw new InvalidTokenError(`Invalid token specified: invalid json for part #${pos + 1} (${e.message})`);
    }
}
}),
"[project]/node_modules/@sindresorhus/is/dist/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/// <reference lib="es2018"/>
/// <reference lib="dom"/>
/// <reference types="node"/>
Object.defineProperty(exports, "__esModule", {
    value: true
});
const typedArrayTypeNames = [
    'Int8Array',
    'Uint8Array',
    'Uint8ClampedArray',
    'Int16Array',
    'Uint16Array',
    'Int32Array',
    'Uint32Array',
    'Float32Array',
    'Float64Array',
    'BigInt64Array',
    'BigUint64Array'
];
function isTypedArrayName(name) {
    return typedArrayTypeNames.includes(name);
}
const objectTypeNames = [
    'Function',
    'Generator',
    'AsyncGenerator',
    'GeneratorFunction',
    'AsyncGeneratorFunction',
    'AsyncFunction',
    'Observable',
    'Array',
    'Buffer',
    'Blob',
    'Object',
    'RegExp',
    'Date',
    'Error',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'ArrayBuffer',
    'SharedArrayBuffer',
    'DataView',
    'Promise',
    'URL',
    'FormData',
    'URLSearchParams',
    'HTMLElement',
    ...typedArrayTypeNames
];
function isObjectTypeName(name) {
    return objectTypeNames.includes(name);
}
const primitiveTypeNames = [
    'null',
    'undefined',
    'string',
    'number',
    'bigint',
    'boolean',
    'symbol'
];
function isPrimitiveTypeName(name) {
    return primitiveTypeNames.includes(name);
}
// eslint-disable-next-line @typescript-eslint/ban-types
function isOfType(type) {
    return (value)=>typeof value === type;
}
const { toString } = Object.prototype;
const getObjectType = (value)=>{
    const objectTypeName = toString.call(value).slice(8, -1);
    if (/HTML\w+Element/.test(objectTypeName) && is.domElement(value)) {
        return 'HTMLElement';
    }
    if (isObjectTypeName(objectTypeName)) {
        return objectTypeName;
    }
    return undefined;
};
const isObjectOfType = (type)=>(value)=>getObjectType(value) === type;
function is(value) {
    if (value === null) {
        return 'null';
    }
    switch(typeof value){
        case 'undefined':
            return 'undefined';
        case 'string':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'function':
            return 'Function';
        case 'bigint':
            return 'bigint';
        case 'symbol':
            return 'symbol';
        default:
    }
    if (is.observable(value)) {
        return 'Observable';
    }
    if (is.array(value)) {
        return 'Array';
    }
    if (is.buffer(value)) {
        return 'Buffer';
    }
    const tagType = getObjectType(value);
    if (tagType) {
        return tagType;
    }
    if (value instanceof String || value instanceof Boolean || value instanceof Number) {
        throw new TypeError('Please don\'t use object wrappers for primitive types');
    }
    return 'Object';
}
is.undefined = isOfType('undefined');
is.string = isOfType('string');
const isNumberType = isOfType('number');
is.number = (value)=>isNumberType(value) && !is.nan(value);
is.bigint = isOfType('bigint');
// eslint-disable-next-line @typescript-eslint/ban-types
is.function_ = isOfType('function');
is.null_ = (value)=>value === null;
is.class_ = (value)=>is.function_(value) && value.toString().startsWith('class ');
is.boolean = (value)=>value === true || value === false;
is.symbol = isOfType('symbol');
is.numericString = (value)=>is.string(value) && !is.emptyStringOrWhitespace(value) && !Number.isNaN(Number(value));
is.array = (value, assertion)=>{
    if (!Array.isArray(value)) {
        return false;
    }
    if (!is.function_(assertion)) {
        return true;
    }
    return value.every(assertion);
};
is.buffer = (value)=>{
    var _a, _b, _c, _d;
    return (_d = (_c = (_b = (_a = value) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.isBuffer) === null || _c === void 0 ? void 0 : _c.call(_b, value)) !== null && _d !== void 0 ? _d : false;
};
is.blob = (value)=>isObjectOfType('Blob')(value);
is.nullOrUndefined = (value)=>is.null_(value) || is.undefined(value);
is.object = (value)=>!is.null_(value) && (typeof value === 'object' || is.function_(value));
is.iterable = (value)=>{
    var _a;
    return is.function_((_a = value) === null || _a === void 0 ? void 0 : _a[Symbol.iterator]);
};
is.asyncIterable = (value)=>{
    var _a;
    return is.function_((_a = value) === null || _a === void 0 ? void 0 : _a[Symbol.asyncIterator]);
};
is.generator = (value)=>{
    var _a, _b;
    return is.iterable(value) && is.function_((_a = value) === null || _a === void 0 ? void 0 : _a.next) && is.function_((_b = value) === null || _b === void 0 ? void 0 : _b.throw);
};
is.asyncGenerator = (value)=>is.asyncIterable(value) && is.function_(value.next) && is.function_(value.throw);
is.nativePromise = (value)=>isObjectOfType('Promise')(value);
const hasPromiseAPI = (value)=>{
    var _a, _b;
    return is.function_((_a = value) === null || _a === void 0 ? void 0 : _a.then) && is.function_((_b = value) === null || _b === void 0 ? void 0 : _b.catch);
};
is.promise = (value)=>is.nativePromise(value) || hasPromiseAPI(value);
is.generatorFunction = isObjectOfType('GeneratorFunction');
is.asyncGeneratorFunction = (value)=>getObjectType(value) === 'AsyncGeneratorFunction';
is.asyncFunction = (value)=>getObjectType(value) === 'AsyncFunction';
// eslint-disable-next-line no-prototype-builtins, @typescript-eslint/ban-types
is.boundFunction = (value)=>is.function_(value) && !value.hasOwnProperty('prototype');
is.regExp = isObjectOfType('RegExp');
is.date = isObjectOfType('Date');
is.error = isObjectOfType('Error');
is.map = (value)=>isObjectOfType('Map')(value);
is.set = (value)=>isObjectOfType('Set')(value);
is.weakMap = (value)=>isObjectOfType('WeakMap')(value);
is.weakSet = (value)=>isObjectOfType('WeakSet')(value);
is.int8Array = isObjectOfType('Int8Array');
is.uint8Array = isObjectOfType('Uint8Array');
is.uint8ClampedArray = isObjectOfType('Uint8ClampedArray');
is.int16Array = isObjectOfType('Int16Array');
is.uint16Array = isObjectOfType('Uint16Array');
is.int32Array = isObjectOfType('Int32Array');
is.uint32Array = isObjectOfType('Uint32Array');
is.float32Array = isObjectOfType('Float32Array');
is.float64Array = isObjectOfType('Float64Array');
is.bigInt64Array = isObjectOfType('BigInt64Array');
is.bigUint64Array = isObjectOfType('BigUint64Array');
is.arrayBuffer = isObjectOfType('ArrayBuffer');
is.sharedArrayBuffer = isObjectOfType('SharedArrayBuffer');
is.dataView = isObjectOfType('DataView');
is.enumCase = (value, targetEnum)=>Object.values(targetEnum).includes(value);
is.directInstanceOf = (instance, class_)=>Object.getPrototypeOf(instance) === class_.prototype;
is.urlInstance = (value)=>isObjectOfType('URL')(value);
is.urlString = (value)=>{
    if (!is.string(value)) {
        return false;
    }
    try {
        new URL(value); // eslint-disable-line no-new
        return true;
    } catch (_a) {
        return false;
    }
};
// Example: `is.truthy = (value: unknown): value is (not false | not 0 | not '' | not undefined | not null) => Boolean(value);`
is.truthy = (value)=>Boolean(value);
// Example: `is.falsy = (value: unknown): value is (not true | 0 | '' | undefined | null) => Boolean(value);`
is.falsy = (value)=>!value;
is.nan = (value)=>Number.isNaN(value);
is.primitive = (value)=>is.null_(value) || isPrimitiveTypeName(typeof value);
is.integer = (value)=>Number.isInteger(value);
is.safeInteger = (value)=>Number.isSafeInteger(value);
is.plainObject = (value)=>{
    // From: https://github.com/sindresorhus/is-plain-obj/blob/main/index.js
    if (toString.call(value) !== '[object Object]') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.getPrototypeOf({});
};
is.typedArray = (value)=>isTypedArrayName(getObjectType(value));
const isValidLength = (value)=>is.safeInteger(value) && value >= 0;
is.arrayLike = (value)=>!is.nullOrUndefined(value) && !is.function_(value) && isValidLength(value.length);
is.inRange = (value, range)=>{
    if (is.number(range)) {
        return value >= Math.min(0, range) && value <= Math.max(range, 0);
    }
    if (is.array(range) && range.length === 2) {
        return value >= Math.min(...range) && value <= Math.max(...range);
    }
    throw new TypeError(`Invalid range: ${JSON.stringify(range)}`);
};
const NODE_TYPE_ELEMENT = 1;
const DOM_PROPERTIES_TO_CHECK = [
    'innerHTML',
    'ownerDocument',
    'style',
    'attributes',
    'nodeValue'
];
is.domElement = (value)=>{
    return is.object(value) && value.nodeType === NODE_TYPE_ELEMENT && is.string(value.nodeName) && !is.plainObject(value) && DOM_PROPERTIES_TO_CHECK.every((property)=>property in value);
};
is.observable = (value)=>{
    var _a, _b, _c, _d;
    if (!value) {
        return false;
    }
    // eslint-disable-next-line no-use-extend-native/no-use-extend-native
    if (value === ((_b = (_a = value)[Symbol.observable]) === null || _b === void 0 ? void 0 : _b.call(_a))) {
        return true;
    }
    if (value === ((_d = (_c = value)['@@observable']) === null || _d === void 0 ? void 0 : _d.call(_c))) {
        return true;
    }
    return false;
};
is.nodeStream = (value)=>is.object(value) && is.function_(value.pipe) && !is.observable(value);
is.infinite = (value)=>value === Infinity || value === -Infinity;
const isAbsoluteMod2 = (remainder)=>(value)=>is.integer(value) && Math.abs(value % 2) === remainder;
is.evenInteger = isAbsoluteMod2(0);
is.oddInteger = isAbsoluteMod2(1);
is.emptyArray = (value)=>is.array(value) && value.length === 0;
is.nonEmptyArray = (value)=>is.array(value) && value.length > 0;
is.emptyString = (value)=>is.string(value) && value.length === 0;
const isWhiteSpaceString = (value)=>is.string(value) && !/\S/.test(value);
is.emptyStringOrWhitespace = (value)=>is.emptyString(value) || isWhiteSpaceString(value);
// TODO: Use `not ''` when the `not` operator is available.
is.nonEmptyString = (value)=>is.string(value) && value.length > 0;
// TODO: Use `not ''` when the `not` operator is available.
is.nonEmptyStringAndNotWhitespace = (value)=>is.string(value) && !is.emptyStringOrWhitespace(value);
is.emptyObject = (value)=>is.object(value) && !is.map(value) && !is.set(value) && Object.keys(value).length === 0;
// TODO: Use `not` operator here to remove `Map` and `Set` from type guard:
// - https://github.com/Microsoft/TypeScript/pull/29317
is.nonEmptyObject = (value)=>is.object(value) && !is.map(value) && !is.set(value) && Object.keys(value).length > 0;
is.emptySet = (value)=>is.set(value) && value.size === 0;
is.nonEmptySet = (value)=>is.set(value) && value.size > 0;
is.emptyMap = (value)=>is.map(value) && value.size === 0;
is.nonEmptyMap = (value)=>is.map(value) && value.size > 0;
// `PropertyKey` is any value that can be used as an object key (string, number, or symbol)
is.propertyKey = (value)=>is.any([
        is.string,
        is.number,
        is.symbol
    ], value);
is.formData = (value)=>isObjectOfType('FormData')(value);
is.urlSearchParams = (value)=>isObjectOfType('URLSearchParams')(value);
const predicateOnArray = (method, predicate, values)=>{
    if (!is.function_(predicate)) {
        throw new TypeError(`Invalid predicate: ${JSON.stringify(predicate)}`);
    }
    if (values.length === 0) {
        throw new TypeError('Invalid number of values');
    }
    return method.call(values, predicate);
};
is.any = (predicate, ...values)=>{
    const predicates = is.array(predicate) ? predicate : [
        predicate
    ];
    return predicates.some((singlePredicate)=>predicateOnArray(Array.prototype.some, singlePredicate, values));
};
is.all = (predicate, ...values)=>predicateOnArray(Array.prototype.every, predicate, values);
const assertType = (condition, description, value, options = {})=>{
    if (!condition) {
        const { multipleValues } = options;
        const valuesMessage = multipleValues ? `received values of types ${[
            ...new Set(value.map((singleValue)=>`\`${is(singleValue)}\``))
        ].join(', ')}` : `received value of type \`${is(value)}\``;
        throw new TypeError(`Expected value which is \`${description}\`, ${valuesMessage}.`);
    }
};
exports.assert = {
    // Unknowns.
    undefined: (value)=>assertType(is.undefined(value), 'undefined', value),
    string: (value)=>assertType(is.string(value), 'string', value),
    number: (value)=>assertType(is.number(value), 'number', value),
    bigint: (value)=>assertType(is.bigint(value), 'bigint', value),
    // eslint-disable-next-line @typescript-eslint/ban-types
    function_: (value)=>assertType(is.function_(value), 'Function', value),
    null_: (value)=>assertType(is.null_(value), 'null', value),
    class_: (value)=>assertType(is.class_(value), "Class" /* class_ */ , value),
    boolean: (value)=>assertType(is.boolean(value), 'boolean', value),
    symbol: (value)=>assertType(is.symbol(value), 'symbol', value),
    numericString: (value)=>assertType(is.numericString(value), "string with a number" /* numericString */ , value),
    array: (value, assertion)=>{
        const assert = assertType;
        assert(is.array(value), 'Array', value);
        if (assertion) {
            value.forEach(assertion);
        }
    },
    buffer: (value)=>assertType(is.buffer(value), 'Buffer', value),
    blob: (value)=>assertType(is.blob(value), 'Blob', value),
    nullOrUndefined: (value)=>assertType(is.nullOrUndefined(value), "null or undefined" /* nullOrUndefined */ , value),
    object: (value)=>assertType(is.object(value), 'Object', value),
    iterable: (value)=>assertType(is.iterable(value), "Iterable" /* iterable */ , value),
    asyncIterable: (value)=>assertType(is.asyncIterable(value), "AsyncIterable" /* asyncIterable */ , value),
    generator: (value)=>assertType(is.generator(value), 'Generator', value),
    asyncGenerator: (value)=>assertType(is.asyncGenerator(value), 'AsyncGenerator', value),
    nativePromise: (value)=>assertType(is.nativePromise(value), "native Promise" /* nativePromise */ , value),
    promise: (value)=>assertType(is.promise(value), 'Promise', value),
    generatorFunction: (value)=>assertType(is.generatorFunction(value), 'GeneratorFunction', value),
    asyncGeneratorFunction: (value)=>assertType(is.asyncGeneratorFunction(value), 'AsyncGeneratorFunction', value),
    // eslint-disable-next-line @typescript-eslint/ban-types
    asyncFunction: (value)=>assertType(is.asyncFunction(value), 'AsyncFunction', value),
    // eslint-disable-next-line @typescript-eslint/ban-types
    boundFunction: (value)=>assertType(is.boundFunction(value), 'Function', value),
    regExp: (value)=>assertType(is.regExp(value), 'RegExp', value),
    date: (value)=>assertType(is.date(value), 'Date', value),
    error: (value)=>assertType(is.error(value), 'Error', value),
    map: (value)=>assertType(is.map(value), 'Map', value),
    set: (value)=>assertType(is.set(value), 'Set', value),
    weakMap: (value)=>assertType(is.weakMap(value), 'WeakMap', value),
    weakSet: (value)=>assertType(is.weakSet(value), 'WeakSet', value),
    int8Array: (value)=>assertType(is.int8Array(value), 'Int8Array', value),
    uint8Array: (value)=>assertType(is.uint8Array(value), 'Uint8Array', value),
    uint8ClampedArray: (value)=>assertType(is.uint8ClampedArray(value), 'Uint8ClampedArray', value),
    int16Array: (value)=>assertType(is.int16Array(value), 'Int16Array', value),
    uint16Array: (value)=>assertType(is.uint16Array(value), 'Uint16Array', value),
    int32Array: (value)=>assertType(is.int32Array(value), 'Int32Array', value),
    uint32Array: (value)=>assertType(is.uint32Array(value), 'Uint32Array', value),
    float32Array: (value)=>assertType(is.float32Array(value), 'Float32Array', value),
    float64Array: (value)=>assertType(is.float64Array(value), 'Float64Array', value),
    bigInt64Array: (value)=>assertType(is.bigInt64Array(value), 'BigInt64Array', value),
    bigUint64Array: (value)=>assertType(is.bigUint64Array(value), 'BigUint64Array', value),
    arrayBuffer: (value)=>assertType(is.arrayBuffer(value), 'ArrayBuffer', value),
    sharedArrayBuffer: (value)=>assertType(is.sharedArrayBuffer(value), 'SharedArrayBuffer', value),
    dataView: (value)=>assertType(is.dataView(value), 'DataView', value),
    enumCase: (value, targetEnum)=>assertType(is.enumCase(value, targetEnum), 'EnumCase', value),
    urlInstance: (value)=>assertType(is.urlInstance(value), 'URL', value),
    urlString: (value)=>assertType(is.urlString(value), "string with a URL" /* urlString */ , value),
    truthy: (value)=>assertType(is.truthy(value), "truthy" /* truthy */ , value),
    falsy: (value)=>assertType(is.falsy(value), "falsy" /* falsy */ , value),
    nan: (value)=>assertType(is.nan(value), "NaN" /* nan */ , value),
    primitive: (value)=>assertType(is.primitive(value), "primitive" /* primitive */ , value),
    integer: (value)=>assertType(is.integer(value), "integer" /* integer */ , value),
    safeInteger: (value)=>assertType(is.safeInteger(value), "integer" /* safeInteger */ , value),
    plainObject: (value)=>assertType(is.plainObject(value), "plain object" /* plainObject */ , value),
    typedArray: (value)=>assertType(is.typedArray(value), "TypedArray" /* typedArray */ , value),
    arrayLike: (value)=>assertType(is.arrayLike(value), "array-like" /* arrayLike */ , value),
    domElement: (value)=>assertType(is.domElement(value), "HTMLElement" /* domElement */ , value),
    observable: (value)=>assertType(is.observable(value), 'Observable', value),
    nodeStream: (value)=>assertType(is.nodeStream(value), "Node.js Stream" /* nodeStream */ , value),
    infinite: (value)=>assertType(is.infinite(value), "infinite number" /* infinite */ , value),
    emptyArray: (value)=>assertType(is.emptyArray(value), "empty array" /* emptyArray */ , value),
    nonEmptyArray: (value)=>assertType(is.nonEmptyArray(value), "non-empty array" /* nonEmptyArray */ , value),
    emptyString: (value)=>assertType(is.emptyString(value), "empty string" /* emptyString */ , value),
    emptyStringOrWhitespace: (value)=>assertType(is.emptyStringOrWhitespace(value), "empty string or whitespace" /* emptyStringOrWhitespace */ , value),
    nonEmptyString: (value)=>assertType(is.nonEmptyString(value), "non-empty string" /* nonEmptyString */ , value),
    nonEmptyStringAndNotWhitespace: (value)=>assertType(is.nonEmptyStringAndNotWhitespace(value), "non-empty string and not whitespace" /* nonEmptyStringAndNotWhitespace */ , value),
    emptyObject: (value)=>assertType(is.emptyObject(value), "empty object" /* emptyObject */ , value),
    nonEmptyObject: (value)=>assertType(is.nonEmptyObject(value), "non-empty object" /* nonEmptyObject */ , value),
    emptySet: (value)=>assertType(is.emptySet(value), "empty set" /* emptySet */ , value),
    nonEmptySet: (value)=>assertType(is.nonEmptySet(value), "non-empty set" /* nonEmptySet */ , value),
    emptyMap: (value)=>assertType(is.emptyMap(value), "empty map" /* emptyMap */ , value),
    nonEmptyMap: (value)=>assertType(is.nonEmptyMap(value), "non-empty map" /* nonEmptyMap */ , value),
    propertyKey: (value)=>assertType(is.propertyKey(value), 'PropertyKey', value),
    formData: (value)=>assertType(is.formData(value), 'FormData', value),
    urlSearchParams: (value)=>assertType(is.urlSearchParams(value), 'URLSearchParams', value),
    // Numbers.
    evenInteger: (value)=>assertType(is.evenInteger(value), "even integer" /* evenInteger */ , value),
    oddInteger: (value)=>assertType(is.oddInteger(value), "odd integer" /* oddInteger */ , value),
    // Two arguments.
    directInstanceOf: (instance, class_)=>assertType(is.directInstanceOf(instance, class_), "T" /* directInstanceOf */ , instance),
    inRange: (value, range)=>assertType(is.inRange(value, range), "in range" /* inRange */ , value),
    // Variadic functions.
    any: (predicate, ...values)=>{
        return assertType(is.any(predicate, ...values), "predicate returns truthy for any value" /* any */ , values, {
            multipleValues: true
        });
    },
    all: (predicate, ...values)=>assertType(is.all(predicate, ...values), "predicate returns truthy for all values" /* all */ , values, {
            multipleValues: true
        })
};
// Some few keywords are reserved, but we'll populate them for Node.js users
// See https://github.com/Microsoft/TypeScript/issues/2536
Object.defineProperties(is, {
    class: {
        value: is.class_
    },
    function: {
        value: is.function_
    },
    null: {
        value: is.null_
    }
});
Object.defineProperties(exports.assert, {
    class: {
        value: exports.assert.class_
    },
    function: {
        value: exports.assert.function_
    },
    null: {
        value: exports.assert.null_
    }
});
exports.default = is;
// For CommonJS default export support
module.exports = is;
module.exports.default = is;
module.exports.assert = exports.assert;
}),
"[project]/node_modules/defer-to-connect/dist/source/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function isTLSSocket(socket) {
    return socket.encrypted;
}
const deferToConnect = (socket, fn)=>{
    let listeners;
    if (typeof fn === 'function') {
        const connect = fn;
        listeners = {
            connect
        };
    } else {
        listeners = fn;
    }
    const hasConnectListener = typeof listeners.connect === 'function';
    const hasSecureConnectListener = typeof listeners.secureConnect === 'function';
    const hasCloseListener = typeof listeners.close === 'function';
    const onConnect = ()=>{
        if (hasConnectListener) {
            listeners.connect();
        }
        if (isTLSSocket(socket) && hasSecureConnectListener) {
            if (socket.authorized) {
                listeners.secureConnect();
            } else if (!socket.authorizationError) {
                socket.once('secureConnect', listeners.secureConnect);
            }
        }
        if (hasCloseListener) {
            socket.once('close', listeners.close);
        }
    };
    if (socket.writable && !socket.connecting) {
        onConnect();
    } else if (socket.connecting) {
        socket.once('connect', onConnect);
    } else if (socket.destroyed && hasCloseListener) {
        listeners.close(socket._hadError);
    }
};
exports.default = deferToConnect;
// For CommonJS default export support
module.exports = deferToConnect;
module.exports.default = deferToConnect;
}),
"[project]/node_modules/@szmarczak/http-timer/dist/source/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
const defer_to_connect_1 = __turbopack_context__.r("[project]/node_modules/defer-to-connect/dist/source/index.js [app-ssr] (ecmascript)");
const util_1 = __turbopack_context__.r("[externals]/util [external] (util, cjs)");
const nodejsMajorVersion = Number(process.versions.node.split('.')[0]);
const timer = (request)=>{
    if (request.timings) {
        return request.timings;
    }
    const timings = {
        start: Date.now(),
        socket: undefined,
        lookup: undefined,
        connect: undefined,
        secureConnect: undefined,
        upload: undefined,
        response: undefined,
        end: undefined,
        error: undefined,
        abort: undefined,
        phases: {
            wait: undefined,
            dns: undefined,
            tcp: undefined,
            tls: undefined,
            request: undefined,
            firstByte: undefined,
            download: undefined,
            total: undefined
        }
    };
    request.timings = timings;
    const handleError = (origin)=>{
        const emit = origin.emit.bind(origin);
        origin.emit = (event, ...args)=>{
            // Catches the `error` event
            if (event === 'error') {
                timings.error = Date.now();
                timings.phases.total = timings.error - timings.start;
                origin.emit = emit;
            }
            // Saves the original behavior
            return emit(event, ...args);
        };
    };
    handleError(request);
    const onAbort = ()=>{
        timings.abort = Date.now();
        // Let the `end` response event be responsible for setting the total phase,
        // unless the Node.js major version is >= 13.
        if (!timings.response || nodejsMajorVersion >= 13) {
            timings.phases.total = Date.now() - timings.start;
        }
    };
    request.prependOnceListener('abort', onAbort);
    const onSocket = (socket)=>{
        timings.socket = Date.now();
        timings.phases.wait = timings.socket - timings.start;
        if (util_1.types.isProxy(socket)) {
            return;
        }
        const lookupListener = ()=>{
            timings.lookup = Date.now();
            timings.phases.dns = timings.lookup - timings.socket;
        };
        socket.prependOnceListener('lookup', lookupListener);
        defer_to_connect_1.default(socket, {
            connect: ()=>{
                timings.connect = Date.now();
                if (timings.lookup === undefined) {
                    socket.removeListener('lookup', lookupListener);
                    timings.lookup = timings.connect;
                    timings.phases.dns = timings.lookup - timings.socket;
                }
                timings.phases.tcp = timings.connect - timings.lookup;
            // This callback is called before flushing any data,
            // so we don't need to set `timings.phases.request` here.
            },
            secureConnect: ()=>{
                timings.secureConnect = Date.now();
                timings.phases.tls = timings.secureConnect - timings.connect;
            }
        });
    };
    if (request.socket) {
        onSocket(request.socket);
    } else {
        request.prependOnceListener('socket', onSocket);
    }
    const onUpload = ()=>{
        var _a;
        timings.upload = Date.now();
        timings.phases.request = timings.upload - ((_a = timings.secureConnect) !== null && _a !== void 0 ? _a : timings.connect);
    };
    const writableFinished = ()=>{
        if (typeof request.writableFinished === 'boolean') {
            return request.writableFinished;
        }
        // Node.js doesn't have `request.writableFinished` property
        return request.finished && request.outputSize === 0 && (!request.socket || request.socket.writableLength === 0);
    };
    if (writableFinished()) {
        onUpload();
    } else {
        request.prependOnceListener('finish', onUpload);
    }
    request.prependOnceListener('response', (response)=>{
        timings.response = Date.now();
        timings.phases.firstByte = timings.response - timings.upload;
        response.timings = timings;
        handleError(response);
        response.prependOnceListener('end', ()=>{
            timings.end = Date.now();
            timings.phases.download = timings.end - timings.response;
            timings.phases.total = timings.end - timings.start;
        });
        response.prependOnceListener('aborted', onAbort);
    });
    return timings;
};
exports.default = timer;
// For CommonJS default export support
module.exports = timer;
module.exports.default = timer;
}),
"[project]/node_modules/cacheable-lookup/source/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { V4MAPPED, ADDRCONFIG, ALL, promises: { Resolver: AsyncResolver }, lookup: dnsLookup } = __turbopack_context__.r("[externals]/dns [external] (dns, cjs)");
const { promisify } = __turbopack_context__.r("[externals]/util [external] (util, cjs)");
const os = __turbopack_context__.r("[externals]/os [external] (os, cjs)");
const kCacheableLookupCreateConnection = Symbol('cacheableLookupCreateConnection');
const kCacheableLookupInstance = Symbol('cacheableLookupInstance');
const kExpires = Symbol('expires');
const supportsALL = typeof ALL === 'number';
const verifyAgent = (agent)=>{
    if (!(agent && typeof agent.createConnection === 'function')) {
        throw new Error('Expected an Agent instance as the first argument');
    }
};
const map4to6 = (entries)=>{
    for (const entry of entries){
        if (entry.family === 6) {
            continue;
        }
        entry.address = `::ffff:${entry.address}`;
        entry.family = 6;
    }
};
const getIfaceInfo = ()=>{
    let has4 = false;
    let has6 = false;
    for (const device of Object.values(os.networkInterfaces())){
        for (const iface of device){
            if (iface.internal) {
                continue;
            }
            if (iface.family === 'IPv6') {
                has6 = true;
            } else {
                has4 = true;
            }
            if (has4 && has6) {
                return {
                    has4,
                    has6
                };
            }
        }
    }
    return {
        has4,
        has6
    };
};
const isIterable = (map)=>{
    return Symbol.iterator in map;
};
const ttl = {
    ttl: true
};
const all = {
    all: true
};
class CacheableLookup {
    constructor({ cache = new Map(), maxTtl = Infinity, fallbackDuration = 3600, errorTtl = 0.15, resolver = new AsyncResolver(), lookup = dnsLookup } = {}){
        this.maxTtl = maxTtl;
        this.errorTtl = errorTtl;
        this._cache = cache;
        this._resolver = resolver;
        this._dnsLookup = promisify(lookup);
        if (this._resolver instanceof AsyncResolver) {
            this._resolve4 = this._resolver.resolve4.bind(this._resolver);
            this._resolve6 = this._resolver.resolve6.bind(this._resolver);
        } else {
            this._resolve4 = promisify(this._resolver.resolve4.bind(this._resolver));
            this._resolve6 = promisify(this._resolver.resolve6.bind(this._resolver));
        }
        this._iface = getIfaceInfo();
        this._pending = {};
        this._nextRemovalTime = false;
        this._hostnamesToFallback = new Set();
        if (fallbackDuration < 1) {
            this._fallback = false;
        } else {
            this._fallback = true;
            const interval = setInterval(()=>{
                this._hostnamesToFallback.clear();
            }, fallbackDuration * 1000);
            /* istanbul ignore next: There is no `interval.unref()` when running inside an Electron renderer */ if (interval.unref) {
                interval.unref();
            }
        }
        this.lookup = this.lookup.bind(this);
        this.lookupAsync = this.lookupAsync.bind(this);
    }
    set servers(servers) {
        this.clear();
        this._resolver.setServers(servers);
    }
    get servers() {
        return this._resolver.getServers();
    }
    lookup(hostname, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        } else if (typeof options === 'number') {
            options = {
                family: options
            };
        }
        if (!callback) {
            throw new Error('Callback must be a function.');
        }
        // eslint-disable-next-line promise/prefer-await-to-then
        this.lookupAsync(hostname, options).then((result)=>{
            if (options.all) {
                callback(null, result);
            } else {
                callback(null, result.address, result.family, result.expires, result.ttl);
            }
        }, callback);
    }
    async lookupAsync(hostname, options = {}) {
        if (typeof options === 'number') {
            options = {
                family: options
            };
        }
        let cached = await this.query(hostname);
        if (options.family === 6) {
            const filtered = cached.filter((entry)=>entry.family === 6);
            if (options.hints & V4MAPPED) {
                if (supportsALL && options.hints & ALL || filtered.length === 0) {
                    map4to6(cached);
                } else {
                    cached = filtered;
                }
            } else {
                cached = filtered;
            }
        } else if (options.family === 4) {
            cached = cached.filter((entry)=>entry.family === 4);
        }
        if (options.hints & ADDRCONFIG) {
            const { _iface } = this;
            cached = cached.filter((entry)=>entry.family === 6 ? _iface.has6 : _iface.has4);
        }
        if (cached.length === 0) {
            const error = new Error(`cacheableLookup ENOTFOUND ${hostname}`);
            error.code = 'ENOTFOUND';
            error.hostname = hostname;
            throw error;
        }
        if (options.all) {
            return cached;
        }
        return cached[0];
    }
    async query(hostname) {
        let cached = await this._cache.get(hostname);
        if (!cached) {
            const pending = this._pending[hostname];
            if (pending) {
                cached = await pending;
            } else {
                const newPromise = this.queryAndCache(hostname);
                this._pending[hostname] = newPromise;
                try {
                    cached = await newPromise;
                } finally{
                    delete this._pending[hostname];
                }
            }
        }
        cached = cached.map((entry)=>{
            return {
                ...entry
            };
        });
        return cached;
    }
    async _resolve(hostname) {
        const wrap = async (promise)=>{
            try {
                return await promise;
            } catch (error) {
                if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
                    return [];
                }
                throw error;
            }
        };
        // ANY is unsafe as it doesn't trigger new queries in the underlying server.
        const [A, AAAA] = await Promise.all([
            this._resolve4(hostname, ttl),
            this._resolve6(hostname, ttl)
        ].map((promise)=>wrap(promise)));
        let aTtl = 0;
        let aaaaTtl = 0;
        let cacheTtl = 0;
        const now = Date.now();
        for (const entry of A){
            entry.family = 4;
            entry.expires = now + entry.ttl * 1000;
            aTtl = Math.max(aTtl, entry.ttl);
        }
        for (const entry of AAAA){
            entry.family = 6;
            entry.expires = now + entry.ttl * 1000;
            aaaaTtl = Math.max(aaaaTtl, entry.ttl);
        }
        if (A.length > 0) {
            if (AAAA.length > 0) {
                cacheTtl = Math.min(aTtl, aaaaTtl);
            } else {
                cacheTtl = aTtl;
            }
        } else {
            cacheTtl = aaaaTtl;
        }
        return {
            entries: [
                ...A,
                ...AAAA
            ],
            cacheTtl
        };
    }
    async _lookup(hostname) {
        try {
            const entries = await this._dnsLookup(hostname, {
                all: true
            });
            return {
                entries,
                cacheTtl: 0
            };
        } catch (_) {
            return {
                entries: [],
                cacheTtl: 0
            };
        }
    }
    async _set(hostname, data, cacheTtl) {
        if (this.maxTtl > 0 && cacheTtl > 0) {
            cacheTtl = Math.min(cacheTtl, this.maxTtl) * 1000;
            data[kExpires] = Date.now() + cacheTtl;
            try {
                await this._cache.set(hostname, data, cacheTtl);
            } catch (error) {
                this.lookupAsync = async ()=>{
                    const cacheError = new Error('Cache Error. Please recreate the CacheableLookup instance.');
                    cacheError.cause = error;
                    throw cacheError;
                };
            }
            if (isIterable(this._cache)) {
                this._tick(cacheTtl);
            }
        }
    }
    async queryAndCache(hostname) {
        if (this._hostnamesToFallback.has(hostname)) {
            return this._dnsLookup(hostname, all);
        }
        let query = await this._resolve(hostname);
        if (query.entries.length === 0 && this._fallback) {
            query = await this._lookup(hostname);
            if (query.entries.length !== 0) {
                // Use `dns.lookup(...)` for that particular hostname
                this._hostnamesToFallback.add(hostname);
            }
        }
        const cacheTtl = query.entries.length === 0 ? this.errorTtl : query.cacheTtl;
        await this._set(hostname, query.entries, cacheTtl);
        return query.entries;
    }
    _tick(ms) {
        const nextRemovalTime = this._nextRemovalTime;
        if (!nextRemovalTime || ms < nextRemovalTime) {
            clearTimeout(this._removalTimeout);
            this._nextRemovalTime = ms;
            this._removalTimeout = setTimeout(()=>{
                this._nextRemovalTime = false;
                let nextExpiry = Infinity;
                const now = Date.now();
                for (const [hostname, entries] of this._cache){
                    const expires = entries[kExpires];
                    if (now >= expires) {
                        this._cache.delete(hostname);
                    } else if (expires < nextExpiry) {
                        nextExpiry = expires;
                    }
                }
                if (nextExpiry !== Infinity) {
                    this._tick(nextExpiry - now);
                }
            }, ms);
            /* istanbul ignore next: There is no `timeout.unref()` when running inside an Electron renderer */ if (this._removalTimeout.unref) {
                this._removalTimeout.unref();
            }
        }
    }
    install(agent) {
        verifyAgent(agent);
        if (kCacheableLookupCreateConnection in agent) {
            throw new Error('CacheableLookup has been already installed');
        }
        agent[kCacheableLookupCreateConnection] = agent.createConnection;
        agent[kCacheableLookupInstance] = this;
        agent.createConnection = (options, callback)=>{
            if (!('lookup' in options)) {
                options.lookup = this.lookup;
            }
            return agent[kCacheableLookupCreateConnection](options, callback);
        };
    }
    uninstall(agent) {
        verifyAgent(agent);
        if (agent[kCacheableLookupCreateConnection]) {
            if (agent[kCacheableLookupInstance] !== this) {
                throw new Error('The agent is not owned by this CacheableLookup instance');
            }
            agent.createConnection = agent[kCacheableLookupCreateConnection];
            delete agent[kCacheableLookupCreateConnection];
            delete agent[kCacheableLookupInstance];
        }
    }
    updateInterfaceInfo() {
        const { _iface } = this;
        this._iface = getIfaceInfo();
        if (_iface.has4 && !this._iface.has4 || _iface.has6 && !this._iface.has6) {
            this._cache.clear();
        }
    }
    clear(hostname) {
        if (hostname) {
            this._cache.delete(hostname);
            return;
        }
        this._cache.clear();
    }
}
module.exports = CacheableLookup;
module.exports.default = CacheableLookup;
}),
"[project]/node_modules/normalize-url/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs
const DATA_URL_DEFAULT_MIME_TYPE = 'text/plain';
const DATA_URL_DEFAULT_CHARSET = 'us-ascii';
const testParameter = (name, filters)=>{
    return filters.some((filter)=>filter instanceof RegExp ? filter.test(name) : filter === name);
};
const normalizeDataURL = (urlString, { stripHash })=>{
    const match = /^data:(?<type>[^,]*?),(?<data>[^#]*?)(?:#(?<hash>.*))?$/.exec(urlString);
    if (!match) {
        throw new Error(`Invalid URL: ${urlString}`);
    }
    let { type, data, hash } = match.groups;
    const mediaType = type.split(';');
    hash = stripHash ? '' : hash;
    let isBase64 = false;
    if (mediaType[mediaType.length - 1] === 'base64') {
        mediaType.pop();
        isBase64 = true;
    }
    // Lowercase MIME type
    const mimeType = (mediaType.shift() || '').toLowerCase();
    const attributes = mediaType.map((attribute)=>{
        let [key, value = ''] = attribute.split('=').map((string)=>string.trim());
        // Lowercase `charset`
        if (key === 'charset') {
            value = value.toLowerCase();
            if (value === DATA_URL_DEFAULT_CHARSET) {
                return '';
            }
        }
        return `${key}${value ? `=${value}` : ''}`;
    }).filter(Boolean);
    const normalizedMediaType = [
        ...attributes
    ];
    if (isBase64) {
        normalizedMediaType.push('base64');
    }
    if (normalizedMediaType.length !== 0 || mimeType && mimeType !== DATA_URL_DEFAULT_MIME_TYPE) {
        normalizedMediaType.unshift(mimeType);
    }
    return `data:${normalizedMediaType.join(';')},${isBase64 ? data.trim() : data}${hash ? `#${hash}` : ''}`;
};
const normalizeUrl = (urlString, options)=>{
    options = {
        defaultProtocol: 'http:',
        normalizeProtocol: true,
        forceHttp: false,
        forceHttps: false,
        stripAuthentication: true,
        stripHash: false,
        stripTextFragment: true,
        stripWWW: true,
        removeQueryParameters: [
            /^utm_\w+/i
        ],
        removeTrailingSlash: true,
        removeSingleSlash: true,
        removeDirectoryIndex: false,
        sortQueryParameters: true,
        ...options
    };
    urlString = urlString.trim();
    // Data URL
    if (/^data:/i.test(urlString)) {
        return normalizeDataURL(urlString, options);
    }
    if (/^view-source:/i.test(urlString)) {
        throw new Error('`view-source:` is not supported as it is a non-standard protocol');
    }
    const hasRelativeProtocol = urlString.startsWith('//');
    const isRelativeUrl = !hasRelativeProtocol && /^\.*\//.test(urlString);
    // Prepend protocol
    if (!isRelativeUrl) {
        urlString = urlString.replace(/^(?!(?:\w+:)?\/\/)|^\/\//, options.defaultProtocol);
    }
    const urlObj = new URL(urlString);
    if (options.forceHttp && options.forceHttps) {
        throw new Error('The `forceHttp` and `forceHttps` options cannot be used together');
    }
    if (options.forceHttp && urlObj.protocol === 'https:') {
        urlObj.protocol = 'http:';
    }
    if (options.forceHttps && urlObj.protocol === 'http:') {
        urlObj.protocol = 'https:';
    }
    // Remove auth
    if (options.stripAuthentication) {
        urlObj.username = '';
        urlObj.password = '';
    }
    // Remove hash
    if (options.stripHash) {
        urlObj.hash = '';
    } else if (options.stripTextFragment) {
        urlObj.hash = urlObj.hash.replace(/#?:~:text.*?$/i, '');
    }
    // Remove duplicate slashes if not preceded by a protocol
    if (urlObj.pathname) {
        urlObj.pathname = urlObj.pathname.replace(/(?<!\b(?:[a-z][a-z\d+\-.]{1,50}:))\/{2,}/g, '/');
    }
    // Decode URI octets
    if (urlObj.pathname) {
        try {
            urlObj.pathname = decodeURI(urlObj.pathname);
        } catch (_) {}
    }
    // Remove directory index
    if (options.removeDirectoryIndex === true) {
        options.removeDirectoryIndex = [
            /^index\.[a-z]+$/
        ];
    }
    if (Array.isArray(options.removeDirectoryIndex) && options.removeDirectoryIndex.length > 0) {
        let pathComponents = urlObj.pathname.split('/');
        const lastComponent = pathComponents[pathComponents.length - 1];
        if (testParameter(lastComponent, options.removeDirectoryIndex)) {
            pathComponents = pathComponents.slice(0, pathComponents.length - 1);
            urlObj.pathname = pathComponents.slice(1).join('/') + '/';
        }
    }
    if (urlObj.hostname) {
        // Remove trailing dot
        urlObj.hostname = urlObj.hostname.replace(/\.$/, '');
        // Remove `www.`
        if (options.stripWWW && /^www\.(?!www\.)(?:[a-z\-\d]{1,63})\.(?:[a-z.\-\d]{2,63})$/.test(urlObj.hostname)) {
            // Each label should be max 63 at length (min: 1).
            // Source: https://en.wikipedia.org/wiki/Hostname#Restrictions_on_valid_host_names
            // Each TLD should be up to 63 characters long (min: 2).
            // It is technically possible to have a single character TLD, but none currently exist.
            urlObj.hostname = urlObj.hostname.replace(/^www\./, '');
        }
    }
    // Remove query unwanted parameters
    if (Array.isArray(options.removeQueryParameters)) {
        for (const key of [
            ...urlObj.searchParams.keys()
        ]){
            if (testParameter(key, options.removeQueryParameters)) {
                urlObj.searchParams.delete(key);
            }
        }
    }
    if (options.removeQueryParameters === true) {
        urlObj.search = '';
    }
    // Sort query parameters
    if (options.sortQueryParameters) {
        urlObj.searchParams.sort();
    }
    if (options.removeTrailingSlash) {
        urlObj.pathname = urlObj.pathname.replace(/\/$/, '');
    }
    const oldUrlString = urlString;
    // Take advantage of many of the Node `url` normalizations
    urlString = urlObj.toString();
    if (!options.removeSingleSlash && urlObj.pathname === '/' && !oldUrlString.endsWith('/') && urlObj.hash === '') {
        urlString = urlString.replace(/\/$/, '');
    }
    // Remove ending `/` unless removeSingleSlash is false
    if ((options.removeTrailingSlash || urlObj.pathname === '/') && urlObj.hash === '' && options.removeSingleSlash) {
        urlString = urlString.replace(/\/$/, '');
    }
    // Restore relative protocol, if applicable
    if (hasRelativeProtocol && !options.normalizeProtocol) {
        urlString = urlString.replace(/^http:\/\//, '//');
    }
    // Remove http/https
    if (options.stripProtocol) {
        urlString = urlString.replace(/^(?:https?:)?\/\//, '');
    }
    return urlString;
};
module.exports = normalizeUrl;
}),
"[project]/node_modules/wrappy/wrappy.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy;
function wrappy(fn, cb) {
    if (fn && cb) return wrappy(fn)(cb);
    if (typeof fn !== 'function') throw new TypeError('need wrapper function');
    Object.keys(fn).forEach(function(k) {
        wrapper[k] = fn[k];
    });
    return wrapper;
    //TURBOPACK unreachable
    ;
    function wrapper() {
        var args = new Array(arguments.length);
        for(var i = 0; i < args.length; i++){
            args[i] = arguments[i];
        }
        var ret = fn.apply(this, args);
        var cb = args[args.length - 1];
        if (typeof ret === 'function' && ret !== cb) {
            Object.keys(cb).forEach(function(k) {
                ret[k] = cb[k];
            });
        }
        return ret;
    }
}
}),
"[project]/node_modules/once/once.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

var wrappy = __turbopack_context__.r("[project]/node_modules/wrappy/wrappy.js [app-ssr] (ecmascript)");
module.exports = wrappy(once);
module.exports.strict = wrappy(onceStrict);
once.proto = once(function() {
    Object.defineProperty(Function.prototype, 'once', {
        value: function() {
            return once(this);
        },
        configurable: true
    });
    Object.defineProperty(Function.prototype, 'onceStrict', {
        value: function() {
            return onceStrict(this);
        },
        configurable: true
    });
});
function once(fn) {
    var f = function() {
        if (f.called) return f.value;
        f.called = true;
        return f.value = fn.apply(this, arguments);
    };
    f.called = false;
    return f;
}
function onceStrict(fn) {
    var f = function() {
        if (f.called) throw new Error(f.onceError);
        f.called = true;
        return f.value = fn.apply(this, arguments);
    };
    var name = fn.name || 'Function wrapped with `once`';
    f.onceError = name + " shouldn't be called more than once";
    f.called = false;
    return f;
}
}),
"[project]/node_modules/end-of-stream/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

var once = __turbopack_context__.r("[project]/node_modules/once/once.js [app-ssr] (ecmascript)");
var noop = function() {};
var qnt = /*TURBOPACK member replacement*/ __turbopack_context__.g.Bare ? queueMicrotask : process.nextTick.bind(process);
var isRequest = function(stream) {
    return stream.setHeader && typeof stream.abort === 'function';
};
var isChildProcess = function(stream) {
    return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3;
};
var eos = function(stream, opts, callback) {
    if (typeof opts === 'function') return eos(stream, null, opts);
    if (!opts) opts = {};
    callback = once(callback || noop);
    var ws = stream._writableState;
    var rs = stream._readableState;
    var readable = opts.readable || opts.readable !== false && stream.readable;
    var writable = opts.writable || opts.writable !== false && stream.writable;
    var cancelled = false;
    var onlegacyfinish = function() {
        if (!stream.writable) onfinish();
    };
    var onfinish = function() {
        writable = false;
        if (!readable) callback.call(stream);
    };
    var onend = function() {
        readable = false;
        if (!writable) callback.call(stream);
    };
    var onexit = function(exitCode) {
        callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
    };
    var onerror = function(err) {
        callback.call(stream, err);
    };
    var onclose = function() {
        qnt(onclosenexttick);
    };
    var onclosenexttick = function() {
        if (cancelled) return;
        if (readable && !(rs && rs.ended && !rs.destroyed)) return callback.call(stream, new Error('premature close'));
        if (writable && !(ws && ws.ended && !ws.destroyed)) return callback.call(stream, new Error('premature close'));
    };
    var onrequest = function() {
        stream.req.on('finish', onfinish);
    };
    if (isRequest(stream)) {
        stream.on('complete', onfinish);
        stream.on('abort', onclose);
        if (stream.req) onrequest();
        else stream.on('request', onrequest);
    } else if (writable && !ws) {
        stream.on('end', onlegacyfinish);
        stream.on('close', onlegacyfinish);
    }
    if (isChildProcess(stream)) stream.on('exit', onexit);
    stream.on('end', onend);
    stream.on('finish', onfinish);
    if (opts.error !== false) stream.on('error', onerror);
    stream.on('close', onclose);
    return function() {
        cancelled = true;
        stream.removeListener('complete', onfinish);
        stream.removeListener('abort', onclose);
        stream.removeListener('request', onrequest);
        if (stream.req) stream.req.removeListener('finish', onfinish);
        stream.removeListener('end', onlegacyfinish);
        stream.removeListener('close', onlegacyfinish);
        stream.removeListener('finish', onfinish);
        stream.removeListener('exit', onexit);
        stream.removeListener('end', onend);
        stream.removeListener('error', onerror);
        stream.removeListener('close', onclose);
    };
};
module.exports = eos;
}),
"[project]/node_modules/pump/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

var once = __turbopack_context__.r("[project]/node_modules/once/once.js [app-ssr] (ecmascript)");
var eos = __turbopack_context__.r("[project]/node_modules/end-of-stream/index.js [app-ssr] (ecmascript)");
var fs;
try {
    fs = __turbopack_context__.r("[externals]/fs [external] (fs, cjs)"); // we only need fs to get the ReadStream and WriteStream prototypes
} catch (e) {}
var noop = function() {};
var ancient = typeof process === 'undefined' ? false : /^v?\.0/.test(process.version);
var isFn = function(fn) {
    return typeof fn === 'function';
};
var isFS = function(stream) {
    if (!ancient) return false // newer node version do not need to care about fs is a special way
    ;
    if (!fs) return false // browser
    ;
    return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close);
};
var isRequest = function(stream) {
    return stream.setHeader && isFn(stream.abort);
};
var destroyer = function(stream, reading, writing, callback) {
    callback = once(callback);
    var closed = false;
    stream.on('close', function() {
        closed = true;
    });
    eos(stream, {
        readable: reading,
        writable: writing
    }, function(err) {
        if (err) return callback(err);
        closed = true;
        callback();
    });
    var destroyed = false;
    return function(err) {
        if (closed) return;
        if (destroyed) return;
        destroyed = true;
        if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
        ;
        if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want
        ;
        if (isFn(stream.destroy)) return stream.destroy();
        callback(err || new Error('stream was destroyed'));
    };
};
var call = function(fn) {
    fn();
};
var pipe = function(from, to) {
    return from.pipe(to);
};
var pump = function() {
    var streams = Array.prototype.slice.call(arguments);
    var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop;
    if (Array.isArray(streams[0])) streams = streams[0];
    if (streams.length < 2) throw new Error('pump requires two streams per minimum');
    var error;
    var destroys = streams.map(function(stream, i) {
        var reading = i < streams.length - 1;
        var writing = i > 0;
        return destroyer(stream, reading, writing, function(err) {
            if (!error) error = err;
            if (err) destroys.forEach(call);
            if (reading) return;
            destroys.forEach(call);
            callback(error);
        });
    });
    return streams.reduce(pipe);
};
module.exports = pump;
}),
"[project]/node_modules/cacheable-request/node_modules/get-stream/buffer-stream.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { PassThrough: PassThroughStream } = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)");
module.exports = (options)=>{
    options = {
        ...options
    };
    const { array } = options;
    let { encoding } = options;
    const isBuffer = encoding === 'buffer';
    let objectMode = false;
    if (array) {
        objectMode = !(encoding || isBuffer);
    } else {
        encoding = encoding || 'utf8';
    }
    if (isBuffer) {
        encoding = null;
    }
    const stream = new PassThroughStream({
        objectMode
    });
    if (encoding) {
        stream.setEncoding(encoding);
    }
    let length = 0;
    const chunks = [];
    stream.on('data', (chunk)=>{
        chunks.push(chunk);
        if (objectMode) {
            length = chunks.length;
        } else {
            length += chunk.length;
        }
    });
    stream.getBufferedValue = ()=>{
        if (array) {
            return chunks;
        }
        return isBuffer ? Buffer.concat(chunks, length) : chunks.join('');
    };
    stream.getBufferedLength = ()=>length;
    return stream;
};
}),
"[project]/node_modules/cacheable-request/node_modules/get-stream/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { constants: BufferConstants } = __turbopack_context__.r("[externals]/buffer [external] (buffer, cjs)");
const pump = __turbopack_context__.r("[project]/node_modules/pump/index.js [app-ssr] (ecmascript)");
const bufferStream = __turbopack_context__.r("[project]/node_modules/cacheable-request/node_modules/get-stream/buffer-stream.js [app-ssr] (ecmascript)");
class MaxBufferError extends Error {
    constructor(){
        super('maxBuffer exceeded');
        this.name = 'MaxBufferError';
    }
}
async function getStream(inputStream, options) {
    if (!inputStream) {
        return Promise.reject(new Error('Expected a stream'));
    }
    options = {
        maxBuffer: Infinity,
        ...options
    };
    const { maxBuffer } = options;
    let stream;
    await new Promise((resolve, reject)=>{
        const rejectPromise = (error)=>{
            // Don't retrieve an oversized buffer.
            if (error && stream.getBufferedLength() <= BufferConstants.MAX_LENGTH) {
                error.bufferedData = stream.getBufferedValue();
            }
            reject(error);
        };
        stream = pump(inputStream, bufferStream(options), (error)=>{
            if (error) {
                rejectPromise(error);
                return;
            }
            resolve();
        });
        stream.on('data', ()=>{
            if (stream.getBufferedLength() > maxBuffer) {
                rejectPromise(new MaxBufferError());
            }
        });
    });
    return stream.getBufferedValue();
}
module.exports = getStream;
// TODO: Remove this for the next major release
module.exports.default = getStream;
module.exports.buffer = (stream, options)=>getStream(stream, {
        ...options,
        encoding: 'buffer'
    });
module.exports.array = (stream, options)=>getStream(stream, {
        ...options,
        array: true
    });
module.exports.MaxBufferError = MaxBufferError;
}),
"[project]/node_modules/http-cache-semantics/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * @typedef {Object} HttpRequest
 * @property {Record<string, string>} headers - Request headers
 * @property {string} [method] - HTTP method
 * @property {string} [url] - Request URL
 */ /**
 * @typedef {Object} HttpResponse
 * @property {Record<string, string>} headers - Response headers
 * @property {number} [status] - HTTP status code
 */ /**
 * Set of default cacheable status codes per RFC 7231 section 6.1.
 * @type {Set<number>}
 */ const statusCodeCacheableByDefault = new Set([
    200,
    203,
    204,
    206,
    300,
    301,
    308,
    404,
    405,
    410,
    414,
    501
]);
/**
 * Set of HTTP status codes that the cache implementation understands.
 * Note: This implementation does not understand partial responses (206).
 * @type {Set<number>}
 */ const understoodStatuses = new Set([
    200,
    203,
    204,
    300,
    301,
    302,
    303,
    307,
    308,
    404,
    405,
    410,
    414,
    501
]);
/**
 * Set of HTTP error status codes.
 * @type {Set<number>}
 */ const errorStatusCodes = new Set([
    500,
    502,
    503,
    504
]);
/**
 * Object representing hop-by-hop headers that should be removed.
 * @type {Record<string, boolean>}
 */ const hopByHopHeaders = {
    date: true,
    connection: true,
    'keep-alive': true,
    'proxy-authenticate': true,
    'proxy-authorization': true,
    te: true,
    trailer: true,
    'transfer-encoding': true,
    upgrade: true
};
/**
 * Headers that are excluded from revalidation update.
 * @type {Record<string, boolean>}
 */ const excludedFromRevalidationUpdate = {
    // Since the old body is reused, it doesn't make sense to change properties of the body
    'content-length': true,
    'content-encoding': true,
    'transfer-encoding': true,
    'content-range': true
};
/**
 * Converts a string to a number or returns zero if the conversion fails.
 * @param {string} s - The string to convert.
 * @returns {number} The parsed number or 0.
 */ function toNumberOrZero(s) {
    const n = parseInt(s, 10);
    return isFinite(n) ? n : 0;
}
/**
 * Determines if the given response is an error response.
 * Implements RFC 5861 behavior.
 * @param {HttpResponse|undefined} response - The HTTP response object.
 * @returns {boolean} true if the response is an error or undefined, false otherwise.
 */ function isErrorResponse(response) {
    // consider undefined response as faulty
    if (!response) {
        return true;
    }
    return errorStatusCodes.has(response.status);
}
/**
 * Parses a Cache-Control header string into an object.
 * @param {string} [header] - The Cache-Control header value.
 * @returns {Record<string, string|boolean>} An object representing Cache-Control directives.
 */ function parseCacheControl(header) {
    /** @type {Record<string, string|boolean>} */ const cc = {};
    if (!header) return cc;
    // TODO: When there is more than one value present for a given directive (e.g., two Expires header fields, multiple Cache-Control: max-age directives),
    // the directive's value is considered invalid. Caches are encouraged to consider responses that have invalid freshness information to be stale
    const parts = header.trim().split(/,/);
    for (const part of parts){
        const [k, v] = part.split(/=/, 2);
        cc[k.trim()] = v === undefined ? true : v.trim().replace(/^"|"$/g, '');
    }
    return cc;
}
/**
 * Formats a Cache-Control directives object into a header string.
 * @param {Record<string, string|boolean>} cc - The Cache-Control directives.
 * @returns {string|undefined} A formatted Cache-Control header string or undefined if empty.
 */ function formatCacheControl(cc) {
    let parts = [];
    for(const k in cc){
        const v = cc[k];
        parts.push(v === true ? k : k + '=' + v);
    }
    if (!parts.length) {
        return undefined;
    }
    return parts.join(', ');
}
module.exports = class CachePolicy {
    /**
     * Creates a new CachePolicy instance.
     * @param {HttpRequest} req - Incoming client request.
     * @param {HttpResponse} res - Received server response.
     * @param {Object} [options={}] - Configuration options.
     * @param {boolean} [options.shared=true] - Is the cache shared (a public proxy)? `false` for personal browser caches.
     * @param {number} [options.cacheHeuristic=0.1] - Fallback heuristic (age fraction) for cache duration.
     * @param {number} [options.immutableMinTimeToLive=86400000] - Minimum TTL for immutable responses in milliseconds.
     * @param {boolean} [options.ignoreCargoCult=false] - Detect nonsense cache headers, and override them.
     * @param {any} [options._fromObject] - Internal parameter for deserialization. Do not use.
     */ constructor(req, res, { shared, cacheHeuristic, immutableMinTimeToLive, ignoreCargoCult, _fromObject } = {}){
        if (_fromObject) {
            this._fromObject(_fromObject);
            return;
        }
        if (!res || !res.headers) {
            throw Error('Response headers missing');
        }
        this._assertRequestHasHeaders(req);
        /** @type {number} Timestamp when the response was received */ this._responseTime = this.now();
        /** @type {boolean} Indicates if the cache is shared */ this._isShared = shared !== false;
        /** @type {boolean} Indicates if legacy cargo cult directives should be ignored */ this._ignoreCargoCult = !!ignoreCargoCult;
        /** @type {number} Heuristic cache fraction */ this._cacheHeuristic = undefined !== cacheHeuristic ? cacheHeuristic : 0.1; // 10% matches IE
        /** @type {number} Minimum TTL for immutable responses in ms */ this._immutableMinTtl = undefined !== immutableMinTimeToLive ? immutableMinTimeToLive : 24 * 3600 * 1000;
        /** @type {number} HTTP status code */ this._status = 'status' in res ? res.status : 200;
        /** @type {Record<string, string>} Response headers */ this._resHeaders = res.headers;
        /** @type {Record<string, string|boolean>} Parsed Cache-Control directives from response */ this._rescc = parseCacheControl(res.headers['cache-control']);
        /** @type {string} HTTP method (e.g., GET, POST) */ this._method = 'method' in req ? req.method : 'GET';
        /** @type {string} Request URL */ this._url = req.url;
        /** @type {string} Host header from the request */ this._host = req.headers.host;
        /** @type {boolean} Whether the request does not include an Authorization header */ this._noAuthorization = !req.headers.authorization;
        /** @type {Record<string, string>|null} Request headers used for Vary matching */ this._reqHeaders = res.headers.vary ? req.headers : null; // Don't keep all request headers if they won't be used
        /** @type {Record<string, string|boolean>} Parsed Cache-Control directives from request */ this._reqcc = parseCacheControl(req.headers['cache-control']);
        // Assume that if someone uses legacy, non-standard uncecessary options they don't understand caching,
        // so there's no point stricly adhering to the blindly copy&pasted directives.
        if (this._ignoreCargoCult && 'pre-check' in this._rescc && 'post-check' in this._rescc) {
            delete this._rescc['pre-check'];
            delete this._rescc['post-check'];
            delete this._rescc['no-cache'];
            delete this._rescc['no-store'];
            delete this._rescc['must-revalidate'];
            this._resHeaders = Object.assign({}, this._resHeaders, {
                'cache-control': formatCacheControl(this._rescc)
            });
            delete this._resHeaders.expires;
            delete this._resHeaders.pragma;
        }
        // When the Cache-Control header field is not present in a request, caches MUST consider the no-cache request pragma-directive
        // as having the same effect as if "Cache-Control: no-cache" were present (see Section 5.2.1).
        if (res.headers['cache-control'] == null && /no-cache/.test(res.headers.pragma)) {
            this._rescc['no-cache'] = true;
        }
    }
    /**
     * You can monkey-patch it for testing.
     * @returns {number} Current time in milliseconds.
     */ now() {
        return Date.now();
    }
    /**
     * Determines if the response is storable in a cache.
     * @returns {boolean} `false` if can never be cached.
     */ storable() {
        // The "no-store" request directive indicates that a cache MUST NOT store any part of either this request or any response to it.
        return !!(!this._reqcc['no-store'] && // A cache MUST NOT store a response to any request, unless:
        // The request method is understood by the cache and defined as being cacheable, and
        ('GET' === this._method || 'HEAD' === this._method || 'POST' === this._method && this._hasExplicitExpiration()) && // the response status code is understood by the cache, and
        understoodStatuses.has(this._status) && // the "no-store" cache directive does not appear in request or response header fields, and
        !this._rescc['no-store'] && // the "private" response directive does not appear in the response, if the cache is shared, and
        (!this._isShared || !this._rescc.private) && // the Authorization header field does not appear in the request, if the cache is shared,
        (!this._isShared || this._noAuthorization || this._allowsStoringAuthenticated()) && // the response either:
        // contains an Expires header field, or
        (this._resHeaders.expires || // contains a max-age response directive, or
        // contains a s-maxage response directive and the cache is shared, or
        // contains a public response directive.
        this._rescc['max-age'] || this._isShared && this._rescc['s-maxage'] || this._rescc.public || // has a status code that is defined as cacheable by default
        statusCodeCacheableByDefault.has(this._status)));
    }
    /**
     * @returns {boolean} true if expiration is explicitly defined.
     */ _hasExplicitExpiration() {
        // 4.2.1 Calculating Freshness Lifetime
        return !!(this._isShared && this._rescc['s-maxage'] || this._rescc['max-age'] || this._resHeaders.expires);
    }
    /**
     * @param {HttpRequest} req - a request
     * @throws {Error} if the headers are missing.
     */ _assertRequestHasHeaders(req) {
        if (!req || !req.headers) {
            throw Error('Request headers missing');
        }
    }
    /**
     * Checks if the request matches the cache and can be satisfied from the cache immediately,
     * without having to make a request to the server.
     *
     * This doesn't support `stale-while-revalidate`. See `evaluateRequest()` for a more complete solution.
     *
     * @param {HttpRequest} req - The new incoming HTTP request.
     * @returns {boolean} `true`` if the cached response used to construct this cache policy satisfies the request without revalidation.
     */ satisfiesWithoutRevalidation(req) {
        const result = this.evaluateRequest(req);
        return !result.revalidation;
    }
    /**
     * @param {{headers: Record<string, string>, synchronous: boolean}|undefined} revalidation - Revalidation information, if any.
     * @returns {{response: {headers: Record<string, string>}, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object with a cached response headers and revalidation info.
     */ _evaluateRequestHitResult(revalidation) {
        return {
            response: {
                headers: this.responseHeaders()
            },
            revalidation
        };
    }
    /**
     * @param {HttpRequest} request - new incoming
     * @param {boolean} synchronous - whether revalidation must be synchronous (not s-w-r).
     * @returns {{headers: Record<string, string>, synchronous: boolean}} An object with revalidation headers and a synchronous flag.
     */ _evaluateRequestRevalidation(request, synchronous) {
        return {
            synchronous,
            headers: this.revalidationHeaders(request)
        };
    }
    /**
     * @param {HttpRequest} request - new incoming
     * @returns {{response: undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}}} An object indicating no cached response and revalidation details.
     */ _evaluateRequestMissResult(request) {
        return {
            response: undefined,
            revalidation: this._evaluateRequestRevalidation(request, true)
        };
    }
    /**
     * Checks if the given request matches this cache entry, and how the cache can be used to satisfy it. Returns an object with:
     *
     * ```
     * {
     *     // If defined, you must send a request to the server.
     *     revalidation: {
     *         headers: {}, // HTTP headers to use when sending the revalidation response
     *         // If true, you MUST wait for a response from the server before using the cache
     *         // If false, this is stale-while-revalidate. The cache is stale, but you can use it while you update it asynchronously.
     *         synchronous: bool,
     *     },
     *     // If defined, you can use this cached response.
     *     response: {
     *         headers: {}, // Updated cached HTTP headers you must use when responding to the client
     *     },
     * }
     * ```
     * @param {HttpRequest} req - new incoming HTTP request
     * @returns {{response: {headers: Record<string, string>}|undefined, revalidation: {headers: Record<string, string>, synchronous: boolean}|undefined}} An object containing keys:
     *   - revalidation: { headers: Record<string, string>, synchronous: boolean } Set if you should send this to the origin server
     *   - response: { headers: Record<string, string> } Set if you can respond to the client with these cached headers
     */ evaluateRequest(req) {
        this._assertRequestHasHeaders(req);
        // In all circumstances, a cache MUST NOT ignore the must-revalidate directive
        if (this._rescc['must-revalidate']) {
            return this._evaluateRequestMissResult(req);
        }
        if (!this._requestMatches(req, false)) {
            return this._evaluateRequestMissResult(req);
        }
        // When presented with a request, a cache MUST NOT reuse a stored response, unless:
        // the presented request does not contain the no-cache pragma (Section 5.4), nor the no-cache cache directive,
        // unless the stored response is successfully validated (Section 4.3), and
        const requestCC = parseCacheControl(req.headers['cache-control']);
        if (requestCC['no-cache'] || /no-cache/.test(req.headers.pragma)) {
            return this._evaluateRequestMissResult(req);
        }
        if (requestCC['max-age'] && this.age() > toNumberOrZero(requestCC['max-age'])) {
            return this._evaluateRequestMissResult(req);
        }
        if (requestCC['min-fresh'] && this.maxAge() - this.age() < toNumberOrZero(requestCC['min-fresh'])) {
            return this._evaluateRequestMissResult(req);
        }
        // the stored response is either:
        // fresh, or allowed to be served stale
        if (this.stale()) {
            // If a value is present, then the client is willing to accept a response that has
            // exceeded its freshness lifetime by no more than the specified number of seconds
            const allowsStaleWithoutRevalidation = 'max-stale' in requestCC && (true === requestCC['max-stale'] || requestCC['max-stale'] > this.age() - this.maxAge());
            if (allowsStaleWithoutRevalidation) {
                return this._evaluateRequestHitResult(undefined);
            }
            if (this.useStaleWhileRevalidate()) {
                return this._evaluateRequestHitResult(this._evaluateRequestRevalidation(req, false));
            }
            return this._evaluateRequestMissResult(req);
        }
        return this._evaluateRequestHitResult(undefined);
    }
    /**
     * @param {HttpRequest} req - check if this is for the same cache entry
     * @param {boolean} allowHeadMethod - allow a HEAD method to match.
     * @returns {boolean} `true` if the request matches.
     */ _requestMatches(req, allowHeadMethod) {
        // The presented effective request URI and that of the stored response match, and
        return !!((!this._url || this._url === req.url) && this._host === req.headers.host && // the request method associated with the stored response allows it to be used for the presented request, and
        (!req.method || this._method === req.method || allowHeadMethod && 'HEAD' === req.method) && // selecting header fields nominated by the stored response (if any) match those presented, and
        this._varyMatches(req));
    }
    /**
     * Determines whether storing authenticated responses is allowed.
     * @returns {boolean} `true` if allowed.
     */ _allowsStoringAuthenticated() {
        // following Cache-Control response directives (Section 5.2.2) have such an effect: must-revalidate, public, and s-maxage.
        return !!(this._rescc['must-revalidate'] || this._rescc.public || this._rescc['s-maxage']);
    }
    /**
     * Checks whether the Vary header in the response matches the new request.
     * @param {HttpRequest} req - incoming HTTP request
     * @returns {boolean} `true` if the vary headers match.
     */ _varyMatches(req) {
        if (!this._resHeaders.vary) {
            return true;
        }
        // A Vary header field-value of "*" always fails to match
        if (this._resHeaders.vary === '*') {
            return false;
        }
        const fields = this._resHeaders.vary.trim().toLowerCase().split(/\s*,\s*/);
        for (const name of fields){
            if (req.headers[name] !== this._reqHeaders[name]) return false;
        }
        return true;
    }
    /**
     * Creates a copy of the given headers without any hop-by-hop headers.
     * @param {Record<string, string>} inHeaders - old headers from the cached response
     * @returns {Record<string, string>} A new headers object without hop-by-hop headers.
     */ _copyWithoutHopByHopHeaders(inHeaders) {
        /** @type {Record<string, string>} */ const headers = {};
        for(const name in inHeaders){
            if (hopByHopHeaders[name]) continue;
            headers[name] = inHeaders[name];
        }
        // 9.1.  Connection
        if (inHeaders.connection) {
            const tokens = inHeaders.connection.trim().split(/\s*,\s*/);
            for (const name of tokens){
                delete headers[name];
            }
        }
        if (headers.warning) {
            const warnings = headers.warning.split(/,/).filter((warning)=>{
                return !/^\s*1[0-9][0-9]/.test(warning);
            });
            if (!warnings.length) {
                delete headers.warning;
            } else {
                headers.warning = warnings.join(',').trim();
            }
        }
        return headers;
    }
    /**
     * Returns the response headers adjusted for serving the cached response.
     * Removes hop-by-hop headers and updates the Age and Date headers.
     * @returns {Record<string, string>} The adjusted response headers.
     */ responseHeaders() {
        const headers = this._copyWithoutHopByHopHeaders(this._resHeaders);
        const age = this.age();
        // A cache SHOULD generate 113 warning if it heuristically chose a freshness
        // lifetime greater than 24 hours and the response's age is greater than 24 hours.
        if (age > 3600 * 24 && !this._hasExplicitExpiration() && this.maxAge() > 3600 * 24) {
            headers.warning = (headers.warning ? `${headers.warning}, ` : '') + '113 - "rfc7234 5.5.4"';
        }
        headers.age = `${Math.round(age)}`;
        headers.date = new Date(this.now()).toUTCString();
        return headers;
    }
    /**
     * Returns the Date header value from the response or the current time if invalid.
     * @returns {number} Timestamp (in milliseconds) representing the Date header or response time.
     */ date() {
        const serverDate = Date.parse(this._resHeaders.date);
        if (isFinite(serverDate)) {
            return serverDate;
        }
        return this._responseTime;
    }
    /**
     * Value of the Age header, in seconds, updated for the current time.
     * May be fractional.
     * @returns {number} The age in seconds.
     */ age() {
        let age = this._ageValue();
        const residentTime = (this.now() - this._responseTime) / 1000;
        return age + residentTime;
    }
    /**
     * @returns {number} The Age header value as a number.
     */ _ageValue() {
        return toNumberOrZero(this._resHeaders.age);
    }
    /**
     * Possibly outdated value of applicable max-age (or heuristic equivalent) in seconds.
     * This counts since response's `Date`.
     *
     * For an up-to-date value, see `timeToLive()`.
     *
     * Returns the maximum age (freshness lifetime) of the response in seconds.
     * @returns {number} The max-age value in seconds.
     */ maxAge() {
        if (!this.storable() || this._rescc['no-cache']) {
            return 0;
        }
        // Shared responses with cookies are cacheable according to the RFC, but IMHO it'd be unwise to do so by default
        // so this implementation requires explicit opt-in via public header
        if (this._isShared && this._resHeaders['set-cookie'] && !this._rescc.public && !this._rescc.immutable) {
            return 0;
        }
        if (this._resHeaders.vary === '*') {
            return 0;
        }
        if (this._isShared) {
            if (this._rescc['proxy-revalidate']) {
                return 0;
            }
            // if a response includes the s-maxage directive, a shared cache recipient MUST ignore the Expires field.
            if (this._rescc['s-maxage']) {
                return toNumberOrZero(this._rescc['s-maxage']);
            }
        }
        // If a response includes a Cache-Control field with the max-age directive, a recipient MUST ignore the Expires field.
        if (this._rescc['max-age']) {
            return toNumberOrZero(this._rescc['max-age']);
        }
        const defaultMinTtl = this._rescc.immutable ? this._immutableMinTtl : 0;
        const serverDate = this.date();
        if (this._resHeaders.expires) {
            const expires = Date.parse(this._resHeaders.expires);
            // A cache recipient MUST interpret invalid date formats, especially the value "0", as representing a time in the past (i.e., "already expired").
            if (Number.isNaN(expires) || expires < serverDate) {
                return 0;
            }
            return Math.max(defaultMinTtl, (expires - serverDate) / 1000);
        }
        if (this._resHeaders['last-modified']) {
            const lastModified = Date.parse(this._resHeaders['last-modified']);
            if (isFinite(lastModified) && serverDate > lastModified) {
                return Math.max(defaultMinTtl, (serverDate - lastModified) / 1000 * this._cacheHeuristic);
            }
        }
        return defaultMinTtl;
    }
    /**
     * Remaining time this cache entry may be useful for, in *milliseconds*.
     * You can use this as an expiration time for your cache storage.
     *
     * Prefer this method over `maxAge()`, because it includes other factors like `age` and `stale-while-revalidate`.
     * @returns {number} Time-to-live in milliseconds.
     */ timeToLive() {
        const age = this.maxAge() - this.age();
        const staleIfErrorAge = age + toNumberOrZero(this._rescc['stale-if-error']);
        const staleWhileRevalidateAge = age + toNumberOrZero(this._rescc['stale-while-revalidate']);
        return Math.round(Math.max(0, age, staleIfErrorAge, staleWhileRevalidateAge) * 1000);
    }
    /**
     * If true, this cache entry is past its expiration date.
     * Note that stale cache may be useful sometimes, see `evaluateRequest()`.
     * @returns {boolean} `false` doesn't mean it's fresh nor usable
     */ stale() {
        return this.maxAge() <= this.age();
    }
    /**
     * @returns {boolean} `true` if `stale-if-error` condition allows use of a stale response.
     */ _useStaleIfError() {
        return this.maxAge() + toNumberOrZero(this._rescc['stale-if-error']) > this.age();
    }
    /** See `evaluateRequest()` for a more complete solution
     * @returns {boolean} `true` if `stale-while-revalidate` is currently allowed.
     */ useStaleWhileRevalidate() {
        const swr = toNumberOrZero(this._rescc['stale-while-revalidate']);
        return swr > 0 && this.maxAge() + swr > this.age();
    }
    /**
     * Creates a `CachePolicy` instance from a serialized object.
     * @param {Object} obj - The serialized object.
     * @returns {CachePolicy} A new CachePolicy instance.
     */ static fromObject(obj) {
        return new this(undefined, undefined, {
            _fromObject: obj
        });
    }
    /**
     * @param {any} obj - The serialized object.
     * @throws {Error} If already initialized or if the object is invalid.
     */ _fromObject(obj) {
        if (this._responseTime) throw Error('Reinitialized');
        if (!obj || obj.v !== 1) throw Error('Invalid serialization');
        this._responseTime = obj.t;
        this._isShared = obj.sh;
        this._cacheHeuristic = obj.ch;
        this._immutableMinTtl = obj.imm !== undefined ? obj.imm : 24 * 3600 * 1000;
        this._ignoreCargoCult = !!obj.icc;
        this._status = obj.st;
        this._resHeaders = obj.resh;
        this._rescc = obj.rescc;
        this._method = obj.m;
        this._url = obj.u;
        this._host = obj.h;
        this._noAuthorization = obj.a;
        this._reqHeaders = obj.reqh;
        this._reqcc = obj.reqcc;
    }
    /**
     * Serializes the `CachePolicy` instance into a JSON-serializable object.
     * @returns {Object} The serialized object.
     */ toObject() {
        return {
            v: 1,
            t: this._responseTime,
            sh: this._isShared,
            ch: this._cacheHeuristic,
            imm: this._immutableMinTtl,
            icc: this._ignoreCargoCult,
            st: this._status,
            resh: this._resHeaders,
            rescc: this._rescc,
            m: this._method,
            u: this._url,
            h: this._host,
            a: this._noAuthorization,
            reqh: this._reqHeaders,
            reqcc: this._reqcc
        };
    }
    /**
     * Headers for sending to the origin server to revalidate stale response.
     * Allows server to return 304 to allow reuse of the previous response.
     *
     * Hop by hop headers are always stripped.
     * Revalidation headers may be added or removed, depending on request.
     * @param {HttpRequest} incomingReq - The incoming HTTP request.
     * @returns {Record<string, string>} The headers for the revalidation request.
     */ revalidationHeaders(incomingReq) {
        this._assertRequestHasHeaders(incomingReq);
        const headers = this._copyWithoutHopByHopHeaders(incomingReq.headers);
        // This implementation does not understand range requests
        delete headers['if-range'];
        if (!this._requestMatches(incomingReq, true) || !this.storable()) {
            // revalidation allowed via HEAD
            // not for the same resource, or wasn't allowed to be cached anyway
            delete headers['if-none-match'];
            delete headers['if-modified-since'];
            return headers;
        }
        /* MUST send that entity-tag in any cache validation request (using If-Match or If-None-Match) if an entity-tag has been provided by the origin server. */ if (this._resHeaders.etag) {
            headers['if-none-match'] = headers['if-none-match'] ? `${headers['if-none-match']}, ${this._resHeaders.etag}` : this._resHeaders.etag;
        }
        // Clients MAY issue simple (non-subrange) GET requests with either weak validators or strong validators. Clients MUST NOT use weak validators in other forms of request.
        const forbidsWeakValidators = headers['accept-ranges'] || headers['if-match'] || headers['if-unmodified-since'] || this._method && this._method != 'GET';
        /* SHOULD send the Last-Modified value in non-subrange cache validation requests (using If-Modified-Since) if only a Last-Modified value has been provided by the origin server.
        Note: This implementation does not understand partial responses (206) */ if (forbidsWeakValidators) {
            delete headers['if-modified-since'];
            if (headers['if-none-match']) {
                const etags = headers['if-none-match'].split(/,/).filter((etag)=>{
                    return !/^\s*W\//.test(etag);
                });
                if (!etags.length) {
                    delete headers['if-none-match'];
                } else {
                    headers['if-none-match'] = etags.join(',').trim();
                }
            }
        } else if (this._resHeaders['last-modified'] && !headers['if-modified-since']) {
            headers['if-modified-since'] = this._resHeaders['last-modified'];
        }
        return headers;
    }
    /**
     * Creates new CachePolicy with information combined from the previews response,
     * and the new revalidation response.
     *
     * Returns {policy, modified} where modified is a boolean indicating
     * whether the response body has been modified, and old cached body can't be used.
     *
     * @param {HttpRequest} request - The latest HTTP request asking for the cached entry.
     * @param {HttpResponse} response - The latest revalidation HTTP response from the origin server.
     * @returns {{policy: CachePolicy, modified: boolean, matches: boolean}} The updated policy and modification status.
     * @throws {Error} If the response headers are missing.
     */ revalidatedPolicy(request, response) {
        this._assertRequestHasHeaders(request);
        if (this._useStaleIfError() && isErrorResponse(response)) {
            return {
                policy: this,
                modified: false,
                matches: true
            };
        }
        if (!response || !response.headers) {
            throw Error('Response headers missing');
        }
        // These aren't going to be supported exactly, since one CachePolicy object
        // doesn't know about all the other cached objects.
        let matches = false;
        if (response.status !== undefined && response.status != 304) {
            matches = false;
        } else if (response.headers.etag && !/^\s*W\//.test(response.headers.etag)) {
            // "All of the stored responses with the same strong validator are selected.
            // If none of the stored responses contain the same strong validator,
            // then the cache MUST NOT use the new response to update any stored responses."
            matches = this._resHeaders.etag && this._resHeaders.etag.replace(/^\s*W\//, '') === response.headers.etag;
        } else if (this._resHeaders.etag && response.headers.etag) {
            // "If the new response contains a weak validator and that validator corresponds
            // to one of the cache's stored responses,
            // then the most recent of those matching stored responses is selected for update."
            matches = this._resHeaders.etag.replace(/^\s*W\//, '') === response.headers.etag.replace(/^\s*W\//, '');
        } else if (this._resHeaders['last-modified']) {
            matches = this._resHeaders['last-modified'] === response.headers['last-modified'];
        } else {
            // If the new response does not include any form of validator (such as in the case where
            // a client generates an If-Modified-Since request from a source other than the Last-Modified
            // response header field), and there is only one stored response, and that stored response also
            // lacks a validator, then that stored response is selected for update.
            if (!this._resHeaders.etag && !this._resHeaders['last-modified'] && !response.headers.etag && !response.headers['last-modified']) {
                matches = true;
            }
        }
        const optionsCopy = {
            shared: this._isShared,
            cacheHeuristic: this._cacheHeuristic,
            immutableMinTimeToLive: this._immutableMinTtl,
            ignoreCargoCult: this._ignoreCargoCult
        };
        if (!matches) {
            return {
                policy: new this.constructor(request, response, optionsCopy),
                // Client receiving 304 without body, even if it's invalid/mismatched has no option
                // but to reuse a cached body. We don't have a good way to tell clients to do
                // error recovery in such case.
                modified: response.status != 304,
                matches: false
            };
        }
        // use other header fields provided in the 304 (Not Modified) response to replace all instances
        // of the corresponding header fields in the stored response.
        const headers = {};
        for(const k in this._resHeaders){
            headers[k] = k in response.headers && !excludedFromRevalidationUpdate[k] ? response.headers[k] : this._resHeaders[k];
        }
        const newResponse = Object.assign({}, response, {
            status: this._status,
            method: this._method,
            headers
        });
        return {
            policy: new this.constructor(request, newResponse, optionsCopy),
            modified: false,
            matches: true
        };
    }
};
}),
"[project]/node_modules/lowercase-keys/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = (object)=>{
    const result = {};
    for (const [key, value] of Object.entries(object)){
        result[key.toLowerCase()] = value;
    }
    return result;
};
}),
"[project]/node_modules/responselike/src/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const Readable = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)").Readable;
const lowercaseKeys = __turbopack_context__.r("[project]/node_modules/lowercase-keys/index.js [app-ssr] (ecmascript)");
class Response extends Readable {
    constructor(statusCode, headers, body, url){
        if (typeof statusCode !== 'number') {
            throw new TypeError('Argument `statusCode` should be a number');
        }
        if (typeof headers !== 'object') {
            throw new TypeError('Argument `headers` should be an object');
        }
        if (!(body instanceof Buffer)) {
            throw new TypeError('Argument `body` should be a buffer');
        }
        if (typeof url !== 'string') {
            throw new TypeError('Argument `url` should be a string');
        }
        super();
        this.statusCode = statusCode;
        this.headers = lowercaseKeys(headers);
        this.body = body;
        this.url = url;
    }
    _read() {
        this.push(this.body);
        this.push(null);
    }
}
module.exports = Response;
}),
"[project]/node_modules/mimic-response/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// We define these manually to ensure they're always copied
// even if they would move up the prototype chain
// https://nodejs.org/api/http.html#http_class_http_incomingmessage
const knownProps = [
    'destroy',
    'setTimeout',
    'socket',
    'headers',
    'trailers',
    'rawHeaders',
    'statusCode',
    'httpVersion',
    'httpVersionMinor',
    'httpVersionMajor',
    'rawTrailers',
    'statusMessage'
];
module.exports = (fromStream, toStream)=>{
    const fromProps = new Set(Object.keys(fromStream).concat(knownProps));
    for (const prop of fromProps){
        // Don't overwrite existing properties
        if (prop in toStream) {
            continue;
        }
        toStream[prop] = typeof fromStream[prop] === 'function' ? fromStream[prop].bind(fromStream) : fromStream[prop];
    }
};
}),
"[project]/node_modules/decompress-response/node_modules/mimic-response/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// We define these manually to ensure they're always copied
// even if they would move up the prototype chain
// https://nodejs.org/api/http.html#http_class_http_incomingmessage
const knownProperties = [
    'aborted',
    'complete',
    'headers',
    'httpVersion',
    'httpVersionMinor',
    'httpVersionMajor',
    'method',
    'rawHeaders',
    'rawTrailers',
    'setTimeout',
    'socket',
    'statusCode',
    'statusMessage',
    'trailers',
    'url'
];
module.exports = (fromStream, toStream)=>{
    if (toStream._readableState.autoDestroy) {
        throw new Error('The second stream must have the `autoDestroy` option set to `false`');
    }
    const fromProperties = new Set(Object.keys(fromStream).concat(knownProperties));
    const properties = {};
    for (const property of fromProperties){
        // Don't overwrite existing properties.
        if (property in toStream) {
            continue;
        }
        properties[property] = {
            get () {
                const value = fromStream[property];
                const isFunction = typeof value === 'function';
                return isFunction ? value.bind(fromStream) : value;
            },
            set (value) {
                fromStream[property] = value;
            },
            enumerable: true,
            configurable: false
        };
    }
    Object.defineProperties(toStream, properties);
    fromStream.once('aborted', ()=>{
        toStream.destroy();
        toStream.emit('aborted');
    });
    fromStream.once('close', ()=>{
        if (fromStream.complete) {
            if (toStream.readable) {
                toStream.once('end', ()=>{
                    toStream.emit('close');
                });
            } else {
                toStream.emit('close');
            }
        } else {
            toStream.emit('close');
        }
    });
    return toStream;
};
}),
"[project]/node_modules/clone-response/src/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const PassThrough = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)").PassThrough;
const mimicResponse = __turbopack_context__.r("[project]/node_modules/mimic-response/index.js [app-ssr] (ecmascript)");
const cloneResponse = (response)=>{
    if (!(response && response.pipe)) {
        throw new TypeError('Parameter `response` must be a response stream.');
    }
    const clone = new PassThrough();
    mimicResponse(response, clone);
    return response.pipe(clone);
};
module.exports = cloneResponse;
}),
"[externals]/keyv [external] (keyv, cjs, [project]/node_modules/keyv)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("keyv-62fb9a63141d8891", () => require("keyv-62fb9a63141d8891"));

module.exports = mod;
}),
"[project]/node_modules/cacheable-request/src/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const EventEmitter = __turbopack_context__.r("[externals]/events [external] (events, cjs)");
const urlLib = __turbopack_context__.r("[externals]/url [external] (url, cjs)");
const normalizeUrl = __turbopack_context__.r("[project]/node_modules/normalize-url/index.js [app-ssr] (ecmascript)");
const getStream = __turbopack_context__.r("[project]/node_modules/cacheable-request/node_modules/get-stream/index.js [app-ssr] (ecmascript)");
const CachePolicy = __turbopack_context__.r("[project]/node_modules/http-cache-semantics/index.js [app-ssr] (ecmascript)");
const Response = __turbopack_context__.r("[project]/node_modules/responselike/src/index.js [app-ssr] (ecmascript)");
const lowercaseKeys = __turbopack_context__.r("[project]/node_modules/lowercase-keys/index.js [app-ssr] (ecmascript)");
const cloneResponse = __turbopack_context__.r("[project]/node_modules/clone-response/src/index.js [app-ssr] (ecmascript)");
const Keyv = __turbopack_context__.r("[externals]/keyv [external] (keyv, cjs, [project]/node_modules/keyv)");
class CacheableRequest {
    constructor(request, cacheAdapter){
        if (typeof request !== 'function') {
            throw new TypeError('Parameter `request` must be a function');
        }
        this.cache = new Keyv({
            uri: typeof cacheAdapter === 'string' && cacheAdapter,
            store: typeof cacheAdapter !== 'string' && cacheAdapter,
            namespace: 'cacheable-request'
        });
        return this.createCacheableRequest(request);
    }
    createCacheableRequest(request) {
        return (opts, cb)=>{
            let url;
            if (typeof opts === 'string') {
                url = normalizeUrlObject(urlLib.parse(opts));
                opts = {};
            } else if (opts instanceof urlLib.URL) {
                url = normalizeUrlObject(urlLib.parse(opts.toString()));
                opts = {};
            } else {
                const [pathname, ...searchParts] = (opts.path || '').split('?');
                const search = searchParts.length > 0 ? `?${searchParts.join('?')}` : '';
                url = normalizeUrlObject({
                    ...opts,
                    pathname,
                    search
                });
            }
            opts = {
                headers: {},
                method: 'GET',
                cache: true,
                strictTtl: false,
                automaticFailover: false,
                ...opts,
                ...urlObjectToRequestOptions(url)
            };
            opts.headers = lowercaseKeys(opts.headers);
            const ee = new EventEmitter();
            const normalizedUrlString = normalizeUrl(urlLib.format(url), {
                stripWWW: false,
                removeTrailingSlash: false,
                stripAuthentication: false
            });
            const key = `${opts.method}:${normalizedUrlString}`;
            let revalidate = false;
            let madeRequest = false;
            const makeRequest = (opts)=>{
                madeRequest = true;
                let requestErrored = false;
                let requestErrorCallback;
                const requestErrorPromise = new Promise((resolve)=>{
                    requestErrorCallback = ()=>{
                        if (!requestErrored) {
                            requestErrored = true;
                            resolve();
                        }
                    };
                });
                const handler = (response)=>{
                    if (revalidate && !opts.forceRefresh) {
                        response.status = response.statusCode;
                        const revalidatedPolicy = CachePolicy.fromObject(revalidate.cachePolicy).revalidatedPolicy(opts, response);
                        if (!revalidatedPolicy.modified) {
                            const headers = revalidatedPolicy.policy.responseHeaders();
                            response = new Response(revalidate.statusCode, headers, revalidate.body, revalidate.url);
                            response.cachePolicy = revalidatedPolicy.policy;
                            response.fromCache = true;
                        }
                    }
                    if (!response.fromCache) {
                        response.cachePolicy = new CachePolicy(opts, response, opts);
                        response.fromCache = false;
                    }
                    let clonedResponse;
                    if (opts.cache && response.cachePolicy.storable()) {
                        clonedResponse = cloneResponse(response);
                        (async ()=>{
                            try {
                                const bodyPromise = getStream.buffer(response);
                                await Promise.race([
                                    requestErrorPromise,
                                    new Promise((resolve)=>response.once('end', resolve))
                                ]);
                                if (requestErrored) {
                                    return;
                                }
                                const body = await bodyPromise;
                                const value = {
                                    cachePolicy: response.cachePolicy.toObject(),
                                    url: response.url,
                                    statusCode: response.fromCache ? revalidate.statusCode : response.statusCode,
                                    body
                                };
                                let ttl = opts.strictTtl ? response.cachePolicy.timeToLive() : undefined;
                                if (opts.maxTtl) {
                                    ttl = ttl ? Math.min(ttl, opts.maxTtl) : opts.maxTtl;
                                }
                                await this.cache.set(key, value, ttl);
                            } catch (error) {
                                ee.emit('error', new CacheableRequest.CacheError(error));
                            }
                        })();
                    } else if (opts.cache && revalidate) {
                        (async ()=>{
                            try {
                                await this.cache.delete(key);
                            } catch (error) {
                                ee.emit('error', new CacheableRequest.CacheError(error));
                            }
                        })();
                    }
                    ee.emit('response', clonedResponse || response);
                    if (typeof cb === 'function') {
                        cb(clonedResponse || response);
                    }
                };
                try {
                    const req = request(opts, handler);
                    req.once('error', requestErrorCallback);
                    req.once('abort', requestErrorCallback);
                    ee.emit('request', req);
                } catch (error) {
                    ee.emit('error', new CacheableRequest.RequestError(error));
                }
            };
            (async ()=>{
                const get = async (opts)=>{
                    await Promise.resolve();
                    const cacheEntry = opts.cache ? await this.cache.get(key) : undefined;
                    if (typeof cacheEntry === 'undefined') {
                        return makeRequest(opts);
                    }
                    const policy = CachePolicy.fromObject(cacheEntry.cachePolicy);
                    if (policy.satisfiesWithoutRevalidation(opts) && !opts.forceRefresh) {
                        const headers = policy.responseHeaders();
                        const response = new Response(cacheEntry.statusCode, headers, cacheEntry.body, cacheEntry.url);
                        response.cachePolicy = policy;
                        response.fromCache = true;
                        ee.emit('response', response);
                        if (typeof cb === 'function') {
                            cb(response);
                        }
                    } else {
                        revalidate = cacheEntry;
                        opts.headers = policy.revalidationHeaders(opts);
                        makeRequest(opts);
                    }
                };
                const errorHandler = (error)=>ee.emit('error', new CacheableRequest.CacheError(error));
                this.cache.once('error', errorHandler);
                ee.on('response', ()=>this.cache.removeListener('error', errorHandler));
                try {
                    await get(opts);
                } catch (error) {
                    if (opts.automaticFailover && !madeRequest) {
                        makeRequest(opts);
                    }
                    ee.emit('error', new CacheableRequest.CacheError(error));
                }
            })();
            return ee;
        };
    }
}
function urlObjectToRequestOptions(url) {
    const options = {
        ...url
    };
    options.path = `${url.pathname || '/'}${url.search || ''}`;
    delete options.pathname;
    delete options.search;
    return options;
}
function normalizeUrlObject(url) {
    // If url was parsed by url.parse or new URL:
    // - hostname will be set
    // - host will be hostname[:port]
    // - port will be set if it was explicit in the parsed string
    // Otherwise, url was from request options:
    // - hostname or host may be set
    // - host shall not have port encoded
    return {
        protocol: url.protocol,
        auth: url.auth,
        hostname: url.hostname || url.host || 'localhost',
        port: url.port,
        pathname: url.pathname,
        search: url.search
    };
}
CacheableRequest.RequestError = class extends Error {
    constructor(error){
        super(error.message);
        this.name = 'RequestError';
        Object.assign(this, error);
    }
};
CacheableRequest.CacheError = class extends Error {
    constructor(error){
        super(error.message);
        this.name = 'CacheError';
        Object.assign(this, error);
    }
};
module.exports = CacheableRequest;
}),
"[project]/node_modules/decompress-response/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { Transform, PassThrough } = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)");
const zlib = __turbopack_context__.r("[externals]/zlib [external] (zlib, cjs)");
const mimicResponse = __turbopack_context__.r("[project]/node_modules/decompress-response/node_modules/mimic-response/index.js [app-ssr] (ecmascript)");
module.exports = (response)=>{
    const contentEncoding = (response.headers['content-encoding'] || '').toLowerCase();
    if (![
        'gzip',
        'deflate',
        'br'
    ].includes(contentEncoding)) {
        return response;
    }
    // TODO: Remove this when targeting Node.js 12.
    const isBrotli = contentEncoding === 'br';
    if (isBrotli && typeof zlib.createBrotliDecompress !== 'function') {
        response.destroy(new Error('Brotli is not supported on Node.js < 12'));
        return response;
    }
    let isEmpty = true;
    const checker = new Transform({
        transform (data, _encoding, callback) {
            isEmpty = false;
            callback(null, data);
        },
        flush (callback) {
            callback();
        }
    });
    const finalStream = new PassThrough({
        autoDestroy: false,
        destroy (error, callback) {
            response.destroy();
            callback(error);
        }
    });
    const decompressStream = isBrotli ? zlib.createBrotliDecompress() : zlib.createUnzip();
    decompressStream.once('error', (error)=>{
        if (isEmpty && !response.readable) {
            finalStream.end();
            return;
        }
        finalStream.destroy(error);
    });
    mimicResponse(response, finalStream);
    response.pipe(checker).pipe(decompressStream).pipe(finalStream);
    return finalStream;
};
}),
"[project]/node_modules/quick-lru/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

class QuickLRU {
    constructor(options = {}){
        if (!(options.maxSize && options.maxSize > 0)) {
            throw new TypeError('`maxSize` must be a number greater than 0');
        }
        this.maxSize = options.maxSize;
        this.onEviction = options.onEviction;
        this.cache = new Map();
        this.oldCache = new Map();
        this._size = 0;
    }
    _set(key, value) {
        this.cache.set(key, value);
        this._size++;
        if (this._size >= this.maxSize) {
            this._size = 0;
            if (typeof this.onEviction === 'function') {
                for (const [key, value] of this.oldCache.entries()){
                    this.onEviction(key, value);
                }
            }
            this.oldCache = this.cache;
            this.cache = new Map();
        }
    }
    get(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        if (this.oldCache.has(key)) {
            const value = this.oldCache.get(key);
            this.oldCache.delete(key);
            this._set(key, value);
            return value;
        }
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.set(key, value);
        } else {
            this._set(key, value);
        }
        return this;
    }
    has(key) {
        return this.cache.has(key) || this.oldCache.has(key);
    }
    peek(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        if (this.oldCache.has(key)) {
            return this.oldCache.get(key);
        }
    }
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this._size--;
        }
        return this.oldCache.delete(key) || deleted;
    }
    clear() {
        this.cache.clear();
        this.oldCache.clear();
        this._size = 0;
    }
    *keys() {
        for (const [key] of this){
            yield key;
        }
    }
    *values() {
        for (const [, value] of this){
            yield value;
        }
    }
    *[Symbol.iterator]() {
        for (const item of this.cache){
            yield item;
        }
        for (const item of this.oldCache){
            const [key] = item;
            if (!this.cache.has(key)) {
                yield item;
            }
        }
    }
    get size() {
        let oldCacheSize = 0;
        for (const key of this.oldCache.keys()){
            if (!this.cache.has(key)) {
                oldCacheSize++;
            }
        }
        return Math.min(this._size + oldCacheSize, this.maxSize);
    }
}
module.exports = QuickLRU;
}),
"[project]/node_modules/http2-wrapper/source/agent.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const EventEmitter = __turbopack_context__.r("[externals]/events [external] (events, cjs)");
const tls = __turbopack_context__.r("[externals]/tls [external] (tls, cjs)");
const http2 = __turbopack_context__.r("[externals]/http2 [external] (http2, cjs)");
const QuickLRU = __turbopack_context__.r("[project]/node_modules/quick-lru/index.js [app-ssr] (ecmascript)");
const kCurrentStreamsCount = Symbol('currentStreamsCount');
const kRequest = Symbol('request');
const kOriginSet = Symbol('cachedOriginSet');
const kGracefullyClosing = Symbol('gracefullyClosing');
const nameKeys = [
    // `http2.connect()` options
    'maxDeflateDynamicTableSize',
    'maxSessionMemory',
    'maxHeaderListPairs',
    'maxOutstandingPings',
    'maxReservedRemoteStreams',
    'maxSendHeaderBlockLength',
    'paddingStrategy',
    // `tls.connect()` options
    'localAddress',
    'path',
    'rejectUnauthorized',
    'minDHSize',
    // `tls.createSecureContext()` options
    'ca',
    'cert',
    'clientCertEngine',
    'ciphers',
    'key',
    'pfx',
    'servername',
    'minVersion',
    'maxVersion',
    'secureProtocol',
    'crl',
    'honorCipherOrder',
    'ecdhCurve',
    'dhparam',
    'secureOptions',
    'sessionIdContext'
];
const getSortedIndex = (array, value, compare)=>{
    let low = 0;
    let high = array.length;
    while(low < high){
        const mid = low + high >>> 1;
        /* istanbul ignore next */ if (compare(array[mid], value)) {
            // This never gets called because we use descending sort. Better to have this anyway.
            low = mid + 1;
        } else {
            high = mid;
        }
    }
    return low;
};
const compareSessions = (a, b)=>{
    return a.remoteSettings.maxConcurrentStreams > b.remoteSettings.maxConcurrentStreams;
};
// See https://tools.ietf.org/html/rfc8336
const closeCoveredSessions = (where, session)=>{
    // Clients SHOULD NOT emit new requests on any connection whose Origin
    // Set is a proper subset of another connection's Origin Set, and they
    // SHOULD close it once all outstanding requests are satisfied.
    for (const coveredSession of where){
        if (// The set is a proper subset when its length is less than the other set.
        coveredSession[kOriginSet].length < session[kOriginSet].length && // And the other set includes all elements of the subset.
        coveredSession[kOriginSet].every((origin)=>session[kOriginSet].includes(origin)) && // Makes sure that the session can handle all requests from the covered session.
        coveredSession[kCurrentStreamsCount] + session[kCurrentStreamsCount] <= session.remoteSettings.maxConcurrentStreams) {
            // This allows pending requests to finish and prevents making new requests.
            gracefullyClose(coveredSession);
        }
    }
};
// This is basically inverted `closeCoveredSessions(...)`.
const closeSessionIfCovered = (where, coveredSession)=>{
    for (const session of where){
        if (coveredSession[kOriginSet].length < session[kOriginSet].length && coveredSession[kOriginSet].every((origin)=>session[kOriginSet].includes(origin)) && coveredSession[kCurrentStreamsCount] + session[kCurrentStreamsCount] <= session.remoteSettings.maxConcurrentStreams) {
            gracefullyClose(coveredSession);
        }
    }
};
const getSessions = ({ agent, isFree })=>{
    const result = {};
    // eslint-disable-next-line guard-for-in
    for(const normalizedOptions in agent.sessions){
        const sessions = agent.sessions[normalizedOptions];
        const filtered = sessions.filter((session)=>{
            const result = session[Agent.kCurrentStreamsCount] < session.remoteSettings.maxConcurrentStreams;
            return isFree ? result : !result;
        });
        if (filtered.length !== 0) {
            result[normalizedOptions] = filtered;
        }
    }
    return result;
};
const gracefullyClose = (session)=>{
    session[kGracefullyClosing] = true;
    if (session[kCurrentStreamsCount] === 0) {
        session.close();
    }
};
class Agent extends EventEmitter {
    constructor({ timeout = 60000, maxSessions = Infinity, maxFreeSessions = 10, maxCachedTlsSessions = 100 } = {}){
        super();
        // A session is considered busy when its current streams count
        // is equal to or greater than the `maxConcurrentStreams` value.
        // A session is considered free when its current streams count
        // is less than the `maxConcurrentStreams` value.
        // SESSIONS[NORMALIZED_OPTIONS] = [];
        this.sessions = {};
        // The queue for creating new sessions. It looks like this:
        // QUEUE[NORMALIZED_OPTIONS][NORMALIZED_ORIGIN] = ENTRY_FUNCTION
        //
        // The entry function has `listeners`, `completed` and `destroyed` properties.
        // `listeners` is an array of objects containing `resolve` and `reject` functions.
        // `completed` is a boolean. It's set to true after ENTRY_FUNCTION is executed.
        // `destroyed` is a boolean. If it's set to true, the session will be destroyed if hasn't connected yet.
        this.queue = {};
        // Each session will use this timeout value.
        this.timeout = timeout;
        // Max sessions in total
        this.maxSessions = maxSessions;
        // Max free sessions in total
        // TODO: decreasing `maxFreeSessions` should close some sessions
        this.maxFreeSessions = maxFreeSessions;
        this._freeSessionsCount = 0;
        this._sessionsCount = 0;
        // We don't support push streams by default.
        this.settings = {
            enablePush: false
        };
        // Reusing TLS sessions increases performance.
        this.tlsSessionCache = new QuickLRU({
            maxSize: maxCachedTlsSessions
        });
    }
    static normalizeOrigin(url, servername) {
        if (typeof url === 'string') {
            url = new URL(url);
        }
        if (servername && url.hostname !== servername) {
            url.hostname = servername;
        }
        return url.origin;
    }
    normalizeOptions(options) {
        let normalized = '';
        if (options) {
            for (const key of nameKeys){
                if (options[key]) {
                    normalized += `:${options[key]}`;
                }
            }
        }
        return normalized;
    }
    _tryToCreateNewSession(normalizedOptions, normalizedOrigin) {
        if (!(normalizedOptions in this.queue) || !(normalizedOrigin in this.queue[normalizedOptions])) {
            return;
        }
        const item = this.queue[normalizedOptions][normalizedOrigin];
        // The entry function can be run only once.
        // BUG: The session may be never created when:
        // - the first condition is false AND
        // - this function is never called with the same arguments in the future.
        if (this._sessionsCount < this.maxSessions && !item.completed) {
            item.completed = true;
            item();
        }
    }
    getSession(origin, options, listeners) {
        return new Promise((resolve, reject)=>{
            if (Array.isArray(listeners)) {
                listeners = [
                    ...listeners
                ];
                // Resolve the current promise ASAP, we're just moving the listeners.
                // They will be executed at a different time.
                resolve();
            } else {
                listeners = [
                    {
                        resolve,
                        reject
                    }
                ];
            }
            const normalizedOptions = this.normalizeOptions(options);
            const normalizedOrigin = Agent.normalizeOrigin(origin, options && options.servername);
            if (normalizedOrigin === undefined) {
                for (const { reject } of listeners){
                    reject(new TypeError('The `origin` argument needs to be a string or an URL object'));
                }
                return;
            }
            if (normalizedOptions in this.sessions) {
                const sessions = this.sessions[normalizedOptions];
                let maxConcurrentStreams = -1;
                let currentStreamsCount = -1;
                let optimalSession;
                // We could just do this.sessions[normalizedOptions].find(...) but that isn't optimal.
                // Additionally, we are looking for session which has biggest current pending streams count.
                for (const session of sessions){
                    const sessionMaxConcurrentStreams = session.remoteSettings.maxConcurrentStreams;
                    if (sessionMaxConcurrentStreams < maxConcurrentStreams) {
                        break;
                    }
                    if (session[kOriginSet].includes(normalizedOrigin)) {
                        const sessionCurrentStreamsCount = session[kCurrentStreamsCount];
                        if (sessionCurrentStreamsCount >= sessionMaxConcurrentStreams || session[kGracefullyClosing] || // Unfortunately the `close` event isn't called immediately,
                        // so `session.destroyed` is `true`, but `session.closed` is `false`.
                        session.destroyed) {
                            continue;
                        }
                        // We only need set this once.
                        if (!optimalSession) {
                            maxConcurrentStreams = sessionMaxConcurrentStreams;
                        }
                        // We're looking for the session which has biggest current pending stream count,
                        // in order to minimalize the amount of active sessions.
                        if (sessionCurrentStreamsCount > currentStreamsCount) {
                            optimalSession = session;
                            currentStreamsCount = sessionCurrentStreamsCount;
                        }
                    }
                }
                if (optimalSession) {
                    /* istanbul ignore next: safety check */ if (listeners.length !== 1) {
                        for (const { reject } of listeners){
                            const error = new Error(`Expected the length of listeners to be 1, got ${listeners.length}.\n` + 'Please report this to https://github.com/szmarczak/http2-wrapper/');
                            reject(error);
                        }
                        return;
                    }
                    listeners[0].resolve(optimalSession);
                    return;
                }
            }
            if (normalizedOptions in this.queue) {
                if (normalizedOrigin in this.queue[normalizedOptions]) {
                    // There's already an item in the queue, just attach ourselves to it.
                    this.queue[normalizedOptions][normalizedOrigin].listeners.push(...listeners);
                    // This shouldn't be executed here.
                    // See the comment inside _tryToCreateNewSession.
                    this._tryToCreateNewSession(normalizedOptions, normalizedOrigin);
                    return;
                }
            } else {
                this.queue[normalizedOptions] = {};
            }
            // The entry must be removed from the queue IMMEDIATELY when:
            // 1. the session connects successfully,
            // 2. an error occurs.
            const removeFromQueue = ()=>{
                // Our entry can be replaced. We cannot remove the new one.
                if (normalizedOptions in this.queue && this.queue[normalizedOptions][normalizedOrigin] === entry) {
                    delete this.queue[normalizedOptions][normalizedOrigin];
                    if (Object.keys(this.queue[normalizedOptions]).length === 0) {
                        delete this.queue[normalizedOptions];
                    }
                }
            };
            // The main logic is here
            const entry = ()=>{
                const name = `${normalizedOrigin}:${normalizedOptions}`;
                let receivedSettings = false;
                try {
                    const session = http2.connect(origin, {
                        createConnection: this.createConnection,
                        settings: this.settings,
                        session: this.tlsSessionCache.get(name),
                        ...options
                    });
                    session[kCurrentStreamsCount] = 0;
                    session[kGracefullyClosing] = false;
                    const isFree = ()=>session[kCurrentStreamsCount] < session.remoteSettings.maxConcurrentStreams;
                    let wasFree = true;
                    session.socket.once('session', (tlsSession)=>{
                        this.tlsSessionCache.set(name, tlsSession);
                    });
                    session.once('error', (error)=>{
                        // Listeners are empty when the session successfully connected.
                        for (const { reject } of listeners){
                            reject(error);
                        }
                        // The connection got broken, purge the cache.
                        this.tlsSessionCache.delete(name);
                    });
                    session.setTimeout(this.timeout, ()=>{
                        // Terminates all streams owned by this session.
                        // TODO: Maybe the streams should have a "Session timed out" error?
                        session.destroy();
                    });
                    session.once('close', ()=>{
                        if (receivedSettings) {
                            // 1. If it wasn't free then no need to decrease because
                            //    it has been decreased already in session.request().
                            // 2. `stream.once('close')` won't increment the count
                            //    because the session is already closed.
                            if (wasFree) {
                                this._freeSessionsCount--;
                            }
                            this._sessionsCount--;
                            // This cannot be moved to the stream logic,
                            // because there may be a session that hadn't made a single request.
                            const where = this.sessions[normalizedOptions];
                            where.splice(where.indexOf(session), 1);
                            if (where.length === 0) {
                                delete this.sessions[normalizedOptions];
                            }
                        } else {
                            // Broken connection
                            const error = new Error('Session closed without receiving a SETTINGS frame');
                            error.code = 'HTTP2WRAPPER_NOSETTINGS';
                            for (const { reject } of listeners){
                                reject(error);
                            }
                            removeFromQueue();
                        }
                        // There may be another session awaiting.
                        this._tryToCreateNewSession(normalizedOptions, normalizedOrigin);
                    });
                    // Iterates over the queue and processes listeners.
                    const processListeners = ()=>{
                        if (!(normalizedOptions in this.queue) || !isFree()) {
                            return;
                        }
                        for (const origin of session[kOriginSet]){
                            if (origin in this.queue[normalizedOptions]) {
                                const { listeners } = this.queue[normalizedOptions][origin];
                                // Prevents session overloading.
                                while(listeners.length !== 0 && isFree()){
                                    // We assume `resolve(...)` calls `request(...)` *directly*,
                                    // otherwise the session will get overloaded.
                                    listeners.shift().resolve(session);
                                }
                                const where = this.queue[normalizedOptions];
                                if (where[origin].listeners.length === 0) {
                                    delete where[origin];
                                    if (Object.keys(where).length === 0) {
                                        delete this.queue[normalizedOptions];
                                        break;
                                    }
                                }
                                // We're no longer free, no point in continuing.
                                if (!isFree()) {
                                    break;
                                }
                            }
                        }
                    };
                    // The Origin Set cannot shrink. No need to check if it suddenly became covered by another one.
                    session.on('origin', ()=>{
                        session[kOriginSet] = session.originSet;
                        if (!isFree()) {
                            // The session is full.
                            return;
                        }
                        processListeners();
                        // Close covered sessions (if possible).
                        closeCoveredSessions(this.sessions[normalizedOptions], session);
                    });
                    session.once('remoteSettings', ()=>{
                        // Fix Node.js bug preventing the process from exiting
                        session.ref();
                        session.unref();
                        this._sessionsCount++;
                        // The Agent could have been destroyed already.
                        if (entry.destroyed) {
                            const error = new Error('Agent has been destroyed');
                            for (const listener of listeners){
                                listener.reject(error);
                            }
                            session.destroy();
                            return;
                        }
                        session[kOriginSet] = session.originSet;
                        {
                            const where = this.sessions;
                            if (normalizedOptions in where) {
                                const sessions = where[normalizedOptions];
                                sessions.splice(getSortedIndex(sessions, session, compareSessions), 0, session);
                            } else {
                                where[normalizedOptions] = [
                                    session
                                ];
                            }
                        }
                        this._freeSessionsCount += 1;
                        receivedSettings = true;
                        this.emit('session', session);
                        processListeners();
                        removeFromQueue();
                        // TODO: Close last recently used (or least used?) session
                        if (session[kCurrentStreamsCount] === 0 && this._freeSessionsCount > this.maxFreeSessions) {
                            session.close();
                        }
                        // Check if we haven't managed to execute all listeners.
                        if (listeners.length !== 0) {
                            // Request for a new session with predefined listeners.
                            this.getSession(normalizedOrigin, options, listeners);
                            listeners.length = 0;
                        }
                        // `session.remoteSettings.maxConcurrentStreams` might get increased
                        session.on('remoteSettings', ()=>{
                            processListeners();
                            // In case the Origin Set changes
                            closeCoveredSessions(this.sessions[normalizedOptions], session);
                        });
                    });
                    // Shim `session.request()` in order to catch all streams
                    session[kRequest] = session.request;
                    session.request = (headers, streamOptions)=>{
                        if (session[kGracefullyClosing]) {
                            throw new Error('The session is gracefully closing. No new streams are allowed.');
                        }
                        const stream = session[kRequest](headers, streamOptions);
                        // The process won't exit until the session is closed or all requests are gone.
                        session.ref();
                        ++session[kCurrentStreamsCount];
                        if (session[kCurrentStreamsCount] === session.remoteSettings.maxConcurrentStreams) {
                            this._freeSessionsCount--;
                        }
                        stream.once('close', ()=>{
                            wasFree = isFree();
                            --session[kCurrentStreamsCount];
                            if (!session.destroyed && !session.closed) {
                                closeSessionIfCovered(this.sessions[normalizedOptions], session);
                                if (isFree() && !session.closed) {
                                    if (!wasFree) {
                                        this._freeSessionsCount++;
                                        wasFree = true;
                                    }
                                    const isEmpty = session[kCurrentStreamsCount] === 0;
                                    if (isEmpty) {
                                        session.unref();
                                    }
                                    if (isEmpty && (this._freeSessionsCount > this.maxFreeSessions || session[kGracefullyClosing])) {
                                        session.close();
                                    } else {
                                        closeCoveredSessions(this.sessions[normalizedOptions], session);
                                        processListeners();
                                    }
                                }
                            }
                        });
                        return stream;
                    };
                } catch (error) {
                    for (const listener of listeners){
                        listener.reject(error);
                    }
                    removeFromQueue();
                }
            };
            entry.listeners = listeners;
            entry.completed = false;
            entry.destroyed = false;
            this.queue[normalizedOptions][normalizedOrigin] = entry;
            this._tryToCreateNewSession(normalizedOptions, normalizedOrigin);
        });
    }
    request(origin, options, headers, streamOptions) {
        return new Promise((resolve, reject)=>{
            this.getSession(origin, options, [
                {
                    reject,
                    resolve: (session)=>{
                        try {
                            resolve(session.request(headers, streamOptions));
                        } catch (error) {
                            reject(error);
                        }
                    }
                }
            ]);
        });
    }
    createConnection(origin, options) {
        return Agent.connect(origin, options);
    }
    static connect(origin, options) {
        options.ALPNProtocols = [
            'h2'
        ];
        const port = origin.port || 443;
        const host = origin.hostname || origin.host;
        if (typeof options.servername === 'undefined') {
            options.servername = host;
        }
        return tls.connect(port, host, options);
    }
    closeFreeSessions() {
        for (const sessions of Object.values(this.sessions)){
            for (const session of sessions){
                if (session[kCurrentStreamsCount] === 0) {
                    session.close();
                }
            }
        }
    }
    destroy(reason) {
        for (const sessions of Object.values(this.sessions)){
            for (const session of sessions){
                session.destroy(reason);
            }
        }
        for (const entriesOfAuthority of Object.values(this.queue)){
            for (const entry of Object.values(entriesOfAuthority)){
                entry.destroyed = true;
            }
        }
        // New requests should NOT attach to destroyed sessions
        this.queue = {};
    }
    get freeSessions() {
        return getSessions({
            agent: this,
            isFree: true
        });
    }
    get busySessions() {
        return getSessions({
            agent: this,
            isFree: false
        });
    }
}
Agent.kCurrentStreamsCount = kCurrentStreamsCount;
Agent.kGracefullyClosing = kGracefullyClosing;
module.exports = {
    Agent,
    globalAgent: new Agent()
};
}),
"[project]/node_modules/http2-wrapper/source/incoming-message.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const { Readable } = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)");
class IncomingMessage extends Readable {
    constructor(socket, highWaterMark){
        super({
            highWaterMark,
            autoDestroy: false
        });
        this.statusCode = null;
        this.statusMessage = '';
        this.httpVersion = '2.0';
        this.httpVersionMajor = 2;
        this.httpVersionMinor = 0;
        this.headers = {};
        this.trailers = {};
        this.req = null;
        this.aborted = false;
        this.complete = false;
        this.upgrade = null;
        this.rawHeaders = [];
        this.rawTrailers = [];
        this.socket = socket;
        this.connection = socket;
        this._dumped = false;
    }
    _destroy(error) {
        this.req._request.destroy(error);
    }
    setTimeout(ms, callback) {
        this.req.setTimeout(ms, callback);
        return this;
    }
    _dump() {
        if (!this._dumped) {
            this._dumped = true;
            this.removeAllListeners('data');
            this.resume();
        }
    }
    _read() {
        if (this.req) {
            this.req._request.resume();
        }
    }
}
module.exports = IncomingMessage;
}),
"[project]/node_modules/http2-wrapper/source/utils/url-to-options.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* istanbul ignore file: https://github.com/nodejs/node/blob/a91293d4d9ab403046ab5eb022332e4e3d249bd3/lib/internal/url.js#L1257 */ module.exports = (url)=>{
    const options = {
        protocol: url.protocol,
        hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[') ? url.hostname.slice(1, -1) : url.hostname,
        host: url.host,
        hash: url.hash,
        search: url.search,
        pathname: url.pathname,
        href: url.href,
        path: `${url.pathname || ''}${url.search || ''}`
    };
    if (typeof url.port === 'string' && url.port.length !== 0) {
        options.port = Number(url.port);
    }
    if (url.username || url.password) {
        options.auth = `${url.username || ''}:${url.password || ''}`;
    }
    return options;
};
}),
"[project]/node_modules/http2-wrapper/source/utils/proxy-events.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = (from, to, events)=>{
    for (const event of events){
        from.on(event, (...args)=>to.emit(event, ...args));
    }
};
}),
"[project]/node_modules/http2-wrapper/source/utils/is-request-pseudo-header.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = (header)=>{
    switch(header){
        case ':method':
        case ':scheme':
        case ':authority':
        case ':path':
            return true;
        default:
            return false;
    }
};
}),
"[project]/node_modules/http2-wrapper/source/utils/errors.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* istanbul ignore file: https://github.com/nodejs/node/blob/master/lib/internal/errors.js */ const makeError = (Base, key, getMessage)=>{
    module.exports[key] = class NodeError extends Base {
        constructor(...args){
            super(typeof getMessage === 'string' ? getMessage : getMessage(args));
            this.name = `${super.name} [${key}]`;
            this.code = key;
        }
    };
};
makeError(TypeError, 'ERR_INVALID_ARG_TYPE', (args)=>{
    const type = args[0].includes('.') ? 'property' : 'argument';
    let valid = args[1];
    const isManyTypes = Array.isArray(valid);
    if (isManyTypes) {
        valid = `${valid.slice(0, -1).join(', ')} or ${valid.slice(-1)}`;
    }
    return `The "${args[0]}" ${type} must be ${isManyTypes ? 'one of' : 'of'} type ${valid}. Received ${typeof args[2]}`;
});
makeError(TypeError, 'ERR_INVALID_PROTOCOL', (args)=>{
    return `Protocol "${args[0]}" not supported. Expected "${args[1]}"`;
});
makeError(Error, 'ERR_HTTP_HEADERS_SENT', (args)=>{
    return `Cannot ${args[0]} headers after they are sent to the client`;
});
makeError(TypeError, 'ERR_INVALID_HTTP_TOKEN', (args)=>{
    return `${args[0]} must be a valid HTTP token [${args[1]}]`;
});
makeError(TypeError, 'ERR_HTTP_INVALID_HEADER_VALUE', (args)=>{
    return `Invalid value "${args[0]} for header "${args[1]}"`;
});
makeError(TypeError, 'ERR_INVALID_CHAR', (args)=>{
    return `Invalid character in ${args[0]} [${args[1]}]`;
});
}),
"[project]/node_modules/http2-wrapper/source/client-request.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const http2 = __turbopack_context__.r("[externals]/http2 [external] (http2, cjs)");
const { Writable } = __turbopack_context__.r("[externals]/stream [external] (stream, cjs)");
const { Agent, globalAgent } = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/agent.js [app-ssr] (ecmascript)");
const IncomingMessage = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/incoming-message.js [app-ssr] (ecmascript)");
const urlToOptions = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/url-to-options.js [app-ssr] (ecmascript)");
const proxyEvents = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/proxy-events.js [app-ssr] (ecmascript)");
const isRequestPseudoHeader = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/is-request-pseudo-header.js [app-ssr] (ecmascript)");
const { ERR_INVALID_ARG_TYPE, ERR_INVALID_PROTOCOL, ERR_HTTP_HEADERS_SENT, ERR_INVALID_HTTP_TOKEN, ERR_HTTP_INVALID_HEADER_VALUE, ERR_INVALID_CHAR } = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/errors.js [app-ssr] (ecmascript)");
const { HTTP2_HEADER_STATUS, HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH, HTTP2_METHOD_CONNECT } = http2.constants;
const kHeaders = Symbol('headers');
const kOrigin = Symbol('origin');
const kSession = Symbol('session');
const kOptions = Symbol('options');
const kFlushedHeaders = Symbol('flushedHeaders');
const kJobs = Symbol('jobs');
const isValidHttpToken = /^[\^`\-\w!#$%&*+.|~]+$/;
const isInvalidHeaderValue = /[^\t\u0020-\u007E\u0080-\u00FF]/;
class ClientRequest extends Writable {
    constructor(input, options, callback){
        super({
            autoDestroy: false
        });
        const hasInput = typeof input === 'string' || input instanceof URL;
        if (hasInput) {
            input = urlToOptions(input instanceof URL ? input : new URL(input));
        }
        if (typeof options === 'function' || options === undefined) {
            // (options, callback)
            callback = options;
            options = hasInput ? input : {
                ...input
            };
        } else {
            // (input, options, callback)
            options = {
                ...input,
                ...options
            };
        }
        if (options.h2session) {
            this[kSession] = options.h2session;
        } else if (options.agent === false) {
            this.agent = new Agent({
                maxFreeSessions: 0
            });
        } else if (typeof options.agent === 'undefined' || options.agent === null) {
            if (typeof options.createConnection === 'function') {
                // This is a workaround - we don't have to create the session on our own.
                this.agent = new Agent({
                    maxFreeSessions: 0
                });
                this.agent.createConnection = options.createConnection;
            } else {
                this.agent = globalAgent;
            }
        } else if (typeof options.agent.request === 'function') {
            this.agent = options.agent;
        } else {
            throw new ERR_INVALID_ARG_TYPE('options.agent', [
                'Agent-like Object',
                'undefined',
                'false'
            ], options.agent);
        }
        if (options.protocol && options.protocol !== 'https:') {
            throw new ERR_INVALID_PROTOCOL(options.protocol, 'https:');
        }
        const port = options.port || options.defaultPort || this.agent && this.agent.defaultPort || 443;
        const host = options.hostname || options.host || 'localhost';
        // Don't enforce the origin via options. It may be changed in an Agent.
        delete options.hostname;
        delete options.host;
        delete options.port;
        const { timeout } = options;
        options.timeout = undefined;
        this[kHeaders] = Object.create(null);
        this[kJobs] = [];
        this.socket = null;
        this.connection = null;
        this.method = options.method || 'GET';
        this.path = options.path;
        this.res = null;
        this.aborted = false;
        this.reusedSocket = false;
        if (options.headers) {
            for (const [header, value] of Object.entries(options.headers)){
                this.setHeader(header, value);
            }
        }
        if (options.auth && !('authorization' in this[kHeaders])) {
            this[kHeaders].authorization = 'Basic ' + Buffer.from(options.auth).toString('base64');
        }
        options.session = options.tlsSession;
        options.path = options.socketPath;
        this[kOptions] = options;
        // Clients that generate HTTP/2 requests directly SHOULD use the :authority pseudo-header field instead of the Host header field.
        if (port === 443) {
            this[kOrigin] = `https://${host}`;
            if (!(':authority' in this[kHeaders])) {
                this[kHeaders][':authority'] = host;
            }
        } else {
            this[kOrigin] = `https://${host}:${port}`;
            if (!(':authority' in this[kHeaders])) {
                this[kHeaders][':authority'] = `${host}:${port}`;
            }
        }
        if (timeout) {
            this.setTimeout(timeout);
        }
        if (callback) {
            this.once('response', callback);
        }
        this[kFlushedHeaders] = false;
    }
    get method() {
        return this[kHeaders][HTTP2_HEADER_METHOD];
    }
    set method(value) {
        if (value) {
            this[kHeaders][HTTP2_HEADER_METHOD] = value.toUpperCase();
        }
    }
    get path() {
        return this[kHeaders][HTTP2_HEADER_PATH];
    }
    set path(value) {
        if (value) {
            this[kHeaders][HTTP2_HEADER_PATH] = value;
        }
    }
    get _mustNotHaveABody() {
        return this.method === 'GET' || this.method === 'HEAD' || this.method === 'DELETE';
    }
    _write(chunk, encoding, callback) {
        // https://github.com/nodejs/node/blob/654df09ae0c5e17d1b52a900a545f0664d8c7627/lib/internal/http2/util.js#L148-L156
        if (this._mustNotHaveABody) {
            callback(new Error('The GET, HEAD and DELETE methods must NOT have a body'));
            /* istanbul ignore next: Node.js 12 throws directly */ return;
        }
        this.flushHeaders();
        const callWrite = ()=>this._request.write(chunk, encoding, callback);
        if (this._request) {
            callWrite();
        } else {
            this[kJobs].push(callWrite);
        }
    }
    _final(callback) {
        if (this.destroyed) {
            return;
        }
        this.flushHeaders();
        const callEnd = ()=>{
            // For GET, HEAD and DELETE
            if (this._mustNotHaveABody) {
                callback();
                return;
            }
            this._request.end(callback);
        };
        if (this._request) {
            callEnd();
        } else {
            this[kJobs].push(callEnd);
        }
    }
    abort() {
        if (this.res && this.res.complete) {
            return;
        }
        if (!this.aborted) {
            process.nextTick(()=>this.emit('abort'));
        }
        this.aborted = true;
        this.destroy();
    }
    _destroy(error, callback) {
        if (this.res) {
            this.res._dump();
        }
        if (this._request) {
            this._request.destroy();
        }
        callback(error);
    }
    async flushHeaders() {
        if (this[kFlushedHeaders] || this.destroyed) {
            return;
        }
        this[kFlushedHeaders] = true;
        const isConnectMethod = this.method === HTTP2_METHOD_CONNECT;
        // The real magic is here
        const onStream = (stream)=>{
            this._request = stream;
            if (this.destroyed) {
                stream.destroy();
                return;
            }
            // Forwards `timeout`, `continue`, `close` and `error` events to this instance.
            if (!isConnectMethod) {
                proxyEvents(stream, this, [
                    'timeout',
                    'continue',
                    'close',
                    'error'
                ]);
            }
            // Wait for the `finish` event. We don't want to emit the `response` event
            // before `request.end()` is called.
            const waitForEnd = (fn)=>{
                return (...args)=>{
                    if (!this.writable && !this.destroyed) {
                        fn(...args);
                    } else {
                        this.once('finish', ()=>{
                            fn(...args);
                        });
                    }
                };
            };
            // This event tells we are ready to listen for the data.
            stream.once('response', waitForEnd((headers, flags, rawHeaders)=>{
                // If we were to emit raw request stream, it would be as fast as the native approach.
                // Note that wrapping the raw stream in a Proxy instance won't improve the performance (already tested it).
                const response = new IncomingMessage(this.socket, stream.readableHighWaterMark);
                this.res = response;
                response.req = this;
                response.statusCode = headers[HTTP2_HEADER_STATUS];
                response.headers = headers;
                response.rawHeaders = rawHeaders;
                response.once('end', ()=>{
                    if (this.aborted) {
                        response.aborted = true;
                        response.emit('aborted');
                    } else {
                        response.complete = true;
                        // Has no effect, just be consistent with the Node.js behavior
                        response.socket = null;
                        response.connection = null;
                    }
                });
                if (isConnectMethod) {
                    response.upgrade = true;
                    // The HTTP1 API says the socket is detached here,
                    // but we can't do that so we pass the original HTTP2 request.
                    if (this.emit('connect', response, stream, Buffer.alloc(0))) {
                        this.emit('close');
                    } else {
                        // No listeners attached, destroy the original request.
                        stream.destroy();
                    }
                } else {
                    // Forwards data
                    stream.on('data', (chunk)=>{
                        if (!response._dumped && !response.push(chunk)) {
                            stream.pause();
                        }
                    });
                    stream.once('end', ()=>{
                        response.push(null);
                    });
                    if (!this.emit('response', response)) {
                        // No listeners attached, dump the response.
                        response._dump();
                    }
                }
            }));
            // Emits `information` event
            stream.once('headers', waitForEnd((headers)=>this.emit('information', {
                    statusCode: headers[HTTP2_HEADER_STATUS]
                })));
            stream.once('trailers', waitForEnd((trailers, flags, rawTrailers)=>{
                const { res } = this;
                // Assigns trailers to the response object.
                res.trailers = trailers;
                res.rawTrailers = rawTrailers;
            }));
            const { socket } = stream.session;
            this.socket = socket;
            this.connection = socket;
            for (const job of this[kJobs]){
                job();
            }
            this.emit('socket', this.socket);
        };
        // Makes a HTTP2 request
        if (this[kSession]) {
            try {
                onStream(this[kSession].request(this[kHeaders]));
            } catch (error) {
                this.emit('error', error);
            }
        } else {
            this.reusedSocket = true;
            try {
                onStream(await this.agent.request(this[kOrigin], this[kOptions], this[kHeaders]));
            } catch (error) {
                this.emit('error', error);
            }
        }
    }
    getHeader(name) {
        if (typeof name !== 'string') {
            throw new ERR_INVALID_ARG_TYPE('name', 'string', name);
        }
        return this[kHeaders][name.toLowerCase()];
    }
    get headersSent() {
        return this[kFlushedHeaders];
    }
    removeHeader(name) {
        if (typeof name !== 'string') {
            throw new ERR_INVALID_ARG_TYPE('name', 'string', name);
        }
        if (this.headersSent) {
            throw new ERR_HTTP_HEADERS_SENT('remove');
        }
        delete this[kHeaders][name.toLowerCase()];
    }
    setHeader(name, value) {
        if (this.headersSent) {
            throw new ERR_HTTP_HEADERS_SENT('set');
        }
        if (typeof name !== 'string' || !isValidHttpToken.test(name) && !isRequestPseudoHeader(name)) {
            throw new ERR_INVALID_HTTP_TOKEN('Header name', name);
        }
        if (typeof value === 'undefined') {
            throw new ERR_HTTP_INVALID_HEADER_VALUE(value, name);
        }
        if (isInvalidHeaderValue.test(value)) {
            throw new ERR_INVALID_CHAR('header content', name);
        }
        this[kHeaders][name.toLowerCase()] = value;
    }
    setNoDelay() {
    // HTTP2 sockets cannot be malformed, do nothing.
    }
    setSocketKeepAlive() {
    // HTTP2 sockets cannot be malformed, do nothing.
    }
    setTimeout(ms, callback) {
        const applyTimeout = ()=>this._request.setTimeout(ms, callback);
        if (this._request) {
            applyTimeout();
        } else {
            this[kJobs].push(applyTimeout);
        }
        return this;
    }
    get maxHeadersCount() {
        if (!this.destroyed && this._request) {
            return this._request.session.localSettings.maxHeaderListSize;
        }
        return undefined;
    }
    set maxHeadersCount(_value) {
    // Updating HTTP2 settings would affect all requests, do nothing.
    }
}
module.exports = ClientRequest;
}),
"[project]/node_modules/http2-wrapper/source/utils/calculate-server-name.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const net = __turbopack_context__.r("[externals]/net [external] (net, cjs)");
/* istanbul ignore file: https://github.com/nodejs/node/blob/v13.0.1/lib/_http_agent.js */ module.exports = (options)=>{
    let servername = options.host;
    const hostHeader = options.headers && options.headers.host;
    if (hostHeader) {
        if (hostHeader.startsWith('[')) {
            const index = hostHeader.indexOf(']');
            if (index === -1) {
                servername = hostHeader;
            } else {
                servername = hostHeader.slice(1, -1);
            }
        } else {
            servername = hostHeader.split(':', 1)[0];
        }
    }
    if (net.isIP(servername)) {
        return '';
    }
    return servername;
};
}),
"[project]/node_modules/http2-wrapper/source/auto.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const http = __turbopack_context__.r("[externals]/http [external] (http, cjs)");
const https = __turbopack_context__.r("[externals]/https [external] (https, cjs)");
const resolveALPN = __turbopack_context__.r("[project]/node_modules/resolve-alpn/index.js [app-ssr] (ecmascript)");
const QuickLRU = __turbopack_context__.r("[project]/node_modules/quick-lru/index.js [app-ssr] (ecmascript)");
const Http2ClientRequest = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/client-request.js [app-ssr] (ecmascript)");
const calculateServerName = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/calculate-server-name.js [app-ssr] (ecmascript)");
const urlToOptions = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/utils/url-to-options.js [app-ssr] (ecmascript)");
const cache = new QuickLRU({
    maxSize: 100
});
const queue = new Map();
const installSocket = (agent, socket, options)=>{
    socket._httpMessage = {
        shouldKeepAlive: true
    };
    const onFree = ()=>{
        agent.emit('free', socket, options);
    };
    socket.on('free', onFree);
    const onClose = ()=>{
        agent.removeSocket(socket, options);
    };
    socket.on('close', onClose);
    const onRemove = ()=>{
        agent.removeSocket(socket, options);
        socket.off('close', onClose);
        socket.off('free', onFree);
        socket.off('agentRemove', onRemove);
    };
    socket.on('agentRemove', onRemove);
    agent.emit('free', socket, options);
};
const resolveProtocol = async (options)=>{
    const name = `${options.host}:${options.port}:${options.ALPNProtocols.sort()}`;
    if (!cache.has(name)) {
        if (queue.has(name)) {
            const result = await queue.get(name);
            return result.alpnProtocol;
        }
        const { path, agent } = options;
        options.path = options.socketPath;
        const resultPromise = resolveALPN(options);
        queue.set(name, resultPromise);
        try {
            const { socket, alpnProtocol } = await resultPromise;
            cache.set(name, alpnProtocol);
            options.path = path;
            if (alpnProtocol === 'h2') {
                // https://github.com/nodejs/node/issues/33343
                socket.destroy();
            } else {
                const { globalAgent } = https;
                const defaultCreateConnection = https.Agent.prototype.createConnection;
                if (agent) {
                    if (agent.createConnection === defaultCreateConnection) {
                        installSocket(agent, socket, options);
                    } else {
                        socket.destroy();
                    }
                } else if (globalAgent.createConnection === defaultCreateConnection) {
                    installSocket(globalAgent, socket, options);
                } else {
                    socket.destroy();
                }
            }
            queue.delete(name);
            return alpnProtocol;
        } catch (error) {
            queue.delete(name);
            throw error;
        }
    }
    return cache.get(name);
};
module.exports = async (input, options, callback)=>{
    if (typeof input === 'string' || input instanceof URL) {
        input = urlToOptions(new URL(input));
    }
    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }
    options = {
        ALPNProtocols: [
            'h2',
            'http/1.1'
        ],
        ...input,
        ...options,
        resolveSocket: true
    };
    if (!Array.isArray(options.ALPNProtocols) || options.ALPNProtocols.length === 0) {
        throw new Error('The `ALPNProtocols` option must be an Array with at least one entry');
    }
    options.protocol = options.protocol || 'https:';
    const isHttps = options.protocol === 'https:';
    options.host = options.hostname || options.host || 'localhost';
    options.session = options.tlsSession;
    options.servername = options.servername || calculateServerName(options);
    options.port = options.port || (isHttps ? 443 : 80);
    options._defaultAgent = isHttps ? https.globalAgent : http.globalAgent;
    const agents = options.agent;
    if (agents) {
        if (agents.addRequest) {
            throw new Error('The `options.agent` object can contain only `http`, `https` or `http2` properties');
        }
        options.agent = agents[isHttps ? 'https' : 'http'];
    }
    if (isHttps) {
        const protocol = await resolveProtocol(options);
        if (protocol === 'h2') {
            if (agents) {
                options.agent = agents.http2;
            }
            return new Http2ClientRequest(options, callback);
        }
    }
    return http.request(options, callback);
};
module.exports.protocolCache = cache;
}),
"[project]/node_modules/http2-wrapper/source/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const http2 = __turbopack_context__.r("[externals]/http2 [external] (http2, cjs)");
const agent = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/agent.js [app-ssr] (ecmascript)");
const ClientRequest = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/client-request.js [app-ssr] (ecmascript)");
const IncomingMessage = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/incoming-message.js [app-ssr] (ecmascript)");
const auto = __turbopack_context__.r("[project]/node_modules/http2-wrapper/source/auto.js [app-ssr] (ecmascript)");
const request = (url, options, callback)=>{
    return new ClientRequest(url, options, callback);
};
const get = (url, options, callback)=>{
    // eslint-disable-next-line unicorn/prevent-abbreviations
    const req = new ClientRequest(url, options, callback);
    req.end();
    return req;
};
module.exports = {
    ...http2,
    ClientRequest,
    IncomingMessage,
    ...agent,
    request,
    get,
    auto
};
}),
"[project]/node_modules/resolve-alpn/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

const tls = __turbopack_context__.r("[externals]/tls [external] (tls, cjs)");
module.exports = (options = {}, connect = tls.connect)=>new Promise((resolve, reject)=>{
        let timeout = false;
        let socket;
        const callback = async ()=>{
            await socketPromise;
            socket.off('timeout', onTimeout);
            socket.off('error', reject);
            if (options.resolveSocket) {
                resolve({
                    alpnProtocol: socket.alpnProtocol,
                    socket,
                    timeout
                });
                if (timeout) {
                    await Promise.resolve();
                    socket.emit('timeout');
                }
            } else {
                socket.destroy();
                resolve({
                    alpnProtocol: socket.alpnProtocol,
                    timeout
                });
            }
        };
        const onTimeout = async ()=>{
            timeout = true;
            callback();
        };
        const socketPromise = (async ()=>{
            try {
                socket = await connect(options, callback);
                socket.on('error', reject);
                socket.once('timeout', onTimeout);
            } catch (error) {
                reject(error);
            }
        })();
    });
}),
"[project]/node_modules/p-cancelable/index.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

class CancelError extends Error {
    constructor(reason){
        super(reason || 'Promise was canceled');
        this.name = 'CancelError';
    }
    get isCanceled() {
        return true;
    }
}
class PCancelable {
    static fn(userFn) {
        return (...arguments_)=>{
            return new PCancelable((resolve, reject, onCancel)=>{
                arguments_.push(onCancel);
                // eslint-disable-next-line promise/prefer-await-to-then
                userFn(...arguments_).then(resolve, reject);
            });
        };
    }
    constructor(executor){
        this._cancelHandlers = [];
        this._isPending = true;
        this._isCanceled = false;
        this._rejectOnCancel = true;
        this._promise = new Promise((resolve, reject)=>{
            this._reject = reject;
            const onResolve = (value)=>{
                if (!this._isCanceled || !onCancel.shouldReject) {
                    this._isPending = false;
                    resolve(value);
                }
            };
            const onReject = (error)=>{
                this._isPending = false;
                reject(error);
            };
            const onCancel = (handler)=>{
                if (!this._isPending) {
                    throw new Error('The `onCancel` handler was attached after the promise settled.');
                }
                this._cancelHandlers.push(handler);
            };
            Object.defineProperties(onCancel, {
                shouldReject: {
                    get: ()=>this._rejectOnCancel,
                    set: (boolean)=>{
                        this._rejectOnCancel = boolean;
                    }
                }
            });
            return executor(onResolve, onReject, onCancel);
        });
    }
    then(onFulfilled, onRejected) {
        // eslint-disable-next-line promise/prefer-await-to-then
        return this._promise.then(onFulfilled, onRejected);
    }
    catch(onRejected) {
        return this._promise.catch(onRejected);
    }
    finally(onFinally) {
        return this._promise.finally(onFinally);
    }
    cancel(reason) {
        if (!this._isPending || this._isCanceled) {
            return;
        }
        this._isCanceled = true;
        if (this._cancelHandlers.length > 0) {
            try {
                for (const handler of this._cancelHandlers){
                    handler();
                }
            } catch (error) {
                this._reject(error);
                return;
            }
        }
        if (this._rejectOnCancel) {
            this._reject(new CancelError(reason));
        }
    }
    get isCanceled() {
        return this._isCanceled;
    }
}
Object.setPrototypeOf(PCancelable.prototype, Promise.prototype);
module.exports = PCancelable;
module.exports.CancelError = CancelError;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0pxkc8c._.js.map