import { NodeType } from '@tiptap/pm/model';
import { RawCommands } from '../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        toggleNode: {
            /**
             * Toggle a node with another node.
             */
            toggleNode: (typeOrName: string | NodeType, toggleTypeOrName: string | NodeType, attributes?: Record<string, any>) => ReturnType;
        };
    }
}
export declare const toggleNode: RawCommands['toggleNode'];
