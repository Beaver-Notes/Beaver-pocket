import { BaseError } from 'make-error';
import { ErrorConstant } from '@remirror/core-constants';
import { AnyConstructor, AnyFunction, UnknownShape, Primitive, JsonPrimitive, Shape, Nullable, ConditionalExcept } from '@remirror/types';
export { camelCase, capitalCase, constantCase, kebabCase, pascalCase, pathCase, snakeCase, spaceCase } from 'case-anything';
export { debounce as DebouncedFunction, throttle as ThrottledFunction, debounce, throttle } from 'throttle-debounce';
export { default as omit } from 'object.omit';
export { default as pick } from 'object.pick';

/**
 * This marks the error as a remirror specific error, with enhanced stack
 * tracing capabilities.
 *
 * @remarks
 *
 * Use this when creating your own extensions and notifying the user that
 * something has gone wrong.
 */
declare class RemirrorError extends BaseError {
    /**
     * A shorthand way of creating an error message.
     */
    static create(options?: RemirrorErrorOptions): RemirrorError;
    /**
     * The error code used to create this error message.
     */
    errorCode: ErrorConstant;
    /**
     * The link to read more about the error online.
     */
    url: string;
    /**
     * The constructor is intentionally kept private to prevent being extended from.
     */
    private constructor();
}
/**
 * Throw an error if the condition fails. Strip out error messages for
 * production. Adapted from `tiny-invariant`.
 */
declare function invariant(condition: unknown, options: RemirrorErrorOptions): asserts condition;
/**
 * The invariant options which only show up during development.
 */
interface RemirrorErrorOptions {
    /**
     * The code for the built in error.
     */
    code?: ErrorConstant;
    /**
     * The message to add to the error.
     */
    message?: string;
    /**
     * When true logging to the console is disabled.
     *
     * @defaultValue false
     */
    disableLogging?: boolean;
}

type TupleRange<Size extends number> = Size extends Size ? number extends Size ? number[] : _NumberRangeTuple<[], Size> : never;
type _NumberRangeTuple<Tuple extends readonly unknown[], Length extends number> = Tuple['length'] extends Length ? Tuple : _NumberRangeTuple<[...Tuple, Tuple['length']], Length>;
/**
 * Type cast an argument. If no type is provided it will default to any.
 *
 * @param arg - the arg to typecast
 */
declare function Cast<Type = any>(value: unknown): Type;
/**
 * Get the key from a given value. Throw an error if the referenced property is
 * `undefined`.
 */
declare function assertGet<Value extends object, Key extends keyof Value>(value: Value, key: Key, message?: string): Value[Key];
/**
 * Assert the value is `truthy`. Good for defensive programming, especially
 * after enabling `noUncheckedIndexedAccess` in the tsconfig `compilerOptions`.
 */
declare function assert(testValue: unknown, message?: string): asserts testValue;
/**
 * A typesafe implementation of `Object.entries()`
 *
 * Taken from
 * https://github.com/biggyspender/ts-entries/blob/master/src/ts-entries.ts
 */
declare function entries<Type extends object, Key extends Extract<keyof Type, string>, Value extends Type[Key], Entry extends [Key, Value]>(value: Type): Entry[];
/**
 * A typesafe implementation of `Object.keys()`
 */
declare function keys<Type extends object, Key extends Extract<keyof Type, string>>(value: Type): Key[];
/**
 * A typesafe implementation of `Object.values()`
 */
declare function values<Type extends object, Key extends Extract<keyof Type, string>, Value extends Type[Key]>(value: Type): Value[];
/**
 * A more lenient typed version of `Array.prototype.includes` which allow less
 * specific types to be checked.
 */
declare function includes<Type>(array: Type[] | readonly Type[], item: unknown, fromIndex?: number): item is Type;
/**
 * Creates an object with the null prototype.
 *
 * @param value - the object to create
 */
declare function object<Type extends object>(value?: Type): Type;
/**
 * Alias of toString for non-dom environments.
 *
 * This is a safe way of calling `toString` on objects created with
 * `Object.create(null)`.
 */
declare function toString(value: unknown): string;
/**
 * Check if an instance is the direct instance of the provided class.
 */
declare function isDirectInstanceOf<Type>(instance: unknown, Constructor: AnyConstructor<Type>): instance is Type;
/**
 * Predicate check that value is undefined
 *
 * @param value - the value to check
 *
 */
declare const isUndefined: (value: unknown) => value is undefined;
/**
 * Predicate check that value is a string
 *
 * @param value - the value to check
 *
 */
declare const isString: (value: unknown) => value is string;
/**
 * Predicate check that value is a number.
 *
 * Also by default doesn't include NaN as a valid number.
 *
 * @param value - the value to check
 *
 */
