import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "../../store/types";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Toolbar from "./Toolbar";
import HeadingTree from "../../lib/HeadingTree";
import { isPlatform } from "@ionic/react";
import Drawer from "./Drawer";
import Find from "./Find";
import extensions from "../../lib/tiptap/index";
import { Link } from "react-router-dom";
import { handleEditorTyping } from "../../utils/bubble-menu-util";
import BubblemenuNoteLink from "./BubblemenuNoteLink";
import BubblemenuLabel from "./BubblemenuLabel";
import { hasNotch } from "../../utils/detectNotch";
import DOMPurify from "dompurify";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";
import { useSaveNote } from "../../store/notes";

// Icons
import Icons from "../../lib/remixicon-react";

type Props = {
  note: Note;
};

function EditorComponent({ note }: Props) {
  const { notesState, setNotesState, activeNoteId, setActiveNoteId } =
    useNotesState();
  const { saveNote } = useSaveNote(setNotesState);
  const { title, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState,
    saveNote
  );

  const [previousContent, setPreviousContent] = useState<JSONContent | null>(
    null
  );

  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
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
      const contentMatch = JSON.stringify(note.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
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
  const [focusMode, setFocusMode] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [headingTreeVisible, setHeadingTreeVisible] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [wd, setWd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hashPopupPosition, setHashPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hashPosition, setHashPosition] = useState<number | null>(null);
  const [textAfterHash, setTextAfterHash] = useState<string | null>(null);
  const [atPosition, setAtPosition] = useState<number | null>(null);
  const [textAfterAt, setTextAfterAt] = useState<string | null>(null);
  const headingTreeRef = useRef<HTMLDivElement | null>(null);
  const [notchPadding, setNotchPadding] = useState(false);

  useEffect(() => {
    const checkNotch = async () => {
      const hasNotchFlag = await hasNotch();
      setNotchPadding(hasNotchFlag);
    };
    checkNotch();
    setActiveNoteId(note.id);
  }, []);

  const editor = useEditor(
    {
      extensions,
      content: note.content,
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();

        // Handle note content change
        handleChangeNoteContent(editorContent || {}, title);

        // Compare previous and current content
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

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "f" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setShowFind(true);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  useEffect(() => {
    setWd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const handleTitleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newTitle = DOMPurify.sanitize(event.currentTarget.innerHTML);
    handleChangeNoteContent(editor?.getJSON() || {}, newTitle);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const toggleHeadingTree = () => {
    setHeadingTreeVisible(!headingTreeVisible);
  };

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
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [handleOutsideClick]);

  const handleClickNote = (note: Note) => {
    const editorContent = editor?.getHTML() || "";
    const atIndex = editorContent.lastIndexOf("@@");

    if (atIndex !== -1) {
      // Find the first whitespace or end of the string after @@ to determine the end of the text to be replaced
      const endOfReplacementIndex = editorContent.indexOf(" ", atIndex + 2);
      const endOfReplacement =
        endOfReplacementIndex !== -1
          ? endOfReplacementIndex
          : editorContent.length;

      const link = `<linkNote id="${note.id}" label="${note.title}"><a href="note://${note.id}" target="_blank" rel="noopener noreferrer nofollow">${note.title}</a></linkNote>`;

      const newContent =
        editorContent.substring(0, atIndex) +
        link +
        editorContent.substring(endOfReplacement);

      editor?.commands.setContent(newContent, true);
      setPopupPosition(null);
    }
  };

  const handleAddLabel = (labelToAdd: string) => {
    const editorContent = editor?.getHTML() || "";
    const atIndex = editorContent.lastIndexOf("#");

    if (atIndex !== -1) {
      // Find the end of the text following the hash
      const endOfReplacementIndex = editorContent.indexOf(" ", atIndex + 1);
      const endOfReplacement =
        endOfReplacementIndex !== -1
          ? endOfReplacementIndex
          : editorContent.length;

      // Construct new content with the label replacement
      const newContent =
        editorContent.substring(0, atIndex) +
        `<noteLabel id="${labelToAdd}" label="${labelToAdd}"></noteLabel>` +
        editorContent.substring(endOfReplacement);

      // Update the editor content
      editor?.commands.setContent(newContent, true);
      setPopupPosition(null);

      // Retrieve the existing labels from the note
      const existingLabels = note.labels || [];

      // Ensure the new label is added without duplicating
      const updatedLabels = Array.from(
        new Set([...existingLabels, labelToAdd])
      ); // Use Set to avoid duplicates

      // Update the note content and labels
      const jsonContent = editor?.getJSON() || {};

      console.log("JSON Content:", jsonContent);

      handleChangeNoteContent(jsonContent, note.title, updatedLabels);
    }
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

  const handleSearch = () => {
    setShowFind((prevShowFind) => !prevShowFind);
  };

  return (
    <div>
      <div
        className={`editor overflow-auto h-full justify-center items-start px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)]`}
      >
        <Toolbar
          toolbarVisible={toolbarVisible}
          note={note}
          noteId={note.id}
          editor={editor}
          toggleHeadingTree={toggleHeadingTree}
        />
        {headingTreeVisible && editor && (
          <div
            ref={headingTreeRef}
            className={`transition-opacity ${
              headingTreeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeadingTree />
          </div>
        )}
        <div
          className={`sm:hidden bg-white dark:bg-[#232222] px-2 fixed top-0 inset-x-0 overflow-auto h-auto w-full z-40 no-scrollbar flex justify-between ${
            notchPadding ? "pt-6" : "sm:pt-1"
          }`}
        >
          <Link
            to="/"
            className="p-2 mt-4 align-start rounded-md text-white bg-transparent cursor-pointer"
          >
            <Icons.ArrowLeftLineIcon className="border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7" />
          </Link>
          <div className="flex">
            <button
              className="p-2 mt-6 rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => {
                setFocusMode((prevFocusMode) => !prevFocusMode);
                setToolbarVisible((prevToolbarVisible) => !prevToolbarVisible);
              }}
            >
              <Icons.Focus3LineIcon
                className={`border-none ${
                  focusMode ? "text-amber-400" : "text-neutral-800"
                } dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7`}
              />
            </button>
            <button
              className="p-2 align-end mt-6 rounded-md text-white bg-transparent cursor-pointer"
              onClick={handleSearch}
            >
              {showFind ? (
                <Icons.CloseLineIcon
                  className={`border-none ${
                    focusMode ? "hidden" : "block"
                  } text-red-500 text-xl w-7 h-7`}
                />
              ) : (
                <Icons.Search2LineIcon
                  className={`border-none ${
                    focusMode ? "hidden" : "block"
                  } dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
                />
              )}
            </button>
          </div>
        </div>
        <div
          contentEditable
          onPaste={handlePaste}
          suppressContentEditableWarning
          className={`text-3xl font-bold overflow-y-scroll outline-none mt-10 ${
            isPlatform("android") ? "pt-6 sm:pt-1" : "md:pt-10s"
          }`}
          onInput={handleTitleChange}
          dangerouslySetInnerHTML={{ __html: note.title }}
        />
        <div>
          <div className="py-2 h-full w-full" id="container">
            {hashPopupPosition && (
              <BubblemenuLabel
                hashPopupPosition={hashPopupPosition}
                note={note}
                handleChangeNoteContent={handleChangeNoteContent}
                editor={editor}
                textAfterHash={textAfterHash}
                uniqueLabels={uniqueLabels}
                setHashPopupPosition={setHashPopupPosition}
                setHashPosition={setHashPosition}
                setTextAfterHash={setTextAfterHash}
                onClickLabel={handleAddLabel}
              />
            )}
            {popupPosition && (
              <BubblemenuNoteLink
                popupPosition={popupPosition}
                notes={notesList}
                onClickNote={handleClickNote}
                textAfterAt={textAfterAt}
              />
            )}
            <EditorContent
              onKeyUp={(event) =>
                handleEditorTyping(
                  event,
                  textAfterAt,
                  textAfterHash,
                  atPosition,
                  hashPosition,
                  setPopupPosition,
                  setAtPosition,
                  setTextAfterAt,
                  setHashPopupPosition,
                  setHashPosition,
                  setTextAfterHash
                )
              }
              editor={editor}
              className="overflow-hidden w-full mb-[6em] min-h-[25em] editor-content"
            />
          </div>
        </div>
        <div
          className={`sm:ml-16 ${
            showFind ? "show" : "hidden"
          } fixed px-4 w-full inset-x-0 sm:px-10 md:px-20 lg:px-60 top-20 sm:bottom-6`}
        >
          {showFind && <Find editor={editor} />}
        </div>
        <div className={`${focusMode ? "hidden" : "block"} sm:hidden`}>
          <Drawer noteId={note.id} note={note} editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default EditorComponent;
