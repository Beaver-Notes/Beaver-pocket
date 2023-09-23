import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        joinItemForward: {
            /**
             * Join two nodes Forwards.
             */
            joinItemForward: () => ReturnType;
        };
    }
}
export declare const joinItemForward: RawCommands['joinItemForward'];
