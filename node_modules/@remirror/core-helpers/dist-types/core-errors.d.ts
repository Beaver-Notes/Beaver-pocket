import { BaseError } from 'make-error';
import { ErrorConstant } from '@remirror/core-constants';
/**
 * This marks the error as a remirror specific error, with enhanced stack
 * tracing capabilities.
 *
 * @remarks
 *
 * Use this when creating your own extensions and notifying the user that
 * something has gone wrong.
 */
export declare class RemirrorError extends BaseError {
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
export declare function invariant(condition: unknown, options: RemirrorErrorOptions): asserts condition;
/**
 * The invariant options which only show up during development.
 */
export interface RemirrorErrorOptions {
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
