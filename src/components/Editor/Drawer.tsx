import React, { useEffect, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import ImageUploadComponent from "./ImageUpload";
import FileUploadComponent from "./FileUpload";
import AudioUploadComponent from "./AudioUpload";
import VideoUploadComponent from "./VideoUpload";
import icons from "../../lib/remixicon-react";
import { Keyboard } from "@capacitor/keyboard";
import Popover from "../UI/Popover";

interface DrawerProps {
  note: Note;
  noteId: string;
  editor: Editor | null;
}

const Drawer: React.FC<DrawerProps> = ({ editor, noteId }) => {
  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editor.embedUrl",
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
      gray: "accessibility.grey",
      setColor: "accessibility.setColor",
      subscript: "accessibility.subscript",
      superscript: "accessibility.superscript",
      link: "accessibility.link",
      fileUploadInput: "accessibility.fileUploadInput",
      fileUpload: "accessibility.fileUpload",
      processing: "accessibility.processing",
      startRecording: "accessibility.startRecording",
      stopRecording: "accessibility.stopRecording",
      videoUpload: "accessibility.videoUpload",
      mergeorSplit: "accessibility.mergeorSplit",
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

  const colorsTranslations = [
    translations.accessibility.orange,
    translations.accessibility.yellow,
    translations.accessibility.green,
    translations.accessibility.blue,
    translations.accessibility.purple,
    translations.accessibility.pink,
    translations.accessibility.red,
    translations.accessibility.gray,
  ];

  // Handle setting highlight color
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

  const formatting = [
    {
      label: translations.menu.paragraph,
      active: "paragraph",
      icon: (
        <icons.ParagraphIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().setParagraph().run(),
    },
    {
      label: translations.menu.heading1,
      active: "heading",
      level: 1,
      icon: (
        <icons.Heading1Icon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: translations.menu.heading2,
      active: "heading",
      level: 2,
      icon: (
        <icons.Heading2Icon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
  ];

  const lists = [
    {
      active: "bulletList",
      label: translations.menu.bulletList,
      icon: (
        <icons.ListUnorderedIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      active: "orderedList",
      label: translations.menu.bulletList,
      icon: (
        <icons.ListOrderedIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) =>
        editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      active: "tasklist",
      label: translations.menu.bulletList,
      icon: (
        <icons.ListCheck2Icon className="border-none text-xl w-8 h-8 cursor-pointer" />
      ),
      action: (editor: any) => editor?.chain().focus().toggleTaskList().run(),
    },
  ];

  return (
    <div
      className={`drawer sm:hidden shadow-t-md block bottom-0 fixed left-0 right-0 ${
        isKeyboardVisible
          ? "bg-[#F8F8F7] dark:bg-[#2D2C2C]"
          : "bg-white dark:bg-neutral-800 p-1 pb-2"
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
                item.level
                  ? editor?.isActive("heading", { level: item.level }) // Strictly check both type and level for headings
                    ? "text-primary"
                    : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                  : editor?.isActive(item.active.toLowerCase()) // For non-headings, check only the type
                  ? "text-primary"
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            aria-label={translations.menu.quote}
          >
            <icons.DoubleQuotesLIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className="text-neutral-700 dark:text-[color:var(--selected-dark-text)] "
            onMouseDown={handleMouseDown}
            //@ts-ignore
            onClick={() => editor?.chain().focus().insertPaper().run()}
            aria-label={translations.menu.drawingBlock}
          >
            <icons.Brush2Fill className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("codeBlock")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            aria-label={translations.menu.code}
          >
            <icons.CodeBoxLineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menu.embed}
          >
            <icons.PagesLineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
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
                ? "text-primary"
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
            aria-label={translations.menu.table}
          >
            <icons.Table2Icon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          {lists.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase())
                  ? "text-primary"
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
            <icons.InsertRowBottomIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 1 })
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowBefore().run()}
            aria-label={translations.accessibility.insertRowBefore}
          >
            <icons.InsertRowTopIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("heading", { level: 2 })
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteRow().run()}
            aria-label={translations.accessibility.deleteRow}
          >
            <icons.DeleteRow className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("blockquote")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
            aria-label={translations.accessibility.insertColumnLeft}
          >
            <icons.InsertColumnLeftIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("codeBlock")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
            aria-label={translations.accessibility.insertColumnRight}
          >
            <icons.InsertColumnRightIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
            aria-label={translations.accessibility.deleteColumn}
          >
            <icons.DeleteColumn className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("codeBlock")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().mergeOrSplit().run()}
            aria-label={translations.accessibility.mergeorSplit}
          >
            <icons.SplitCellsHorizontalIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
            aria-label={translations.menu.drawingBlock}
          >
            <icons.Brush2Fill className="border-none text-xl w-8 h-8 cursor-pointer" />
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
            aria-label={translations.menu.embed}
          >
            <icons.PagesLineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteTable().run()}
            aria-label={translations.accessibility.deleteTable}
          >
            <icons.DeleteBinLineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
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
                item.level
                  ? editor?.isActive("heading", { level: item.level }) // Strictly check both type and level for headings
                    ? "text-primary"
                    : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                  : editor?.isActive(item.active.toLowerCase()) // For non-headings, check only the type
                  ? "text-primary"
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            aria-label={translations.accessibility.bold}
          >
            <icons.BoldIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("italic")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            aria-label={translations.accessibility.italic}
          >
            <icons.ItalicIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("underline")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            aria-label={translations.accessibility.underline}
          >
            <icons.UnderlineIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("strike")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            aria-label={translations.accessibility.strikethrough}
          >
            <icons.StrikethroughIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
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
          {lists.map((item) => (
            <button
              className={`p-1 ${
                editor?.isActive(item.active.toLowerCase())
                  ? "text-primary"
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
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSubscript()}
            aria-label={translations.accessibility.subscript}
          >
            <icons.SubscriptIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("superscript")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSuperscript()}
            aria-label={translations.accessibility.superscript}
          >
            <icons.SuperscriptIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("link")
                ? "text-primary"
                : "text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={setLink}
            aria-label={translations.accessibility.link}
          >
            <icons.LinkIcon className="border-none text-xl w-8 h-8 cursor-pointer" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
