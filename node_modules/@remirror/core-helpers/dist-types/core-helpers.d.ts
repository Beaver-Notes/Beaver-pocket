import omit from 'object.omit';
import pick from 'object.pick';
import type { AnyConstructor, AnyFunction, ConditionalExcept, JsonPrimitive, Nullable, Primitive, Shape, UnknownShape } from '@remirror/types';
type TupleRange<Size extends number> = Size extends Size ? number extends Size ? number[] : _NumberRangeTuple<[], Size> : never;
type _NumberRangeTuple<Tuple extends readonly unknown[], Length extends number> = Tuple['length'] extends Length ? Tuple : _NumberRangeTuple<[...Tuple, Tuple['length']], Length>;
/**
 * Type cast an argument. If no type is provided it will default to any.
 *
 * @param arg - the arg to typecast
 */
export declare function Cast<Type = any>(value: unknown): Type;
/**
 * Get the key from a given value. Throw an error if the referenced property is
 * `undefined`.
 */
export declare function assertGet<Value extends object, Key extends keyof Value>(value: Value, key: Key, message?: string): Value[Key];
/**
 * Assert the value is `truthy`. Good for defensive programming, especially
 * after enabling `noUncheckedIndexedAccess` in the tsconfig `compilerOptions`.
 */
export declare function assert(testValue: unknown, message?: string): asserts testValue;
/**
 * A typesafe implementation of `Object.entries()`
 *
 * Taken from
 * https://github.com/biggyspender/ts-entries/blob/master/src/ts-entries.ts
 */
export declare function entries<Type extends object, Key extends Extract<keyof Type, string>, Value extends Type[Key], Entry extends [Key, Value]>(value: Type): Entry[];
/**
 * A typesafe implementation of `Object.keys()`
 */
export declare function keys<Type extends object, Key extends Extract<keyof Type, string>>(value: Type): Key[];
/**
 * A typesafe implementation of `Object.values()`
 */
export declare function values<Type extends object, Key extends Extract<keyof Type, string>, Value extends Type[Key]>(value: Type): Value[];
/**
 * A more lenient typed version of `Array.prototype.includes` which allow less
 * specific types to be checked.
 */
export declare function includes<Type>(array: Type[] | readonly Type[], item: unknown, fromIndex?: number): item is Type;
/**
 * Creates an object with the null prototype.
 *
 * @param value - the object to create
 */
export declare function object<Type extends object>(value?: Type): Type;
/**
 * Alias of toString for non-dom environments.
 *
 * This is a safe way of calling `toString` on objects created with
 * `Object.create(null)`.
 */
export declare function toString(value: unknown): string;
/**
 * Check if an instance is the direct instance of the provided class.
 */
export declare function isDirectInstanceOf<Type>(instance: unknown, Constructor: AnyConstructor<Type>): instance is Type;
/**
 * Predicate check that value is undefined
 *
 * @param value - the value to check
 *
 */
export declare const isUndefined: (value: unknown) => value is undefined;
/**
 * Predicate check that value is a string
 *
 * @param value - the value to check
 *
 */
export declare const isString: (value: unknown) => value is string;
/**
 * Predicate check that value is a number.
 *
 * Also by default doesn't include NaN as a valid number.
 *
 * @param value - the value to check
 *
 */
export declare const isNumber: (value: unknown) => value is number;
/**
 * Predicate check that value is a function
 *
 * @param value - the value to check
 *
 */
export declare const isFunction: (value: unknown) => value is AnyFunction;
/**
 * Predicate check that value is null
 *
 * @param value - the value to check
 *
 */
export declare function isNull(value: unknown): value is null;
/**
 * Predicate check that value is a class
 *
 * @deprecated Due to the current build process stripping out classes
 *
 * @param value - the value to check
 *
 */
export declare function isClass(value: unknown): value is AnyConstructor;
/**
 * Predicate check that value is boolean
 *
 * @param value - the value to check
 *
 */
export declare function isBoolean(value: unknown): value is boolean;
/**
 * Predicate check that value is a symbol
 *
 * @param value - the value to check
 *
 */
export declare const isSymbol: (value: unknown) => value is symbol;
/**
 * Helper function for Number.isInteger check allowing non numbers to be tested
 *
 * @param value - the value to check
 *
 */
