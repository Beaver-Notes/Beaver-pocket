/**
 * Retrieves a (deeply) nested value from an object.
 * A tiny implementation of lodash.get.
 *
 * Perf tests:
 * https://jsperf.com/get-try-catch-vs-reduce-vs-lodash-get

 * Created by @itsjonq and @knicklabs
 *
 * @param {Object} obj Object to retreive value from.
 * @param {Array<string>|string} path Key path for the value.
 * @param {any} fallback Fallback value, if unsuccessful
 * @returns {any} The value, the fallback, or undefined
 */
declare function get(obj: Object, path?: Array<string> | string, fallback?: any): any;
export default get;
