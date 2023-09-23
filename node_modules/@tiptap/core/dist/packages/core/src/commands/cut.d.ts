import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        cut: {
            /**
             * Cuts content from a range and inserts it at a given position.
             */
            cut: ({ from, to }: {
                from: number;
                to: number;
            }, targetPos: number) => ReturnType;
        };
    }
}
export declare const cut: RawCommands['cut'];
