import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        undoInputRule: {
            /**
             * Undo an input rule.
             */
            undoInputRule: () => ReturnType;
        };
    }
}
export declare const undoInputRule: RawCommands['undoInputRule'];
