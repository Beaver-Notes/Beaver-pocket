import { NodeType } from '@tiptap/pm/model';
import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        wrapIn: {
            /**
             * Wraps nodes in another node.
             */
            wrapIn: (typeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
        };
    }
}
export declare const wrapIn: RawCommands['wrapIn'];
