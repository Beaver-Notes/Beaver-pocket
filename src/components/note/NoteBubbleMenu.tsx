import React from "react";
import { BubbleMenu, Editor } from "@tiptap/react";
import NoteBubbleMenuLink from "./NoteBubbleMenuLink";

interface Props {
  editor: Editor | null;
}

const NoteBubbleMenu: React.FC<Props> = ({ editor }) => {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) =>
        editor.isActive("image") || editor.isActive("link")
      }
      className="bg-white dark:bg-neutral-800 rounded-lg max-w-xs border shadow-xl print:hidden"
    >
      <NoteBubbleMenuLink editor={editor} />
    </BubbleMenu>
  );
};

export default NoteBubbleMenu;
