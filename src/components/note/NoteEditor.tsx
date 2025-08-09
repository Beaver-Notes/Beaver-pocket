import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { debounce } from "@/utils/helper";
import { Note } from "../../store/types";
import { EditorContent, useEditor } from "@tiptap/react";
import Toolbar from "./Toolbar";
import Find from "./Find";
import "../../assets/css/editor.css";
import { extensions, CollapseHeading, heading, dropFile } from "@/lib/tiptap";
import Commands from "../../lib/tiptap/exts/commands";
import LinkNote from "../../lib/tiptap/exts/link-note";
import Mousetrap from "mousetrap";
import { WebviewPrint } from "capacitor-webview-print";
import NoteBubbleMenu from "./NoteBubbleMenu";
import Icon from "../ui/Icon";
import { UiModal } from "../ui/Modal";
import { exportBEA } from "../../utils/share/BEA";
import { useLabelStore } from "@/store/label";
import { useNoteStore } from "@/store/note";

type Props = {
  note: Note;
  translations: any;
};

function EditorComponent({ note, translations }: Props) {
  const labelStore = useLabelStore();
  const noteStore = useNoteStore();
  const [isExporting, setIsExporting] = useState(false);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const findRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => {
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  const [focusMode, setFocusMode] = useState(false);
  const [showFind, setShowFind] = useState(false);
  const [wd, setWd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );
  const navigate = useNavigate();

  const exts = [
    ...extensions,
    LinkNote(() => note.id ?? ""),
    dropFile.configure({ id: note.id }),
    Commands.configure({
      noteId: note.id,
    }),
  ];

  const isCollapsibleEnabled =
    localStorage.getItem("collapsibleHeading") === "true";

  exts.push(isCollapsibleEnabled ? CollapseHeading : heading);

  const editor = useEditor(
    {
      extensions: exts,
      content: note.content,
      onUpdate: ({ editor }) => {
        let data = editor.getJSON();

        data.content = data.content?.filter(
          (node) =>
            !(
              node.type === "paragraph" &&
              (!node.content || node.content.length === 0)
            )
        );

        const labels = new Set<string>();
        const labelEls =
          editor.options.element?.querySelectorAll("[data-mention]") ?? [];

        labelEls.forEach((el) => {
          const labelId = (el as HTMLElement).dataset.id;
          if (labelId && labelStore.data.includes(labelId)) {
            labels.add(labelId);
          }
        });

        updateNote({
          content: data,
          labels: [...labels],
        });
      },
    },
    [note.id]
  );

  useEffect(() => {
    function toggleFindListener() {
      setShowFind((prevShowFind) => !prevShowFind);
    }

    document.addEventListener("showFind", toggleFindListener);
    return () => {
      document.removeEventListener("showFind", toggleFindListener);
    };
  }, []);

  useEffect(() => {
    setWd(localStorage.getItem("expand-editor") === "true");
  }, []);

  useEffect(() => {
    Mousetrap.bind("mod+f", (e) => {
      e.preventDefault();
      setShowFind(true);
    });

    Mousetrap.bind("mod+shift+x", (e) => {
      e.preventDefault();
      editor?.chain().focus().toggleStrike().run();
    });
    Mousetrap.bind("mod+shift+h", (e) => {
      e.preventDefault();
      editor
        ?.chain()
        .focus()
        .setHighlight({ color: "bg-yellow-200 dark:bg-yellow-100" })
        .run();
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
  }, [editor]);

  const handlePrint = async (fileName: string) => {
    const html = document.documentElement;
    const darkModeActive = html.classList.contains("dark");
    const content = document.getElementById("content");

    if (darkModeActive) html.classList.remove("dark");

    const originalStyles = {
      overflow: content?.style.overflow,
      height: content?.style.height,
      maxHeight: content?.style.maxHeight,
    };

    if (content) {
      content.style.overflow = "visible";
      content.style.height = "auto";
      content.style.maxHeight = "none";
    }

    const restore = () => {
      if (darkModeActive) html.classList.add("dark");

      if (content) {
        content.style.overflow = originalStyles.overflow || "";
        content.style.height = originalStyles.height || "";
        content.style.maxHeight = originalStyles.maxHeight || "";
      }

      window.removeEventListener("afterprint", restore);
    };

    window.addEventListener("afterprint", restore);

    try {
      await WebviewPrint.print({ name: fileName });
      console.log("Print triggered for file:", fileName);
    } catch (error) {
      console.error("Error printing webview:", error);
      restore();
    }
  };

  const goBack = () => {
    navigate("/");
  };

  function toggleFocusMode() {
    try {
      if (!focusMode) {
        editor?.setOptions({ editable: false });
        editor?.view.update(editor.view.props);
        setFocusMode(true);
      } else {
        editor?.setOptions({ editable: true });
        editor?.view.update(editor.view.props);
        setFocusMode(false);
      }
    } catch (error) {
      console.error("Error while toggling focus mode:", error);
    }
  }

  const shareBEA = async () => {
    setIsExporting(true);
    try {
      await exportBEA(note.id);
    } finally {
      setIsExporting(false);
    }
  };

  const updateNote = debounce((data: Partial<Note>) => {
    Object.assign(data, { updatedAt: Date.now() });

    noteStore.update(note.id, data);
  }, 250);

  const noteEditor = useRef<HTMLDivElement | null>(null);

  const focusEditor = (): void => {
    noteEditor.current?.querySelector<HTMLElement>('*[tabindex="0"]')?.focus();
  };

  const disallowedEnter = (
    event: React.KeyboardEvent<HTMLDivElement>
  ): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      focusEditor();
    }
  };

  useEffect(() => {
    if (titleRef.current && note.title !== titleRef.current.innerText) {
      titleRef.current.innerText = note.title;
    }
  }, [note.id, note.title]);

  return (
    <div className="relative h-auto" onDragOver={(e) => e.preventDefault()}>
      <div className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] sm:top-0 sm:bottom-auto print:hidden bg-white dark:bg-[#232222] z-20">
        <Toolbar
          note={note}
          noteId={note.id}
          editor={editor}
          openDialog={openDialog}
          toggleFocusMode={toggleFocusMode}
          focusMode={focusMode}
          wd={wd}
        />
      </div>
      <div>
        <div className="sm:hidden bg-white bg-opacity-95 dark:bg-[#232222] w-full no-scrollbar flex justify-between print:hidden">
          <button
            className="p-2 align-start rounded-md text-white bg-transparent cursor-pointer"
            onClick={goBack}
          >
            <Icon name="ArrowLeftLine" />
          </button>

          <div className="flex">
            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={openDialog}
              aria-label={translations.editor.share}
            >
              <Icon name="ShareLine" />
            </button>

            <UiModal
              modelValue={isOpen}
              onClose={closeDialog}
              header={translations.editor.exportas}
              allowSwipeToDismiss={true}
              persist={true}
              className="fixed inset-0 flex items-end sm:items-center justify-center p-5 overflow-y-auto z-50 bg-black bg-opacity-20 print:hidden"
            >
              <div className="flex flex-col rounded-xl overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
                {/* Export as BEA */}
                <button
                  onClick={shareBEA}
                  disabled={isExporting}
                  className={`flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200
      ${isExporting ? "cursor-not-allowed opacity-70" : "cursor-pointer"}
    `}
                >
                  <p className="font-medium w-16 flex-shrink-0">BEA</p>
                  {isExporting ? (
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                  ) : (
                    <Icon
                      name="FileTextLine"
                      className="w-5 h-5"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {/* Export as PDF */}
                <button
                  onClick={() => handlePrint(`${note.title}.pdf`)}
                  className="flex items-center justify-between p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors duration-200"
                >
                  <p className="font-medium w-16 flex-shrink-0">PDF</p>
                  <Icon
                    name="FileArticleLine"
                    className="w-5 h-5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </UiModal>

            <button
              className="p-2 rounded-md text-white bg-transparent cursor-pointer"
              onClick={toggleFocusMode}
              aria-label={translations.editor.ReadingMode}
            >
              <Icon
                name="FileArticleLine"
                className={`border-none ${
                  focusMode
                    ? "text-primary"
                    : "text-neutral-800 dark:text-[color:var(--selected-dark-text)]"
                } text-xl w-7 h-7`}
              />
            </button>
            <button
              className={`${
                focusMode ? "hidden" : "block"
              } p-2 align-end rounded-md text-white bg-transparent cursor-pointer`}
              onClick={() => {
                if (buttonRef.current) {
                  setShowFind(true);
                }
              }}
              ref={buttonRef}
              aria-label={translations.editor.searchPage}
            >
              <Icon name="Search2Line" />
            </button>
          </div>

          {/* Portal appears below the button */}
          {showFind && (
            <div ref={findRef} className="fixed" style={{ zIndex: 80 }}>
              <Find editor={editor} setShowFind={setShowFind} />
            </div>
          )}
        </div>
      </div>

      <div
        id="content"
        className={`inset-x-0 pt-4 sm:pt-20 bottom-16 overflow-auto editor px-4 ${
          wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
        } text-black dark:text-[color:var(--selected-dark-text)]`}
      >
        {!note.isLocked && (
          <div
            contentEditable
            ref={titleRef}
            className="text-4xl outline-none block font-bold bg-transparent w-full cursor-text contenteditable title-placeholder"
            data-placeholder={translations.editor.untitledNote || "-"}
            onInput={(e) => updateNote({ title: e.currentTarget.innerText })}
            onKeyDown={disallowedEnter}
            suppressContentEditableWarning={true}
          />
        )}

        <div>
          <div className="py-2 h-full w-full" ref={noteEditor} id="container">
            <EditorContent
              editor={editor}
              className="prose dark:text-neutral-100 max-w-none prose-indigo mb-[5em]"
            />
          </div>
          <NoteBubbleMenu editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default EditorComponent;
