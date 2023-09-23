import React, { HTMLProps } from 'react';
import { Editor } from './Editor.js';
import { ReactRenderer } from './ReactRenderer.js';
export interface EditorContentProps extends HTMLProps<HTMLDivElement> {
    editor: Editor | null;
}
export interface EditorContentState {
    renderers: Record<string, ReactRenderer>;
}
export declare class PureEditorContent extends React.Component<EditorContentProps, EditorContentState> {
    editorContentRef: React.RefObject<any>;
    initialized: boolean;
    constructor(props: EditorContentProps);
    componentDidMount(): void;
    componentDidUpdate(): void;
    init(): void;
    maybeFlushSync(fn: () => void): void;
    setRenderer(id: string, renderer: ReactRenderer): void;
    removeRenderer(id: string): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
export declare const EditorContent: React.MemoExoticComponent<(props: EditorContentProps) => React.ReactElement<EditorContentProps, string | React.JSXElementConstructor<any>>>;
