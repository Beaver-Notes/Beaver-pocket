import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "./types";
import { lowlight } from "lowlight";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import generatePDF, { Resolution, Margin, Options } from "react-to-pdf";
import Placeholder from "@tiptap/extension-placeholder";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import styles from "./css/NoteEditor.module.css";
import "./css/NoteEditor.module.css";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import OrderedList from "@tiptap/extension-list-item";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Link from "@tiptap/extension-link";
import Text from "@tiptap/extension-text";
import { NoteLabel } from "./lib/tiptap/NoteLabel";
import Mathblock from "./lib/tiptap/math-block/Index";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import CodeBlockComponent from "./components/CodeBlockComponent";
import { v4 as uuidv4 } from "uuid";
import HeadingTree from "./lib/HeadingTree";
// import Paper from "./lib/tiptap/paper/Paper"

// Icons

import BoldIcon from "remixicon-react/BoldIcon";
import MarkPenLineIcon from "remixicon-react/MarkPenLineIcon";
import ImageLineIcon from "remixicon-react/ImageLineIcon";
import ListOrderedIcon from "remixicon-react/ListOrderedIcon";
import ItalicIcon from "remixicon-react/ItalicIcon";
import UnderlineIcon from "remixicon-react/UnderlineIcon";
import StrikethroughIcon from "remixicon-react/StrikethroughIcon";
import ArrowLeftSLineIcon from "remixicon-react/ArrowLeftLineIcon";
import ListUnorderedIcon from "remixicon-react/ListUnorderedIcon";
import ListCheck2Icon from "remixicon-react/ListCheck2Icon";
import DoubleQuotesLIcon from "remixicon-react/DoubleQuotesLIcon";
import LinkIcon from "remixicon-react/LinkMIcon";
import PrinterLineIcon from "remixicon-react/PrinterLineIcon";
import Focus3LineIcon from "remixicon-react/Focus3LineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";

// Languages
import css from "highlight.js/lib/languages/css";
import js from "highlight.js/lib/languages/javascript";
import ts from "highlight.js/lib/languages/typescript";
import html from "highlight.js/lib/languages/xml";

lowlight.registerLanguage("html", html);
lowlight.registerLanguage("css", css);
lowlight.registerLanguage("js", js);
lowlight.registerLanguage("ts", ts);

const extensions = [
  CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({ lowlight }),
  Document,
  NoteLabel,
  Text,
  StarterKit,
  Link,
  Mathblock,
  Highlight,
  Underline,
  Placeholder,
  OrderedList,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  Image.configure({}),
];

type Props = {
  note: Note;
  onCloseEditor: () => void;
  onChange: (content: JSONContent, title?: string) => void;
  isFullScreen?: boolean;
  title: string;
  onTitleChange: (newTitle: string) => void;
};

