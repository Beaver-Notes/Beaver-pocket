import { Folder } from "@/store/types";
import { useFolderStore } from "@/store/folder";
import Icon from "../ui/Icon";
import React, { useState, useMemo } from "react";

interface FolderTreeItemProps {
  folder: Folder;
  selectedId: string | null;
  currentNoteFolderId?: string | null;
  onSelect: (id: string) => void;
  level?: number;
}

const FolderTreeItem: React.FC<FolderTreeItemProps> = ({
  folder,
  selectedId,
  currentNoteFolderId,
  onSelect,
  level = 0,
}) => {
  const folderStore = useFolderStore();
  const [isExpanded, setIsExpanded] = useState(true);

  const isSelected = selectedId === folder.id;
  const isCurrentFolder = currentNoteFolderId === folder.id;

  const subfolders = useMemo(() => {
    return folderStore
      .validFolders()
      .filter((f: Folder) => f.parentId === folder.id)
      .sort((a: Folder, b: Folder) => a.name.localeCompare(b.name));
  }, [folderStore.data, folderStore.deletedIds, folder.id]);

  const hasSubfolders = subfolders.length > 0;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleFolderClick = () => {
    if (!isCurrentFolder) onSelect(folder.id);
  };

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center rounded cursor-pointer transition
          ${isSelected ? "bg-primary bg-opacity-20" : ""}
          ${isCurrentFolder ? "opacity-50" : ""}
          p-2
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleFolderClick}
      >
        {/* Chevron (fixed square). If none, render a spacer of same size */}
        {hasSubfolders ? (
          <button
            onClick={handleToggleExpand}
            className={`mr-1 grid place-items-center rounded
                        hover:bg-neutral-200 dark:hover:bg-neutral-600
                        ${
                          isSelected
                            ? "hover:bg-primary hover:bg-opacity-20"
                            : ""
                        }
                        w-6 h-6`}
            disabled={isCurrentFolder}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <Icon
              name={isExpanded ? "ArrowDownSLine" : "ArrowRightSLine"}
              className="w-4 h-4"
            />
          </button>
        ) : (
          <div className="mr-1 w-6 h-6" />
        )}
        {/* Icon slot (fixed 20px box) */}
        <div className="mr-2 w-5 h-5 grid place-items-center">
          {folder.icon ? (
            <span className="text-[18px] leading-none select-none">
              {folder.icon}
            </span>
          ) : (
            <Icon name="Folder5Fill" className="w-5 h-5" />
          )}
        </div>
        <span className={`${isCurrentFolder ? "text-neutral-800" : ""} flex-1 truncate`}>
          {folder.name}
        </span>
      </div>

      {hasSubfolders && isExpanded && (
        <div>
          {subfolders.map((subfolder: Folder) => (
            <FolderTreeItem
              key={subfolder.id}
              folder={subfolder}
              selectedId={selectedId}
              currentNoteFolderId={currentNoteFolderId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderTreeItem;