declare const isNumber: (value: unknown) => value is number;
/**
 * Predicate check that value is a function
 *
 * @param value - the value to check
 *
 */
declare const isFunction: (value: unknown) => value is AnyFunction;
/**
 * Predicate check that value is null
 *
 * @param value - the value to check
 *
 */
declare function isNull(value: unknown): value is null;
/**
 * Predicate check that value is a class
 *
 * @deprecated Due to the current build process stripping out classes
 *
 * @param value - the value to check
 *
 */
declare function isClass(value: unknown): value is AnyConstructor;
/**
 * Predicate check that value is boolean
 *
 * @param value - the value to check
 *
 */
declare function isBoolean(value: unknown): value is boolean;
/**
 * Predicate check that value is a symbol
 *
 * @param value - the value to check
 *
 */
declare const isSymbol: (value: unknown) => value is symbol;
/**
 * Helper function for Number.isInteger check allowing non numbers to be tested
 *
 * @param value - the value to check
 *
 */
declare function isInteger(value: unknown): value is number;
/**
 * Helper function for Number.isSafeInteger allowing for unknown values to be
 * tested
 *
 * @param value - the value to check
 *
 */
declare function isSafeInteger(value: unknown): value is number;
/**
 * Predicate check for whether passed in value is a plain object
 *
 * @param value - the value to check
 *
 */
declare function isPlainObject<Type = unknown>(value: unknown): value is UnknownShape<Type>;
/**
 * Predicate check for whether passed in value is a primitive value
 */
declare function isPrimitive(value: unknown): value is Primitive;
/**
 * Predicate check for whether passed in value is a JSON primitive value
 */
declare function isJSONPrimitive(value: unknown): value is JsonPrimitive;
/**
 * Utility predicate check that value is either null or undefined
 *
 * @param value - the value to check
 *
 */
declare function isNullOrUndefined(value: unknown): value is null | undefined;
/**
 * Predicate check that value is an object.
 *
 * @param value - the value to check
 *
 */
declare function isObject<Type extends Shape>(value: unknown): value is Type;
/**
 * A shorthand method for creating instance of checks.
 */
declare function isInstanceOf<Constructor extends AnyConstructor>(Constructor: Constructor): (value: unknown) => value is InstanceType<Constructor>;
/**
 * Predicate check that value is a native promise
 *
 * @param value - the value to check
 *
 */
declare function isNativePromise(value: unknown): value is Promise<unknown>;
/**
 * Predicate check that value has the promise api implemented
 *
 * @param value - the value to check
 *
 */
declare function isPromise(value: unknown): value is Promise<unknown>;
/**
 * Predicate check that value is a RegExp
 *
 * @param value - the value to check
 *
 */
declare const isRegExp: (value: unknown) => value is RegExp;
/**
 * Predicate check that value is a date
 *
 * @param value - the value to check
 *
 */
declare const isDate: (value: unknown) => value is Date;
/**
 * Predicate check that value is an error
 *
 * @param value - the value to check
 *
 */
declare const isError: (value: unknown) => value is Error;
/**
 * Predicate check that value is a `Map`
 *
 * @param value - the value to check
 *
 */
declare function isMap(value: unknown): value is Map<unknown, unknown>;
/**
 * Predicate check that value is a `Set`
 *
 * @param value - the value to check
 *
 */
declare function isSet(value: unknown): value is Set<unknown>;
/**
 * Predicate check that value is an empty object
 *
 * @param value - the value to check
 *
 */
declare function isEmptyObject(value: unknown): boolean;
/**
 * Alias the isArray method.
 */
declare const isArray: (arg: any) => arg is any[];
/**
 * Predicate check that value is an empty array
 *
 * @param value - the value to check
 *
 */
declare function isEmptyArray(value: unknown): value is never[];
/**
 * Predicate check that value is a non-empty.
 *
 * @param value - the value to check
 *
 */
declare function isNonEmptyArray<Item>(value: Item[]): value is [Item, ...Item[]];
/**
 * Capitalizes a string value.
 *
 * @param str - the string to capitalize.
 */
declare function capitalize(string: string): string;
/**
 * Trim and conditionally capitalize string values.
 *
 * @param str - the string to format.
 *
 */
declare function format(value: string): string;
/**
 * Calls a function if defined and provides compile time type checking for the
 * passed in parameters.
 *
 * @param fn - the function to call if it exists
 * @param args - the rest of the parameters with types
 */
declare function callIfDefined<Method extends AnyFunction>(fn: Nullable<Method>, ...args: Parameters<Method>): void;
/**
 * Finds all the regex matches for a string
 *
 * @param text - the text to check against
 * @param regexp - the regex (which should include a 'g' flag)
 *
 */