function NoteEditor({
  note,
  onChange,
  onCloseEditor,
  onTitleChange,
  isFullScreen = false,
}: Props) {

  const [localTitle, setLocalTitle] = useState<string>(note.title);

  const handleTitleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newTitle = event.currentTarget.innerText;
    setLocalTitle(newTitle);
    onTitleChange(newTitle);
    // Call onChange with the updated content and title
    onChange(editor?.getJSON() || {} as JSONContent, newTitle);
  };

  useEffect(() => {
    // Update local title when the note changes
    setLocalTitle(note.title);
  }, [note.title]);

  const editor = useEditor(
    {
      extensions,
      content: note.content,
      editorProps: {
        attributes: {
          class: "overflow-auto outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();
        onChange(editorContent);
      },
    },
    [note.id]
  );

  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(
    null
  );

  const [focusMode, setFocusMode] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const updateLabelsInNote = (labelToUpdate: string, newLabel: string) => {
    const updatedNote = { ...note };

    if (
      typeof updatedNote.content === "object" &&
      updatedNote.content !== null
    ) {
      const contentArray =
        "content" in updatedNote.content &&
        Array.isArray(updatedNote.content.content)
          ? updatedNote.content.content
          : [];

      const labelIndex = updatedNote.labels?.indexOf(labelToUpdate);

      if (labelIndex !== -1) {
        // Check if the newLabel is empty
        if (newLabel.trim() === "") {
          // Remove the label from the labels array
          updatedNote.labels.splice(labelIndex, 1);

          // Remove the corresponding noteLabel node from the content array
          const existingNoteLabelIndex = contentArray.findIndex(
            (node: any) =>
              node.type === "noteLabel" &&
              node.attrs &&
              node.attrs.id === labelToUpdate
          );

          if (existingNoteLabelIndex !== -1) {
            contentArray.splice(existingNoteLabelIndex, 1);
          }
        } else {
          // Update the label in the labels array
          updatedNote.labels[labelIndex] = newLabel;

          // Find the corresponding noteLabel node and update it
          const existingNoteLabelIndex = contentArray.findIndex(
            (node: any) =>
              node.type === "noteLabel" &&
              node.attrs &&
              node.attrs.id === labelToUpdate
          );

          if (
            existingNoteLabelIndex !== -1 &&
            contentArray[existingNoteLabelIndex]?.attrs
          ) {
            contentArray[existingNoteLabelIndex] = {
              type: "noteLabel",
              attrs: {
                id: newLabel,
                label: newLabel,
              },
            };
          }
        }

        // Call the onChange callback with the updated content and title
        onChange(updatedNote.content);
      }
    }
  };

  const extractLabelsFromNote = (note: Note): string[] => {
    return note.labels || [];
  };

  const labelsArray: string[] = extractLabelsFromNote(note);

  const addLabelToNote = (labelToAdd: string) => {
    // Clone the note to avoid mutating the original state directly
    const updatedNote = { ...note };

    // Create a noteLabel node
    const noteLabelNode = {
      type: "noteLabel",
      attrs: {
        id: labelToAdd,
        label: null,
      },
    };

    // Check if content is an array
    if (Array.isArray(updatedNote.content)) {
      // If it is an array, create a new content object with the noteLabelNode
      updatedNote.content = {
        type: "doc",
        content: [noteLabelNode],
      };
    } else if (updatedNote.content && typeof updatedNote.content === "object") {
      // Check if content has content property
      if (
        "content" in updatedNote.content &&
        Array.isArray(updatedNote.content.content)
      ) {
        updatedNote.content.content.push(noteLabelNode);
      } else {
        // If content is not an array or content property is not an array, create a new object with the noteLabelNode
        updatedNote.content = {
          type: "doc",
          content: [noteLabelNode],
        };
      }
    } else {
      // If content is not an array or an object, create a new object with the noteLabelNode
      updatedNote.content = {
        type: "doc",
        content: [noteLabelNode],
      };
    }

    // Add the label to the labels array
    if (!updatedNote.labels) {
      updatedNote.labels = [labelToAdd];
    } else {
      updatedNote.labels.push(labelToAdd);
    }

    // Update the note using the onChange callback
    onChange(updatedNote.content);
  };

  const handleImageUpload = async (file: File) => {
    try {
      // Generate a unique identifier (UUID) for the image
      const directoryId = uuidv4();

      // Directory name for your images under the "assets" directory
      const assetsDirectory = "assets";

      // Check if the "assets" directory exists (or attempt to create it)
      try {
        await Filesystem.mkdir({
          path: assetsDirectory,
          directory: Directory.Data,
          recursive: true, // Create parent directories if they don't exist
        });
      } catch (createDirectoryError) {
        // Directory likely already exists, ignore the error
      }

      // Check if the directory with the random UUID exists (or attempt to create it)
      try {
        await Filesystem.mkdir({
          path: `${assetsDirectory}/${directoryId}`,
          directory: Directory.Data,
          recursive: true, // Create parent directories if they don't exist
        });
      } catch (createDirectoryError) {
        // Directory likely already exists, ignore the error
      }

      // Fetch the image as a binary blob
      const response = await fetch(URL.createObjectURL(file));
      const blob = await response.blob();

      // Convert the binary blob to an ArrayBuffer
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Convert ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);

      // Convert the Uint8Array to a regular array of numbers
      const dataArray = Array.from(uint8Array);

      // Encode the array of numbers as Base64
      const base64Data = btoa(
        dataArray.map((byte) => String.fromCharCode(byte)).join("")
      );

      // Get the original file name
      const originalFileName = file.name;

      // Write the Base64 image data to the app's data directory with the original file name
      await Filesystem.writeFile({
        path: `${assetsDirectory}/${directoryId}/${originalFileName}`,
        data: base64Data,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      const imageSrc = `data:image/jpeg;base64,${base64Data}`;

      // Insert the image into the editor
      editor?.chain().focus().setImage({ src: imageSrc }).run();
    } catch (error) {
      console.error("Error uploading image:", error);
    }
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

  const toggleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const toggleUnorderedList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const toggleTaskList = () => {
    editor?.chain().focus().toggleTaskList().run();
  };

  const toggleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    // update link
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const options: Options = {
    filename: "advanced-example.pdf",
    method: "save",
    // default is Resolution.MEDIUM = 3, which should be enough, higher values
    // increases the image quality but also the size of the PDF, so be careful
    // using values higher than 10 when having multiple pages generated, it
    // might cause the page to crash or hang.
    resolution: Resolution.EXTREME,
    page: {
      // margin is in MM, default is Margin.NONE = 0
      margin: Margin.SMALL,
      // default is 'A4'
      format: "letter",
      // default is 'portrait'
      orientation: "landscape",
    },
    canvas: {
      // default is 'image/jpeg' for better size performance
      mimeType: "image/jpeg",
      qualityRatio: 1,
    },
    // Customize any value passed to the jsPDF instance and html2canvas
    // function. You probably will not need this and things can break,
    // so use with caution.
    overrides: {
      // see https://artskydj.github.io/jsPDF/docs/jsPDF.html for more options
      pdf: {
        compress: true,
      },
      // see https://html2canvas.hertzen.com/configuration for more options
      canvas: {
        useCORS: true,
      },
    },
  };

  const getTargetElement = () => document.getElementById("container");

  const downloadPdf = () => generatePDF(getTargetElement, options);

  const handleHeadingClick = (heading: string) => {
    console.log("Heading clicked:", heading);
  };

  const [headingTreeVisible, setHeadingTreeVisible] = useState(false);

  const toggleHeadingTree = () => {
    setHeadingTreeVisible(!headingTreeVisible);
  };

  const headingTreeRef = useRef<HTMLDivElement | null>(null);

  // Close heading tree when clicking outside
  const handleOutsideClick = useCallback(
    (event: MouseEvent) => {
      if (
        headingTreeVisible &&
        headingTreeRef.current &&
        event.target instanceof Node &&
        !headingTreeRef.current.contains(event.target)
      ) {
        setHeadingTreeVisible(false);
      }
    },
    [headingTreeVisible]
  );

  useEffect(() => {
    // Attach the event listener
    document.addEventListener("mousedown", handleOutsideClick);

    // Detach the event listener on component unmount
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  return (
    <div
      className={`pt-6 overflow-auto h-full justify-center items-start w-full px-4 text-black dark:text-white lg:px-60 text-base`}
    >
      {toolbarVisible && (
        <div
          className={
            isFullScreen
              ? "overflow-auto w-full"
              : "fixed z-10 inset-x-2 bottom-6 overflow-auto h-auto w-full bg-transparent md:sticky md:top-0 md:z-50 no-scrollbar"
          }
        >
          <div className="fixed inset-x-2 bottom-6 overflow-auto h-auto w-full bg-transparent md:sticky md:top-0 md:z-50 no-scrollbar">
            <div className="bottom-6 flex overflow-y-hidden w-fit md:p-2 md:w-full p-4 bg-[#2D2C2C] rounded-full">
              <button
                className="p-2 hidden sm:block sm:align-start rounded-md text-white bg-transparent cursor-pointer"
                onClick={onCloseEditor}
              >
                <ArrowLeftSLineIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <div className="sm:mx-auto flex overflow-y-hidden w-fit">
                <button
                  className={
                    editor?.isActive("bold")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleBold}
                >
                  <BoldIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("italic")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleItalic}
                >
                  <ItalicIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("underline")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleUnderline}
                >
                  <UnderlineIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("strike")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleStrike}
                >
                  <StrikethroughIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("highlight")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleHighlight}
                >
                  <MarkPenLineIcon className="border-none text-white text-xl w-7 h-7" />
                </button>

                <button
                  className={
                    editor?.isActive("OrderedList")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleOrderedList}
                >
                  <ListOrderedIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("UnorderedList")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleUnorderedList}
                >
                  <ListUnorderedIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("Tasklist")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleTaskList}
                >
                  <ListCheck2Icon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    editor?.isActive("Blockquote")
                      ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                      : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={toggleBlockquote}
                >
                  <DoubleQuotesLIcon className="border-none text-white text-xl w-7 h-7" />
                </button>

                <button
                  onClick={setLink}
                  className={
                    "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                >
                  <LinkIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <button
                  className={
                    "p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={() => {
                    const imageInput =
                      document.getElementById("image-upload-input");
                    if (imageInput) {
                      imageInput.click();
                    }
                  }}
                >
                  <ImageLineIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleImageUpload(e.target.files[0]);
                    }
                  }}
                  style={{ display: "none" }}
                  id="image-upload-input" // Add this ID
                />
                <button
                  className={
                    "hidden sm:block p-2 rounded-md text-white bg-transparent cursor-pointer"
                  }
                  onClick={downloadPdf}
                >
                  <PrinterLineIcon className="border-none text-white text-xl w-7 h-7" />
                </button>
              </div>
              <button
                className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
                onClick={toggleHeadingTree}
              >
                <Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
            </div>
          </div>
        </div>
      )}

      {headingTreeVisible && editor && (
        <div
          ref={headingTreeRef}
          className={`transition-opacity ${
            headingTreeVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <HeadingTree onHeadingClick={handleHeadingClick} />
        </div>
      )}
      <div className="fixed sm:hidden mt-4 inset-x-2 overflow-auto h-auto w-full bg-transparent sticky top-0 z-50 no-scrollbar flex justify-between">
        <button
          className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
          onClick={onCloseEditor}
        >
          <ArrowLeftSLineIcon className="border-none dark:text-white text-neutral-800 text-xl w-7 h-7" />
        </button>
        <div className="flex">
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer"
            onClick={() => {
              setFocusMode((prevFocusMode) => !prevFocusMode);
              setToolbarVisible((prevToolbarVisible) => !prevToolbarVisible);
            }}
          >
            <Focus3LineIcon className="border-none dark:text-white text-neutral-800 text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 align-end rounded-md text-white bg-transparent cursor-pointer"
            onClick={toggleHeadingTree}
          >
            <Search2LineIcon
              className={`border-none ${
                focusMode ? "hidden" : "block"
              }  dark:text-white text-neutral-800 text-xl w-7 h-7`}
            />
          </button>
        </div>
      </div>

      <div
      contentEditable
      suppressContentEditableWarning
      className="text-3xl font-bold overflow-y-scroll outline-none"
      onBlur={handleTitleChange}
      dangerouslySetInnerHTML={{ __html: localTitle }}
    />

      <div>
        <div className="flex flex-wrap mt-4 gap-2">
          {labelsArray.map((label, index) => (
            <span
              key={index}
              className="text-lg bg-amber-400 bg-opacity-10 text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
              onClick={() => {
                setEditingLabelIndex(index);

                // Handle the case when clicking on a label
                const updatedLabels = [...labelsArray];
                updatedLabels[index] = label; // Update the label to its original value
                updateLabelsInNote(label, label); // Fix: Pass both labelToUpdate and newLabel
              }}
            >
              {editingLabelIndex === index ? (
                <div
                  className="min-w-0 flex-auto bg-transparent outline-none"
                  contentEditable
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const updatedLabels = [...labelsArray];
                      updatedLabels[index] = e.currentTarget.innerText.trim();
                      setEditingLabelIndex(null);
                      // Update the note with the new labels and content
                      updateLabelsInNote(
                        label,
                        e.currentTarget.innerText.trim()
                      ); // Fix: Pass both labelToUpdate and newLabel
                    }
                  }}
                >
                  {label}
                </div>
              ) : (
                `#${label}`
              )}
            </span>
          ))}
          <div
            className={styles.labelinput}
            contentEditable
            data-placeholder="Add label"
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                e.currentTarget.innerText.trim() !== ""
              ) {
                addLabelToNote(e.currentTarget.innerText.trim());
                e.currentTarget.innerText = ""; // Clear the input field after adding the label
              }
            }}
          />
        </div>
        <div className="py-2 h-full w-full" id="container">
          <EditorContent
            editor={editor}
            className="overflow-auto h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
