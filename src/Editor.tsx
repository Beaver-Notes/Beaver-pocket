import { useCallback, useEffect, useRef, useState } from "react";
import { Note } from "./store/types";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Bubblemenu from "./components/Editor/Bubblemenu";
import Toolbar from "./components/Editor/Toolbar";
import "./css/video.scss";
import NoteLabels from "./components/Editor/NoteLabel";
import BubleMenutable from "./components/Editor/Bubblemenutable";
import HeadingTree from "./lib/HeadingTree";
import { isPlatform } from "@ionic/react";
import Drawer from "./components/Editor/Drawer";
import Find from "./components/Editor/Find";
import extensions from "./lib/tiptap/index";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import BubblemenuNoteLink from "./components/Editor/BubblemenuNoteLink";
import DOMPurify from "dompurify";

// Icons
import Icons from "./lib/remixicon-react";

type Props = {
  note: Note;
  notesList: Note[];
  onCloseEditor: () => void;
  onChange: (content: JSONContent, title?: string) => void;
  isFullScreen?: boolean;
  title: string;
  onTitleChange: (newTitle: string) => void;
};

function NoteEditor({
  note,
  notesList,
  onChange,
  onTitleChange,
  onCloseEditor,
  isFullScreen = false,
}: Props) {
  const [localTitle, setLocalTitle] = useState<string>(note.title);

  const handleTitleChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newTitle = DOMPurify.sanitize(event.currentTarget.innerHTML);
    setLocalTitle(newTitle);
    onTitleChange(newTitle);
    onChange(editor?.getJSON() || ({} as JSONContent), newTitle);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
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

  const [focusMode, setFocusMode] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);

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

  const addPaddingTop = isPlatform("ios") ? "pt-6 sm:pt-1" : "";

  const navigate = useNavigate();

  const handleSwipe = (eventData: any) => {
    const isRightSwipe = eventData.dir === "Right";
    const isSmallSwipe = Math.abs(eventData.deltaX) < 250;

    if (isRightSwipe && isSmallSwipe) {
      eventData.event.preventDefault();
    } else if (isRightSwipe) {
      navigate(-1); // Navigate back
    }
  };

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
  });

  const [showFind, setShowFind] = useState(false);

  const handleClickNote = (note: Note) => {
    const editorContent = editor?.getHTML() || "";
    const atIndex = editorContent.lastIndexOf("@@");

    if (atIndex !== -1) {
      // Replace @@ with the link to the selected note
      const link = `<linkNote id="${note.id}" label="${note.title}"><a href="note://${note.id}" target="_blank" rel="noopener noreferrer nofollow">${note.title}</a></linkNote>`;
      const newContent =
        editorContent.substring(0, atIndex) +
        link +
        editorContent.substring(atIndex + 2);

      // Set the new content in the editor
      editor?.commands.setContent(newContent, true);
      setPopupPosition(null);
    }
  };

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

  const handleButtonClick = () => {
    setShowFind((prevShowFind) => !prevShowFind);
  };

  const [wd, setwd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  useEffect(() => {
    setwd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const handleEditorTyping = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { key } = event;
    const text = event.currentTarget.innerText;
    const atIndex = text.lastIndexOf("@");

    if (key === "@" && text[atIndex - 1] === "@") {
      // '@@' typed, show the pop-up menu
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Get the editor content area and its scroll position
        const editorContent = document.querySelector(".editor-content");
        if (editorContent) {
          const editorRect = editorContent.getBoundingClientRect();

          // Calculate the position of the pop-up menu relative to the line in the editor
          const top = rect.top - editorRect.top + editorContent.scrollTop;
          const left = rect.left - editorRect.left;

          setPopupPosition({ top, left });
        }
      }
    } else if (key === "Backspace" && text[atIndex] === "@") {
      // Delete the pop-up menu when any '@' is deleted
      setPopupPosition(null);
    }
  };

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleTyping = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Clear the previous timeout if any
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Update the typing state to true
    setIsTyping(true);

    // Set a new timeout to reset the typing state
    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 1000); // Adjust the timeout period as needed
  };

  useEffect(() => {
    // Cleanup timeout on component unmount
    return () => {
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div {...handlers}>
      <div
        className={`sm:ml-16 editor overflow-auto h-full justify-center items-start px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)] text-base`}
        onDragOver={(e) => e.preventDefault()}
      >
        <div className="hidden sm:block sm:p-12"></div>
        <Toolbar
          toolbarVisible={toolbarVisible}
          isFullScreen={isFullScreen}
          note={note}
          onCloseEditor={onCloseEditor}
          noteId={note.id}
          editor={editor}
          toggleHeadingTree={toggleHeadingTree}
        />
        {headingTreeVisible && editor && (
          <div
            ref={headingTreeRef}
            className={`transition-opacity  ${
              headingTreeVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <HeadingTree onHeadingClick={handleHeadingClick} />
          </div>
        )}
        <div
          className={`sm:hidden bg-white dark:bg-[#232222] px-2 fixed top-0 inset-x-0 overflow-auto h-auto w-full z-40 no-scrollbar flex justify-between ${addPaddingTop}`}
        >
          <button
            className="p-2 mt-4 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={onCloseEditor}
          >
            <Icons.ArrowLeftLineIcon className="border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7" />
          </button>
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
                }  dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7`}
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
                  }  text-red-500 text-xl w-7 h-7`}
                />
              ) : (
                <Icons.Search2LineIcon
                  className={`border-none ${
                    focusMode ? "hidden" : "block"
                  }  dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7`}
                />
              )}
            </button>
          </div>
        </div>
        <Bubblemenu editor={editor} />
        <BubleMenutable editor={editor} isTyping={isTyping} />
        <div
          contentEditable
          onPaste={handlePaste}
          suppressContentEditableWarning
          className="text-3xl font-bold overflow-y-scroll outline-none sm:mt-2"
          onBlur={handleTitleChange}
          dangerouslySetInnerHTML={{ __html: localTitle }}
        />
        <div>
          <NoteLabels note={note} onChange={onChange} />
          <div className="py-2 h-full w-full" id="container">
            {popupPosition && (
              <BubblemenuNoteLink
                notes={notesList}
                position={popupPosition}
                onClickNote={handleClickNote}
              />
            )}
            <EditorContent
              onKeyUp={handleEditorTyping}
              editor={editor}
              onKeyDown={handleTyping}
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
        <div className={` ${focusMode ? "hidden" : "block"}  sm:hidden`}>
          <Drawer noteId={note.id} note={note} editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default NoteEditor;
