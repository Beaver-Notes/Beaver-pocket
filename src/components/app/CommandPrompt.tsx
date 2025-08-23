import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Mousetrap from "mousetrap";
import { useNoteStore } from "@/store/note";
import { useFolderStore } from "@/store/folder";
import useCommands from "@/utils/commands";
import { debounce } from "@/utils/helper";
import Icon from "../ui/Icon";
import UiCard from "../ui/Card";
import UiList from "../ui/List";
import UiListItem from "../ui/ListItem";
import { useTranslation } from "@/utils/translations";
import { IconName } from "@/lib/remixicon-react";

type CommandItem = {
  id: string;
  type: "note" | "folder" | "command";
  title?: string;
  name?: string;
  content?: string;
  updatedAt?: string | number;
  createdAt?: string | number;
  isLocked?: boolean;
  icon?: string;
  color?: string;
  handler?: () => void;
};

type CommandPromptProps = {
  showPrompt: boolean;
  setShowPrompt: React.Dispatch<React.SetStateAction<boolean>>;
};

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  showPrompt,
  setShowPrompt,
}) => {
  const navigate = useNavigate();
  const noteStore = useNoteStore();
  const folderStore = useFolderStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [translations, setTranslations] = useState({
    commandPrompt: {} as any,
  });

  const isCommand = query.startsWith(">");
  const queryTerm = useMemo(() => {
    return (isCommand ? query.slice(1) : query).trim().toLowerCase();
  }, [query, isCommand]);

  const mergeContent = (content: any): string => {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map(mergeContent).join("");
    if (content == null) return "";
    if ("content" in content) return mergeContent(content.content);
    if (content.type?.toLowerCase()?.includes("label"))
      return `#${content.attrs?.id}`;
    return content.label ?? content.text ?? "";
  };

  const commands = useCommands();

  const items: CommandItem[] = useMemo(() => {
    if (isCommand) {
      return commands
        .map((cmd) => ({ ...cmd, type: "command" as const }))
        .filter(({ title }) => title?.toLowerCase().includes(queryTerm));
    }

    const notes = Object.values(noteStore.data || []).map((note: any) => ({
      ...note,
      type: "note" as const,
      content: mergeContent(note.content),
    }));

    const folders = Object.values(folderStore.data || []).map(
      (folder: any) => ({
        ...folder,
        type: "folder" as const,
        title: folder.name || folder.title,
      })
    );

    const all = [...notes, ...folders];
    return all.filter(({ title, name, content }) => {
      const t = (title || name || "").toLowerCase();
      return (
        t.includes(queryTerm) ||
        (content && content.toLowerCase().includes(queryTerm))
      );
    });
  }, [isCommand, queryTerm, noteStore.data, folderStore.data, commands]);

  const formatDate = (timestamp?: string | number) => {
    if (!timestamp) return "";
    return dayjs(timestamp).format("YYYY-MM-DD hh:mm");
  };

  const clear = () => {
    setShowPrompt(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const selectItem = (itemArg?: CommandItem, isManual?: boolean) => {
    const selected = isManual ? itemArg : items[selectedIndex];
    if (!selected) return;

    if (selected.handler) {
      selected.handler();
    } else if (selected.type === "folder") {
      navigate(`/folder/${selected.id}`);
    } else if (selected.type === "note") {
      navigate(`/note/${selected.id}`);
    }
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0) return;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? items.length - 1 : next;
        });
        break;

      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = prev + 1;
          return next >= items.length ? 0 : next;
        });
        break;

      case "Enter":
        e.preventDefault();
        selectItem();
        break;

      case "Escape":
        e.preventDefault();
        clear();
        break;

      default:
        // Allow other keys to pass through normally
        break;
    }
  };

  useEffect(() => {
    const loadTranslations = async () => {
      const t = await useTranslation();
      if (t) setTranslations(t);
    };
    loadTranslations();
  }, []);

  // Focus input when prompt opens
  useEffect(() => {
    if (showPrompt && inputRef.current) {
      // Small delay to ensure the prompt is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, [showPrompt]);

  useEffect(() => {
    Mousetrap.bind("mod+shift+p", () => {
      if (showPrompt) return clear();
      setShowPrompt(true);
    });
    return () => {
      Mousetrap.unbind("mod+shift+p");
    };
  }, [showPrompt, setShowPrompt]);

  // Reset selected index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  // Scroll active item into view
  useEffect(() => {
    const scrollToActive = debounce(() => {
      if (items.length <= 6) return;
      const el = document.querySelector(".active-command-item");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    scrollToActive();
  }, [selectedIndex]);

  if (!showPrompt) return null;

  return (
    <UiCard className="command-prompt w-full max-w-lg mx-auto shadow-xl m-4 p-4 fixed left-1/2 transform -translate-x-1/2 z-[99999]">
      <div className="flex items-center border-b pb-4 mb-4">
        <Icon
          name="Search2Line"
          className="mr-3 text-neutral-600 dark:text-[color:var(--selected-dark-text)]"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={translations.commandPrompt.placeholder || "-"}
          className="w-full bg-transparent command-input"
        />
      </div>

      <UiList className="max-h-80 overflow-auto space-y-1 scroll command-scroll">
        {items.map((item, index) => (
          <UiListItem
            key={item.id}
            onClick={() => selectItem(item, true)}
            className={`cursor-pointer flex items-center justify-between rounded-md px-2 py-1 ${
              index === selectedIndex
                ? "active-command-item bg-primary bg-opacity-10"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
          >
            <div className="w-full">
              <p className="text-overflow w-full flex justify-between">
                <span className="flex items-center">
                  {item.type === "folder" &&
                    (item.icon ? (
                      <span className="text-neutral-600 dark:text-[color:var(--selected-dark-text)] mr-2 w-4">
                        {item.icon}
                      </span>
                    ) : (
                      <Icon
                        name="Folder5Fill"
                        className="text-neutral-600 dark:text-[color:var(--selected-dark-text)] mr-2 w-4"
                        style={{ color: item.color || "#6B7280" }}
                      />
                    ))}

                  {item.type === "note" &&
                    (item.isLocked ? (
                      <Icon
                        name="LockLine"
                        className="text-neutral-600 dark:text-[color:var(--selected-dark-text)] mr-2 w-4"
                      />
                    ) : (
                      <Icon
                        name="File"
                        className="text-neutral-600 dark:text-[color:var(--selected-dark-text)] mr-2 w-4"
                      />
                    ))}

                  {item.type === "command" && (
                    <Icon
                      name={(item.icon as IconName) || "CodeLine"}
                      className="text-neutral-600 dark:text-[color:var(--selected-dark-text)] mr-2 w-4"
                    />
                  )}

                  {item.title ||
                    item.name ||
                    translations.commandPrompt.untitledNote}
                </span>
                {!isCommand && item.type !== "command" && (
                  <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                )}
              </p>
              {!isCommand && !item.isLocked && item.type === "note" && (
                <p className="text-overflow text-xs">{item.content}</p>
              )}
            </div>
          </UiListItem>
        ))}
      </UiList>
    </UiCard>
  );
};
