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
    menuItems: {
      paragraphLabel: "menuItems.paragraphLabel",
      heading1Label: "menuItems.heading1Label",
      heading2Label: "menuItems.heading2Label",
      bulletListLabel: "menuItems.bulletListLabel",
      orderedListLabel: "menuItems.orderedListLabel",
      checklistLabel: "menuItems.checklistLabel",
      quoteLabel: "menuItems.quoteLabel",
      codeLabel: "menuItems.codeLabel",
      embedLabel: "menuItems.embedLabel",
      tableLabel: "menuItems.tableLabel",
      drawingBlockLabel: "menuItems.drawingBlockLabel",
      imageLabel: "menuItems.imageLabel",
      imageDescription: "menuItems.imageDescription",
    },
    accessibility: {
      insertRowAfter: "accessibility.insertRowAfter",
      insertRowBefore: "accessibility.insertRowBefore",
      deleteRow: "accessibility.deleteRow",
      insertColumnLeft: "accessibility.insertColumnLeft",
      insertColumnRight: "accessibility.insertColumnRight",
      deleteColumn: "accessibility.deleteColumn",
      deleteTable: "accessibility.deleteTable",
      bold: "accessibility.bold",
      italic: "accessibility.italic",
      underline: "accessibility.underline",
      strikethrough: "accessibility.strikethrough",
      highlight: "accessibility.highlight",
      highlightOptions: "accessibility.highlightOptions",
      removehighlight: "accessibility.removeHighlight",
      orange: "accessibility.orange",
      yellow: "accessibility.yellow",
      green: "accessibility.green",
      blue: "accessibility.blue",
      purple: "accessibility.purple",
      pink: "accessibility.pink",
      red: "accessibility.red",
      setColor: "accessibility.setColor",
      subscript: "accessibility.subscript",
      superscript: "accessibility.superscript",
      link: "accessibility.link",
      fileUploadInput: "accessibility.fileUploadInput",
      fileUpload: "accessibility.fileUpload",
      processing: "accessibility.processing",
      startRecording: "accessibility.startRecording",
      stopRecording: "accessibility.stopRecording",
      videoUpload: "accessibility.videoUpload"
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

  const colorsTranslations = [
    translations.accessibility.orange,
    translations.accessibility.yellow,
    translations.accessibility.green,
    translations.accessibility.blue,
    translations.accessibility.purple,
    translations.accessibility.pink,
    translations.accessibility.red,
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

  const formatting = [
    {
      label: translations.menuItems.paragraphLabel,
      active: "Pragraph",
      icon: (
        <icons.ParagraphIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().setParagraph().run(),
    },
    {
      label: translations.menuItems.heading1Label,
      active: "heading",
      level: 1,
      icon: (
        <icons.Heading1Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: translations.menuItems.heading2Label,
      active: "heading",
      level: 2,
      icon: (
        <icons.Heading2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ];

  const lists = [
    {
      active: "bulletList",
      label: translations.menuItems.bulletListLabel,
      icon: (
        <icons.ListUnorderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: "orderedList",
      label: translations.menuItems.orderedListLabel,
      icon: (
        <icons.ListOrderedIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: "TaskList",
      label: translations.menuItems.bulletListLabel,
      icon: (
        <icons.ListCheck2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

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
          {formatting.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase(), item.level)
                  ? "text-amber-400"
                  : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
              } cursor-pointer flex-1 pl-3`}
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          <button
            className={`p-1 ${
              editor?.isActive("blockquote")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            aria-label={translations.menuItems.quoteLabel}
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
            aria-label={translations.menuItems.codeLabel}
          >
            <icons.CodeBoxLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>

          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menuItems.embedLabel}
          >
            <icons.PagesLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
            translations={translations}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
            translations={translations}
          />
          <AudioUploadComponent
            onAudioUpload={handleaudioUpload}
            noteId={noteId}
            translations={translations}
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
            aria-label={translations.menuItems.tableLabel}
          >
            <icons.Table2Icon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          {lists.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase())
                  ? "text-amber-400"
                  : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
              } cursor-pointer flex-1 pl-3`}
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
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
            aria-label={translations.accessibility.insertRowAfter}
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
            aria-label={translations.accessibility.insertRowBefore}
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
            aria-label={translations.accessibility.deleteRow}
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
            aria-label={translations.accessibility.insertColumnLeft}
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
            aria-label={translations.accessibility.insertColumnRight}
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
            aria-label={translations.accessibility.deleteColumn}
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
            aria-label={translations.menuItems.drawingBlockLabel}
          >
            <icons.Brush2Fill className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menuItems.embedLabel}
          >
            <icons.PagesLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
            translations={translations}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteTable().run()}
            aria-label={translations.accessibility.deleteTable}
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
          {formatting.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase(), item.level)
                  ? "text-amber-400"
                  : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
              } cursor-pointer flex-1 pl-3`}
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          <button
            className={`p-1 ${
              editor?.isActive("bold")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label={translations.accessibility.bold}
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
            aria-label={translations.accessibility.italic}
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
            aria-label={translations.accessibility.underline}
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
            aria-label={translations.accessibility.strikethrough}
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
            aria-label={translations.accessibility.highlight}
          >
            <icons.MarkPenLineIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          {isDropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className="absolute p-2 bg-white dark:bg-[#353333] shadow-lg rounded-md grid grid-cols-4 gap-2"
                role="menu"
                aria-label={translations.accessibility.highlightOptions}
                style={{
                  top: dropdownPosition.top,
                  left: dropdownPosition.left,
                  zIndex: 1000,
                }}
              >
                <button
                  aria-label={translations.accessibility.removehighlight}
                  role="menuitem"
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
                {colors.map((color, index) => (
                  <button
                    key={index}
                    role="menuitem"
                    aria-label={`${translations.accessibility.setColor} ${colorsTranslations[index]}`}
                    className={`w-8 h-8 cursor-pointer ${color}`}
                    onClick={() => {
                      setHighlightColor(color);
                      setDropdownOpen(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        setHighlightColor(color);
                        setDropdownOpen(false);
                      }
                    }}
                  />
                ))}
              </div>,
              document.body
            )}

          {lists.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase())
                  ? "text-amber-400"
                  : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
              } cursor-pointer flex-1 pl-3`}
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          <button
            className={`p-1 ${
              editor?.isActive("subscript")
                ? "text-amber-400"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSubscript()}
            aria-label={translations.accessibility.subscript}
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
            aria-label={translations.accessibility.superscript}
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
            aria-label={translations.accessibility.link}
          >
            <icons.LinkIcon className="border-none text-xl text-neutral-700 dark:text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