export declare function isInteger(value: unknown): value is number;
/**
 * Helper function for Number.isSafeInteger allowing for unknown values to be
 * tested
 *
 * @param value - the value to check
 *
 */
export declare function isSafeInteger(value: unknown): value is number;
/**
 * Predicate check for whether passed in value is a plain object
 *
 * @param value - the value to check
 *
 */
export declare function isPlainObject<Type = unknown>(value: unknown): value is UnknownShape<Type>;
/**
 * Predicate check for whether passed in value is a primitive value
 */
export declare function isPrimitive(value: unknown): value is Primitive;
/**
 * Predicate check for whether passed in value is a JSON primitive value
 */
export declare function isJSONPrimitive(value: unknown): value is JsonPrimitive;
/**
 * Utility predicate check that value is either null or undefined
 *
 * @param value - the value to check
 *
 */
export declare function isNullOrUndefined(value: unknown): value is null | undefined;
/**
 * Predicate check that value is an object.
 *
 * @param value - the value to check
 *
 */
export declare function isObject<Type extends Shape>(value: unknown): value is Type;
/**
 * A shorthand method for creating instance of checks.
 */
export declare function isInstanceOf<Constructor extends AnyConstructor>(Constructor: Constructor): (value: unknown) => value is InstanceType<Constructor>;
/**
 * Predicate check that value is a native promise
 *
 * @param value - the value to check
 *
 */
export declare function isNativePromise(value: unknown): value is Promise<unknown>;
/**
 * Predicate check that value has the promise api implemented
 *
 * @param value - the value to check
 *
 */
export declare function isPromise(value: unknown): value is Promise<unknown>;
/**
 * Predicate check that value is a RegExp
 *
 * @param value - the value to check
 *
 */
export declare const isRegExp: (value: unknown) => value is RegExp;
/**
 * Predicate check that value is a date
 *
 * @param value - the value to check
 *
 */
export declare const isDate: (value: unknown) => value is Date;
/**
 * Predicate check that value is an error
 *
 * @param value - the value to check
 *
 */
export declare const isError: (value: unknown) => value is Error;
/**
 * Predicate check that value is a `Map`
 *
 * @param value - the value to check
 *
 */
export declare function isMap(value: unknown): value is Map<unknown, unknown>;
/**
 * Predicate check that value is a `Set`
 *
 * @param value - the value to check
 *
 */
export declare function isSet(value: unknown): value is Set<unknown>;
/**
 * Predicate check that value is an empty object
 *
 * @param value - the value to check
 *
 */
export declare function isEmptyObject(value: unknown): boolean;
/**
 * Alias the isArray method.
 */
export declare const isArray: (arg: any) => arg is any[];
/**
 * Predicate check that value is an empty array
 *
 * @param value - the value to check
 *
 */
export declare function isEmptyArray(value: unknown): value is never[];
/**
 * Predicate check that value is a non-empty.
 *
 * @param value - the value to check
 *
 */
export declare function isNonEmptyArray<Item>(value: Item[]): value is [Item, ...Item[]];
/**
 * Capitalizes a string value.
 *
 * @param str - the string to capitalize.
 */
export declare function capitalize(string: string): string;
/**
 * Trim and conditionally capitalize string values.
 *
 * @param str - the string to format.
 *
 */
export declare function format(value: string): string;
/**
 * Calls a function if defined and provides compile time type checking for the
 * passed in parameters.
 *
 * @param fn - the function to call if it exists
 * @param args - the rest of the parameters with types
 */
export declare function callIfDefined<Method extends AnyFunction>(fn: Nullable<Method>, ...args: Parameters<Method>): void;
/**
 * Finds all the regex matches for a string
 *
 * @param text - the text to check against
 * @param regexp - the regex (which should include a 'g' flag)
 *
 */
export declare function findMatches(text: string, regexp: RegExp, runWhile?: (match: RegExpExecArray | null) => boolean): RegExpExecArray[];
/**
 * A utility function to clean up the Operating System name.
 *
 * @param os - the OS name to clean up.
 * @param pattern - a `RegExp` pattern matching the OS name.
 * @param label - a label for the OS.
 * @returns a cleaned up Operating System name
 */
export declare function cleanupOS(os: string, pattern?: string, label?: string): string;
/**
 * A utility function to check whether the current browser is running on the
 * android platform.
 */
