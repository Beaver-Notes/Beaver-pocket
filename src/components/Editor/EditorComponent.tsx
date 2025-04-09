import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../../store/types";
import SDialog from "../UI/SDialog";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Toolbar from "./Toolbar";
import Drawer from "./Drawer";
import Find from "./Find";
import "../../assets/css/editor.css";
import { extensions } from "../../lib/tiptap/index";
import Commands from "../../lib/tiptap/exts/commands";
import NoteLinkExtension from "../../lib/tiptap/exts/suggestions/NoteLinkSuggestion";
import NoteLabelSuggestion from "../../lib/tiptap/exts/suggestions/NoteLabelSuggestion";
import DOMPurify from "dompurify";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";
import Icons from "../../lib/remixicon-react";
import Mousetrap from "mousetrap";
import mime from "mime";
import { saveImageToFileSystem } from "../../utils/fileHandler";
import { saveFileToFileSystem } from "../../utils/fileHandler";
import { WebviewPrint } from "capacitor-webview-print";

type Props = {
  note: Note;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
  translations: any;
};

function EditorComponent({
  note,
  notesState,
  setNotesState,
  translations,
}: Props) {
  const { activeNoteId, setActiveNoteId } = useNotesState();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const findRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { title, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState
  );
  const [previousContent, setPreviousContent] = useState<JSONContent | null>(
    null
  );
  const [searchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);
  const [sortingOption] = useState("updatedAt");

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch;
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdAtB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdAtA - createdAtB;
      case "updatedAt":
      default:
        const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return updatedAtA - updatedAtB;
    }
  });

  // Function to handle opening the dialog
  const openDialog = () => {
    setIsOpen(true);
  };

  // Function to handle closing the dialog
  const closeDialog = () => {
    setIsOpen(false);
  };

  const [focusMode, setFocusMode] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [wd, setWd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );
  const navigate = useNavigate();

  const titleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setActiveNoteId(note.id);
  }, [note.id, setActiveNoteId]);

  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
  );

  document.addEventListener("updateLabel", (event: Event) => {
    const customEvent = event as CustomEvent;
    const labelToAdd = customEvent.detail.props;
    console.log(labelToAdd);

    // Ensure existingLabels is initialized correctly
    const existingLabels = note.labels || [];

    // Check if the label already exists
    const labelExists = existingLabels.includes(labelToAdd);

    // Only add the label if it doesn't already exist
    const updatedLabels = labelExists
      ? existingLabels
      : [...existingLabels, labelToAdd];

    const jsonContent = editor?.getJSON() || {};

    // Update the note content with the new list of labels
    handleChangeNoteContent(jsonContent, note.title, updatedLabels);
  });

  const exts = [
    ...extensions,
    NoteLinkExtension.configure({
      notes: notesList,
    }),
    NoteLabelSuggestion.configure({
      uniqueLabels: uniqueLabels,
    }),
    Commands.configure({
      noteId: note.id,
    }),
  ];

  const editor = useEditor(
    {
      extensions: exts,
      content: note.content,
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();

        // Handle note content change
        handleChangeNoteContent(editorContent || {}, title);

        // Compare previous and current content
        if (previousContent) {
          const previousLabels = findNoteLabels(previousContent);
          const currentLabels = findNoteLabels(editorContent);

          // Check for deleted labels
          previousLabels.forEach((label) => {
            if (
              !currentLabels.some(
                (currentLabel) => currentLabel.attrs.id === label.attrs.id
              )
            ) {
              console.log(`Label deleted: ${label.attrs.label}`);

              // Remove the deleted label from the labels array
              const updatedLabels = note.labels.filter(
                (noteLabel) => noteLabel !== label.attrs.label
              );

              // Update the note content with the new labels
              handleChangeNoteContent(editorContent, note.title, updatedLabels);
            }
          });
        }

        // Update previous content
        setPreviousContent(editorContent);
      },
    },
    [note.id]
  );

  document.addEventListener("showFind", () => {
    setShowFind((prevShowFind) => !prevShowFind);
  });

  useEffect(() => {
    setWd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const handleTitleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newTitle = DOMPurify.sanitize(event.currentTarget.innerHTML);
    handleChangeNoteContent(editor?.getJSON() || {}, newTitle);
  };

  const handleTitlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  // Utility function to find all noteLabel objects in the JSON content
  const findNoteLabels = (content: JSONContent) => {
    const labels: any[] = [];
    const traverse = (node: any) => {
      if (node.type === "noteLabel") {
        labels.push(node);
      }
      if (node.content) {
        node.content.forEach(traverse);
      }
    };
    traverse(content);
    return labels;
  };

  const handleKeyDownTitle = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editorRef.current?.commands.focus(); // Focus the editor
    }
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

  useEffect(() => {
    Mousetrap.bind("mod+f", (e) => {
      e.preventDefault();
      setShowFind(true);
    });
    // Mousetrap key bindings
    Mousetrap.bind("mod+k", (e) => {
      e.preventDefault();
      setLink();
    });
    Mousetrap.bind("mod+shift+x", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleStrike().run();
    });
    Mousetrap.bind("mod+shift+h", (e) => {
      e.preventDefault();
      editor
        ?.chain()
        .focus()
        .setHighlight({ color: "bg-yellow-200 dark:bg-yellow-100" })
        .run();
    });
    Mousetrap.bind("mod+.", (e) => {
      e.preventDefault();
      editor?.commands.toggleSuperscript();
    });
    Mousetrap.bind("alt+,", (e) => {
      e.preventDefault();
      editor?.commands.toggleSubscript();
    });
    Mousetrap.bind("mod+e", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleCode().run();
    });
    Mousetrap.bind("alt+1", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 1 }).run();
    });
    Mousetrap.bind("alt+2", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 2 }).run();
    });
    Mousetrap.bind("alt+3", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 3 }).run();
    });
    Mousetrap.bind("alt+4", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 4 }).run();
    });
    Mousetrap.bind("alt+5", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 5 }).run();
    });
    Mousetrap.bind("alt+6", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleHeading({ level: 6 }).run();
    });
    Mousetrap.bind("mod+shift+7", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleOrderedList().run();
    });
    Mousetrap.bind("mod+shift+8", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleBulletList().run();
    });
    Mousetrap.bind("mod+shift+b", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleBlockquote().run();
    });
    Mousetrap.bind("mod+alt+c", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleCodeBlock().run();
    });

    // Cleanup all key bindings on unmount
    return () => {
      Mousetrap.unbind("mod+k");
      Mousetrap.unbind("mod+shift+x");
      Mousetrap.unbind("mod+shift+h");
      Mousetrap.unbind("mod+.");
      Mousetrap.unbind("alt+,");
      Mousetrap.unbind("mod+e");
      Mousetrap.unbind("alt+1");
      Mousetrap.unbind("alt+2");
      Mousetrap.unbind("alt+3");
      Mousetrap.unbind("alt+4");
      Mousetrap.unbind("alt+5");
      Mousetrap.unbind("alt+6");
      Mousetrap.unbind("mod+shift+7");
      Mousetrap.unbind("mod+shift+8");
      Mousetrap.unbind("mod+shift+b");
      Mousetrap.unbind("mod+alt+c");
    };
  }, [editor, setLink]);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.dataTransfer.items;
    await processItems(items);
  };

  const processItems = async (items: DataTransferItemList) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          const fileType = mime.getType(file.name);
          if (fileType) {
            await handleFileByType(file);
          } else {
            console.warn(`Unsupported file type: ${file.type}`);
          }
        }
      }
    }
  };

  const handleFileByType = async (file: File) => {
    try {
      let fileUrl = "",
        fileName = "";
      const mimeType = file.type;

      if (mimeType.startsWith("image/")) {
        const { imageUrl } = await saveImageToFileSystem(file, note.id);
        editor?.chain().setImage({ src: imageUrl }).run();
      } else if (mimeType.startsWith("video/")) {
        ({ fileUrl, fileName } = await saveFileToFileSystem(file, note.id));
        //@ts-ignore
        editor?.chain().setVideo({ src: fileUrl }).run();
      } else if (mimeType.startsWith("audio/")) {
        ({ fileUrl, fileName } = await saveFileToFileSystem(file, note.id));
        //@ts-ignore
        editor?.chain().setAudio({ src: fileUrl }).run();
      } else {
        ({ fileUrl, fileName } = await saveFileToFileSystem(file, note.id));
        //@ts-ignore
        editor?.chain().setFileEmbed(fileUrl, fileName).run();
      }
    } catch (error) {
      console.error(`Error handling file: ${file.name}`, error);
    }
  };

  const handlePrint = async (fileName: string) => {
    const html = document.documentElement;
    const darkModeActive = html.classList.contains("dark");

    // Temporarily force light mode by removing the "dark" class
    if (darkModeActive) html.classList.remove("dark");

    const restoreClass = () => {
      if (darkModeActive) html.classList.add("dark");
      window.removeEventListener("afterprint", restoreClass); // Clean up listener
    };

    // Restore dark mode after printing is done
    window.addEventListener("afterprint", restoreClass);

    try {
      await WebviewPrint.print({ name: fileName });
      console.log("Print triggered for file:", fileName);
    } catch (error) {
      console.error("Error printing webview:", error);
      restoreClass(); // Restore immediately on error
    }
  };

  const goBack = () => {
    navigate("/");
  };

  function toggleFocusMode() {
    try {
      if (!focusMode) {
        // Enable focus mode
        editor?.setOptions({ editable: false });
        editor?.view.update(editor.view.props);
        setFocusMode(true);
      } else {
        // Disable focus mode
        editor?.setOptions({ editable: true });
        editor?.view.update(editor.view.props);
        setFocusMode(false);
      }
    } catch (error) {
      // Log the error with a message
      console.error("Error while toggling focus mode:", error);
    }
  }

  return (
    <div
      className="relative h-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div>
        <Toolbar
          note={note}
          noteId={note.id}
          editor={editor}
          openDialog={openDialog}
          toggleFocusMode={toggleFocusMode}
          focusMode={focusMode}
          wd={wd}
        />
        <div className="sm:hidden bg-white bg-opacity-95 dark:bg-[#232222] w-full no-scrollbar flex justify-between print:hidden">
          <button
            className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={goBack}
          >
            <Icons.ArrowLeftLineIcon className="border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7" />
          </button>

          <div className="flex">
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={openDialog}
              aria-label={translations.editor.share}
            >
              <Icons.ShareLineIcon className="border-none text-neutral-800 dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
            </button>

            <SDialog
              translations={translations}
              isOpen={isOpen}
              closeDialog={closeDialog}
              notesState={notesState}
              handlePrint={handlePrint}
              note={note}
            />

            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={toggleFocusMode}
              aria-label={translations.editor.ReadingMode}
            >
              <Icons.FileArticleLine
                className={`border-none ${
                  focusMode
                    ? "text-primary"
                    : "text-neutral-800 dark:text-[color:var(--selected-dark-text)]"
                } text-xl w-7 h-7`}
              />
            </button>

            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => editor?.chain().focus().undo().run()}
              aria-label={translations.editor.undo}
            >
              <Icons.ArrowGoBackLineIcon
                className={`border-none ${
                  focusMode ? "hidden" : "block"
                } dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
              />
            </button>
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => editor?.chain().focus().redo().run()}
              aria-label={translations.editor.redo}
            >
              <Icons.ArrowGoForwardLineIcon
                className={`border-none ${
                  focusMode ? "hidden" : "block"
                } dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
              />
            </button>

            <button
              className="p-2 align-end rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => {
                if (buttonRef.current) {
                  setShowFind(true);
                }
              }}
              ref={buttonRef}
              aria-label={translations.editor.searchPage}
            >
              <Icons.Search2LineIcon
                className={`border-none ${
                  focusMode ? "hidden" : "block"
                } dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
              />
            </button>
          </div>

          {/* Portal appears below the button */}
          {showFind && (
            <div ref={findRef} className="fixed" style={{ zIndex: 80 }}>
              <Find editor={editor} setShowFind={setShowFind} />
            </div>
          )}
        </div>
      </div>

      <div
        id="content"
        className={`inset-x-0 pt-4 sm:pt-16 bottom-16 overflow-auto editor px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)]`}
      >
        <div
          contentEditable
          onPaste={handleTitlePaste}
          suppressContentEditableWarning
          onTouchStart={event?.preventDefault}
          className={`text-3xl font-bold overflow-y-scroll outline-none`}
          onBlur={handleTitleChange}
          onKeyDown={handleKeyDownTitle}
          dangerouslySetInnerHTML={{ __html: note.title }}
          ref={titleRef}
        />
        <div>
          <div className="py-2 h-full w-full" id="container">
            <EditorContent
              editor={editor}
              className="prose dark:text-neutral-100 max-w-none prose-indigo mb-[5em]"
            />
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 sm:hidden print:hidden bg-white dark:bg-[#232222] z-50 ${
          focusMode ? "hidden" : "block"
        }`}
      >
        <Drawer noteId={note.id} note={note} editor={editor} />
      </div>
    </div>
  );
}

export default EditorComponent;
