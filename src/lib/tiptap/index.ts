// index.ts
import Image from "./exts/image";
import StarterKit from "@tiptap/starter-kit";
import Video from "./exts/video-block";
import Audio from "./exts/audio-block";
import Document from "@tiptap/extension-document";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "./exts/highlight";
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
import MathInline from "./exts/math-inline";
import { NoteLabel } from "./exts/NoteLabel";
import { linkNote } from "./exts/note-link";
import FileEmbed from "./exts/file-block";
import SearchAndReplace from "@sereneinserenade/tiptap-search-and-replace";
import Mathblock from "./exts/math-block/Index";
import CodeBlock from "./exts/code-block";
import Paper from "./exts/paper-block-new";
import iframe from "./exts/embed-block/iframe";
import MermaidDiagram from "./exts/mermaid-block";
import labels from "./exts/labels";
import markdownEngine from "./exts/markdown-engine";
import { Paste } from "./exts/markdown-engine/paste";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Footnote from "./exts/footnote-block/footnote";
import Footnotes from "./exts/footnote-block/footnotes";
import FootnoteReference from "./exts/footnote-block/reference";
import {
  blackCallout,
  blueCallout,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
} from "./exts/callouts/Index";

// Languages
import enTranslations from "../../assets/locales/en.json";
import deTranslations from "../../assets/locales/de.json";

let translations: any = enTranslations;

const selectedLanguage: string | null =
  localStorage.getItem("selectedLanguage") || "en";

if (selectedLanguage === "de") {
  translations = deTranslations;
}

const extensions = [
  StarterKit,
  Document.extend({
    content: "block+ (footnotes)?",
    allowGapCursor: true,
  }),
  CodeBlock,
  Placeholder.configure({
    placeholder: translations.tiptap.placeholder,
  }),
  Highlight.extend({ priority: 1000 }).configure({
    multicolor: true,
  }),
  Color,
  TextStyle,
  Underline,
  OrderedList,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link.configure({
    openOnClick: false,
    protocols: ['http', 'https', 'mailto', 'note'],
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
      "tiptap-url": "true",
    },
  }),
  Text,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  MermaidDiagram,
  BulletList,
  MathInline,
  NoteLabel,
  linkNote,
  FileEmbed,
  SearchAndReplace,
  Mathblock,
  iframe,
  Typography,
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
  Footnotes,
  FootnoteReference,
  Footnote,
  Paper,
  Video,
  markdownEngine,
  Paste,
  Image,
];

export { extensions };
