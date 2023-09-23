import { EditorOptions } from '@tiptap/core';
import React, { ReactNode } from 'react';
import { Editor } from './Editor.js';
export declare type EditorContextValue = {
    editor: Editor | null;
};
export declare const EditorContext: React.Context<EditorContextValue>;
export declare const EditorConsumer: React.Consumer<EditorContextValue>;
export declare const useCurrentEditor: () => EditorContextValue;
export declare type EditorProviderProps = {
    children: ReactNode;
    slotBefore?: ReactNode;
    slotAfter?: ReactNode;
} & Partial<EditorOptions>;
export declare const EditorProvider: ({ children, slotAfter, slotBefore, ...editorOptions }: EditorProviderProps) => React.JSX.Element | null;
