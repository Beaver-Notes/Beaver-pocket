import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../../store/types";
import { useTranslation } from "@/utils/translations";
import Icon from "../ui/Icon";
import UiList from "../ui/List";
import UiListItem from "../ui/ListItem";

interface Props {
  editor: any;
  notes: Note[];
}

const NoteBubbleMenuLink: React.FC<Props> = ({ editor, notes }) => {
  const [currentLinkVal, setCurrentLinkVal] = useState("");
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(0);
  const [translations, setTranslations] = useState<Record<string, any>>({
    link: {},
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  useEffect(() => {
    if (!editor) return;

    const updateLinkValFromEditor = () => {
      const linkAttrs = editor.getAttributes("link");
      if (linkAttrs?.href) {
        setCurrentLinkVal(linkAttrs.href.replace("note://", "@"));
      } else {
        setCurrentLinkVal("");
      }
    };

    updateLinkValFromEditor();
    editor.on("transaction", updateLinkValFromEditor);

    return () => {
      editor.off("transaction", updateLinkValFromEditor);
    };
  }, [editor]);

  useEffect(() => {
    if (currentLinkVal.startsWith("@")) {
      setSelectedNoteIndex(0);
    }
  }, [currentLinkVal]);

  const updateCurrentLink = useCallback(
    (id?: string) => {
      let value = currentLinkVal;

      if (typeof id === "string") {
        value = `note://${id}`;
        setCurrentLinkVal(value);
        editor
          ?.chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: value })
          .run();
        return;
      }

      if (currentLinkVal.startsWith("@")) {
        const noteId = notes[selectedNoteIndex]?.id;
        value = `note://${noteId}`;
        setCurrentLinkVal(value);
      }

      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: value })
        .run();
    },
    [currentLinkVal, editor, notes, selectedNoteIndex]
  );

  const keydownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!currentLinkVal.startsWith("@")) return;
    const notesLength = notes.length;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedNoteIndex((prev) => (prev + notesLength - 1) % notesLength);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedNoteIndex((prev) => (prev + 1) % notesLength);
    }
  };

  function openLink(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    if (!currentLinkVal) return;

    const href = currentLinkVal.startsWith("@")
      ? `note://${notes[selectedNoteIndex]?.id}`
      : currentLinkVal;

    if (href.startsWith("note://")) {
      const noteId = href.split("note://")[1];
      navigate(`/editor/${noteId}`);
    } else {
      window.open(href, "_blank", "noopener");
    }
  }

  return (
    <div>
      {currentLinkVal.startsWith("@") && notes.length > 0 && (
        <UiList className="transition-all p-2 space-y-1 border-b max-h-48 overflow-auto">
          {notes.map((note, index) => (
            <UiListItem
              key={note.id}
              active={index === selectedNoteIndex}
              onClick={() => updateCurrentLink(note.id)}
              className="cursor-pointer line-clamp leading-tight"
              style={{ userSelect: "none" }}
            >
              <p className="text-overflow w-full text-sm">
                {note.title || translations.link?.untitlednote || "Untitled"}
              </p>
            </UiListItem>
          ))}
        </UiList>
      )}

      <div className="p-2">
        <div className="flex flex-wrap items-center space-x-2 space-y-2 sm:space-y-0">
          <input
            id="bubble-input"
            type="url"
            placeholder={translations.link?.placeholder || "Enter link"}
            value={currentLinkVal}
            className="flex-1 bg-transparent"
            onChange={(e) => setCurrentLinkVal(e.target.value)}
            onKeyDown={(e) => {
              keydownHandler(e);
              if (e.key === "Escape") {
                editor?.commands.focus();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter") updateCurrentLink();
            }}
          />
          <button
            title="Remove link"
            className="text-neutral-600 -mr-1 p-2 dark:text-neutral-200"
            onClick={() => editor?.chain().focus().unsetLink().run()}
            aria-label="Remove link"
          >
            <Icon name="LinkUnlink" className="w-6 h-6" />
          </button>
          <button
            title="Open link"
            className="text-neutral-600 -mr-1 p-2 dark:text-neutral-200"
            onClick={openLink}
            aria-label="Open link"
            disabled={!currentLinkVal}
          >
            <Icon name="ExternalLink" className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteBubbleMenuLink;
