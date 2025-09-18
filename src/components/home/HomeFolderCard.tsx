import React, { useState, useRef, useMemo, useEffect } from "react";
import emojis from "emoji.json";
import Popover from "../ui/Popover";
import UiInput from "../ui/Input";
import Icon from "../ui/Icon";
import { Folder } from "@/store/types";
import { useFolderStore } from "@/store/folder";
import { IconName } from "@/lib/remixicon-react";
import { Link } from "react-router-dom";
import FolderTree from "./FolderTree";
import emitter from "tiny-emitter/instance";

interface Emoji {
  char: string;
  name: string;
  group?: string;
  subgroup?: string;
}

type EmojiCategory = {
  name: string;
  icon: string;
  groups: string[];
  subgroups?: string[];
};

interface FolderCardProps {
  folder: Folder;
  onUpdate?: (updateFolder: Folder) => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ folder }) => {
  const folderStore = useFolderStore();
  const [activeTab, setActiveTab] = useState<"icon" | "emoji">("icon");
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const iconColors = [
    "#ffba00",
    "#c27aff",
    "#fb64b6",
    "#fb2c36",
    "#51a2ff",
    "#a1a1a1",
    "#00bc7d",
  ];

  const emojiCategories: EmojiCategory[] = [
    {
      name: "Smileys & Emotion",
      icon: "EmotionLine",
      groups: ["Smileys & Emotion", "People & Body"],
    },
    {
      name: "Animals & Nature",
      icon: "LeafLine",
      groups: ["Animals & Nature"],
    },
    {
      name: "Food & Drink",
      icon: "Cake3Line",
      groups: ["Food & Drink"],
    },
    {
      name: "Travel & Places",
      icon: "PlaneLine",
      groups: ["Travel & Places"],
    },
    {
      name: "Activities",
      icon: "FootballLine",
      groups: ["Activities"],
    },
    {
      name: "Objects",
      icon: "LightbulbLine",
      groups: ["Objects"],
    },
    {
      name: "Symbols & Flags",
      icon: "FlagLine",
      groups: ["Symbols", "Flags"],
    },
  ];

  async function deleteFolder(folder: { id: string }) {
    emitter.emit("show-dialog", "", {
      title: "Delete Folder",
      body: "Are you sure you want to delete this folder and its contents?",
      okText: "Delete",
      okVariant: "danger",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          await folderStore.delete(folder.id, { deleteContents: true });
        } catch (error) {
          console.error(error);
        }
      },
    });
  }

  useEffect(() => {
    if (isRenaming) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    }
  }, [isRenaming]);

  const filteredEmojis = useMemo(() => {
    let filtered = emojis as Emoji[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((emoji) =>
        emoji.name.toLowerCase().includes(query)
      );
    } else if (selectedCategory) {
      const category = emojiCategories.find(
        (cat) => cat.name === selectedCategory
      );
      if (category) {
        filtered = filtered.filter((emoji) => {
          const mainGroup = (emoji.group || "").split(" (")[0];
          const inGroup = category.groups.includes(mainGroup);
          const inSubgroup = category.subgroups
            ? category.subgroups.includes(emoji.subgroup || "")
            : true;
          return inGroup && inSubgroup;
        });
      }
    }

    // Deduplicate emojis by visual appearance
    const seen = new Set<string>();
    filtered = filtered.filter((emoji) => {
      // Normalize and remove variation selectors (U+FE0F)
      const normalized = emoji.char.normalize("NFC").replace(/\uFE0F/g, "");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    return filtered;
  }, [searchQuery, selectedCategory, emojiCategories]);

  const startRenaming = () => {
    setNewName(folder.name);
    setIsRenaming(true);
  };

  const saveRename = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setNewName(folder.name);
    } else if (trimmedName !== folder.name) {
      folderStore.update(folder.id, { name: trimmedName });
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setNewName(folder.name);
    setIsRenaming(false);
  };

  const selectEmoji = (emoji: string) => {
    folderStore.update(folder.id, { icon: emoji, color: undefined });
  };

  const selectColorIcon = (color: string) => {
    folderStore.update(folder.id, { color, icon: undefined });
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-700/50 transform rounded-xl transition-transform ui-card overflow-hidden hover:ring-2 ring-secondary group note-card transition flex flex-row items-center p-3">
      {/* Emoji / Icon Selector */}
      <Popover
        padding="p-3 flex flex-col print:hidden"
        triggerContent={
          <button className="transition hoverable h-10 w-10 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
            {folder.icon ? (
              <span className="text-2xl select-none">{folder.icon}</span>
            ) : (
              <Icon
                name="Folder5Fill"
                className="w-6 h-6"
                style={{ color: folder.color || "#6B7280" }}
              />
            )}
          </button>
        }
      >
        {/* Tab Headers */}
        <div className="flex mb-4 border-b border-neutral-200 dark:border-neutral-700 w-full relative">
          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === "icon"
                ? "text-primary"
                : "text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
            onClick={() => setActiveTab("icon")}
          >
            Colors
          </button>
          <button
            className={`flex-1 px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === "emoji"
                ? "text-primary"
                : "text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
            onClick={() => setActiveTab("emoji")}
          >
            Emojis
          </button>

          {/* Animated underline */}
          <div
            className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300"
            style={{
              width: "50%",
              left: activeTab === "icon" ? "0%" : "50%",
            }}
          />
        </div>

        {/* Color Icons Grid */}
        {activeTab === "icon" && (
          <div className="grid grid-cols-4 gap-2">
            {iconColors.map((color) => (
              <button
                key={color}
                className="p-2 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => selectColorIcon(color)}
              >
                <Icon
                  name="Folder5Fill"
                  className="w-6 h-6"
                  style={{ color }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Emoji Section */}
        {activeTab === "emoji" && (
          <div className="w-full">
            {/* Search Bar */}
            <div className="mb-3">
              <UiInput
                value={searchQuery}
                prependIcon="Search2Line"
                clearable
                placeholder="Search emojis..."
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Escape") {
                    (e.target as HTMLElement).blur();
                  }
                }}
                onChange={(value) => setSearchQuery(value.toLowerCase())}
              />
            </div>

            {/* Category Filters */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                {emojiCategories.map((category) => {
                  return (
                    <button
                      key={category.name}
                      className={`flex items-center p-2 rounded-full text-xs font-medium transition-all duration-200 ${
                        selectedCategory === category.name
                          ? "bg-primary text-white"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                      onClick={() =>
                        setSelectedCategory(
                          selectedCategory === category.name
                            ? null
                            : category.name
                        )
                      }
                    >
                      <Icon
                        name={`${category.icon as IconName}`}
                        className="w-6 h-6"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Emoji Grid */}
            <div className="w-full max-h-64 overflow-auto overflow-x-hidden">
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.length > 0 ? (
                  filteredEmojis.map((emoji) => (
                    <button
                      key={emoji.char}
                      className="text-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 p-2 rounded-md transition-colors duration-150 relative group"
                      style={{
                        fontFamily: `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji", sans-serif`,
                      }}
                      title={emoji.name}
                      onClick={() => selectEmoji(emoji.char)}
                    >
                      {emoji.char}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 col-span-8">
                    <Icon
                      name="EmotionUnhappyFill"
                      className="w-8 h-8 mx-auto mb-2 opacity-50"
                    />
                    <p className="text-sm">No emojis found</p>
                    <p className="text-xs mt-1">
                      Try a different search term or category
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Popover>
      {/* Folder Name */}
      <div className="flex flex-col flex-grow min-w-0 ml-2">
        {!isRenaming ? (
          <Link
            to={`/folder/${folder.id}`}
            className="flex-1 bg-transparent focus:outline-none font-medium truncate"
          >
            {folder.name}
          </Link>
        ) : (
          <input
            ref={renameInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-transparent focus:outline-none font-medium"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveRename();
              } else if (e.key === "Escape") {
                e.preventDefault();
                cancelRename();
              }
            }}
            onBlur={saveRename}
          />
        )}
      </div>
      {/* Actions */}
      <div className="flex z-10 items-center text-neutral-600 dark:text-neutral-200 gap-2">
        {!isRenaming ? (
          <button
            type="button"
            className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)] "
            onClick={startRenaming}
          >
            <Icon name="Edit2Line" />
          </button>
        ) : (
          <button
            type="button"
            className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)] "
            onClick={saveRename}
          >
            <Icon name="CheckLine" />
          </button>
        )}
        <button
          type="button"
          className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)] "
          onClick={() => setShowModal(true)}
        >
          <Icon name="FolderTransferLine" />
        </button>
        <button
          type="button"
          className="hover:text-red-500 dark:hover:text-red-400 "
          onClick={() => {
            deleteFolder(folder);
          }}
        >
          <Icon name="DeleteBinLine" />
        </button>
      </div>
      <FolderTree
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        folder={folder}
        mode="folder"
      />
    </div>
  );
};

export default FolderCard;
