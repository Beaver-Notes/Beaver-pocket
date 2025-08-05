import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import Mousetrap from "mousetrap";
import { useNoteStore } from "@/store/note";
import useCommands from "@/utils/commands";
import { debounce } from "@/utils/helper";
import Icon from "../ui/Icon";
import UiCard from "../ui/Card";
import UiList from "../ui/List";
import UiListItem from "../ui/ListItem";
import { useTranslation } from "@/utils/translations";

type CommandItem = {
  id: string;
  title?: string;
  content?: string;
  updatedAt?: string | number;
  isLocked?: boolean;
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
    const source = isCommand ? commands : Object.values(noteStore.data || {});

    return source
      .map(
        (item: any): CommandItem =>
          isCommand ? item : { ...item, content: mergeContent(item.content) }
      )
      .filter(({ title, content }: { title?: string; content?: string }) => {
        const lowerTitle = title?.toLowerCase() || "";
        const inTitle = lowerTitle.includes(queryTerm);
        return isCommand ? inTitle : inTitle || content?.includes(queryTerm);
      });
  }, [isCommand, queryTerm, noteStore.data, commands]);

  const formatDate = (timestamp: string | number) => {
    return dayjs(timestamp).format("YYYY-MM-DD hh:mm");
  };

  const clear = () => {
    setShowPrompt(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const selectItem = (itemArg?: any, isManual?: boolean) => {
    const selected = isManual ? itemArg : items[selectedIndex];
    if (selected.handler) selected.handler();
    else if (selected.id) navigate(`/editor/${selected.id}`);
    clear();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === "Enter") {
      selectItem();
    } else if (e.key === "Escape") {
      clear();
    }
  };

  useEffect(() => {
    const loadTranslations = async () => {
      const t = await useTranslation();
      if (t) setTranslations(t);
    };
    loadTranslations();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") clear();
    };
    document.addEventListener("keyup", onKey);
    return () => document.removeEventListener("keyup", onKey);
  }, []);

  useEffect(() => {
    Mousetrap.bind("mod+shift+p", () => {
      if (showPrompt) return clear();
      setShowPrompt(true);
      inputRef.current?.focus();
    });
    return () => {
      Mousetrap.unbind("mod+shift+p");
    };
  }, [showPrompt, setShowPrompt]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

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
          className="mr-3 text-gray-600 dark:text-gray-200"
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
        {items.map((item: CommandItem, index: number) => (
          <UiListItem
            key={item.id}
            onClick={() => selectItem(item, true)}
            className={
              index === selectedIndex
                ? "cursor-pointer flex items-center justify-between active-command-item"
                : "cursor-pointer flex items-center justify-between"
            }
          >
            <div className="w-full">
              <p className="text-overflow w-full flex justify-between">
                <span>
                  {item.title || translations.commandPrompt.untitledNote}
                  {item.isLocked && (
                    <Icon
                      name="LockLine"
                      className="text-gray-600 dark:text-[color:var(--selected-dark-text)] ml-2 w-4 translate-y-[-1.5px]"
                    />
                  )}
                </span>
                {!isCommand && <span>{formatDate(item.updatedAt!)}</span>}
              </p>
              {!isCommand && !item.isLocked && (
                <p className="text-overflow text-xs">{item.content}</p>
              )}
            </div>
          </UiListItem>
        ))}
      </UiList>
    </UiCard>
  );
};
