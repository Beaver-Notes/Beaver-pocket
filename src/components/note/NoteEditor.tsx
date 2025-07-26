import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../../store/types";
import { EditorContent, useEditor } from "@tiptap/react";
import Toolbar from "./Toolbar";
import Find from "./Find";
import "../../assets/css/editor.css";
import { extensions } from "../../lib/tiptap/index";
import Commands from "../../lib/tiptap/exts/commands";
import LabelSuggestion from "../../lib/tiptap/exts/label-suggestion";
import LinkNote from "../../lib/tiptap/exts/link-note";
import DOMPurify from "dompurify";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";
import Mousetrap from "mousetrap";
import { labelStore } from "../../store/label";
import { WebviewPrint } from "capacitor-webview-print";
import { cleanEmptyParagraphs } from "../../utils/editor";
import NoteBubbleMenu from "./NoteBubbleMenu";
import Icon from "../UI/Icon";
import { UiModal } from "../UI/Modal";
import { shareNote } from "../../utils/share";

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
  const [searchQuery] = useState<string>("");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);
  const [sortingOption] = useState("updatedAt");

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const noteTitle = note.title ?? ""; // fallback to empty string
      return noteTitle.toLowerCase().includes(searchQuery.toLowerCase());
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return (a.title ?? "").localeCompare(b.title ?? "");
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

  const exts = [
    ...extensions,
    LinkNote(notesList, activeNoteId ?? ""),
    LabelSuggestion,
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
        editorContent = cleanEmptyParagraphs(editorContent);

        const labelEls = editor.view.dom.querySelectorAll("[data-mention]");
        const labelsSet = new Set<string>();
        labelEls.forEach((el) => {
          const labelId = el.getAttribute("data-id");
          if (labelId && labelStore.labels.includes(labelId)) {
            labelsSet.add(labelId);
          }
        });
        const extractedLabels = Array.from(labelsSet);

        handleChangeNoteContent(editorContent || {}, title, extractedLabels);
      },
    },
    [note.id]
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const editorContent = editor.getJSON();
      const labelEls = editor.view.dom.querySelectorAll("[data-mention]");
      const labelsSet = new Set<string>();
      labelEls.forEach((el) => {
        const labelId = el.getAttribute("data-id");
        if (labelId && labelStore.labels.includes(labelId)) {
          labelsSet.add(labelId);
        }
      });
      const extractedLabels = Array.from(labelsSet);

      if (JSON.stringify(extractedLabels) !== JSON.stringify(note.labels)) {
        handleChangeNoteContent(editorContent, title, extractedLabels);
      }
    }
  }, [labelStore.labels, editor, note.labels, title]);

  useEffect(() => {
    function toggleFindListener() {
      setShowFind((prevShowFind) => !prevShowFind);
    }

    document.addEventListener("showFind", toggleFindListener);
    return () => {
      document.removeEventListener("showFind", toggleFindListener);
    };
  }, []);

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

  const handleKeyDownTitle = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editorRef.current?.commands.focus();
    }
  };

  useEffect(() => {
    Mousetrap.bind("mod+f", (e) => {
      e.preventDefault();
      setShowFind(true);
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
  }, [editor]);

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
      <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] sm:top-0 sm:bottom-auto print:hidden bg-white dark:bg-[#232222] z-20">
        <Toolbar
          note={note}
          noteId={note.id}
          editor={editor}
          openDialog={openDialog}
          toggleFocusMode={toggleFocusMode}
          focusMode={focusMode}
          wd={wd}
        />
      </div>
      <div>
        <div className="sm:hidden bg-white bg-opacity-95 dark:bg-[#232222] w-full no-scrollbar flex justify-between print:hidden">
          <button
            className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={goBack}
          >
            <Icon name="ArrowLeftLine" />
          </button>

          <div className="flex">
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={openDialog}
              aria-label={translations.editor.share}
            >
              <Icon name="ShareLine" />
            </button>

            <UiModal
              modelValue={isOpen}
              onClose={closeDialog}
              header={translations.editor.exportas}
              allowSwipeToDismiss={true}
              className="fixed inset-0 flex items-end sm:items-center pb-6 justify-center bg-black bg-opacity-20 p-5 overflow-y-auto z-50 print:hidden"
            >
              <div className="my-2 border-b dark:border-neutral-500"></div>
              <div className="mt-4 space-y-4 p-2 bg-[#F8F8F7] dark:bg-neutral-800 rounded-xl">
                <div className="flex items-center w-full">
                  <p className="text-base pl-2 font-bold">BEA</p>

                  <button
                    onClick={() => shareNote(note.id, notesState)}
                    className="w-full bg-[#F8F8F7] dark:bg-neutral-800 p-4 text-lg rounded-xl inline-flex justify-between items-center"
                  >
                    <Icon
                      name="FileTextLine"
                      className="w-6 h-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>
                <div className="flex items-center w-full">
                  <p className="text-base pl-2 font-bold">PDF</p>
                  <button
                    onClick={() => handlePrint(`${note.title}.pdf`)}
                    className="w-full bg-[#F8F8F7] dark:bg-neutral-800 p-4 text-lg rounded-xl inline-flex justify-between items-center"
                  >
                    <Icon
                      name="FileArticleLine"
                      className="w-6 h-6"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </UiModal>

            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={toggleFocusMode}
              aria-label={translations.editor.ReadingMode}
            >
              <Icon
                name="FileArticleLine"
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
              onClick={() => {
                if (buttonRef.current) {
                  setShowFind(true);
                }
              }}
              ref={buttonRef}
              aria-label={translations.editor.searchPage}
            >
              <Icon name="Search2Line" />
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
        className={`inset-x-0 pt-4 sm:pt-20 bottom-16 overflow-auto editor px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)]`}
      >
        <div
          contentEditable
          onPaste={handleTitlePaste}
          suppressContentEditableWarning
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
          <NoteBubbleMenu editor={editor} notes={notesList} />
        </div>
      </div>
    </div>
  );
}

export default EditorComponent;
