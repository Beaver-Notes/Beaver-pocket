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
import Popover from "../UI/Popover";
import Mousetrap from "mousetrap";
import Find from "./Find";

interface ToolbarProps {
  note: Note;
  noteId: string;
  editor: Editor | null;
  openDialog: any;
  toggleFocusMode: any;
  focusMode: boolean;
  wd: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  noteId,
  openDialog,
  toggleFocusMode,
  focusMode,
  wd,
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [isMoreOpen, setMoreOpen] = useState<boolean>(false);
  const [showFind, setShowFind] = useState(false);
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

  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editor.embedUrl",
      share: "editor.share",
      ReadingMode: "editor.ReadingMode",
      searchPage: "editor.searchPage",
      deleteTable: "editor.deleteTable",
      undo: "editor.undo",
      redo: "editor.redo",
    },
    menu: {
      paragraph: "menu.paragraph",
      heading1: "menu.heading1",
      heading2: "menu.heading2",
      bulletList: "menu.bulletList",
      orderedList: "menu.orderedList",
      checklist: "menu.checklist",
      quote: "menu.quote",
      code: "menu.code",
      embed: "menu.embed",
      table: "menu.table",
      drawingBlock: "menu.drawingBlock",
      image: "menu.image",
      imageDescription: "menu.imageDescription",
      textColor: "menu.textColor",
      highlighterColor: "menu.highlighterColor",
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

      if (
        moreDropdownRef.current &&
        !moreDropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setMoreOpen(false); // Reset or handle closing logic
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const goBack = () => {
    navigate("/");
  };

  const draw = [
    {
      label: translations.menu.drawingBlock,
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

  const highlighterColors = [
    "bg-[#FFD56B]/60 dark:bg-[#996B1F]/50 dark:text-white", // Soft Orange-Yellow
    "bg-[#FFF78A]/60 dark:bg-[#B8A233]/50 dark:text-white", // Yellow
    "bg-[#C5F6C7]/60 dark:bg-[#5A9E5D]/50 dark:text-white", // Green
    "bg-[#A7DBFA]/60 dark:bg-[#4785A3]/50 dark:text-white", // Blue
    "bg-[#D7B5F7]/60 dark:bg-[#7E5A9A]/50 dark:text-white", // Purple
    "bg-[#F9C3D8]/60 dark:bg-[#B15A79]/50 dark:text-white", // Pink
    "bg-[#FF9E9E]/60 dark:bg-[#B04C4C]/50 dark:text-white", // Red
    "bg-[#E0E0E0]/60 dark:bg-[#6B6B6B]/50 dark:text-white", // Gray
  ];

  const textColors = [
    "#DC8D42", // Soft Orange
    "#E3B324", // Warm Yellow
    "#4CAF50", // Natural Green
    "#3A8EE6", // Soft Blue
    "#9B5EE6", // Muted Purple
    "#E67EA4", // Pastel Pink
    "#E75C5C", // Warm Red
    "#A3A3A3", // Soft Gray
  ];

  const setHighlightColor = (color: string) => {
    if (editor?.isActive("highlight", { color })) {
      editor.commands.unsetHighlight();
    } else {
      editor?.chain().focus().setHighlight({ color }).run();
    }
  };

  function setTextColor(color: string) {
    if (editor?.isActive("textStyle", { color })) {
      editor?.chain().focus().unsetColor().run();
    } else {
      editor?.commands.setColor(color);
    }
  }

  return (
    <div
      className={`print:hidden drawer hidden sm:block fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] overflow-auto dark:text-neutral-50 mx-2 transition ${
        focusMode ? "opacity-0 hover:opacity-100" : ""
      } ${wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"} `}
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
          <Popover
            placement="top"
            trigger="click"
            modelValue={false}
            onShow={() => console.log("Popover opened")}
            onClose={() => console.log("Popover closed")}
            triggerContent={
              <button
                className={`p-1 ${
                  editor?.isActive("highlight")
                    ? "text-primary"
                    : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                } cursor-pointer flex-1`}
              >
                {" "}
                <icons.MarkPenLineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
              </button>
            }
          >
            <div
              role="menu"
              aria-label={translations.accessibility.highlightOptions}
            >
              <p className="text-sm py-2">
                {translations.menu.textColor || "Text Color"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {textColors.map((color, index) => (
                  <button
                    key={index}
                    role="menuitem"
                    aria-label={`${translations.accessibility.setColor} ${colorsTranslations[index]}`}
                    className={`w-8 h-8 cursor-pointer rounded${color}`}
                    onClick={() => {
                      setTextColor(color);
                    }}
                  >
                    <icons.fontColor
                      className="border-none text-xl w-8 h-8 cursor-pointer"
                      style={{ color: color }}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm py-2">
                {translations.menu.highlighterColor || "Highlighter Color"}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {highlighterColors.map((color, index) => (
                  <button
                    key={index}
                    role="menuitem"
                    aria-label={`${translations.accessibility.setColor} ${colorsTranslations[index]}`}
                    className={`w-8 h-8 cursor-pointer ${color}`}
                    onClick={() => {
                      setHighlightColor(color);
                    }}
                  />
                ))}
              </div>
            </div>
          </Popover>
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
                aria-label={translations.menu.bulletList}
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
                aria-label={translations.menu.orderedList}
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
                aria-label={translations.menu.bulletList}
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
                aria-label={translations.menu.quote}
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
                aria-label={translations.menu.code}
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
            aria-label={translations.menu.table}
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
                className="absolute p-1 bg-white dark:bg-neutral-800 shadow-lg rounded-md flex"
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
                  aria-label={translations.menu.embed}
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
            <button
              className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().undo().run()}
              aria-label={translations.editor.undo}
            >
              <icons.ArrowGoBackLineIcon className="border-none text-xl w-7 h-7" />
            </button>
            <button
              className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().redo().run()}
              aria-label={translations.editor.redo}
            >
              <icons.ArrowGoForwardLineIcon className="border-none text-xl w-7 h-7" />
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
