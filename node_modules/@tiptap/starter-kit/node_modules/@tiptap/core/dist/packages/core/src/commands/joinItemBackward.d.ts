import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        joinItemBackward: {
            /**
             * Join two nodes Forwards.
             */
            joinItemBackward: () => ReturnType;
        };
    }
}
export declare const joinItemBackward: RawCommands['joinItemBackward'];
