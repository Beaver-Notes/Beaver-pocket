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
    const span = document.createElement('span');
    span.setAttribute('data-src', HTMLAttributes.src || ''); // Set data-src attribute
    span.setAttribute('data-file-name', HTMLAttributes.fileName || ''); // Set data-file-name attribute
    span.className = 'fixed p-2 w-auto text-lg bg-[#F8F8F7] hover:bg-[#EFEFEF] dark:hover:bg-[#373737] dark:bg-[#353333] rounded-lg cursor-pointer';
  
    // Attach event listener to emit custom event
    span.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default action
      const src = span.getAttribute('data-src');
      const fileName = span.getAttribute('data-file-name');
      if (src && fileName) {
        const eventData = { src, fileName };
        const customEvent = new CustomEvent('fileEmbedClick', { detail: eventData });
        document.dispatchEvent(customEvent); // Dispatch custom event
      }
    });
  
    span.textContent = HTMLAttributes.fileName || ''; // Set text content
  
    return span;
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
