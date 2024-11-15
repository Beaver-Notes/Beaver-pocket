import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../../store/types";
import { EditorContent, useEditor, JSONContent } from "@tiptap/react";
import Toolbar from "./Toolbar";
import { isPlatform } from "@ionic/react";
import Drawer from "./Drawer";
import Find from "./Find";
import "../../assets/css/editor.css";
import extensions from "../../lib/tiptap/index";
import EditorSuggestion from "../../lib/tiptap/exts/suggestions/EditorSuggestion";
import NoteLinkExtension from "../../lib/tiptap/exts/suggestions/NoteLinkSuggestion";
import NoteLabelSuggestion from "../../lib/tiptap/exts/suggestions/NoteLabelSuggestion";
import DOMPurify from "dompurify";
import useNoteEditor from "../../store/useNoteActions";
import { useNotesState } from "../../store/Activenote";
import Icons from "../../lib/remixicon-react";
import Mousetrap from "mousetrap";
import getMimeType from "../../utils/mimetype";
import { saveImageToFileSystem } from "../../utils/fileHandler";
import { saveFileToFileSystem } from "../../utils/fileHandler";
import { useExportDav } from "../../utils/Webdav/webDavUtil";

type Props = {
  note: Note;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
};

function EditorComponent({ note, notesState, setNotesState }: Props) {
  const { activeNoteId, setActiveNoteId } = useNotesState();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const findRef = useRef<HTMLDivElement | null>(null);
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
    EditorSuggestion.configure({
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

  const handleshowFind = () => {
    if (buttonRef.current) {
      setShowFind(true);
    }
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
      editor?.chain().focus().setHighlight({color: "bg-yellow-200 dark:bg-yellow-100"}).run();
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

  const handlePaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const items = event.clipboardData.items;
    document.execCommand("insertText", false, " "); // Add space before pasting

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.kind === "file") {
        // Handle pasted file (like from file manager)
        const file = item.getAsFile();
        if (file) {
          await handleFileByType(file); // Handle file processing as usual
        }
      } else if (item.kind === "string" && item.type === "text/html") {
        // Handle HTML content (like pasting from a web page)
        item.getAsString(async (htmlContent: string) => {
          const imageUrl = extractImageUrlFromHtml(htmlContent);
          if (imageUrl) {
            editor?.chain().setImage({ src: imageUrl }).run(); // Insert image from URL
          } else {
            // If no image URL, fallback to pasting the content as plain HTML/text
            editor?.chain().insertContent(htmlContent).run();
          }
        });
      } else if (item.kind === "string" && item.type === "text/plain") {
        // Handle plain text or URLs
        item.getAsString(async (textContent: string) => {
          if (isBase64Image(textContent)) {
            // If the content is a base64 image, insert it directly
            editor?.chain().setImage({ src: textContent }).run();
          } else if (isValidUrl(textContent)) {
            // If it's a valid URL, check if it's an image URL
            if (isImageUrl(textContent)) {
              editor?.chain().setImage({ src: textContent }).run(); // Insert image
            } else {
              // If it's not an image URL, insert it as plain text or link
              editor?.chain().insertContent(textContent).run();
            }
          } else {
            // If neither base64 nor a valid URL, insert it as plain text
            editor?.chain().insertContent(textContent).run();
          }
        });
      }
    }
  };

  // Helper to check if the pasted content is a base64 image
  const isBase64Image = (str: string): boolean => {
    return str.startsWith("data:image/") && str.includes("base64,");
  };

  // Helper to extract image URL from pasted HTML content
  const extractImageUrlFromHtml = (htmlContent: string): string | null => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const imgTag = tempDiv.querySelector("img");

    return imgTag ? imgTag.src : null;
  };

  // Helper to validate if a string is a valid URL
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Helper to check if a URL is an image URL (jpg, png, gif, etc.)
  const isImageUrl = (url: string): boolean => {
    const imagePattern = /\.(jpeg|jpg|gif|png|bmp|webp)$/i;
    return imagePattern.test(url);
  };

  const processItems = async (items: DataTransferItemList) => {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          const fileType = getMimeType(file.name);
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

  const goBack = () => {
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      const dropboxExport = new CustomEvent("dropboxExport");
      document.dispatchEvent(dropboxExport);
    } else if (syncValue === "webdav") {
      const { exportdata } = useExportDav();
      exportdata();
    } else if (syncValue === "iCloud") {
      const iCloudExport = new CustomEvent("iCloudExport");
      document.dispatchEvent(iCloudExport);
    } else if (syncValue === "googledrive") {
      const driveExport = new CustomEvent("driveExport");
      document.dispatchEvent(driveExport);
    } else if (syncValue === "onedrive") {
      const onedriveExport = new CustomEvent("onedriveExport");
      document.dispatchEvent(onedriveExport);
    }
    navigate("/");
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
        <Toolbar note={note} noteId={note.id} editor={editor} />
        <div
          className={`sm:hidden bg-white bg-opacity-95 dark:bg-[#232222] fixed inset-x-0 overflow-auto h-auto w-full z-40 no-scrollbar flex justify-between`}
        >
          <button
            className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={goBack}
          >
            <Icons.ArrowLeftLineIcon className="border-none dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7" />
          </button>
          <div className="flex">
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={() => setFocusMode((prevFocusMode) => !prevFocusMode)}
            >
              <Icons.Focus3LineIcon
                className={`border-none ${
                  focusMode ? "text-amber-400" : "text-neutral-800"
                } dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7`}
              />
            </button>

            <button
              className="p-2 align-end rounded-md text-white bg-transparent cursor-pointer"
              onClick={handleshowFind}
              ref={buttonRef}
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
            <div
              ref={findRef}
              className={`fixed ${showFind ? "block" : "hidden"}`}
              style={{
                zIndex: 80,
              }}
            >
              <div className="fixed inset-x-0 flex justify-center">
                <div className="w-full bg-white px-4 sm:px-10 md:px-20 lg:px-60">
                  <Find editor={editor} setShowFind={setShowFind} />
                </div>
              </div>
            </div>
          )}
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
            <EditorContent
              onPaste={handlePaste}
              editor={editor}
              onTouchStart={preventKeyboardToggle}
              className="prose dark:text-neutral-100 max-w-none prose-indigo mb-12"
            />
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
