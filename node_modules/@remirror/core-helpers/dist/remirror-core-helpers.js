// packages/remirror__core-helpers/src/core-errors.ts
import { BaseError as BaseError2 } from "make-error";
import { ErrorConstant } from "@remirror/core-constants";

// packages/remirror__core-helpers/src/core-helpers.ts
import deepmerge from "deepmerge";
import fastDeepEqual from "fast-deep-equal";
import { BaseError } from "make-error";
import omit from "object.omit";
import pick from "object.pick";
import {
  camelCase,
  capitalCase,
  constantCase,
  kebabCase,
  pascalCase,
  pathCase,
  snakeCase,
  spaceCase
} from "case-anything";
import { debounce, throttle } from "throttle-debounce";
function Cast(value) {
  return value;
}
function assertGet(value, key, message) {
  const prop = value[key];
  assert(!isUndefined(prop), message);
  return prop;
}
function assert(testValue, message) {
  if (!testValue) {
    throw new AssertionError(message);
  }
}
var AssertionError = class extends BaseError {
  constructor() {
    super(...arguments);
    this.name = "AssertionError";
  }
};
function entries(value) {
  return Object.entries(value);
}
function keys(value) {
  return Object.keys(value);
}
function values(value) {
  return Object.values(value);
}
function includes(array, item, fromIndex) {
  return array.includes(item, fromIndex);
}
function object(value) {
  return Object.assign(/* @__PURE__ */ Object.create(null), value);
}
function toString(value) {
  return Object.prototype.toString.call(value);
}
function getObjectType(value) {
  const objectName = toString(value).slice(8, -1);
  return objectName;
}
function isOfType(type, predicate) {
  return (value) => {
    if (typeof value !== type) {
      return false;
    }
    return predicate ? predicate(value) : true;
  };
}
function isObjectOfType(type) {
  return (value) => getObjectType(value) === type;
}
function isDirectInstanceOf(instance, Constructor) {
  return Object.getPrototypeOf(instance) === Constructor.prototype;
}
var isUndefined = isOfType("undefined");
var isString = isOfType("string");
var isNumber = isOfType("number", (value) => !Number.isNaN(value));
var isFunction = isOfType("function");
function isNull(value) {
  return value === null;
}
function isClass(value) {
  return isFunction(value) && value.toString().startsWith("class ");
}
function isBoolean(value) {
  return value === true || value === false;
}
var isSymbol = isOfType("symbol");
function isInteger(value) {
  return Number.isInteger(value);
}
function isSafeInteger(value) {
  return Number.isSafeInteger(value);
}
function isPlainObject(value) {
  if (getObjectType(value) !== "Object" /* Object */) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.getPrototypeOf({});
}
function isPrimitive(value) {
  return value == null || /^[bns]/.test(typeof value);
}
function isJSONPrimitive(value) {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}
function isNullOrUndefined(value) {
  return isNull(value) || isUndefined(value);
}
function isObject(value) {
  return !isNullOrUndefined(value) && (isFunction(value) || isOfType("object")(value));
}
function isInstanceOf(Constructor) {
  return (value) => isObject(value) && value instanceof Constructor;
}
function isNativePromise(value) {
  return isObjectOfType("Promise" /* Promise */)(value);
}
var hasPromiseAPI = (value) => !!(!isNull(value) && isObject(value) && isFunction(value.then) && isFunction(value.catch));
function isPromise(value) {
  return isNativePromise(value) || hasPromiseAPI(value);
}
var isRegExp = isObjectOfType("RegExp" /* RegExp */);
var isDate = isObjectOfType("Date" /* Date */);
var isError = isObjectOfType("Error" /* Error */);
function isMap(value) {
  return isObjectOfType("Map" /* Map */)(value);
}
function isSet(value) {
  return isObjectOfType("Set" /* Set */)(value);
}
function isEmptyObject(value) {
  return isObject(value) && !isMap(value) && !isSet(value) && Object.keys(value).length === 0;
}
var isArray = Array.isArray;
function isEmptyArray(value) {
  return isArray(value) && value.length === 0;
}
function isNonEmptyArray(value) {
  return isArray(value) && value.length > 0;
}
function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function format(value) {
  value = value.trim();
  return /^(?:webOS|i(?:OS|P))/.test(value) ? value : capitalize(value);
}
function callIfDefined(fn, ...args) {
  if (isFunction(fn)) {
    fn(...args);
  }
}
function findMatches(text, regexp, runWhile = (match) => !!match) {
  regexp.lastIndex = 0;
  const results = [];
  const flags = regexp.flags;
  let match;
  if (!flags.includes("g")) {
    regexp = new RegExp(regexp.source, `g${flags}`);
  }
  do {
    match = regexp.exec(text);
    if (match) {
      results.push(match);
    }
  } while (runWhile(match));
  regexp.lastIndex = 0;
  return results;
}
function cleanupOS(os, pattern, label) {
  if (pattern && label) {
    os = os.replace(new RegExp(pattern, "i"), label);
  }
  return format(
    os.replace(/ ce$/i, " CE").replace(/\bhpw/i, "web").replace(/\bMacintosh\b/, "Mac OS").replace(/_powerpc\b/i, " OS").replace(/\b(os x) [^\d ]+/i, "$1").replace(/\bMac (OS X)\b/, "$1").replace(/\/(\d)/, " $1").replace(/_/g, ".").replace(/(?: bepc|[ .]*fc[\d .]+)$/i, "").replace(/\bx86\.64\b/gi, "x86_64").replace(/\b(Windows Phone) OS\b/, "$1").replace(/\b(Chrome OS \w+) [\d.]+\b/, "$1").split(" on ")[0] ?? ""
  );
}
function isAndroidOS() {
  const ua = navigator.userAgent;
  const match = new RegExp("\\bAndroid(?:/[\\d.]+|[ \\w.]*)", "i").exec(ua);
  if (!match) {
    return false;
  }
  return cleanupOS(match[0] ?? "", "Android", "Android").includes("Android");
}
function randomFloat(min, max) {
  if (!max) {
    max = min;
    min = 0;
  }
  return Math.random() * (max - min + 1) + min;
}
function randomInt(min, max) {
  return Math.floor(randomFloat(min, max));
}
function startCase(string) {
  return string.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, (_, $1, $2) => `${$1} ${$2}`).replace(/(\s|^)(\w)/g, (_, $1, $2) => `${$1}${$2.toUpperCase()}`);
}
function n() {
  const time = Date.now();
  const last2 = n.last || time;
  return n.last = time > last2 ? time : last2 + 1;
}
n.last = 0;
function uniqueId(prefix = "") {
  return `${prefix}${n().toString(36)}`;
}
function take(array, number) {
  number = Math.max(Math.min(0, number), number);
  return array.slice(0, number);
}
function omitUndefined(object2) {
  return omit(object2, (value) => !isUndefined(value));
}
function clone(value) {
  if (!isPlainObject(value)) {
    throw new Error("An invalid value was passed into this clone utility. Expected a plain object");
  }
  return { ...value };
}
function shallowClone(value) {
  const clone2 = Object.create(Object.getPrototypeOf(value));
  const descriptors = Object.getOwnPropertyDescriptors(value);
  Object.defineProperties(clone2, descriptors);
  return clone2;
}
var isEqual = fastDeepEqual;
function uniqueArray(array, fromStart = false) {
  const array_ = fromStart ? [...array].reverse() : array;
  const set2 = new Set(array_);
  return fromStart ? [...set2].reverse() : [...set2];
}
function flattenArray(array) {
  const flattened = [];
  for (const item of array) {
    const itemsToInsert = isArray(item) ? flattenArray(item) : [item];
    flattened.push(...itemsToInsert);
  }
  return flattened;
}
function noop() {
  return;
}
function deepMerge(...objects) {
  return deepmerge.all(objects, { isMergeableObject: isPlainObject });
}
function clamp({ min, max, value }) {
  if (value < min) {
    return min;
  }
  return value > max ? max : value;
}
function last(array) {
  return array[array.length - 1];
}
function sort(array, compareFn) {
  return [...array].map((value, index) => ({ value, index })).sort((a, z) => compareFn(a.value, z.value) || a.index - z.index).map(({ value }) => value);
}
function get(root, path, defaultValue) {
  try {
    if (isString(path) && path in root) {
      return root[path];
    }
    if (isArray(path)) {
      path = `['${path.join("']['")}']`;
    }
    let obj = root;
    path.replace(
      /\[\s*(["'])(.*?)\1\s*]|^\s*(\w+)\s*(?=\.|\[|$)|\.\s*(\w*)\s*(?=\.|\[|$)|\[\s*(-?\d+)\s*]/g,
      (_, __, quotedProp, firstLevel, namedProp, index) => {
        obj = obj[quotedProp || firstLevel || namedProp || index];
        return "";
      }
    );
    return obj === void 0 ? defaultValue : obj;
  } catch {
    return defaultValue;
  }
}
function setPropInternal(path, obj, value, index) {
  if (path.length === index) {
    return value;
  }
  obj = obj || {};
  const key = path[index];
  assert(key);
  return setClone(obj, key, setPropInternal(path, obj[key], value, ++index));
}
function setClone(obj, key, value) {
  const newObj = clone(obj);
  newObj[key] = value;
  return newObj;
}
function set(path, obj, value) {
  if (isNumber(path)) {
    return setClone(obj, path, value);
  }
  if (isString(path)) {
    path = path.split(".");
  }
  return setPropInternal(path, obj, value, 0);
}
function unset(path, target) {
  const clonedObject = clone(target);
  let value = clonedObject;
  for (const [index, key] of path.entries()) {
    const shouldDelete = index >= path.length - 1;
    let item = value[key];
    if (shouldDelete) {
      if (isArray(value)) {
        const indexKey = Number.parseInt(key.toString(), 10);
        if (isNumber(indexKey)) {
          value.splice(indexKey, 1);
        }
      } else {
        Reflect.deleteProperty(value, key);
      }
      return clonedObject;
    }
    if (isPrimitive(item)) {
      return clonedObject;
    }
    item = isArray(item) ? [...item] : { ...item };
    value[key] = item;
    value = item;
  }
  return clonedObject;
}
function makeFunctionForUniqueBy(value) {
  return (item) => get(item, value);
}
function uniqueBy(array, getValue, fromStart = false) {
  const unique = [];
  const found = /* @__PURE__ */ new Set();
  const getter = isFunction(getValue) ? getValue : makeFunctionForUniqueBy(getValue);
  const list = fromStart ? [...array].reverse() : array;
  for (const item of list) {
    const value = getter(item);
    if (!found.has(value)) {
      found.add(value);
      unique.push(item);
    }
  }
  return fromStart ? unique.reverse() : unique;
}
function range(start, end) {
  const startValue = isArray(start) ? start[0] : start;
  if (!isNumber(end)) {
    return Array.from(
      { length: Math.abs(startValue) },
      (_, index) => (startValue < 0 ? -1 : 1) * index
    );
  }
  if (startValue <= end) {
    return Array.from({ length: end + 1 - startValue }, (_, index) => index + startValue);
  }
  return Array.from({ length: startValue + 1 - end }, (_, index) => -1 * index + startValue);
}
function within(value, ...rest) {
  const numbers = rest.filter(isNumber);
  return value >= Math.min(...numbers) && value <= Math.max(...numbers);
}
function hasOwnProperty(object_, key) {
  return Object.prototype.hasOwnProperty.call(object_, key);
}
function getLazyArray(value) {
  if (isFunction(value)) {
    return value();
  }
  return value;
}

// packages/remirror__core-helpers/src/core-errors.ts
var ERROR_INFORMATION_URL = "https://remirror.io/docs/errors";
var errorMessageMap = {
  [ErrorConstant.UNKNOWN]: "An error occurred but we're not quite sure why. \u{1F9D0}",
  [ErrorConstant.INVALID_COMMAND_ARGUMENTS]: "The arguments passed to the command method were invalid.",
  [ErrorConstant.CUSTOM]: "This is a custom error, possibly thrown by an external library.",
  [ErrorConstant.CORE_HELPERS]: "An error occurred in a function called from the `@remirror/core-helpers` library.",
  [ErrorConstant.MUTATION]: "Mutation of immutable value detected.",
  [ErrorConstant.INTERNAL]: "This is an error which should not occur and is internal to the remirror codebase.",
  [ErrorConstant.MISSING_REQUIRED_EXTENSION]: "Your editor is missing a required extension.",
  [ErrorConstant.MANAGER_PHASE_ERROR]: "This occurs when accessing a method or property before it is available.",
  [ErrorConstant.INVALID_GET_EXTENSION]: "The user requested an invalid extension from the getExtensions method. Please check the `createExtensions` return method is returning an extension with the defined constructor.",
  [ErrorConstant.INVALID_MANAGER_ARGUMENTS]: "Invalid value(s) passed into `Manager` constructor. Only `Presets` and `Extensions` are supported.",
  [ErrorConstant.SCHEMA]: "There is a problem with the schema or you are trying to access a node / mark that doesn't exists.",
  [ErrorConstant.HELPERS_CALLED_IN_OUTER_SCOPE]: "The `helpers` method which is passed into the ``create*` method should only be called within returned method since it relies on an active view (not present in the outer scope).",
  [ErrorConstant.INVALID_MANAGER_EXTENSION]: "You requested an invalid extension from the manager.",
  [ErrorConstant.DUPLICATE_COMMAND_NAMES]: "Command method names must be unique within the editor.",
  [ErrorConstant.DUPLICATE_HELPER_NAMES]: "Helper method names must be unique within the editor.",
  [ErrorConstant.NON_CHAINABLE_COMMAND]: "Attempted to chain a non chainable command.",
  [ErrorConstant.INVALID_EXTENSION]: "The provided extension is invalid.",
  [ErrorConstant.INVALID_CONTENT]: "The content provided to the editor is not supported.",
  [ErrorConstant.INVALID_NAME]: "An invalid name was used for the extension.",
  [ErrorConstant.EXTENSION]: "An error occurred within an extension. More details should be made available.",
  [ErrorConstant.EXTENSION_SPEC]: "The spec was defined without calling the `defaults`, `parse` or `dom` methods.",
  [ErrorConstant.EXTENSION_EXTRA_ATTRIBUTES]: "Extra attributes must either be a string or an object.",
  [ErrorConstant.INVALID_SET_EXTENSION_OPTIONS]: "A call to `extension.setOptions` was made with invalid keys.",
  [ErrorConstant.REACT_PROVIDER_CONTEXT]: "`useRemirrorContext` was called outside of the `remirror` context. It can only be used within an active remirror context created by the `<Remirror />`.",
  [ErrorConstant.REACT_GET_ROOT_PROPS]: "`getRootProps` has been attached to the DOM more than once. It should only be attached to the dom once per editor.",
  [ErrorConstant.REACT_EDITOR_VIEW]: "A problem occurred adding the editor view to the dom.",
  [ErrorConstant.REACT_CONTROLLED]: "There is a problem with your controlled editor setup.",
  [ErrorConstant.REACT_NODE_VIEW]: "Something went wrong with your custom ReactNodeView Component.",
  [ErrorConstant.REACT_GET_CONTEXT]: "You attempted to call `getContext` provided by the `useRemirror` prop during the first render of the editor. This is not possible and should only be after the editor first mounts.",
  [ErrorConstant.REACT_COMPONENTS]: "An error occurred within a remirror component.",
  [ErrorConstant.REACT_HOOKS]: "An error occurred within a remirror hook.",
  [ErrorConstant.I18N_CONTEXT]: "You called `useI18n()` outside of an `I18nProvider` context."
};
function isErrorConstant(code) {
  return isString(code) && includes(values(ErrorConstant), code);
}
function createErrorMessage(code, extraMessage) {
  const message = errorMessageMap[code];
  const prefix = message ? `${message}

` : "";
  const customMessage = extraMessage ? `${extraMessage}

` : "";
  return `${prefix}${customMessage}For more information visit ${ERROR_INFORMATION_URL}#${code.toLowerCase()}`;
}
var RemirrorError = class extends BaseError2 {
  /**
   * The constructor is intentionally kept private to prevent being extended from.
   */
  constructor({ code, message, disableLogging = false } = {}) {
    const errorCode = isErrorConstant(code) ? code : ErrorConstant.CUSTOM;
    super(createErrorMessage(errorCode, message));
    this.errorCode = errorCode;
    this.url = `${ERROR_INFORMATION_URL}#${errorCode.toLowerCase()}`;
    if (!disableLogging) {
      console.error(this.message);
    }
  }
  /**
   * A shorthand way of creating an error message.
   */
  static create(options = {}) {
    return new RemirrorError(options);
  }
};
function invariant(condition, options) {
  if (condition) {
    return;
  }
  throw RemirrorError.create(options);
}

// packages/remirror__core-helpers/src/default-import.ts
function defaultImport(mod) {
  if (typeof mod !== "object" || mod === null) {
    return mod;
  }
  const defaultVal = Symbol.toStringTag in mod && mod[Symbol.toStringTag] === "Module" ? mod.default ?? mod : mod;
  if (defaultVal && typeof mod === "object" && "__esModule" in defaultVal && defaultVal.__esModule && defaultVal.default !== void 0) {
    return defaultVal.default;
  }
  return defaultVal;
}

// packages/remirror__core-helpers/src/freeze.ts
import { ErrorConstant as ErrorConstant2 } from "@remirror/core-constants";
function freeze(target, options = {}) {
  if (process.env.NODE_ENV === "production") {
    return target;
  }
  invariant(isObject(target) || isArray(target), {
    message: "`freeze` only supports objects and arrays.",
    code: ErrorConstant2.CORE_HELPERS
  });
  return new Proxy(target, {
    get: (target2, prop, receiver) => {
      invariant(prop in target2 || !options.requireKeys, {
        message: `The prop: '${prop.toString()}' you are trying to access does not yet exist on the target.`
      });
      return Reflect.get(target2, prop, receiver);
    },
    set: (_, prop) => {
      invariant(false, {
        message: `It seems you're trying to set the value of the property (${String(
          prop
        )}) on a frozen object. For your protection this object does not allow direct mutation.`,
        code: ErrorConstant2.MUTATION
      });
    }
  });
}
export {
  Cast,
  RemirrorError,
  assert,
  assertGet,
  callIfDefined,
  camelCase,
  capitalCase,
  capitalize,
  clamp,
  cleanupOS,
  clone,
  constantCase,
  debounce,
  deepMerge,
  defaultImport,
  entries,
  findMatches,
  flattenArray,
  format,
  freeze,
  get,
  getLazyArray,
  hasOwnProperty,
  includes,
  invariant,
  isAndroidOS,
  isArray,
  isBoolean,
  isClass,
  isDate,
  isDirectInstanceOf,
  isEmptyArray,
  isEmptyObject,
  isEqual,
  isError,
  isFunction,
  isInstanceOf,
  isInteger,
  isJSONPrimitive,
  isMap,
  isNativePromise,
  isNonEmptyArray,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isPlainObject,
  isPrimitive,
  isPromise,
  isRegExp,
  isSafeInteger,
  isSet,
  isString,
  isSymbol,
  isUndefined,
  kebabCase,
  keys,
  last,
  noop,
  object,
  omit,
  omitUndefined,
  pascalCase,
  pathCase,
  pick,
  randomFloat,
  randomInt,
  range,
  set,
  shallowClone,
  snakeCase,
  sort,
  spaceCase,
  startCase,
  take,
  throttle,
  toString,
  uniqueArray,
  uniqueBy,
  uniqueId,
  unset,
  values,
  within
};
