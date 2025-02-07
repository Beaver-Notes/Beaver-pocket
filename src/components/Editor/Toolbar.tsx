import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import icons from "../../lib/remixicon-react";
import ImageUploadComponent from "./ImageUpload";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import FileUploadComponent from "./FileUpload";
import AudioUploadComponent from "./AudioUpload";
import VideoUploadComponent from "./VideoUpload";
import { useNavigate } from "react-router-dom";
import Mousetrap from "mousetrap";
import { useSyncDav } from "../../utils/Webdav/webDavUtil";
import Find from "./Find";
import { useDropboxSync } from "../../utils/Dropbox/DropboxUtil";
import { useOnedriveSync } from "../../utils/Onedrive/oneDriveUtil";
import { useExportiCloud } from "../../utils/iCloud/iCloudUtil";
import { useDriveSync } from "../../utils/Google Drive/GDriveUtil";

interface ToolbarProps {
  note: Note;
  noteId: string;
  editor: Editor | null;
  openDialog: any;
  toggleFocusMode: any;
  focusMode: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  noteId,
  openDialog,
  toggleFocusMode,
  focusMode,
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [isMoreOpen, setMoreOpen] = useState<boolean>(false);
  const [showFind, setShowFind] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [morePosition, setMorePosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const [FindPosition, setFindPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const FindRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  //Sync
  const { syncDropBox } = useDropboxSync();
  const { syncDav } = useSyncDav();
  const { syncOneDrive } = useOnedriveSync();
  const { exportdata: SyncIcloud } = useExportiCloud();
  const { syncGdrive } = useDriveSync();

  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editor.embedUrl",
      share: "editor.share",
      ReadingMode: "editor.ReadingMode",
      searchPage: "editor.searchPage",
      deleteTable: "editor.deleteTable",
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
      drawLabel: "menuItems.drawLabel",
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
      searchContent: "accessibility.searchContent",
      back: "accessibility.back",
      videoUpload: "accessibility.videoUpload",
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

  const isTableCellActive = editor?.isActive("tableCell");
  const isTableHeaderActive = editor?.isActive("tableHeader");

  const isTableActive = isTableCellActive || isTableHeaderActive;

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

  const handleMouseDown = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
  };

  const handleshowFind = () => {
    if (searchRef.current) {
      const rect = searchRef.current.getBoundingClientRect();
      const dropdownHeight = 120;
      let top = rect.top + window.scrollY - dropdownHeight;

      if (top < 0) {
        top = rect.bottom + window.scrollY;
      }

      // Check for right overflow
      let left = rect.left + window.scrollX;
      const dropdownWidth = 200;

      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth;
      }

      setFindPosition({ top, left });
    }
    setShowFind(!isDropdownOpen);
  };

