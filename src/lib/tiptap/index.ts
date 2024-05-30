// index.ts
import { lowlight } from "lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import { NoteLabel } from "./NoteLabel";
import { LinkNote } from "./note-link";
import FileEmbed from "./FileEmbed";
import SearchAndReplace from "./search-&-replace";
import Paper from "./drawing-paper/Paper";
import Mathblock from "./math-block/Index";
import CodeBlockComponent from "./CodeBlockComponent";
import iframe from "./iframe";
import { useDataPath } from "../../store/useDataPath";

// Callouts
import { blackCallout, blueCallout, greenCallout, purpleCallout, redCallout, yellowCallout } from "./Callouts/Index";

// Languages
import enTranslations from '../../assets/locales/en.json';
import itTranslations from '../../assets/locales/it.json';
import deTranslations from '../../assets/locales/de.json';

let translations: any = enTranslations;

const selectedLanguage: string | null = localStorage.getItem('selectedLanguage') || 'en';

if (selectedLanguage === 'it') {
  translations = itTranslations;
} else if (selectedLanguage === 'de') {
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
  BulletList,
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
  Paper,
  Mathblock,
  iframe,
  blackCallout,
  blueCallout,
  greenCallout,
  purpleCallout,
  redCallout,
  yellowCallout,
];

export default extensions;
