import { Editor } from '@tiptap/core';
import { EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { Instance, Props } from 'tippy.js';
export interface FloatingMenuPluginProps {
    pluginKey: PluginKey | string;
    editor: Editor;
    element: HTMLElement;
    tippyOptions?: Partial<Props>;
    shouldShow?: ((props: {
        editor: Editor;
        view: EditorView;
        state: EditorState;
        oldState?: EditorState;
    }) => boolean) | null;
}
export declare type FloatingMenuViewProps = FloatingMenuPluginProps & {
    view: EditorView;
};
export declare class FloatingMenuView {
    editor: Editor;
    element: HTMLElement;
    view: EditorView;
    preventHide: boolean;
    tippy: Instance | undefined;
    tippyOptions?: Partial<Props>;
    shouldShow: Exclude<FloatingMenuPluginProps['shouldShow'], null>;
    constructor({ editor, element, view, tippyOptions, shouldShow, }: FloatingMenuViewProps);
    mousedownHandler: () => void;
    focusHandler: () => void;
    blurHandler: ({ event }: {
        event: FocusEvent;
    }) => void;
    tippyBlurHandler: (event: FocusEvent) => void;
    createTooltip(): void;
    update(view: EditorView, oldState?: EditorState): void;
    show(): void;
    hide(): void;
    destroy(): void;
}
export declare const FloatingMenuPlugin: (options: FloatingMenuPluginProps) => Plugin<any>;
