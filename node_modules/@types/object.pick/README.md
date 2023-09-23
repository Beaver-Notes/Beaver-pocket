# Installation
> `npm install --save @types/object.pick`

# Summary
This package contains type definitions for object.pick (https://github.com/jonschlinkert/object.pick).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/object.pick.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/object.pick/index.d.ts)
````ts
// Type definitions for object.pick 1.3
// Project: https://github.com/jonschlinkert/object.pick
// Definitions by: Ifiok Jr. <https://github.com/ifiokjr>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.8

/**
 * Returns a filtered copy of an object with only the specified keys, similar to `_.pick` from lodash / underscore.
 *
 * @param object
 * @param keys
 */
declare function pick<T extends object, U extends keyof T>(object: T, keys: readonly U[]): Pick<T, U>;

export = pick;

````

### Additional Details
 * Last updated: Tue, 24 May 2022 19:01:55 GMT
 * Dependencies: none
 * Global values: none

# Credits
These definitions were written by [Ifiok Jr.](https://github.com/ifiokjr).
