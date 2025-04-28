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
import { WebviewPrint } from "capacitor-webview-print";
import { uselabelStore } from "../../store/label";
import { cleanEmptyParagraphs } from "../../utils/ediotor";

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
  const labelStore = uselabelStore();

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

  useEffect(() => {
    const load = async () => {
      await labelStore.retrieve();
    };
    load();
  }, []);

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

  const openDialog = () => {
    setIsOpen(true);
  };

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

  document.addEventListener("updateLabel", (event: Event) => {
    const customEvent = event as CustomEvent;
    const labelToAdd = customEvent.detail.props;
    console.log(labelToAdd);

    const existingLabels = note.labels || [];

    const labelExists = existingLabels.includes(labelToAdd);

    const updatedLabels = labelExists
      ? existingLabels
      : [...existingLabels, labelToAdd];

    labelStore.add(labelToAdd);

    const jsonContent = editor?.getJSON() || {};

    handleChangeNoteContent(jsonContent, note.title, updatedLabels);
  });

  const exts = [
    ...extensions,
    NoteLinkExtension.configure({
      notes: notesList,
    }),
    NoteLabelSuggestion.configure({
      uniqueLabels: labelStore.labels,
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
        let editorContent = editor.getJSON();

        editorContent = cleanEmptyParagraphs(editorContent); // 🧹 clean here

        handleChangeNoteContent(editorContent || {}, title);

        if (previousContent) {
          const previousLabels = findNoteLabels(previousContent);
          const currentLabels = findNoteLabels(editorContent);

          previousLabels.forEach((label) => {
            if (
              !currentLabels.some(
                (currentLabel) => currentLabel.attrs.id === label.attrs.id
              )
            ) {
              console.log(`Label deleted: ${label.attrs.label}`);

              const updatedLabels = note.labels.filter(
                (noteLabel) => noteLabel !== label.attrs.label
              );

              handleChangeNoteContent(editorContent, note.title, updatedLabels);
            }
          });
        }

        setPreviousContent(editorContent);
      },
    },
    [note.id, labelStore.labels]
  );

  useEffect(() => {
    function handleClick(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null;
      const closestAnchor = target?.closest("a");

      const isTiptapURL = closestAnchor?.hasAttribute("tiptap-url");
      const isMentionURL = target?.hasAttribute("data-mention");

      if (isTiptapURL) {
        if (closestAnchor && closestAnchor.href.startsWith("note://")) {
          const noteId = closestAnchor.href.split("note://")[1];
          navigate(`/editor/${noteId}`);
          return;
        } else if (closestAnchor) {
          window.open(closestAnchor.href, "_blank", "noopener");
          event.preventDefault();
        }
      } else if (isMentionURL) {
        event.preventDefault();
        navigate(`/?label=${encodeURIComponent(target?.dataset.id || "")}`);
      }
    }

    const editorElement = document.querySelector(".ProseMirror");

    if (editorElement) {
      editorElement.addEventListener("click", handleClick as EventListener);
      editorElement.addEventListener("touchend", handleClick as EventListener);
    }

    return () => {
      if (editorElement) {
        editorElement.removeEventListener(
          "click",
          handleClick as EventListener
        );
        editorElement.removeEventListener(
          "touchend",
          handleClick as EventListener
        );
      }
    };
  }, [editor]);

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
      editorRef.current?.commands.focus();
    }
  };

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) {
      return;
    }

    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

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

  const handlePrint = async (fileName: string) => {
    const html = document.documentElement;
    const darkModeActive = html.classList.contains("dark");
    const content = document.getElementById("content");

    if (darkModeActive) html.classList.remove("dark");

    const originalStyles = {
      overflow: content?.style.overflow,
      height: content?.style.height,
      maxHeight: content?.style.maxHeight,
    };

    if (content) {
      content.style.overflow = "visible";
      content.style.height = "auto";
      content.style.maxHeight = "none";
    }

    const restore = () => {
      if (darkModeActive) html.classList.add("dark");

      if (content) {
        content.style.overflow = originalStyles.overflow || "";
        content.style.height = originalStyles.height || "";
        content.style.maxHeight = originalStyles.maxHeight || "";
      }

      window.removeEventListener("afterprint", restore);
    };

    window.addEventListener("afterprint", restore);

    try {
      await WebviewPrint.print({ name: fileName });
      console.log("Print triggered for file:", fileName);
    } catch (error) {
      console.error("Error printing webview:", error);
      restore();
    }
  };

  const goBack = () => {
    navigate("/");
  };

  function toggleFocusMode() {
    try {
      if (!focusMode) {
        editor?.setOptions({ editable: false });
        editor?.view.update(editor.view.props);
        setFocusMode(true);
      } else {
        editor?.setOptions({ editable: true });
        editor?.view.update(editor.view.props);
        setFocusMode(false);
      }
    } catch (error) {
      console.error("Error while toggling focus mode:", error);
    }
  }

  return (
    <div className="relative h-auto" onDragOver={(e) => e.preventDefault()}>
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
              className={`${
                focusMode ? "hidden" : "block"
              } p-2 align-end rounded-md text-white bg-transparent cursor-pointer`}
              onClick={() => editor?.chain().focus().undo().run()}
              aria-label={translations.editor.undo}
            >
              <Icons.ArrowGoBackLineIcon
                className={`border-none  dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
              />
            </button>
            <button
              className={`${
                focusMode ? "hidden" : "block"
              } p-2 align-end rounded-md text-white bg-transparent cursor-pointer`}
              onClick={() => editor?.chain().focus().redo().run()}
              aria-label={translations.editor.redo}
            >
              <Icons.ArrowGoForwardLineIcon
                className={`border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
              />
            </button>

            <button
              className={`${
                focusMode ? "hidden" : "block"
              } p-2 align-end rounded-md text-white bg-transparent cursor-pointer`}
              onClick={() => {
                if (buttonRef.current) {
                  setShowFind(true);
                }
              }}
              ref={buttonRef}
              aria-label={translations.editor.searchPage}
            >
              <Icons.Search2LineIcon
                className={`border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
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
