import { Node, nodeInputRule, RawCommands } from "@tiptap/react";


export interface LinkNoteOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    linkNote: (options: { noteId: string; noteTitle: string }) => ReturnType;
  }
}

export const LinkNote = Node.create({
  name: "linkNote",

  group: "inline", // Display inline

  inline: true, // Inline node

  atom: true, // Represents an atomic inline node, like an image

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "linkNote", // Change the tag name to 'linkNote'
        getAttrs: (dom) => ({
          id: (dom as HTMLElement).getAttribute("id"), // Use 'id' attribute instead of 'data-id'
          label: (dom as HTMLElement).getAttribute("label"), // Use 'label' attribute instead of 'data-label'
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, label } = HTMLAttributes;
  
    const link = document.createElement('a');
    link.href = `note://${id}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer nofollow';
    link.textContent = label;
    
    // Attach event listener to emit custom event
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        const noteId = href.replace('note://', '');
        const event = new CustomEvent('notelink', { detail: { noteId } });
        document.dispatchEvent(event);
      }
    });
  
    return [
      'linkNote', // Use 'linkNote' as the top-level node
      {
        id,
        label,
      },
      link,
    ];
  },  

  addCommands() {
    return {
      linkNote:
        ({ noteId, noteTitle }: { noteId: string; noteTitle: string }) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent(
            `<linkNote id="${noteId}" label="${noteTitle}"><a href="note://${noteId}" target="_blank" rel="noopener noreferrer nofollow">${noteTitle}</a></linkNote>`
          ),
    } as Partial<RawCommands>;
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /<linkNote id="([^"]+)" label="([^"]+)"><a href="note:\/\/([^"]+)" target="_blank" rel="noopener noreferrer nofollow">([^<]+)<\/a><\/linkNote>/,
        type: this.type,
        getAttributes: (match) => {
          const [, id, label] = match;
          return { id, label };
        },
      }),
    ];
  },
});
