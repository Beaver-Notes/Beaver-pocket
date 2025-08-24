import { Folder, Note } from "@/store/types";
import React, { useState, useEffect, useMemo } from "react";
import { useFolderStore } from "@/store/folder";
import { useNoteStore } from "@/store/note";
import { useTranslation } from "@/utils/translations";
import Icon from "../ui/Icon";
import { UiModal } from "../ui/Modal";
import FolderTreeItem from "./FolderTreeItem";
import UiButton from "../ui/Button";

interface Props {
  note?: Note | null;
  folder?: Folder | null;
  isOpen: boolean;
  mode?: "note" | "folder";
  onClose: () => void;
}

const FolderTree: React.FC<Props> = ({
  note = null,
  folder = null,
  isOpen,
  mode = "note",
  onClose,
}) => {
  const noteStore = useNoteStore();
  const folderStore = useFolderStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const rootFolders = useMemo(() => {
    return folderStore
      .validFolders()
      .filter((f: any) => !f.parentId || f.parentId === null)
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [folderStore.data, folderStore.deletedIds]);

  const [translations, setTranslations] = useState<Record<string, any>>({
    folderTree: {},
  });

  useEffect(() => {
    const run = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    run();
  }, []);

  // Reset selected folder when modal opens
  useEffect(() => {
    if (isOpen && note) {
      setSelectedId(note.folderId || null);
    }
  }, [isOpen, note]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setIsMoving(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleMove = async () => {
    if (selectedId === note?.folderId || selectedId === folder?.parentId) {
      return;
    }

    setIsMoving(true);
    try {
      if (mode === "folder" && folder) {
        await folderStore.move(folder.id, selectedId);
        onClose();
      } else if (mode === "note" && note) {
        await noteStore.moveToFolder(note.id, selectedId);
        onClose();
      }
    } catch (error) {
      console.error("Move failed:", error);
    } finally {
      setIsMoving(false);
    }
  };

  const currentNoteFolderId =
    mode === "note" ? note?.folderId : folder?.parentId;

  const canMove = selectedId !== currentNoteFolderId;

  return (
    <UiModal
      modelValue={isOpen}
      onClose={handleClose}
      persist={true}
      allowSwipeToDismiss={true}
      className="fixed inset-0 flex justify-center items-end md:items-center p-5 z-50 bg-black bg-opacity-20 print:hidden"
    >
      <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {translations.folderTree.moveToFolder}
      </h3>

      <div
        className={`
         flex items-center p-2 rounded cursor-pointer transition
            ${selectedId === null ? "bg-primary bg-opacity-20" : ""}
          `}
        onClick={() => setSelectedId(null)}
      >
        <Icon
          name="HomeLine"
          className={`w-5 h-5 mr-2 ${
            selectedId === null ? "text-primary" : ""
          }`}
        />
        <span> {translations.folderTree.root} </span>
      </div>

      {/* Folder tree container */}
      <div className="max-h-64 overflow-y-auto p-1">
        {rootFolders.length > 0 ? (
          <div>
            {rootFolders.map((rootFolder: Folder) => (
              <FolderTreeItem
                key={rootFolder.id}
                folder={rootFolder}
                selectedId={selectedId}
                currentNoteFolderId={currentNoteFolderId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 justify-center flex flex-col items-center">
            <Icon name="Folder5Fill" className="text-4xl size-8 text-primary mb-2" />
            <p>{translations.folderTree.noFolders || "No folders"}</p>
            <p className="text-sm">
              {translations.folderTree.newFolder ||
                "Create a new folder to organize your notes"}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex space-x-2 rtl:space-x-0">
        <UiButton className="w-6/12 rtl:ml-2" onClick={handleClose}>
          {translations.folderTree.cancel || "Cancel"}
        </UiButton>
        <UiButton
          className="w-6/12"
          variant="primary"
          disabled={!canMove || isMoving}
          onClick={handleMove}
        >
          {translations.folderTree.move || "Move"}
        </UiButton>
      </div>
    </UiModal>
  );
};

export default FolderTree;
