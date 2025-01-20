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
}

const Toolbar: React.FC<ToolbarProps> = ({ editor, noteId }) => {
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [showFind, setShowFind] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
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
  const navigate = useNavigate();

  //Sync
  const { syncDropBox } = useDropboxSync();
  const { syncDav } = useSyncDav();
  const { syncOneDrive } = useOnedriveSync();
  const { exportdata:SyncIcloud } = useExportiCloud();
  const { syncGdrive } = useDriveSync();

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
  const [wd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

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

  const formatting = [
    {
      label: translations.menuItems.paragraphLabel,
      active: "Pragraph",
      icon: (
        <icons.ParagraphIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) => editor?.chain().focus().setParagraph().run(),
    },
    {
      label: translations.menuItems.heading1Label,
      active: "heading",
      level: 1,
      icon: (
        <icons.Heading1Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: translations.menuItems.heading2Label,
      active: "heading",
      level: 2,
      icon: (
        <icons.Heading2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
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
        <icons.ListUnorderedIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: "orderedList",
      label: translations.menuItems.orderedListLabel,
      icon: (
        <icons.ListOrderedIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: "TaskList",
      label: translations.menuItems.bulletListLabel,
      icon: (
        <icons.ListCheck2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

  const draw = [
    {
      label: translations.menuItems.drawLabel,
      active: "paper",
      icon: (
        <icons.Brush2Fill className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: (editor: any) => editor?.chain().focus().insertPaper().run(),
    },
  ];

  const search = [
    {
      label: translations.accessibility.searchContent,
      icon: (
        <icons.Search2LineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: handleshowFind,
    },
  ];

  const back = [
    {
      label: translations.accessibility.back,
      icon: (
        <icons.ArrowLeftLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
      ),
      action: goBack,
    },
  ];

  return (
    <div
      className={`print:hidden drawer hidden sm:block fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] dark:text-neutral-50 overflow-x-auto sm:overflow-x-none py-1 ${
        wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
      }`}
    >
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "hidden" : "block"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        {back.map((item) => (
          <button
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          {formatting.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase(), item.level)
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          <button
            className={
              editor?.isActive("blockquote")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            aria-label={translations.menuItems.quoteLabel}
          >
            <icons.DoubleQuotesLIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
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
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menuItems.embedLabel}
          >
            <icons.PagesLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
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
          {draw.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase())
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          {/* List and Table Options */}
          <button
            className={
              editor?.isActive("table")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
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
            <icons.Table2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          {lists.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase())
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
        {search.map((item) => (
          <button
            ref={searchRef}
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "block" : "hidden"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        {back.map((item) => (
          <button
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className="p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
            aria-label={translations.accessibility.insertRowAfter}
          >
            <icons.InsertRowBottomIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowBefore().run()}
            aria-label={translations.accessibility.insertRowBefore}
          >
            <icons.InsertRowTopIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteRow().run()}
            aria-label={translations.accessibility.deleteRow}
          >
            <icons.DeleteRow className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
            aria-label={translations.accessibility.insertColumnLeft}
          >
            <icons.InsertColumnLeftIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
            aria-label={translations.accessibility.insertColumnRight}
          >
            <icons.InsertColumnRightIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
            aria-label={translations.accessibility.deleteColumn}
          >
            <icons.DeleteColumn className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          {draw.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase())
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
            translations={translations}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menuItems.embedLabel}
          >
            <icons.PagesLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
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
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteTable().run()}
            aria-label={translations.accessibility.deleteTable}
          >
            <icons.DeleteBinLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
          </button>
        </div>
        {search.map((item) => (
          <button
            ref={searchRef}
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTextSelected ? "block" : "hidden"
        }`}
      >
        {back.map((item) => (
          <button
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          {formatting.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase(), item.level)
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
              onMouseDown={handleMouseDown}
              onClick={() => item.action(editor)}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
          <button
            className={
              editor?.isActive("bold")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label={translations.accessibility.bold}
          >
            <icons.BoldIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label={translations.accessibility.italic}
          >
            <icons.ItalicIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label={translations.accessibility.underline}
          >
            <icons.UnderlineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            aria-label={translations.accessibility.strikethrough}
          >
            <icons.StrikethroughIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            ref={buttonRef}
            className={
              editor?.isActive("highlight")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={toggleDropdown}
            aria-label={translations.accessibility.highlight}
          >
            <icons.MarkPenLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
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
                        ? "border-none text-amber-400 text-xl w-7 h-7"
                        : "border-none text-neutral-800 dark:text-[color:var(--selected-dark-text)] text-xl w-7 h-7"
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
          {lists.map((item) => (
            <button
              className={
                editor?.isActive(item.active.toLowerCase())
                  ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                  : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
              }
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
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSubscript()}
            aria-label={translations.accessibility.subscript}
          >
            <icons.SubscriptIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("superscript")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSuperscript()}
            aria-label={translations.accessibility.superscript}
          >
            <icons.SuperscriptIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("link")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={setLink}
            aria-label={translations.accessibility.link}
          >
            <icons.LinkIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-7 h-7 cursor-pointer" />
          </button>
        </div>
        {search.map((item) => (
          <button
            ref={searchRef}
            className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => item.action()}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        ))}
      </div>
      {showFind &&
        createPortal(
          <div
            ref={FindRef}
            className="absolute p-2"
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
