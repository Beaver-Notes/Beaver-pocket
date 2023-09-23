import { useCallback } from 'react';
import { Note } from "./types";
import {
  EditorContent,
  useEditor,
  JSONContent,
  generateText,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import styles from "./NoteEditor.module.css";
import Highlight from "@tiptap/extension-highlight";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import Underline from "@tiptap/extension-underline";
import Code from "@tiptap/extension-code";
import OrderedList from "@tiptap/extension-list-item";
import { ListItem } from "@tiptap/extension-list-item";
import CodeBlock from "@tiptap/extension-code-block";
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Blockquote from '@tiptap/extension-blockquote';
import Link from '@tiptap/extension-link';

// Remix Icons

import BoldIcon from "remixicon-react/BoldIcon";
import CodeFillIcon from "remixicon-react/CodeFillIcon";
import MarkPenLineIcon from "remixicon-react/MarkPenLineIcon";
import ImageLineIcon from "remixicon-react/ImageLineIcon";
import ParagraphIcon from "remixicon-react/ParagraphIcon";
import H1Icon from "remixicon-react/H1Icon";
import ListOrderedIcon from "remixicon-react/ListOrderedIcon";
import H2Icon from "remixicon-react/H2Icon";
import ItalicIcon from "remixicon-react/ItalicIcon";
import UnderlineIcon from "remixicon-react/UnderlineIcon";
import StrikethroughIcon from "remixicon-react/StrikethroughIcon";
import ArrowLeftSLineIcon from "remixicon-react/ArrowLeftSLineIcon";
import ListUnorderedIcon from "remixicon-react/ListUnorderedIcon";
import ListCheck2Icon from "remixicon-react/ListCheck2Icon";
import CodeBoxLineIcon from "remixicon-react/CodeBoxLineIcon";
import DoubleQuotesLIcon from "remixicon-react/DoubleQuotesLIcon";
import LinkIcon from "remixicon-react/LinkIcon";

const extensions = [
  StarterKit,
  Link,
  Highlight,
  Underline,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Paragraph,
  CodeBlock,
  Code,
  OrderedList,
  ListItem,
  Blockquote,
  TaskList,
      TaskItem.configure({
        nested: true,
      }),
  Image,
];

type Props = {
  note: Note;
  onChange: (content: JSONContent, title?: string) => void;
  isFullScreen?: boolean; // Add the isFullScreen prop
};

function NoteEditor({ note, onChange, isFullScreen = false }: Props) {
  const editor = useEditor(
    {
      extensions,
      content: note.content,
      editorProps: {
        attributes: {
          class: styles.TextEditor,
        },
      },
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();
        const firstNodeContent = editorContent.content?.[0];
        onChange(
          editorContent,
          firstNodeContent && generateText(firstNodeContent, extensions)
        );
      },
    },
    [note.id]
  );

  const toggleParagraph = () => {
    editor?.commands.setParagraph();
  };

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
  };

  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
  };

  const toggleHighlight = () => {
    editor?.chain().focus().toggleHighlight().run();
  };

  const toggleCode = () => {
    editor?.chain().focus().toggleCode().run();
  };

  const toggleOrderedList = () => {
    editor?.commands.toggleOrderedList()
  };

  const addImage = () => {
    const imageUrl = window.prompt("Enter the URL of the image:");

    if (imageUrl) {
      editor?.chain().focus().setImage({ src: imageUrl }).run();
    }
  };

  const toggleUnorderedList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleTaskList = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const toggleCodeBlock = () => {
    editor?.chain().focus().toggleCodeBlock().run();
  };

  const toggleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink()
        .run()

      return
    }

    // update link
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url })
      .run()
  }, [editor])

  return (
    <div className={styles.pageContainer}>
      <div
        className={
          isFullScreen ? styles.fullScreenEditor : styles.editorContainer
        }
      >
        <div className={styles.toolbar}>
          <button
            className={styles.toolbarButton}
            onClick={() => window.location.reload()} 
          >
            <ArrowLeftSLineIcon className={styles.toolbarIcon} />
          </button>
          |
          <button
            className={
              editor?.isActive("paragraph")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleParagraph}
          >
            <ParagraphIcon className={styles.toolbarIcon} />
          </button>
          <button
  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
  className={
    editor?.isActive("heading", { level: 1 })
      ? styles.toolbarButtonActive
      : styles.toolbarButton
  }
>
  <H1Icon className={styles.toolbarIcon} />
</button>
<button
  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
  className={
    editor?.isActive("heading", { level: 2 })
      ? styles.toolbarButtonActive
      : styles.toolbarButton
  }
>
  <H2Icon className={styles.toolbarIcon} />
</button>
          <div className={styles.separator}>
          |
          </div>
          <button
            className={
              editor?.isActive("bold")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleBold}
          >
            <BoldIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleItalic}
          >
            <ItalicIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleUnderline}
          >
            <UnderlineIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleStrike}
          >
            <StrikethroughIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("code")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleCode}
          >
            <CodeFillIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("highlight")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleHighlight}
          >
            <MarkPenLineIcon className="toolbarIcon" />
          </button>
          |
          <button
            className={
              editor?.isActive("OrderedList")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleOrderedList}
          >
            <ListOrderedIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("UnorderedList")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleUnorderedList}
          >
            <ListUnorderedIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("Tasklist")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleTaskList}
          >
            <ListCheck2Icon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("Blockquote")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleBlockquote}
          >
            <DoubleQuotesLIcon className="toolbarIcon" />
          </button>
          <button
            className={
              editor?.isActive("codeblock")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
            }
            onClick={toggleCodeBlock}
          >
            <CodeBoxLineIcon className="toolbarIcon" />
          </button>
          |
          <button onClick={setLink} className={editor?.isActive('link') ? 'is-active' : ''}>
        <LinkIcon className='toolbarIcon' />
      </button>
          <button onClick={addImage} className={
              editor?.isActive("image")
                ? styles.toolbarButtonActive
                : styles.toolbarButton
          }>
            <ImageLineIcon className="toolbarIcon" />
          </button>
        </div>
      </div>
      <EditorContent editor={editor} className={styles.textEditorContent} />
    </div>
  );
}

export default NoteEditor;
