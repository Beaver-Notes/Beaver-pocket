import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        enter: {
            /**
             * Trigger enter.
             */
            enter: () => ReturnType;
        };
    }
}
export declare const enter: RawCommands['enter'];
