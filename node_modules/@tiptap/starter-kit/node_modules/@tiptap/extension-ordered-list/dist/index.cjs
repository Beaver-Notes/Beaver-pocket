'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var core = require('@tiptap/core');

const ListItem = core.Node.create({
    name: 'listItem',
    addOptions() {
        return {
            HTMLAttributes: {},
            bulletListTypeName: 'bulletList',
            orderedListTypeName: 'orderedList',
        };
    },
    content: 'paragraph block*',
    defining: true,
    parseHTML() {
        return [
            {
                tag: 'li',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['li', core.mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addKeyboardShortcuts() {
        return {
            Enter: () => this.editor.commands.splitListItem(this.name),
            Tab: () => this.editor.commands.sinkListItem(this.name),
            'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
        };
    },
});

const TextStyle = core.Mark.create({
    name: 'textStyle',
    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },
    parseHTML() {
        return [
            {
                tag: 'span',
                getAttrs: element => {
                    const hasStyles = element.hasAttribute('style');
                    if (!hasStyles) {
                        return false;
                    }
                    return {};
                },
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return ['span', core.mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
        return {
            removeEmptyTextStyle: () => ({ state, commands }) => {
                const attributes = core.getMarkAttributes(state, this.type);
                const hasStyles = Object.entries(attributes).some(([, value]) => !!value);
                if (hasStyles) {
                    return true;
                }
                return commands.unsetMark(this.name);
            },
        };
    },
});

const inputRegex = /^(\d+)\.\s$/;
const OrderedList = core.Node.create({
    name: 'orderedList',
    addOptions() {
        return {
            itemTypeName: 'listItem',
            HTMLAttributes: {},
            keepMarks: false,
            keepAttributes: false,
        };
    },
    group: 'block list',
    content() {
        return `${this.options.itemTypeName}+`;
    },
    addAttributes() {
        return {
            start: {
                default: 1,
                parseHTML: element => {
                    return element.hasAttribute('start')
                        ? parseInt(element.getAttribute('start') || '', 10)
                        : 1;
                },
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: 'ol',
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        const { start, ...attributesWithoutStart } = HTMLAttributes;
        return start === 1
            ? ['ol', core.mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart), 0]
            : ['ol', core.mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
    addCommands() {
        return {
            toggleOrderedList: () => ({ commands, chain }) => {
                if (this.options.keepAttributes) {
                    return chain().toggleList(this.name, this.options.itemTypeName, this.options.keepMarks).updateAttributes(ListItem.name, this.editor.getAttributes(TextStyle.name)).run();
                }
                return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks);
            },
        };
    },
    addKeyboardShortcuts() {
        return {
            'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
        };
    },
    addInputRules() {
        let inputRule = core.wrappingInputRule({
            find: inputRegex,
            type: this.type,
            getAttributes: match => ({ start: +match[1] }),
            joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
        });
        if (this.options.keepMarks || this.options.keepAttributes) {
            inputRule = core.wrappingInputRule({
                find: inputRegex,
                type: this.type,
                keepMarks: this.options.keepMarks,
                keepAttributes: this.options.keepAttributes,
                getAttributes: match => ({ start: +match[1], ...this.editor.getAttributes(TextStyle.name) }),
                joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
                editor: this.editor,
            });
        }
        return [
            inputRule,
        ];
    },
});

exports.OrderedList = OrderedList;
exports["default"] = OrderedList;
exports.inputRegex = inputRegex;
//# sourceMappingURL=index.cjs.map