  useEffect(() => {
    Mousetrap.bind("esc", (e) => {
      e.preventDefault();
      setShowFind(false);
    });

    Mousetrap.bind("mod+backspace", (e) => {
      e.preventDefault();
      setShowFind(false);
    });
    return () => {
      Mousetrap.unbind("esc");
      Mousetrap.unbind("mod+backspace");
    };
  }, []);

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
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      }); // Set dropdown position relative to button
    }
    setDropdownOpen(!isDropdownOpen);
  };

  // Toggle dropdown visibility
  const toggleMore = () => {
    if (moreRef.current) {
      const rect = moreRef.current.getBoundingClientRect(); // Get the button's position
      setMorePosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      }); // Set dropdown position relative to button
    }
    setMoreOpen(!isMoreOpen);
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

  const goBack = () => {
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      syncDropBox();
    } else if (syncValue === "webdav") {
      syncDav();
    } else if (syncValue === "iCloud") {
      SyncIcloud();
    } else if (syncValue === "googledrive") {
      syncGdrive();
    } else if (syncValue === "onedrive") {
      syncOneDrive();
    }
    navigate("/");
  };

  const draw = [
    {
      label: translations.menuItems.drawLabel,
      active: "paper",
      icon: <icons.Brush2Fill className="border-none text-xl w-7 h-7" />,
      action: (editor: any) => editor?.chain().focus().insertPaper().run(),
    },
  ];

  const back = [
    {
      label: translations.accessibility.back,
      icon: <icons.ArrowLeftLineIcon className="border-none text-xl w-7 h-7" />,
      action: goBack,
    },
  ];

  return (
    <div
      className={`print:hidden drawer hidden sm:block fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] overflow-auto dark:text-neutral-50 mx-2 transition ${
        focusMode ? "opacity-0 hover:opacity-100" : ""
      }`}
    >
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex items-center justify-center border-b dark:border-b-neutral-600">
          {/* Back button */}
          <div>
            {back.map((item) => (
              <button
                key={item.label}
                className="p-1 dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => item.action()}
                aria-label={item.label}
              >
                {item.icon}
              </button>
            ))}
          </div>
          <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />
          <button
            className={
              editor?.isActive("paragraph")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().setParagraph().run()}
            aria-label={translations.menuItems.paragraphLabel}
          >
            <icons.ParagraphIcon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
            aria-label={translations.menuItems.heading1Label}
          >
            <icons.Heading1Icon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            aria-label={translations.menuItems.heading2Label}
          >
            <icons.Heading2Icon className="border-none text-xl w-7 h-7" />
          </button>
          <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />
          <button
            className={
              editor?.isActive("bold")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label={translations.accessibility.bold}
          >
            <icons.BoldIcon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label={translations.accessibility.italic}
          >
            <icons.ItalicIcon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label={translations.accessibility.underline}
          >
            <icons.UnderlineIcon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            aria-label={translations.accessibility.strikethrough}
          >
            <icons.StrikethroughIcon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            ref={buttonRef}
            className={
              editor?.isActive("highlight")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
            onMouseDown={handleMouseDown}
            onClick={toggleDropdown}
            aria-label={translations.accessibility.highlight}
          >
            <icons.MarkPenLineIcon className="border-none text-xl w-7 h-7" />
          </button>
          {isDropdownOpen &&
            createPortal(
              <div
                ref={dropdownRef}
                className="absolute p-1 bg-white dark: shadow-lg rounded-md grid grid-cols-4"
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
                      ? "rounded-md text-primary cursor-pointer"
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
                        ? "border-none text-primary text-xl w-7 h-7"
                        : "border-none text-neutral-800 dark:dark:text-[color:var(--selected-dark-text)] text-neutral-800 text-xl w-7 h-7"
                    }
                  />
                </button>
                {/* Color options */}
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
              document.body // Mount the dropdown in the document body
            )}
          {isTableActive && !isTextSelected && (
            <>
              <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />{" "}
              <button
                className="p-1 rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                aria-label={translations.accessibility.insertRowAfter}
              >
                <icons.InsertRowBottomIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className="p-1 hidden sm:block sm:align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().addRowBefore().run()}
                aria-label={translations.accessibility.insertRowBefore}
              >
                <icons.InsertRowTopIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className="p-1 hidden sm:block sm:align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().deleteRow().run()}
                aria-label={translations.accessibility.deleteRow}
              >
                <icons.DeleteRow className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className="p-1 hidden sm:block sm:align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().addColumnBefore().run()}
                aria-label={translations.accessibility.insertColumnLeft}
              >
                <icons.InsertColumnLeftIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className="p-1 hidden sm:block sm:align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                aria-label={translations.accessibility.insertColumnRight}
              >
                <icons.InsertColumnRightIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className="p-1 hidden sm:block sm:align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                aria-label={translations.accessibility.deleteColumn}
              >
                <icons.DeleteColumn className="border-none text-xl w-7 h-7" />
              </button>
            </>
          )}
          {!isTableActive && (
            <>
              <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />{" "}
              <button
                className={
                  editor?.isActive("bulletList")
                    ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                    : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                }
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                aria-label={translations.menuItems.bulletListLabel}
              >
                <icons.ListUnorderedIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("orderedList")
                    ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                    : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                }
                onMouseDown={handleMouseDown}
                onClick={() =>
                  editor?.chain().focus().toggleOrderedList().run()
                }
                aria-label={translations.menuItems.orderedListLabel}
              >
                <icons.ListOrderedIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("TaskList")
                    ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                    : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                }
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
                aria-label={translations.menuItems.bulletListLabel}
              >
                <icons.ListCheck2Icon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("blockquote")
                    ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                    : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                }
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                aria-label={translations.menuItems.quoteLabel}
              >
                <icons.DoubleQuotesLIcon className="border-none text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("codeBlock")
                    ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                    : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                }
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
                aria-label={translations.menuItems.codeLabel}
              >
                <icons.CodeBoxLineIcon className="border-none text-xl w-7 h-7" />
              </button>
            </>
          )}
          <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
            translations={translations}
          />{" "}
          <AudioUploadComponent
            onAudioUpload={handleaudioUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={`p-1 ${
              editor?.isActive("link")
                ? "p-1 rounded-md text-primary  cursor-pointer"
                : "p-1 rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
            }`}
            onMouseDown={handleMouseDown}
            onClick={setLink}
            aria-label={translations.accessibility.link}
          >
            <icons.LinkIcon className="border-none text-xl w-7 h-7" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={
              editor?.isActive("table")
                ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
            }
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
            <icons.Table2Icon className="border-none text-xl w-7 h-7" />
          </button>
          <button
            ref={moreRef}
            className={
              "p-1 rounded-md text-neutral-800 dark:text-[color:var(--selected-dark-text)]  hoverable cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={toggleMore}
            aria-label={translations.accessibility.highlight}
          >
            <icons.MoreLineIcon className="border-none text-xl w-7 h-7" />
          </button>
          {isMoreOpen &&
            createPortal(
              <div
                ref={moreDropdownRef}
                className="absolute p-1 bg-white dark: shadow-lg rounded-md flex"
                style={{
                  top: morePosition.top,
                  left: morePosition.left,
                  zIndex: 1000,
                }}
              >
                <VideoUploadComponent
                  onVideoUpload={handlevideoUpload}
                  noteId={noteId}
                  translations={translations}
                />
                <button
                  className={`p-1 ${
                    editor?.isActive("Embed")
                      ? "p-1 rounded-md text-primary  cursor-pointer"
                      : "p-1 rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
                  } cursor-pointer flex-1`}
                  onMouseDown={handleMouseDown}
                  onClick={handleAddIframe}
                  aria-label={translations.menuItems.embedLabel}
                >
                  <icons.PagesLineIcon className="border-none text-xl w-7 h-7" />
                </button>
                {draw.map((item) => (
                  <button
                    className={
                      editor?.isActive(item.active.toLowerCase())
                        ? "p-1 rounded-md text-primary hoverable cursor-pointer"
                        : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
                    }
                    onMouseDown={handleMouseDown}
                    onClick={() => item.action(editor)}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>,
              document.body // Mount the dropdown in the document body
            )}
          <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />
          <button
            className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => openDialog()}
            aria-label={translations.editor.share}
          >
            <icons.ShareLineIcon className="border-none text-xl w-7 h-7" />
          </button>
          <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />
          <div className="flex items-center">
            <button
              className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => toggleFocusMode()}
              aria-label={translations.editor.ReadingMode}
            >
              <icons.FileArticleLine className="border-none text-xl w-7 h-7" />
            </button>
            {!isTableActive && !isTextSelected && (
              <button
                className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => handleshowFind()}
                aria-label={translations.editor.searchPage}
              >
                <icons.Search2LineIcon className="border-none text-xl w-7 h-7" />
              </button>
            )}
          </div>
          {isTableActive && !isTextSelected && (
            <>
              <button
                className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
                onMouseDown={handleMouseDown}
                onClick={() => editor?.chain().focus().deleteTable().run()}
                aria-label={translations.editor.deleteTable}
              >
                <icons.DeleteBinLineIcon className="border-none text-xl w-7 h-7" />
              </button>
            </>
          )}
        </div>
      </div>
      {showFind &&
        createPortal(
          <div
            ref={FindRef}
            className="absolute p-1"
            style={{
              top: FindPosition.top,
              left: FindPosition.left,
              zIndex: 1000,
            }}
          >
            <div className="fixed inset-x-0 flex justify-center">
              <div className="w-full px-4 sm:px-10 md:px-20 lg:px-60">
                {showFind && <Find editor={editor} setShowFind={setShowFind} />}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Toolbar;
