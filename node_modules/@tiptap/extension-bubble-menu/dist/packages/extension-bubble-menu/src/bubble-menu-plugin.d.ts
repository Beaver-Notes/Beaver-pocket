import { Editor } from '@tiptap/core';
import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Instance, Props } from 'tippy.js';
export interface BubbleMenuPluginProps {
    pluginKey: PluginKey | string;
    editor: Editor;
    element: HTMLElement;
    tippyOptions?: Partial<Props>;
    updateDelay?: number;
    shouldShow?: ((props: {
        editor: Editor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
        from: number;
        to: number;
    }) => boolean) | null;
}
export declare type BubbleMenuViewProps = BubbleMenuPluginProps & {
    view: EditorView;
};
export declare class BubbleMenuView {
    editor: Editor;
    element: HTMLElement;
    view: EditorView;
    preventHide: boolean;
    tippy: Instance | undefined;
    tippyOptions?: Partial<Props>;
    updateDelay: number;
    private updateDebounceTimer;
    shouldShow: Exclude<BubbleMenuPluginProps['shouldShow'], null>;
    constructor({ editor, element, view, tippyOptions, updateDelay, shouldShow, }: BubbleMenuViewProps);
    mousedownHandler: () => void;
    dragstartHandler: () => void;
    focusHandler: () => void;
    blurHandler: ({ event }: {
        event: FocusEvent;
    }) => void;
    tippyBlurHandler: (event: FocusEvent) => void;
    createTooltip(): void;
    update(view: EditorView, oldState?: EditorState): void;
    handleDebouncedUpdate: (view: EditorView, oldState?: EditorState) => void;
    updateHandler: (view: EditorView, selectionChanged: boolean, docChanged: boolean, oldState?: EditorState) => void;
    show(): void;
    hide(): void;
    destroy(): void;
}
export declare const BubbleMenuPlugin: (options: BubbleMenuPluginProps) => Plugin<any>;
