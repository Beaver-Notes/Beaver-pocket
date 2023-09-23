import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        selectNodeForward: {
            /**
             * Select a node forward.
             */
            selectNodeForward: () => ReturnType;
        };
    }
}
export declare const selectNodeForward: RawCommands['selectNodeForward'];
