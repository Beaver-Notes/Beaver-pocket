import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "../../utils/translations";
import { createPortal } from "react-dom";
import ImageUploadComponent from "../../composable/ImageUpload";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import { Keyboard } from "@capacitor/keyboard";
import FileUploadComponent from "../../composable/FileUpload";
import AudioUploadComponent from "../../composable/AudioUpload";
import VideoUploadComponent from "../../composable/VideoUpload";
import { Link } from "react-router-dom";
import Popover from "../UI/Popover";
import Mousetrap from "mousetrap";
import Find from "./Find";
import Icon from "../UI/Icon";
import { Capacitor } from "@capacitor/core";

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
}) => {
  const headings = [1, 2, 3, 4];
  const headingIcons: Record<
    number,
    React.ComponentType<{ className?: string }>
  > = {
    1: (props) => <Icon {...props} name="Heading1" />,
    2: (props) => <Icon {...props} name="Heading2" />,
    3: (props) => <Icon {...props} name="Heading3" />,
    4: (props) => <Icon {...props} name="Heading4" />,
  };
  const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [showFind, setShowFind] = useState(false);
  const [FindPosition, setFindPosition] = useState<{
    top: number;
    left: number;
  }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const FindRef = useRef<HTMLDivElement>(null);

  const [translations, setTranslations] = useState<Record<string, any>>({
    editor: {},
    menu: {},
    accessibility: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
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

  const draw = [
    {
      label: translations.menu.drawingBlock,
      active: "paper",
      icon: <Icon name="Brush2Fill" />,
      action: (editor: any) => editor?.chain().focus().insertPaper().run(),
    },
  ];

  const highlighterColors = [
    "bg-[#DC8D42]/30 dark:bg-[#DC8D42]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#E3B324]/30 dark:bg-[#E3B324]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#4CAF50]/30 dark:bg-[#4CAF50]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#3A8EE6]/30 dark:bg-[#3A8EE6]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#9B5EE6]/30 dark:bg-[#9B5EE6]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#E67EA4]/30 dark:bg-[#E67EA4]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#E75C5C]/30 dark:bg-[#E75C5C]/40 dark:text-[color:var(--selected-dark-text)]",
    "bg-[#A3A3A3]/30 dark:bg-[#A3A3A3]/40 dark:text-[color:var(--selected-dark-text)]",
  ];

  const textColors = [
    "#DC8D42",
    "#E3B324",
    "#4CAF50",
    "#3A8EE6",
    "#9B5EE6",
    "#E67EA4",
    "#E75C5C",
    "#A3A3A3",
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

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() === "web") return;

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

  const lists = [
    {
      active: "bulletList",
      label: translations.menu.bulletList,
      icon: <Icon name="ListUnordered" />,
      action: (editor: any) => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: "orderedList",
      label: translations.menu.orderedList,
      icon: <Icon name="ListOrdered" />,
      action: (editor: any) =>
        editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: "tasklist",
      label: translations.menu.checklist,
      icon: <Icon name="ListCheck2" />,
      action: (editor: any) => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

  return (
    <div
      className={`print:hidden fixed z-20 bg-white dark:bg-[#232222] dark:text-[color:var(--selected-dark-text)] mx-2 transition overflow-auto no-scrollbar flex justify-center items-center
    ${focusMode ? "opacity-0 hover:opacity-100" : ""}
    ${isKeyboardVisible ? "pb-4 sm:pb-0" : "pb-6 sm:pb-0"}
    sm:pt-6 left-0 right-0 bottom-0 sm:bottom-auto`}
    >
      <div className="flex items-center justify-center sm:border-b sm:dark:border-b-neutral-600 whitespace-nowrap w-max">
        {/* Back button */}
        <div className="hidden sm:flex items-center">
          <Link
            to="/"
            className="p-1 dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
            aria-label={translations.accessibility.back}
          >
            <Icon name="ArrowLeftLine" />
          </Link>
        </div>
        <div className="sm:hidden flex items-center">
          <button
            className="p-1 sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().undo().run()}
            aria-label={translations.editor.undo}
          >
            <Icon name="ArrowGoBackLine" />
          </button>
          <button
            className="p-1 sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().redo().run()}
            aria-label={translations.editor.redo}
          >
            <Icon name="ArrowGoForwardLine" />
          </button>
          <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
        </div>
        <button
          className={
            editor?.isActive("paragraph")
              ? "p-1 rounded-md text-primary hoverable cursor-pointer"
              : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
          }
          onMouseDown={handleMouseDown}
          onClick={() => editor?.chain().focus().setParagraph().run()}
          aria-label={translations.menu.paragraph}
        >
          <Icon name="Paragraph" />
        </button>
        <Popover
          placement="top"
          trigger="click"
          modelValue={false}
          triggerContent={
            <button
              className={`p-1 ${
                editor?.isActive("highlight")
                  ? "text-primary"
                  : "flex items-center rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200"
              } cursor-pointer flex`}
            >
              <Icon name="Heading" />
              <Icon name="ArrowDownS" className="w-4 h-4" />
            </button>
          }
          aria-label={translations.accessibility.highlight}
        >
          <>
            {headings.map((heading) => (
              <button
                key={heading}
                aria-label={`${translations.menu.heading} ${heading}`} // v-tooltip replacement
                className={`flex items-center p-1 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200 ${
                  editor?.isActive("heading", { level: heading })
                    ? "is-active"
                    : ""
                }`}
                onClick={() => {
                  editor
                    ?.chain()
                    .focus()
                    .toggleHeading({ level: heading as 1 | 2 | 3 | 4 })
                    .run();
                }}
              >
                {React.createElement(headingIcons[heading], {
                  className: "border-none text-xl w-7 h-7",
                })}
                <div className="text-left overflow-hidden text-ellipsis whitespace-nowrap">
                  <p className="font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)] pl-2">
                    {translations.menu.heading} {heading}
                  </p>
                </div>
              </button>
            ))}
          </>
        </Popover>
        <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
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
          <Icon name="Bold" />
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
          <Icon name="Italic" />
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
          <Icon name="Underline" />
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
          <Icon name="Strikethrough" />
        </button>
        <Popover
          placement="top"
          trigger="click"
          modelValue={false}
          triggerContent={
            <button
              className={`${
                editor?.isActive("highlight")
                  ? "p-1 rounded-md text-primary hoverable cursor-pointer text-primary"
                  : "p-1 rounded-md hoverable dark:text-[color:var(--selected-dark-text)] text-neutral-800"
              }`}
            >
              <Icon name="MarkPenLine" />
            </button>
          }
          aria-label={translations.accessibility.highlight}
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
                  className={`w-7 h-7 cursor-pointer rounded${color}`}
                  onClick={() => {
                    setTextColor(color);
                  }}
                >
                  <Icon name="fontColor" />
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
                  className={`w-7 h-7 cursor-pointer ${color}`}
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
              <Icon name="InsertRowBottom" />
            </button>
            <button
              className="p-1 block align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().addRowBefore().run()}
              aria-label={translations.accessibility.insertRowBefore}
            >
              <Icon name="InsertRowTop" />
            </button>
            <button
              className="p-1 block align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().deleteRow().run()}
              aria-label={translations.accessibility.deleteRow}
            >
              <Icon name="DeleteRow" />
            </button>
            <button
              className="p-1 block align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().addColumnBefore().run()}
              aria-label={translations.accessibility.insertColumnLeft}
            >
              <Icon name="InsertColumnLeft" />
            </button>
            <button
              className="p-1 block align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              aria-label={translations.accessibility.insertColumnRight}
            >
              <Icon name="InsertColumnRight" />
            </button>
            <button
              className="p-1 block align-end rounded-md dark:text-[color:var(--selected-dark-text)] text-neutral-800 bg-transparent cursor-pointer"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().deleteColumn().run()}
              aria-label={translations.accessibility.deleteColumn}
            >
              <Icon name="DeleteColumn" />
            </button>
          </>
        )}
        {!isTableActive && (
          <>
            <hr className="border-r dark:border-r-neutral-600 mx-2 h-6" />{" "}
            <Popover
              placement="top"
              trigger="click"
              modelValue={false}
              triggerContent={
                <button
                  className={`p-1 ${
                    editor?.isActive("highlight")
                      ? "text-primary"
                      : "flex items-center rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200"
                  } cursor-pointer flex`}
                >
                  <Icon name="ListUnordered" />
                  <Icon name="ArrowDownS" className="w-4 h-4" />
                </button>
              }
              aria-label={translations.accessibility.highlight}
            >
              <>
                {lists.map((item) => (
                  <button
                    key={item.active}
                    className={`flex items-center p-1 rounded-lg text-black dark:text-[color:var(--selected-dark-text)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333] transition duration-200 ${
                      editor?.isActive(item.active.toLowerCase())
                        ? "text-primary"
                        : ""
                    } cursor-pointer flex-1 pl-3`}
                    onMouseDown={handleMouseDown}
                    onClick={() => item.action(editor)}
                    aria-label={item.label}
                  >
                    {item.icon}
                    <div className="text-left overflow-hidden text-ellipsis whitespace-nowrap">
                      <p className="font-medium text-neutral-800 dark:text-[color:var(--selected-dark-text)] pl-2">
                        {item.label}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            </Popover>
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
              <Icon name="DoubleQuotesL" />
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
              <Icon name="CodeBoxLine" />
            </button>
          </>
        )}
        <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
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
          onClick={() => editor?.chain().focus().toggleLink({ href: "" }).run()}
          aria-label={translations.accessibility.link}
        >
          <Icon name="Link" />
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
          <Icon name="Table2" />
        </button>
        <Popover
          placement="top"
          trigger="click"
          modelValue={false}
          triggerContent={
            <button
              className={
                "p-1 rounded-md text-neutral-800 dark:text-[color:var(--selected-dark-text)]  hoverable cursor-pointer"
              }
              aria-label={translations.accessibility.highlight}
            >
              <Icon name="MoreLine" />
            </button>
          }
        >
          <div className="flex">
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
              <Icon name="PagesLine" />
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
          </div>
        </Popover>
        <div className="sm:flex items-center hidden">
          <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
          <button
            className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333]"
            onMouseDown={handleMouseDown}
            onClick={() => openDialog()}
            aria-label={translations.editor.share}
          >
            <Icon name="ShareLine" />
          </button>
          <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
          <button
            className="p-1 sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333]"
            onMouseDown={handleMouseDown}
            onClick={() => toggleFocusMode()}
            aria-label={translations.editor.ReadingMode}
          >
            <Icon name="FileArticleLine" />
          </button>
          {!isTableActive && !isTextSelected && (
            <button
              className="p-1 hidden sm:block sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333]"
              onMouseDown={handleMouseDown}
              onClick={() => handleshowFind()}
              aria-label={translations.editor.searchPage}
            >
              <Icon name="Search2Line" />
            </button>
          )}
        </div>
        {isTableActive && !isTextSelected && (
          <>
            <hr className="w-px border-0 border-r border-r-neutral-300 dark:border-r-neutral-700 mx-2 h-6 bg-transparent" />{" "}
            <button
              className="p-1 sm:align-start dark:text-[color:var(--selected-dark-text)] text-neutral-800 rounded-md bg-transparent cursor-pointer hover:bg-neutral-100 dark:hover:bg-[#353333]"
              onMouseDown={handleMouseDown}
              onClick={() => editor?.chain().focus().deleteTable().run()}
              aria-label={translations.editor.deleteTable}
            >
              <Icon name="DeleteBinLine" />
            </button>
          </>
        )}
      </div>
      {showFind
        ? createPortal(
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
                  <Find editor={editor} setShowFind={setShowFind} />
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default Toolbar;
