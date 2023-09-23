import { Extension } from '@tiptap/core';
import { undo, redo, history } from '@tiptap/pm/history';

const History = Extension.create({
    name: 'history',
    addOptions() {
        return {
            depth: 100,
            newGroupDelay: 500,
        };
    },
    addCommands() {
        return {
            undo: () => ({ state, dispatch }) => {
                return undo(state, dispatch);
            },
            redo: () => ({ state, dispatch }) => {
                return redo(state, dispatch);
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            history(this.options),
        ];
    },
    addKeyboardShortcuts() {
        return {
            'Mod-z': () => this.editor.commands.undo(),
            'Mod-Z': () => this.editor.commands.undo(),
            'Mod-y': () => this.editor.commands.redo(),
            'Mod-Y': () => this.editor.commands.redo(),
            'Shift-Mod-z': () => this.editor.commands.redo(),
            'Shift-Mod-Z': () => this.editor.commands.redo(),
            // Russian keyboard layouts
            'Mod-я': () => this.editor.commands.undo(),
            'Shift-Mod-я': () => this.editor.commands.redo(),
        };
    },
});

export { History, History as default };
//# sourceMappingURL=index.js.map
