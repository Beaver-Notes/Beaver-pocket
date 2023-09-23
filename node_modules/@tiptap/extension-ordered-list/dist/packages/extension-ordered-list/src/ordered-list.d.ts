import { Node } from '@tiptap/core';
export interface OrderedListOptions {
    itemTypeName: string;
    HTMLAttributes: Record<string, any>;
    keepMarks: boolean;
    keepAttributes: boolean;
}
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        orderedList: {
            /**
             * Toggle an ordered list
             */
            toggleOrderedList: () => ReturnType;
        };
    }
}
export declare const inputRegex: RegExp;
export declare const OrderedList: Node<OrderedListOptions, any>;
