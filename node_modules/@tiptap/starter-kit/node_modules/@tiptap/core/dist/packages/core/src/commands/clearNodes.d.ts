import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        clearNodes: {
            /**
             * Normalize nodes to a simple paragraph.
             */
            clearNodes: () => ReturnType;
        };
    }
}
export declare const clearNodes: RawCommands['clearNodes'];
