import React, { useState, useEffect, useMemo, useRef } from "react";
import { Note } from "../../store/types";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useSaveNote } from "../../store/notes";
import Mousetrap from "mousetrap";
import { formatTime } from "../../utils/time-format";
import { JSONContent } from "@tiptap/react";
import Icon from "../UI/Icon";
import UiCard from "../UI/Card";
import UiListItem from "../UI/ListItem";
import { useTranslation } from "@/utils/translations";
import "./css/commandprompt.css";

interface CommandPromptProps {
  isOpen: boolean;
  setIsCommandPromptOpen: (value: boolean) => void;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const MAX_CONTENT_PREVIEW_LENGTH = 100;

const CommandPrompt: React.FC<CommandPromptProps> = ({
  isOpen,
  setIsCommandPromptOpen,
  notesState,
  setNotesState,
}) => {
  const { saveNote } = useSaveNote(setNotesState);
  const navigate = useNavigate();

  const [translations, setTranslations] = useState<Record<string, any>>({
    commandprompt: {},
    accessibility: {},
    home: {},
    card: {},
  });

  const [state, setState] = useState({
    query: "",
    selectedIndex: 0,
  });

  const inputRef = useRef<HTMLInputElement | null>(null);

  const isCommand = state.query.startsWith(">");
  const queryTerm = isCommand
    ? state.query.slice(1).toLowerCase().trim()
    : state.query.toLowerCase().trim();

  useEffect(() => {
    useTranslation().then((trans) => {
      if (trans) setTranslations(trans);
    });
  }, []);

  const truncateContentPreview = (
    content: JSONContent | string | JSONContent[]
  ): string => {
    let text = "";

    const extractParagraphText = (json: JSONContent): string => {
      if (!json || !Array.isArray(json.content)) return "";
      return json.content
        .filter((node) => node.type === "paragraph")
        .map((node) =>
          Array.isArray(node.content)
            ? node.content
                .filter((n) => n.type === "text")
                .map((n) => n.text)
                .join(" ")
            : ""
        )
        .join(" ");
    };

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      text = extractParagraphText({ type: "doc", content });
    } else {
      const { title, ...rest } = content;
      text = extractParagraphText(rest);
    }

    text = text.replace(/(\S{30,})/g, "$1 ");
    return text.length > MAX_CONTENT_PREVIEW_LENGTH
      ? text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "..."
      : text;
  };

  const handleCreateNewNote = async () => {
    const newNote: Note = {
      id: uuid(),
      title: `${translations.home.title || "Untitled"}`,
      content: { type: "doc", content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };

    await saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
    setIsCommandPromptOpen(false);
  };

  const goToSettings = () => {
    navigate("/settings");
    setIsCommandPromptOpen(false);
  };

  const toggleTheme = () => {
    const current = localStorage.getItem("themeMode") || "auto";
    const newMode = current === "dark" ? "light" : "dark";
    localStorage.setItem("themeMode", newMode);
    setIsCommandPromptOpen(false);
  };

  const commandItems = [
    {
      id: "new",
      title: translations.commandprompt.newNote,
      handler: handleCreateNewNote,
    },
    {
      id: "settings",
      title: translations.commandprompt.settings,
      handler: goToSettings,
    },
    {
      id: "theme",
      title: translations.commandprompt.theme,
      handler: toggleTheme,
    },
  ];

  const items = useMemo(() => {
    if (isCommand) {
      return commandItems.filter((item) =>
        item.title?.toLowerCase().includes(queryTerm)
      );
    }

    return Object.values(notesState)
      .map((note) => ({
        ...note,
        content: truncateContentPreview(note.content ?? ""),
      }))
      .filter((note) => {
        const title = note.title?.toLowerCase() || "";
        const content = note.content?.toLowerCase() || "";
        return title.includes(queryTerm) || content.includes(queryTerm);
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [notesState, queryTerm, isCommand]);

  const handleSelectItem = (item: any) => {
    if (item.handler) {
      item.handler();
    } else {
      navigate(`/editor/${item.id}`);
    }
    setIsCommandPromptOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setState((s) => ({
        ...s,
        selectedIndex: (s.selectedIndex + items.length - 1) % items.length,
      }));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setState((s) => ({
        ...s,
        selectedIndex: (s.selectedIndex + 1) % items.length,
      }));
    } else if (e.key === "Enter") {
      const item = items[state.selectedIndex];
      item && handleSelectItem(item);
    } else if (e.key === "Escape") {
      setIsCommandPromptOpen(false);
      setState({ query: "", selectedIndex: 0 });
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }

    Mousetrap.bind("mod+shift+p", () => {
      if (isOpen) {
        setIsCommandPromptOpen(false);
      } else {
        setIsCommandPromptOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    });

    return () => {
      Mousetrap.unbind("mod+shift+p");
    };
  }, [isOpen]);

  return isOpen ? (
    <UiCard
      className="command-prompt w-full max-w-lg mx-auto shadow-xl m-4"
      padding="p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={translations.accessibility.commandPrompt}
    >
      <div className="flex items-center border-b pb-4 mb-4">
        <Icon
          name="Search2Line"
          className="mr-3 text-neutral-600 dark:text-neutral-200"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          className="w-full bg-transparent command-input"
          type="text"
          placeholder={translations.commandprompt.placeholder || "-"}
          value={state.query}
          onChange={(e) =>
            setState({ ...state, query: e.target.value, selectedIndex: 0 })
          }
          onKeyDown={handleKeyDown}
          aria-label={translations.accessibility.search}
          role="combobox"
        />
      </div>

      <UiListItem className="max-h-80 overflow-auto space-y-1 scroll command-scroll">
        {items.slice(0, 5).map((item, index) => (
          <div
            key={item.id}
            className={`note-item cursor-pointer flex justify-between rounded-lg p-2 ${
              index === state.selectedIndex
                ? "active-command-item bg-primary bg-opacity-10 text-primary"
                : "hover:bg-primary hover:bg-opacity-10 hover:text-primary"
            }`}
            onClick={() => handleSelectItem(item)}
            role="option"
          >
            <div className="w-full">
              <p className="text-overflow w-full flex justify-between">
                <span>
                  {item.title || translations.commandprompt.untitlednote}
                  {"isLocked" in item && item.isLocked && (
                    <Icon
                      name="LockClosed"
                      className="text-neutral-600 ml-2 w-4 translate-y-[-1.5px]"
                      aria-label={translations.accessibility.lockedNote}
                    />
                  )}
                </span>
                {!isCommand && "updatedAt" in item && item.updatedAt && (
                  <span>{formatTime(item.updatedAt)}</span>
                )}
              </p>
              {!isCommand && "isLocked" in item && !item.isLocked && (
                <p className="text-overflow text-xs">{item.content}</p>
              )}
            </div>
          </div>
        ))}
      </UiListItem>
    </UiCard>
  ) : null;
};

export default CommandPrompt;