declare function findMatches(text: string, regexp: RegExp, runWhile?: (match: RegExpExecArray | null) => boolean): RegExpExecArray[];
/**
 * A utility function to clean up the Operating System name.
 *
 * @param os - the OS name to clean up.
 * @param pattern - a `RegExp` pattern matching the OS name.
 * @param label - a label for the OS.
 * @returns a cleaned up Operating System name
 */
declare function cleanupOS(os: string, pattern?: string, label?: string): string;
/**
 * A utility function to check whether the current browser is running on the
 * android platform.
 */
declare function isAndroidOS(): boolean;
/**
 * Generate a random float between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 */
declare function randomFloat(min: number, max?: number): number;
/**
 * Generate a random integer between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 */
declare function randomInt(min: number, max?: number): number;
/**
 * Converts a string, including strings in camelCase or snake_case, into Start
 * Case (a variant of Title case where all words start with a capital letter),
 * it keeps original single quote and hyphen in the word.
 *
 *   'management_companies' to 'Management Companies' 'managementCompanies' to
 *   'Management Companies' `hell's kitchen` to `Hell's Kitchen` `co-op` to
 *   `Co-op`
 *
 * @param str - the string to examine
 */
declare function startCase(string: string): string;
/**
 * Generate a unique id
 *
 * @param prefix - a prefix for the generated id.
 * @returns a unique string of specified length
 *
 */
declare function uniqueId(prefix?: string): string;
/**
 * Takes a number of elements from the provided array starting from the
 * zero-index
 *
 * @param arr - the array to take from
 * @param num - the number of items to take
 *
 */
declare function take<Type>(array: Type[], number: number): Type[];
/**
 * Remove the undefined values from an object.
 */
declare function omitUndefined<Type extends object>(object: Type): ConditionalExcept<Type, undefined>;
/**
 * Clones a plain object using object spread notation
 *
 * @param value - the value to check
 *
 */
declare function clone<Type extends object>(value: Type): Type;
/**
 * Shallow clone an object while preserving it's getters and setters. This is a
 * an alternative to the spread clone.
 */
declare function shallowClone<Type extends object>(value: Type): Type;
/**
 * Alias for fast deep equal
 */
declare const isEqual: (a: any, b: any) => boolean;
/**
 * Create a unique array in a non-mutating manner
 *
 * @param array - the array which will be reduced to its unique elements
 * @param fromStart - when set to true the duplicates will be removed from the
 * beginning of the array. This defaults to false.
 *
 * @returns a new array containing only unique elements (by reference)
 *
 */
declare function uniqueArray<Type>(array: Type[], fromStart?: boolean): Type[];
/**
 * Flattens an array.
 *
 * @param array
 *
 */
declare function flattenArray<Type>(array: any[]): Type[];
/**
 * noop is a shorthand way of saying `No Operation` and is a function that does
 * nothing.
 *
 * And Sometimes doing nothing is the best policy.
 */
declare function noop(): undefined;
/**
 * A deep merge which only merges plain objects and Arrays. It clones the object
 * before the merge so will not mutate any of the passed in values.
 *
 * To completely remove a key you can use the `Merge` helper class which
 * replaces it's key with a completely new object
 */
declare function deepMerge<Type = any>(...objects: Array<object | unknown[]>): Type;
interface ClampProps {
    min: number;
    max: number;
    value: number;
}
/**
 * Clamps the value to the provided range.
 */
declare function clamp({ min, max, value }: ClampProps): number;
/**
 * Get the last element of the array.
 */
declare function last<Type>(array: Type[]): Type;
/**
 * Sorts an array while retaining the original order when the compare method
 * identifies the items as equal.
 *
 * `Array.prototype.sort()` is unstable and so values that are the same will
 * jump around in a non deterministic manner. Here I'm using the index as a
 * fallback. If two elements have the same priority the element with the lower
 * index is placed first hence retaining the original order.
 *
 * @param array - the array to sort
 * @param compareFn - compare the two value arguments `a` and `z` - return 0 for
 *                  equal - return number > 0 for a > z - return number < 0 for
 *                  z > a
 */
declare function sort<Type>(array: Type[], compareFn: (a: Type, z: Type) => number): Type[];
/**
 * Get a property from an object or array by a string path or an array path.
 *
 * @param obj - object to retrieve property from
 * @param path - path to property
 */
declare function get<Return>(root: Shape, path: string | string[], defaultValue?: unknown): Return;
/**
 * Set the value of a given path for the provided object. Does not mutate the
 * original object.
 */
declare function set(path: number | string | Array<string | number>, obj: Shape, value: unknown): Shape;
/**
 * Unset the value of a given path within an object.
 */
