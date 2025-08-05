import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";

export const useFolderStore = create(
  persist(
    (set, get) => ({
      data: {},
      deletedIds: {},

      // Getters
      folders: () => Object.values(get().data).filter((f) => f.id),
      getById: (id) => get().data[id],
      getByParent: (parentId = null) =>
        Object.values(get().data).filter(
          (f) => f.parentId === parentId && f.id
        ),
      getPath: (folderId) => {
        const path = [];
        let current = get().data[folderId];

        while (current) {
          path.unshift(current);
          current = current.parentId ? get().data[current.parentId] : null;
        }
        return path;
      },
      getDescendants: (folderId) => {
        const descendants = [];
        const queue = [folderId];

        while (queue.length) {
          const currentId = queue.shift();
          const children = Object.values(get().data).filter(
            (f) => f.parentId === currentId
          );

          children.forEach((child) => {
            descendants.push(child);
            queue.push(child.id);
          });
        }
        return descendants;
      },
      hasChildren: (folderId) =>
        Object.values(get().data).some((f) => f.parentId === folderId),
      exists: (id) => !!get().data[id] && !get().deletedIds[id],

      // Actions
      retrieve: async () => {
        const data = JSON.parse(localStorage.getItem("folders")) || {};
        const deletedIds =
          JSON.parse(localStorage.getItem("deletedFolderIds")) || {};
        set({ data, deletedIds });
      },
      add: async (folder = {}) => {
        try {
          const id = folder.id || nanoid();
          const newFolder = {
            id,
            name: folder.name || "New Folder",
            parentId: folder.parentId || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: folder.color || null,
            isExpanded: folder.isExpanded ?? true,
            ...folder,
          };

          if (newFolder.parentId && !get().data[newFolder.parentId]) {
            throw new Error("Parent folder not found");
          }

          set((state) => ({ data: { ...state.data, [id]: newFolder } }));
          localStorage.setItem("folders", JSON.stringify(get().data));
          return newFolder;
        } catch (error) {
          console.error("Error adding folder:", error);
          throw error;
        }
      },
      update: async (id, data) => {
        try {
          if (
            data.parentId &&
            get().wouldCreateCircularReference(id, data.parentId)
          ) {
            throw new Error("Circular reference detected");
          }

          set((state) => {
            const updated = {
              ...state.data[id],
              ...data,
              updatedAt: Date.now(),
            };
            return { data: { ...state.data, [id]: updated } };
          });

          localStorage.setItem("folders", JSON.stringify(get().data));
          return get().data[id];
        } catch (error) {
          console.error("Error updating folder:", error);
          throw error;
        }
      },
      delete: async (id, options = {}) => {
        try {
          const folder = get().data[id];
          if (!folder) throw new Error("Folder not found");

          // Handle children
          const children = get().getByParent(id);
          for (const child of children) {
            if (options.deleteContents) {
              await get().delete(child.id, options);
            } else {
              await get().update(child.id, {
                parentId: options.moveContentsTo || folder.parentId,
              });
            }
          }

          // Mark as deleted
          set((state) => ({
            data: Object.fromEntries(
              Object.entries(state.data).filter(([key]) => key !== id)
            ),
            deletedIds: { ...state.deletedIds, [id]: Date.now() },
          }));

          localStorage.setItem("folders", JSON.stringify(get().data));
          localStorage.setItem(
            "deletedFolderIds",
            JSON.stringify(get().deletedIds)
          );
          return id;
        } catch (error) {
          console.error("Error deleting folder:", error);
          throw error;
        }
      },
      wouldCreateCircularReference: (folderId, targetParentId) => {
        if (folderId === targetParentId) return true;
        let current = get().data[targetParentId];

        while (current) {
          if (current.id === folderId) return true;
          current = current.parentId ? get().data[current.parentId] : null;
        }
        return false;
      },
    }),
    {
      name: "folder-storage",
      partialize: (state) => ({
        data: state.data,
        deletedIds: state.deletedIds,
      }),
    }
  )
);

export default useFolderStore;
