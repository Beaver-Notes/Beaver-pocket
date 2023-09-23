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
export declare function freeze<Target extends object>(target: Target, options?: FreezeOptions): Readonly<Target>;
interface FreezeOptions {
    /**
     * Whether the key that is being accessed should exist on the target object.
     *
     * @defaultValue undefined
     */
    requireKeys?: boolean;
}
export {};
