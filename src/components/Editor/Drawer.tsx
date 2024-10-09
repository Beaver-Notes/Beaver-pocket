import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import ImageUploadComponent from "./ImageUpload";
import FileUploadComponent from "./FileUpload";
import AudioUploadComponent from "./AudioUpload";
import VideoUploadComponent from "./VideoUpload";
import icons from "../../lib/remixicon-react";
import { Keyboard } from "@capacitor/keyboard";

interface DrawerProps {
  note: Note;
  noteId: string;
  editor: Editor | null;
}

const Drawer: React.FC<DrawerProps> = ({ editor, noteId }) => {
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null); // Reference to the trigger button
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editor.embedUrl",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  const handlefileUpload = (fileUrl: string, fileName: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setFileEmbed(fileUrl, fileName).run();
    }
  };

  const handlevideoUpload = (fileUrl: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setVideo(fileUrl).run();
    }
  };

  const handleaudioUpload = (fileUrl: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setAudio(fileUrl).run();
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

  const handleAddIframe = () => {
    const videoUrl = prompt(`${translations.editor.embedUrl}`);
    if (!videoUrl || videoUrl.trim() === "") {
      return;
    }

    let formattedUrl = videoUrl.trim();
    if (formattedUrl.includes("youtube.com/watch?v=")) {
      let videoId = formattedUrl.split("v=")[1];
      const ampersandPosition = videoId.indexOf("&");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (formattedUrl.includes("youtu.be/")) {
      let videoId = formattedUrl.split("youtu.be/")[1];
      const ampersandPosition = videoId.indexOf("?");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    editor?.chain().focus().setIframe({ src: formattedUrl }).run();
  };

  const isTableCellActive = editor?.isActive("tableCell");
  const isTableHeaderActive = editor?.isActive("tableHeader");

  const isTableActive = isTableCellActive || isTableHeaderActive;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    }) as any;

    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    }) as any;

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const [isTextSelected, setIsTextSelected] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateTextSelection = () => {
      const { from, to } = editor.state.selection;
      setIsTextSelected(from !== to);
    };

    editor.on("selectionUpdate", updateTextSelection);

    return () => {
      editor.off("selectionUpdate", updateTextSelection);
    };
  }, [editor]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
  };

  const colors = [
    "bg-orange-200 dark:bg-orange-40",
    "bg-yellow-200 dark:bg-yellow-100",
    "bg-green-200 dark:bg-green-100",
    "bg-blue-200 dark:bg-blue-100",
    "bg-purple-200 dark:bg-purple-100",
    "bg-pink-200 dark:bg-pink-100",
    "bg-red-200 dark:bg-red-100",
  ];

  // Toggle dropdown visibility
  const toggleDropdown = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect(); // Get the button's position
      const dropdownHeight = 80; // Adjust based on your dropdown height
      let top = rect.top + window.scrollY - dropdownHeight;

      // Adjust top if the dropdown goes off the top of the viewport
      if (top < 0) {
        top = rect.bottom + window.scrollY; // Position below if above would go off-screen
      }

      // Check for right overflow
      let left = rect.left + window.scrollX;
      const dropdownWidth = 200; // Set a fixed width for your dropdown

      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth; // Position it to the left if it goes off the screen
      }

      setDropdownPosition({ top, left });
    }
    setDropdownOpen(!isDropdownOpen);
  };

  // Close the dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle setting highlight color
  const setHighlightColor = (color: string) => {
    editor?.chain().focus().setHighlight({ color }).run();
    setDropdownOpen(false); // Close dropdown after color is selected
  };

  return (
    <div
      className={`drawer sm:hidden shadow-t-md block bottom-0 fixed left-0 right-0 ${
        isKeyboardVisible
          ? "bg-[#F8F8F7] dark:bg-[#2D2C2C]"
          : "bg-white dark:bg-[#232222] p-1 pb-2"
      } cursor-grab overflow-y-auto transition-height duration-200 ease-in-out`}
      style={{ maxHeight: "50vh" }}
    >
      <div className="align-center items-center max-auto flex justify-center">
        <div
          className={`flex p-2 w-full space-x-2 ${
            isTableActive ? "hidden" : "block"
          } ${isTextSelected ? "hidden" : "block"}`}
        >
          {/* Adding margin before the first button */}
          <div className="flex-1" />
          <button
            className={`p-1 ${
              editor?.isActive("paragraph")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pl-3`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 1 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 2 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("blockquote")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <icons.DoubleQuotesLIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("codeBlock")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <icons.CodeBoxLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>

          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
          >
            <icons.PagesLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
          />
          <AudioUploadComponent
            onAudioUpload={handleaudioUpload}
            noteId={noteId}
          />
          {/* List and Table Options */}
          <button
            className={`p-1 ${
              editor?.isActive("table")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.commands.insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
              })
            }
          >
            <icons.Table2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("bulletList")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <icons.ListUnorderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("orderedList")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <icons.ListOrderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <icons.ListCheck2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
        <div
          className={`flex p-2 w-full space-x-2 ${
            isTableActive ? "block" : "hidden"
          } ${isTextSelected ? "hidden" : "block"}`}
        >
          <div className="flex-1" />
          {/* Table */}
          <button
            className="p-1 text-neutral-700 dark:text-[color:var(--selected-dark-text)] cursor-pointer flex-1 pl-3"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            <icons.InsertRowBottomIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 1 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowBefore().run()}
          >
            <icons.InsertRowTopIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 2 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            <icons.DeleteRow className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("blockquote")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
          >
            <icons.InsertColumnLeftIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("codeBlock")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            <icons.InsertColumnRightIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            <icons.DeleteColumn className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
          >
            <icons.Brush2Fill className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
          >
            <icons.PagesLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            <icons.DeleteBinLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
        <div
          className={`flex p-2 w-full space-x-2 ${
            isTextSelected ? "block" : "hidden"
          }`}
        >
          <div className="flex-1" />
          <button
            className={`p-1 ${
              editor?.isActive("paragraph")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 1 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 2 })
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("bold")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <icons.BoldIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("italic")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <icons.ItalicIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("underline")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <icons.UnderlineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("strike")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <icons.StrikethroughIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            ref={buttonRef}
            className={`p-1 ${
              editor?.isActive("highlight")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={toggleDropdown}
          >
            <icons.MarkPenLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          {isDropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className="absolute p-2 bg-white dark:bg-[#353333] shadow-lg rounded-md grid grid-cols-4 gap-2"
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  zIndex: 1000,
                }}
              >
                {/* Option to remove highlight */}
                <button
                  className={
                    editor?.isActive("highlight")
                      ? "rounded-md text-amber-400 cursor-pointer"
                      : "rounded-md bg-transparent cursor-pointer"
                  }
                  onClick={() => {
                    editor?.chain().focus().unsetHighlight().run();
                    setDropdownOpen(false); // Close dropdown after removing highlight
                  }}
                >
                  <icons.CloseLineIcon
                    className={
                      editor?.isActive("highlight")
                        ? "border-none text-amber-400 text-xl w-8 h-8"
                        : "border-none text-neutral-800 dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8"
                    }
                  />
                </button>
                {/* Color options */}
                {colors.map((color, index) => (
                  <button
                    key={index}
                    className={`w-8 h-8 cursor-pointer ${color}`}
                    onClick={() => setHighlightColor(color)}
                  />
                ))}
              </div>,
              document.body // Mount the dropdown in the document body
            )}
          <button
            className={`p-1 ${
              editor?.isActive("bulletList")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <icons.ListUnorderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("orderedList")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <icons.ListOrderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <icons.ListCheck2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("subscript")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSubscript()}
          >
            <icons.SubscriptIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("superscript")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSuperscript()}
          >
            <icons.SuperscriptIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("highlight")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={setLink}
          >
            <icons.LinkIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
