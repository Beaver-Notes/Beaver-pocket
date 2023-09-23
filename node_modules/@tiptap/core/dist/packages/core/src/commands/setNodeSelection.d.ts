import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        setNodeSelection: {
            /**
             * Creates a NodeSelection.
             */
            setNodeSelection: (position: number) => ReturnType;
        };
    }
}
export declare const setNodeSelection: RawCommands['setNodeSelection'];
