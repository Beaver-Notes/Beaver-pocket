import React from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Editor } from "@tiptap/react";
import NoteBubbleMenuLink from "./NoteBubbleMenuLink";
import NoteBubbleMenuEmbed from "./NoteBubbleMenuEmbed";

interface Props {
  editor: Editor | null;
}

const NoteBubbleMenu: React.FC<Props> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor ?? undefined}
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
