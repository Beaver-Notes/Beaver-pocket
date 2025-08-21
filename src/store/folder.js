import { create } from "zustand";
import { nanoid } from "nanoid";
import { useStorage } from "@/composable/storage";

const storage = useStorage();

export const useFolderStore = create((set, get) => ({
  //state
  data: {},
  deletedIds: {},

  //getters
  folders: () => Object.values(get().data).filter((f) => f.id),
  getById: (id) => get().data[id],
  getByParent: (parentId = null) =>
    Object.values(get().data).filter((f) => f.parentId === parentId && f.id),

  rootFolders: (state) => {
    return Object.values(state.data).filter(
      (folder) => !folder.parentId && folder.id
    );
  },

  getFolderPath: (folderId) => {
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
  getFolderDepth: (state) => (folderId) => {
    if (!folderId || !state.data[folderId]) return 0;

    let depth = 0;
    let currentFolder = state.data[folderId];

    while (currentFolder && currentFolder.parentId) {
      depth++;
      currentFolder = state.data[currentFolder.parentId];
    }

    return depth;
  },

  getFolderTree:
    (state) =>
    (parentId = null) => {
      const folders = Object.values(state.data)
        .filter((folder) => folder.parentId === parentId && folder.id)
        .sort((a, b) => a.name.localeCompare(b.name));

      return folders.map((folder) => ({
        ...folder,
        children: state.getFolderTree(folder.id),
        hasChildren: Object.values(state.data).some(
          (f) => f.parentId === folder.id
        ),
      }));
    },

  validFolders: () => {
    const { data, deletedIds } = get();
    return Object.values(data).filter(
      (folder) => folder.id && !deletedIds[folder.id]
    );
  },

  // Actions
  retrieve: async () => {
    const data = await storage.get("folders", {});
    const deletedIds = await storage.get("deletedFolderIds", {});
    set({ data, deletedIds });
  },
  add: async (folderId, folder = {}) => {
    try {
      const id = folderId || nanoid();
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

      const folders = await storage.get("folders", {});

      folders[id] = newFolder;

      await storage.set("folders", folders);

      set((state) => ({ data: { ...state.data, [id]: newFolder } }));

      return newFolder;
    } catch (error) {
      console.error("Error adding folder:", error);
      throw error;
    }
  },
  update: async (id, updates) => {
    try {
      if (
        updates.parentId &&
        get().wouldCreateCircularReference(id, updates.parentId)
      ) {
        throw new Error("Circular reference detected");
      }

      const folders = await storage.get("folders", {});

      if (!folders[id]) {
        throw new Error(`Note with id ${id} not found`);
      }

      const updatedFolder = {
        ...folders[id],
        ...updates,
        updatedAt: Date.now(),
      };

      folders[id] = updatedFolder;

      await storage.set("folders", folders);

      set((state) => ({
        data: {
          ...state.data,
          [id]: updatedFolder,
        },
      }));

      return updatedFolder;
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
  },
  move: async (id, newParentId) => {
    const store = get();
    if (newParentId && store.wouldCreateCircularReference(id, newParentId)) {
      throw new Error("Circular reference detected");
    }
    await store.update(id, { parentId: newParentId });
  },
  delete: async (id, options = {}) => {
    const folders = await storage.get("folders", {});
    const folder = folders[id];

    if (!folder) return null;

    const { deleteContents = false, moveContentsTo = null } = options;
    const store = get();
    const children = store.getByParent(id);

    for (const child of children) {
      if (deleteContents) {
        await store.delete(child.id, options);
      } else {
        const newParentId = moveContentsTo || folder.parentId;
        await store.update(child.id, { parentId: newParentId });
      }
    }

    delete folders[id];

    const deletedIds = { ...get().deletedIds, [id]: Date.now() };

    set({
      data: Object.fromEntries(
        Object.entries(get().data).filter(([key]) => key !== id)
      ),
      deletedIds,
    });

    await storage.set("folders", folders);
    await storage.set("deletedIds", deletedIds);

    await trackChange(`folders.${id}`, null);
    await trackChange("deletedIds", deletedIds);

    return id;
  },
  exists: (state) => (id) => {
    return !!state.data[id] && !state.deletedIds[id];
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
}));
