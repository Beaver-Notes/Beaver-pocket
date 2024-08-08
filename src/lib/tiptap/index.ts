// index.ts
import { lowlight } from "lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Audio from "./exts/audio-block";
import Document from '@tiptap/extension-document'
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import OrderedList from "@tiptap/extension-ordered-list";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Link from "@tiptap/extension-link";
import Text from "@tiptap/extension-text";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import BulletList from "@tiptap/extension-bullet-list";
import ImageResize from "tiptap-extension-resize-image";
import MathInline from "./exts/math-inline";
import { NoteLabel } from "./exts/NoteLabel";
import { LinkNote } from "./exts/note-link";
import FileEmbed from "./exts/file-block";
import SearchAndReplace from "./exts/search-&-replace";
import Mathblock from "./exts/math-block/Index";
import CodeBlockComponent from "./exts/CodeBlockComponent";
import iframe from "./exts/embed-block/iframe";
import { useDataPath } from "../../store/useDataPath";
import MermaidDiagram from "./exts/mermaid-block";
import labels from "./exts/labels";

// Callouts
import {
  blackCallout,
  blueCallout,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
} from "./exts/Callouts/Index";

// Languages
import enTranslations from "../../assets/locales/en.json";
import itTranslations from "../../assets/locales/it.json";
import deTranslations from "../../assets/locales/de.json";
import Footnote from "./exts/footnote-block/footnote";
import Footnotes from "./exts/footnote-block/footnotes";
import FootnoteReference from "./exts/footnote-block/reference";

let translations: any = enTranslations;

const selectedLanguage: string | null =
  localStorage.getItem("selectedLanguage") || "en";

if (selectedLanguage === "it") {
  translations = itTranslations;
} else if (selectedLanguage === "de") {
  translations = deTranslations;
}

const extensions = [
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({ lowlight }),
  StarterKit,
  Placeholder.configure({
    placeholder: translations.tiptap.placeholder,
  }),
  Highlight,
  Underline,
  OrderedList,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link,
  Text,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  MermaidDiagram,
  BulletList,
  MathInline,
  ImageResize.extend({
    addNodeView() {
      const viewer = this.parent?.() as any;
      return (props) => {
        const attrs = props.node.attrs;
        const node = {
          ...props.node,
          attrs: { ...attrs, src: useDataPath().getRemotePath(attrs.src) },
        };
        const newProps = { ...props, node };
        return viewer(newProps);
      };
    },
  }),
  NoteLabel,
  LinkNote,
  FileEmbed,
  SearchAndReplace,
  Mathblock,
  iframe,
  blackCallout,
  blueCallout,
  labels,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
  Audio,
  Subscript,
  Superscript,
  Footnote,
  Footnotes,
  FootnoteReference,
  Document.extend({
    content: 'block+ footnotes?',
  }),
];

export default extensions;
