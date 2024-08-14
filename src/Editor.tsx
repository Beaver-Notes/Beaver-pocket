import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "./store/types";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Toolbar from "./components/Editor/Toolbar";
import HeadingTree from "./lib/HeadingTree";
import { isPlatform } from "@ionic/react";
import Drawer from "./components/Editor/Drawer";
import Find from "./components/Editor/Find";
import extensions from "./lib/tiptap/index";
import { useNavigate, Link } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import BubblemenuNoteLink from "./components/Editor/BubblemenuNoteLink";
import BubblemenuLabel from "./components/Editor/BubblemenuLabel";
import { hasNotch } from "./utils/detectNotch";
import DOMPurify from "dompurify";
import useNoteEditor from "./store/useNoteActions";
import { useNotesState } from "./store/Activenote";
import { useSaveNote } from "./store/notes";

// Icons
import Icons from "./lib/remixicon-react";

type Props = {
  note: Note;
};

function Editor({ note }: Props) {
  const { notesState, setNotesState, activeNoteId, setActiveNoteId } =
    useNotesState();
  const { saveNote } = useSaveNote(setNotesState);
  const { title, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState,
    saveNote
  );
  const uniqueLabels = Array.from(
    new Set(Object.values(notesState).flatMap((note) => note.labels))
  );
  const [searchQuery] = useState<string>("");
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
  }, [notesState]);
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);
  const [sortingOption] = useState("updatedAt");
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
  const [TextAfterHash, setTextAfterHash] = useState<string | null>(null);
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

  const navigate = useNavigate();
  const editor = useEditor(
    {
      extensions,
      content: note.content,
      editorProps: {
        attributes: {
          class: "overflow-y-hidden outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        const editorContent = editor.getJSON();
        handleChangeNoteContent(editorContent, title);
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
    handleChangeNoteContent(editor?.getJSON() || ({} as JSONContent), newTitle);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleHeadingClick = (heading: string) => {
    console.log("Heading clicked:", heading);
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

  const handleSwipe = (eventData: any) => {
    const isRightSwipe = eventData.dir === "Right";
    const isSmallSwipe = Math.abs(eventData.deltaX) < 250;

    if (isRightSwipe && isSmallSwipe) {
      eventData.event.preventDefault();
    } else if (isRightSwipe) {
      navigate(-1); // Navigate back
    }
  };

  const handlers = useSwipeable({ onSwiped: handleSwipe });

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
      const link = `<linkNote id="${note.id}" label="${note.title}"><a href="note://${note.id}" target="_blank" rel="noopener noreferrer nofollow">${note.title}</a></linkNote>`;
      const newContent =
        editorContent.substring(0, atIndex) +
        link +
        editorContent.substring(atIndex + 2);

      editor?.commands.setContent(newContent, true);
      setPopupPosition(null);
    }
  };

  const handleButtonClick = () => {
    setShowFind((prevShowFind) => !prevShowFind);
  };

  const handleEditorTyping = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const text = event.currentTarget.innerText.trim(); // Trimmed the text to avoid unnecessary whitespace

    // Return early if there's no text
    if (!text) {
      setPopupPosition(null);
      setAtPosition(null);
      setTextAfterAt("");
      setHashPopupPosition(null);
      setHashPosition(null);
      setTextAfterHash("");
      return;
    }

    const atIndex = text.lastIndexOf("@@");
    const hashIndex = text.lastIndexOf("#");

    // Function to calculate and set popup position
    const setPosition = (trigger: string, index: number) => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0).cloneRange();
        const rect = range.getBoundingClientRect();
        const editorContent = document.querySelector(".editor-content");

        if (editorContent) {
          const top = rect.bottom + window.scrollY; // Adjusted top position relative to the viewport
          const left = rect.left + window.scrollX; // Adjusted left position relative to the viewport

          console.log(`Popup position for ${trigger}:`, { top, left });

          if (trigger === "@@") {
            setPopupPosition({ top, left });
            setAtPosition(index); // Set the position of '@@'
            setTextAfterAt(""); // Initialize textAfterAt to an empty string
          } else if (trigger === "#") {
            setHashPopupPosition({ top, left });
            setHashPosition(index); // Set the position of '#'
            setTextAfterHash(""); // Initialize textAfterHash to an empty string
          }
        }
      }
    };

    // Handle the @@ trigger
    if (
      key === "@" &&
      atIndex !== -1 &&
      text[atIndex] === "@" &&
      text[atIndex + 1] === "@"
    ) {
      setPosition("@@", atIndex);
    } else if (atPosition !== null) {
      if (
        key === " " ||
        key === "Enter" ||
        (key === "Backspace" && atIndex === -1)
      ) {
        setPopupPosition(null); // Close popup
        setAtPosition(null); // Reset position
        setTextAfterAt(""); // Clear textAfterAt
      } else {
        // Ensure there's no space or newline between @@ and the text
        const textAfterAt = text.substring(atPosition + 2).split(/\s/)[0];
        if (textAfterAt) {
          setTextAfterAt(textAfterAt); // Set textAfterAt
          console.log("Text after @@:", textAfterAt);
        }
      }
    }

    // Handle the # trigger
    if (key === "#" && text[hashIndex] === "#" && text[hashIndex + 1] !== " ") {
      setPosition("#", hashIndex);
    } else if (hashPosition !== null) {
      if (
        key === " " ||
        key === "Enter" ||
        (key === "Backspace" && hashIndex === -1)
      ) {
        setHashPopupPosition(null); // Close popup when '#' is deleted or space is added
        setHashPosition(null); // Reset position
        setTextAfterHash(""); // Clear textAfterHash
      } else {
        // Ensure there's no space or newline between # and the text
        const textAfterHash = text.substring(hashPosition + 1).split(/\s/)[0];
        if (textAfterHash) {
          setTextAfterHash(textAfterHash); // Set textAfterHash
          console.log("Text after #:", textAfterHash);
        }
      }
    }

    // Close popups if @@ or # are deleted
    if (key === "Backspace") {
      if (text.indexOf("@@") === -1) {
        setPopupPosition(null);
        setAtPosition(null); // Reset position if '@@' is deleted
        setTextAfterAt(""); // Clear textAfterAt
      }

      if (text.indexOf("#") === -1) {
        setHashPopupPosition(null);
        setHashPosition(null); // Reset position if '#' is deleted
        setTextAfterHash(""); // Clear textAfterHash
      }
    }
  };

  return (
    <div {...handlers}>
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
            <HeadingTree onHeadingClick={handleHeadingClick} />
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
              onClick={handleButtonClick}
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
                textAfterHash={TextAfterHash}
                uniqueLabels={uniqueLabels}
                setHashPopupPosition={setHashPopupPosition}
                setHashPosition={setHashPosition}
                setTextAfterHash={setTextAfterHash}
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
              onKeyUp={handleEditorTyping}
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

export default Editor;
