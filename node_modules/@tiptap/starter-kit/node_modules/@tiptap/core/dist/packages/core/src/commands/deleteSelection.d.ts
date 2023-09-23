import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        deleteSelection: {
            /**
             * Delete the selection, if there is one.
             */
            deleteSelection: () => ReturnType;
        };
    }
}
export declare const deleteSelection: RawCommands['deleteSelection'];
