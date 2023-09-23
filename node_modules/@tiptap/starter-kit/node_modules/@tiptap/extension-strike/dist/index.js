import { Mark, mergeAttributes, isMacOS, markInputRule, markPasteRule } from '@tiptap/core';

const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/;
const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g;
const Strike = Mark.create({
    name: 'strike',
    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },
    parseHTML() {
        return [
            {
                tag: 's',
            },
            {
                tag: 'del',
            },
            {
                tag: 'strike',
            },
            {
                style: 'text-decoration',
                consuming: false,
                getAttrs: style => (style.includes('line-through') ? {} : false),
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['s', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
        return {
            setStrike: () => ({ commands }) => {
                return commands.setMark(this.name);
            },
            toggleStrike: () => ({ commands }) => {
                return commands.toggleMark(this.name);
            },
            unsetStrike: () => ({ commands }) => {
                return commands.unsetMark(this.name);
            },
        };
    },
    addKeyboardShortcuts() {
        const shortcuts = {};
        if (isMacOS()) {
            shortcuts['Mod-Shift-s'] = () => this.editor.commands.toggleStrike();
        }
        else {
            shortcuts['Ctrl-Shift-s'] = () => this.editor.commands.toggleStrike();
        }
        return shortcuts;
    },
    addInputRules() {
        return [
            markInputRule({
                find: inputRegex,
                type: this.type,
            }),
        ];
    },
    addPasteRules() {
        return [
            markPasteRule({
                find: pasteRegex,
                type: this.type,
            }),
        ];
    },
});

export { Strike, Strike as default, inputRegex, pasteRegex };
//# sourceMappingURL=index.js.map
