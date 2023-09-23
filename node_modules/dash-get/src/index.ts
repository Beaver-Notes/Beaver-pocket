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
function get(obj: Object, path?: Array<string> | string, fallback?: any): any {
  if (!obj || !path) return fallback;
  const paths = Array.isArray(path) ? path : path.split(".");
  let results = obj;
  let i = 0;

  while (i < paths.length && results !== undefined && results !== null) {
    results = results[paths[i]];
    i++;
  }

  if (i === paths.length) {
    return results !== undefined ? results : fallback;
  }

  return results !== undefined && results !== null ? results : fallback;
}

export default get;
