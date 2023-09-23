import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        selectTextblockEnd: {
            /**
             * Moves the cursor to the end of current text block.
             */
            selectTextblockEnd: () => ReturnType;
        };
    }
}
export declare const selectTextblockEnd: RawCommands['selectTextblockEnd'];
