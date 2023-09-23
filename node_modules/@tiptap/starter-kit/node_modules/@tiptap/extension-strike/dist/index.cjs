'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@tiptap/core');

const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/;
const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g;
const Strike = core.Mark.create({
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
        return ['s', core.mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
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
        if (core.isMacOS()) {
            shortcuts['Mod-Shift-s'] = () => this.editor.commands.toggleStrike();
        }
        else {
            shortcuts['Ctrl-Shift-s'] = () => this.editor.commands.toggleStrike();
        }
        return shortcuts;
    },
    addInputRules() {
        return [
            core.markInputRule({
                find: inputRegex,
                type: this.type,
            }),
        ];
    },
    addPasteRules() {
        return [
            core.markPasteRule({
                find: pasteRegex,
                type: this.type,
            }),
        ];
    },
});

exports.Strike = Strike;
exports["default"] = Strike;
exports.inputRegex = inputRegex;
exports.pasteRegex = pasteRegex;
//# sourceMappingURL=index.cjs.map
