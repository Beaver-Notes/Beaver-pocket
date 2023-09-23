import { Extension } from '@tiptap/core';
import { dropCursor } from '@tiptap/pm/dropcursor';

const Dropcursor = Extension.create({
    name: 'dropCursor',
    addOptions() {
        return {
            color: 'currentColor',
            width: 1,
            class: undefined,
        };
    },
    addProseMirrorPlugins() {
        return [
            dropCursor(this.options),
        ];
    },
});

export { Dropcursor, Dropcursor as default };
//# sourceMappingURL=index.js.map
