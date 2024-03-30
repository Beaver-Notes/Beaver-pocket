import { Node, nodeInputRule, RawCommands } from '@tiptap/core';

const FileEmbed = Node.create({
  name: 'fileEmbed',

  group: 'block',

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => (el instanceof HTMLElement ? el.getAttribute('src') : null),
        renderHTML: (attrs) => ({ src: attrs.src }),
      },
      fileName: {
        default: null,
        parseHTML: (el) => (el instanceof HTMLElement ? el.getAttribute('data-file-name') : null),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-file-name]',
        getAttrs: (el) => ({
          src: el instanceof HTMLElement ? el.getAttribute('data-src') : null,
          fileName: el instanceof HTMLElement ? el.getAttribute('data-file-name') : null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        src: HTMLAttributes.src,
        'data-file-name': HTMLAttributes.fileName,
        className:
          'p-2 w-full bg-[#F8F8F7] hover:bg-[#EFEFEF] dark:hover:bg-[#373737] dark:bg-[#353333] rounded-lg cursor-pointer', // Add cursor pointer
      },
      HTMLAttributes.fileName,
    ];
  },

  addCommands() {
    return {
      setFileEmbed:
        (src: string, fileName: string) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent(
            `<span data-src="${src}" data-file-name="${fileName}">${fileName}</span>`
          ),
    } as Partial<RawCommands>;
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
        type: this.type,
        getAttributes: (match) => {
          const [, src, fileName] = match;
          return { src, fileName };
        },
      }),
    ];
  },
});

export default FileEmbed;
