import React from "react";
import { BubbleMenu, Editor } from "@tiptap/react";
import NoteBubbleMenuLink from "./NoteBubbleMenuLink";
import { Note } from "../../store/types";

interface Props {
  editor: Editor | null;
  notes: Note[];
}

const NoteBubbleMenu: React.FC<Props> = ({ editor, notes }) => {
  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor }) =>
        editor.isActive("image") || editor.isActive("link")
      }
      className="bg-white dark:bg-neutral-800 rounded-lg max-w-xs border shadow-xl print:hidden"
    >
      <NoteBubbleMenuLink editor={editor} notes={notes} />
    </BubbleMenu>
  );
};

export default NoteBubbleMenu;
