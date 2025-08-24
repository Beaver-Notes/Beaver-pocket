import React from "react";
import { BubbleMenu, Editor } from "@tiptap/react";
import NoteBubbleMenuLink from "./NoteBubbleMenuLink";
import NoteBubbleMenuEmbed from "./NoteBubbleMenuEmbed";

interface Props {
  editor: Editor;
}

const NoteBubbleMenu: React.FC<Props> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) =>
        editor.isActive("link") || editor.isActive("iframe")
      }
      className="bg-white dark:bg-neutral-800 rounded-lg max-w-xs border shadow-xl print:hidden"
    >
      {editor?.isActive("link") ? (
        <NoteBubbleMenuLink editor={editor} />
      ) : (
        <NoteBubbleMenuEmbed editor={editor} />
      )}
    </BubbleMenu>
  );
};

export default NoteBubbleMenu;
