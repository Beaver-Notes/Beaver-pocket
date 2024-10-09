import React, { useEffect, useState, useRef, useCallback } from "react";
import { Note } from "../../store/types";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Toolbar from "./Toolbar";
import { isPlatform } from "@ionic/react";
import Drawer from "./Drawer";
import Find from "./Find";
import "../../assets/css/editor.css";
import extensions from "../../lib/tiptap/index";
import CollapseHeading from "../../lib/tiptap/exts/collapse-heading";
import { Link } from "react-router-dom";
import { handleEditorTyping } from "../../utils/bubble-menu-util";
import BubblemenuNoteLink from "./BubblemenuNoteLink";
import BubblemenuLabel from "./BubblemenuLabel";
import DOMPurify from "dompurify";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";

// Icons
import Icons from "../../lib/remixicon-react";
import FloatingMenuComponent from "./Floatingmenu";
import Mousetrap from "mousetrap";
import { saveImageToFileSystem } from "../../utils/fileHandler";

type Props = {
  note: Note;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
};

function EditorComponent({ note, notesState, setNotesState }: Props) {
  const { activeNoteId, setActiveNoteId } = useNotesState();
  const { title, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState
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

  const [focusMode, setFocusMode] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
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
  const [slashPopupPosition, setSlashPopupPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [hashPosition, setHashPosition] = useState<number | null>(null);
  const [textAfterHash, setTextAfterHash] = useState<string | null>(null);
  const [slashPosition, setSlashPosition] = useState<number | null>(null);
  const [textAfterSlash, setTextAfterSlash] = useState<string | null>(null);
  const [atPosition, setAtPosition] = useState<number | null>(null);
  const [textAfterAt, setTextAfterAt] = useState<string | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    setActiveNoteId(note.id);
  }, [note.id, setActiveNoteId]);

  const exts = [...extensions];

  // Check collapsibleHeading from localStorage
  if (localStorage.getItem("collapsibleHeading") === "true") {
    exts.push(CollapseHeading);
  }
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
    if (editor) {
      editor.commands.focus();
      editorRef.current = editor; // Store editor in ref
    }
  }, [editor]);

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

  const handleKeyDownTitle = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      editorRef.current?.commands.focus(); // Focus the editor
    }
  };

  const preventKeyboardToggle = (event: any) => {
    event.preventDefault();
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
      editor?.chain().focus().toggleHighlight().run();
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
    event.preventDefault(); // Prevent default behavior of the drop event

    const items = event.dataTransfer.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Handle image files
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          // Save the image file to the filesystem
          const { imageUrl } = await saveImageToFileSystem(file, note.id);
          if (imageUrl) {
            // Insert saved image URL into the editor
            editor?.chain().setImage({ src: imageUrl }).run();
          }
        }
      }
    }
  };

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault(); // Prevent default paste behavior
    event.stopPropagation(); // Stop event bubbling to higher handlers
  
    const items = event.clipboardData.items;
    let containsImage = false; // Flag to track if there's an image
  
    // Add a space before pasting
    document.execCommand("insertText", false, " ");
  
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
  
      // Handle pasted image files only
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          // Save the image file to the filesystem
          const { imageUrl } = await saveImageToFileSystem(file, note.id);
          if (imageUrl) {
            // Insert the image and prevent the URL from being pasted
            editor?.chain().setImage({ src: imageUrl }).run();
            containsImage = true; // Mark that an image was processed
          }
        }
      }
  
      // Handle plain text, which may contain URLs, but ignore image URLs
      if (item.kind === "string" && item.type === "text/plain") {
        item.getAsString((text) => {
          // Regular expression to identify URLs that are image links (e.g., ending with image file extensions)
          const imageUrlPattern = /\.(jpeg|jpg|gif|png|svg|webp)$/i;
  
          // Split the text by spaces and filter out any image URLs
          const filteredText = text
            .split(/\s+/)
            .filter((word) => !imageUrlPattern.test(word)) // Remove image URLs
            .join(" ");
  
          // If no image was pasted, insert the filtered text
          if (!containsImage) {
            document.execCommand("insertText", false, filteredText);
          }
        });
      }
    }
  };
  
  
  return (
    <div>
      <div
        className={`editor overflow-auto h-full justify-center items-start px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)]`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Toolbar
          toolbarVisible={toolbarVisible}
          note={note}
          noteId={note.id}
          editor={editor}
        />
        <div
          className={`sm:hidden bg-white bg-opacity-95 dark:bg-[#232222] fixed inset-x-0 overflow-auto h-auto w-full z-40 no-scrollbar flex justify-between`}
        >
          <Link
            to="/"
            className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
          >
            <Icons.ArrowLeftLineIcon className="border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7" />
          </Link>
          <div className="flex">
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
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
              className="p-2 align-end rounded-md text-white bg-transparent cursor-pointer"
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
          onPaste={handleTitlePaste}
          suppressContentEditableWarning
          onTouchStart={preventKeyboardToggle}
          className={`text-3xl font-bold overflow-y-scroll outline-none ${
            isPlatform("android") ? "mt-10 sm:pt-14" : "md:pt-14"
          } ${isPlatform("ios") ? "mt-10 sm:pt-14" : "md:pt-14"}`}
          onBlur={handleTitleChange}
          onKeyDown={handleKeyDownTitle} // Add onKeyDown to handle Enter key
          dangerouslySetInnerHTML={{ __html: note.title }}
          ref={titleRef} // Attach ref to title field
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
            {popupPosition && (
              <BubblemenuNoteLink
                popupPosition={popupPosition}
                notes={notesList}
                onClickNote={handleClickNote}
                textAfterAt={textAfterAt}
              />
            )}
            {slashPopupPosition && (
              <FloatingMenuComponent
                editor={editor}
                noteId={note.id}
                slashPopupPosition={slashPopupPosition}
                slashPosition={slashPosition}
                setSlashPopupPosition={setSlashPopupPosition}
                setSlashPosition={setSlashPosition}
              />
            )}
            <EditorContent
              onPaste={handlePaste}
              onKeyUp={(event) =>
                handleEditorTyping(
                  event,
                  textAfterAt,
                  textAfterHash,
                  textAfterSlash,
                  atPosition,
                  hashPosition,
                  slashPosition,
                  setPopupPosition,
                  setAtPosition,
                  setTextAfterAt,
                  setHashPopupPosition,
                  setHashPosition,
                  setTextAfterHash,
                  setSlashPopupPosition,
                  setSlashPosition,
                  setTextAfterSlash
                )
              }
              editor={editor}
              onTouchStart={preventKeyboardToggle}
              className="prose dark:text-gray-100 max-w-none prose-indigo mb-12"
            />
          </div>
        </div>
        <div
          className={`${
            showFind ? "show" : "hidden"
          } fixed inset-x-0 sm:bottom-6 md:bottom-6 flex justify-center`}
        >
          <div className="w-full px-4 sm:px-10 md:px-20 lg:px-60">
            {showFind && <Find editor={editor} />}
          </div>
        </div>

        <div className={`${focusMode ? "hidden" : "block"} sm:hidden`}>
          <Drawer noteId={note.id} note={note} editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default EditorComponent;
