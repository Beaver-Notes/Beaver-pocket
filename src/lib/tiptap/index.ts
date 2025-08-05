// index.ts
import Image from "./exts/image";
import StarterKit from "@tiptap/starter-kit";
import Video from "./exts/video-block";
import Audio from "./exts/audio-block";
import heading from './exts/headings';
import CollapseHeading from './exts/collapse-heading';
import Document from "@tiptap/extension-document";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "./exts/highlight";
import Underline from "@tiptap/extension-underline";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Link from "@tiptap/extension-link";
import Text from "@tiptap/extension-text";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import MathInline from "./exts/math-inline";
import FileEmbed from "./exts/file-block";
import SearchAndReplace from "@sereneinserenade/tiptap-search-and-replace";
import Mathblock from "./exts/math-block/Index";
import CodeBlock from "./exts/code-block";
import Paper from "./exts/paper-block";
import iframe from "./exts/embed-block/iframe";
import MermaidDiagram from "./exts/mermaid-block";
import markdownEngine from "./exts/markdown-engine";
import { Paste } from "./exts/markdown-engine/paste";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Footnote from './exts/footnote-block/footnote';
import Footnotes from './exts/footnote-block/footnotes';
import FootnoteReference from './exts/footnote-block/reference';
import { dropFile } from './exts/drop-file';
import { TrailingNode } from "@tiptap/extensions";
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
import LabelSuggestion from "./exts/label-suggestion";

let translations: any = enTranslations;

const selectedLanguage: string | null =
  localStorage.getItem("selectedLanguage") || "en";

if (selectedLanguage === "de") {
  translations = deTranslations;
}

const extensions = [
  StarterKit.configure({
    heading: false,
    text: false,
    codeBlock: false,
    code: false,
  }),
  Document.extend({
    content: 'block+ (footnotes)?',
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
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Link.extend({
    addKeyboardShortcuts() {
      return {
        "Mod-k": () =>
          this.editor.chain().focus().toggleLink({ href: "" }).run(),
      };
    },
  }).configure({
    openOnClick: false,
    protocols: ["http", "https", "mailto", "note"],
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
      "tiptap-url": "true",
      title: "Ctrl+Click to open URL",
    },
  }),
  Text,
  heading,
  Table,
  TableCell,
  TableHeader,
  TableRow,
  MermaidDiagram,
  MathInline,
  FileEmbed,
  SearchAndReplace,
  TrailingNode,
  Mathblock,
  iframe,
  Typography,
  blackCallout,
  blueCallout,
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
  LabelSuggestion,
  Paper,
  Video,
  markdownEngine,
  Paste,
  Image,
];

export { extensions, heading, CollapseHeading, dropFile };