declare function unset(path: Array<string | number>, target: Shape): Shape;
/**
 * Create a unique array of objects from a getter function or a property list.
 *
 * @param array - the array to extract unique values from
 * @param getValue - a getter function or a string with the path to the item
 * that is being used as a a test for uniqueness.
 * @param fromStart - when true will remove duplicates from the start rather
 * than from the end
 *
 * ```ts
 * import { uniqueBy } from '@remirror/core-helpers';
 *
 * const values = uniqueBy([{ id: 'a', value: 'Awesome' }, { id: 'a', value: 'ignored' }], item => item.id);
 * log(values) // => [{id: 'a', value: 'Awesome'}]
 *
 * const byKey = uniqueBy([{ id: 'a', value: 'Awesome' }, { id: 'a', value: 'ignored' }], 'id')
 * // Same as above
 * ```
 */
declare function uniqueBy<Item = any>(array: Item[], getValue: ((item: Item) => unknown) | string | string[], fromStart?: boolean): Item[];
/**
 * Create a range from start to end.
 *
 * If only start is provided it creates an array of the size provided. if start
 * and end are provided it creates an array who's first position is start and
 * final position is end. i.e. `length = (end - start) + 1`.
 *
 * If you'd like to create a typed tuple of up to `40` items then pass in a
 * `[number]` tuple as the first argument.
 */
declare function range<Size extends number>(size: [Size]): TupleRange<Size>;
declare function range(size: number): number[];
declare function range(start: number, end: number): number[];
/**
 * Check that a number is within the minimum and maximum bounds of a set of
 * numbers.
 *
 * @param value - the number to test
 */
declare function within(value: number, ...rest: Array<number | undefined | null>): boolean;
/**
 * Safe implementation of hasOwnProperty with typechecking.
 *
 * @remarks
 *
 * See {@link https://eslint.org/docs/rules/no-prototype-builtins}
 *
 * @param obj - the object to check
 * @param key - the property to check
 *
 * @typeParam Obj - the object type
 * @typeParam Property - the property which can be a string | number | symbol
 */
declare function hasOwnProperty<Obj extends object, Property extends string | number | symbol>(object_: Obj, key: Property): object_ is Property extends keyof Obj ? Obj : Obj & {
    Key: unknown;
};
/**
 * Helper for getting an array from a function or array.
 */
declare function getLazyArray<Type>(value: Type[] | (() => Type[])): Type[];

/**
 * Fixes the default import for a CommonJS module.
 *
 * @internal
 *
 * @remark
 *
 * With ESM it is possible to export both a default value and multiple named exports.
 * With CJS it is possible to "mock" ESM functionality with a `__esModule=true` flag
 * but still only export a single "default" export, or multiple named exports.
 *
 * This helper method detects when a library tries to do a "default" export with other named values
 * and returns the "intended" default value.
 *
 * It also handles CJS exports that export an entire object via `module.exports = {}` rather than export syntax,
 * as well as extracting the `default` (if exists) from a dynamic import.
 *
 * Note there is not "namedExport" equivalent because it is assumed module loaders successfully parse that
 * out for both CJS and ESM.
 *
 * @param {*} mod - "default" export that might be wrapped in another layer
 * @returns {*} unwrapped module
 */
declare function defaultImport<T>(mod: T): T;

/**
 * A freeze method for objects that only runs in development. Helps prevent code
 * that shouldn't be mutated from being mutated during development.
 *
 * @remarks
 *
 * This function passes the value back unchanged when in a production
 * environment. It's purpose is to help prevent bad practice while developing
 * by avoiding mutation of values that shouldn't be mutated.
 */
declare function freeze<Target extends object>(target: Target, options?: FreezeOptions): Readonly<Target>;
interface FreezeOptions {
    /**
     * Whether the key that is being accessed should exist on the target object.
     *
     * @defaultValue undefined
     */
    requireKeys?: boolean;
}

export { Cast, RemirrorError, RemirrorErrorOptions, assert, assertGet, callIfDefined, capitalize, clamp, cleanupOS, clone, deepMerge, defaultImport, entries, findMatches, flattenArray, format, freeze, get, getLazyArray, hasOwnProperty, includes, invariant, isAndroidOS, isArray, isBoolean, isClass, isDate, isDirectInstanceOf, isEmptyArray, isEmptyObject, isEqual, isError, isFunction, isInstanceOf, isInteger, isJSONPrimitive, isMap, isNativePromise, isNonEmptyArray, isNull, isNullOrUndefined, isNumber, isObject, isPlainObject, isPrimitive, isPromise, isRegExp, isSafeInteger, isSet, isString, isSymbol, isUndefined, keys, last, noop, object, omitUndefined, randomFloat, randomInt, range, set, shallowClone, sort, startCase, take, toString, uniqueArray, uniqueBy, uniqueId, unset, values, within };
