import { Extension, callOrReturn, getExtensionField } from '@tiptap/core';
import { gapCursor } from '@tiptap/pm/gapcursor';

const Gapcursor = Extension.create({
    name: 'gapCursor',
    addProseMirrorPlugins() {
        return [
            gapCursor(),
        ];
    },
    extendNodeSchema(extension) {
        var _a;
        const context = {
            name: extension.name,
            options: extension.options,
            storage: extension.storage,
        };
        return {
            allowGapCursor: (_a = callOrReturn(getExtensionField(extension, 'allowGapCursor', context))) !== null && _a !== void 0 ? _a : null,
        };
    },
});

export { Gapcursor, Gapcursor as default };
//# sourceMappingURL=index.js.map
