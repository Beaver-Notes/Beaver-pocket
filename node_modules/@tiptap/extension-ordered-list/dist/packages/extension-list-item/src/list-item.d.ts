import { Node } from '@tiptap/core';
export interface ListItemOptions {
    HTMLAttributes: Record<string, any>;
    bulletListTypeName: string;
    orderedListTypeName: string;
}
export declare const ListItem: Node<ListItemOptions, any>;