export declare function isAndroidOS(): boolean;
/**
 * Generate a random float between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 */
export declare function randomFloat(min: number, max?: number): number;
/**
 * Generate a random integer between min and max. If only one parameter is
 * provided minimum is set to 0.
 *
 * @param min - the minimum value
 * @param max - the maximum value
 *
 */
export declare function randomInt(min: number, max?: number): number;
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
export declare function startCase(string: string): string;
/**
 * Generate a unique id
 *
 * @param prefix - a prefix for the generated id.
 * @returns a unique string of specified length
 *
 */
export declare function uniqueId(prefix?: string): string;
/**
 * Takes a number of elements from the provided array starting from the
 * zero-index
 *
 * @param arr - the array to take from
 * @param num - the number of items to take
 *
 */
export declare function take<Type>(array: Type[], number: number): Type[];
/**
 * Remove the undefined values from an object.
 */
export declare function omitUndefined<Type extends object>(object: Type): ConditionalExcept<Type, undefined>;
/**
 * Clones a plain object using object spread notation
 *
 * @param value - the value to check
 *
 */
export declare function clone<Type extends object>(value: Type): Type;
/**
 * Shallow clone an object while preserving it's getters and setters. This is a
 * an alternative to the spread clone.
 */
export declare function shallowClone<Type extends object>(value: Type): Type;
/**
 * Alias for fast deep equal
 */
export declare const isEqual: (a: any, b: any) => boolean;
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
export declare function uniqueArray<Type>(array: Type[], fromStart?: boolean): Type[];
/**
 * Flattens an array.
 *
 * @param array
 *
 */
export declare function flattenArray<Type>(array: any[]): Type[];
/**
 * noop is a shorthand way of saying `No Operation` and is a function that does
 * nothing.
 *
 * And Sometimes doing nothing is the best policy.
 */
export declare function noop(): undefined;
/**
 * A deep merge which only merges plain objects and Arrays. It clones the object
 * before the merge so will not mutate any of the passed in values.
 *
 * To completely remove a key you can use the `Merge` helper class which
 * replaces it's key with a completely new object
 */
export declare function deepMerge<Type = any>(...objects: Array<object | unknown[]>): Type;
interface ClampProps {
    min: number;
    max: number;
    value: number;
}
/**
 * Clamps the value to the provided range.
 */
export declare function clamp({ min, max, value }: ClampProps): number;
/**
 * Get the last element of the array.
 */
export declare function last<Type>(array: Type[]): Type;
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
export declare function sort<Type>(array: Type[], compareFn: (a: Type, z: Type) => number): Type[];
/**
 * Get a property from an object or array by a string path or an array path.
 *
 * @param obj - object to retrieve property from
 * @param path - path to property
 */
export declare function get<Return>(root: Shape, path: string | string[], defaultValue?: unknown): Return;
/**
 * Set the value of a given path for the provided object. Does not mutate the
 * original object.
 */
export declare function set(path: number | string | Array<string | number>, obj: Shape, value: unknown): Shape;
/**
 * Unset the value of a given path within an object.
 */
export declare function unset(path: Array<string | number>, target: Shape): Shape;
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
export declare function uniqueBy<Item = any>(array: Item[], getValue: ((item: Item) => unknown) | string | string[], fromStart?: boolean): Item[];
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
export declare function range<Size extends number>(size: [Size]): TupleRange<Size>;
export declare function range(size: number): number[];
export declare function range(start: number, end: number): number[];
/**
 * Check that a number is within the minimum and maximum bounds of a set of
 * numbers.
 *
 * @param value - the number to test
 */
export declare function within(value: number, ...rest: Array<number | undefined | null>): boolean;
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
export declare function hasOwnProperty<Obj extends object, Property extends string | number | symbol>(object_: Obj, key: Property): object_ is Property extends keyof Obj ? Obj : Obj & {
    Key: unknown;
};
/**
 * Helper for getting an array from a function or array.
 */
export declare function getLazyArray<Type>(value: Type[] | (() => Type[])): Type[];
export { camelCase, capitalCase, constantCase, kebabCase, pascalCase, pathCase, snakeCase, spaceCase, } from 'case-anything';
export type { debounce as DebouncedFunction, throttle as ThrottledFunction, } from 'throttle-debounce';
export { debounce, throttle } from 'throttle-debounce';
export { omit, pick };
