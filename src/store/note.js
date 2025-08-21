import { create } from "zustand";
import { nanoid } from "nanoid";
import { AES } from "crypto-es/lib/aes.js";
import { Utf8 } from "crypto-es/lib/core.js";
import { useStorage } from "@/composable/storage";
import { trackChange } from "@/utils/sync";
import { useFolderStore } from "./folder";
import { SpotSearch } from "@daniele-rolli/capacitor-spotsearch";
import { Preferences } from "@capacitor/preferences";

const storage = useStorage();

async function isIndexingEnabled() {
  const { value } = await Preferences.get({ key: "indexing" });
  return value === "true";
}

function getPlainText(node) {
  if (!node) return "";
  if (typeof node === "string") return node;

  if (Array.isArray(node)) {
    return node.map(getPlainText).join(" ");
  }

  if (typeof node === "object" && node.text) return node.text;

  if (typeof node === "object" && Array.isArray(node.content)) {
    return node.content.map(getPlainText).join(" ");
  }

  return "";
}

function findAllNodesInRange(fragment, name) {
  if (!fragment) return [];
  if (!Array.isArray(fragment))
    return findAllNodesInRange(fragment.content, name);
  return fragment.flatMap((n) => {
    if (n.type === name) return [n];
    return findAllNodesInRange(n.content, name);
  });
}

function unCollapsedFootnotes(note, footnotes) {
  let lastNode = note.content.content.at(-1);
  if (lastNode?.type !== "footnotes") {
    lastNode = {
      type: "footnotes",
      content: [],
      attrs: { class: "footnotes" },
    };
    note.content.content.push(lastNode);
  }
  const footnoteMap = [...footnotes, ...lastNode.content].reduce(
    (a, c) => ({ ...a, [c.attrs["data-id"]]: c }),
    {}
  );
  const references = findAllNodesInRange(
    note.content.content,
    "footnoteReference"
  );
  lastNode.content = references.map(
    (r, i) =>
      footnoteMap[r.attrs["data-id"]] || {
        type: "footnote",
        content: [{ type: "paragraph", content: [] }],
        attrs: { "data-id": r.attrs["data-id"], id: `fn:${i + 1}` },
      }
  );
}

export const useNoteStore = create((set, get) => ({
  //state
  data: {},
  deletedIds: {},
  syncInProgress: false,

  //getters
  getById: (id) => get().data[id],

  getByFolder: (folderId = null) => {
    return Object.values(get().data).filter(
      (note) => note.folderId === folderId && note.id
    );
  },

  getFolderContents: (folderId = null) => {
    const folderStore = useFolderStore.getState();
    const notes = Object.values(get().data)
      .filter((note) => note.folderId === folderId && note.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const folders = folderStore
      .getByParent(folderId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return { folders, notes };
  },

  searchNotes: (query) => {
    const searchTerm = query.toLowerCase();
    return Object.values(get().data).filter((note) => {
      if (!note.id) return false;
      return (
        note.title.toLowerCase().includes(searchTerm) ||
        JSON.stringify(note.content).toLowerCase().includes(searchTerm)
      );
    });
  },

  getNotesCountByFolder: (folderId = null) => {
    return Object.values(get().data).filter(
      (note) => note.folderId === folderId && note.id
    ).length;
  },

  // actions
  retrieve: async () => {
    try {
      const localStorageData = await storage.get("notes", {});
      const safeData =
        localStorageData && typeof localStorageData === "object"
          ? localStorageData
          : {};

      set((state) => ({
        data: { ...state.data, ...safeData },
      }));

      const migrationCompleted = await storage.get(
        "migration_completed",
        false
      );
      if (!migrationCompleted) {
        await get().migrateLockData();
        await storage.set("migration_completed", true);
      }
    } catch (e) {
      console.error("Error retrieving notes:", e);
      set({ data: {} });
    }
  },

  migrateLockData: async () => {
    console.log("Running one-time lock data migration...");

    const lockStatus = await storage.get("lockStatus", {});
    const isLocked = await storage.get("isLocked", {});

    if (
      Object.keys(lockStatus).length === 0 &&
      Object.keys(isLocked).length === 0
    ) {
      console.log("No legacy lock data found, skipping migration");
      return;
    }

    const updated = { ...get().data };
    let hasChanges = false;

    Object.keys(updated).forEach((id) => {
      const oldLockStatus =
        lockStatus[id] === "locked" || isLocked[id] === true;
      if (oldLockStatus && !updated[id].isLocked) {
        updated[id].isLocked = true;
        hasChanges = true;
        console.log(`Migrated lock status for note ${id}`);
      }
    });

    if (hasChanges) {
      await storage.set("notes", updated);
      set({ data: updated });
      console.log("Lock data migration completed with changes");
    } else {
      console.log("Lock data migration completed - no changes needed");
    }

    await storage.delete("lockStatus");
    await storage.delete("isLocked");
  },

  add: async (noteId, note = {}) => {
    try {
      const folderStore = useFolderStore.getState();

      if (note.folderId && !(await folderStore.exists(note.folderId))) {
        throw new Error("Folder does not exist");
      }

      const id = noteId || nanoid();

      const newNote = {
        id,
        title: "",
        content: { type: "doc", content: [] },
        labels: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBookmarked: false,
        isArchived: false,
        isLocked: false,
        folderId: note.folderId || null,
        ...note,
      };

      const notes = await storage.get("notes", {});

      notes[id] = newNote;

      await storage.set("notes", notes);

      set((state) => ({
        data: {
          ...state.data,
          [id]: newNote,
        },
      }));

      await trackChange(`notes.${id}`, newNote);

      if (isIndexingEnabled) {
        await SpotSearch.indexItems({
          items: [
            {
              id,
              domain: "notes",
              title: newNote.title,
              snippet: getPlainText(newNote.content).slice(0, 500),
              keywords: [],
              url: `beaver-pocket://note/${id}`,
            },
          ],
        });
      }

      return newNote;
    } catch (e) {
      console.error("Error adding note:", e);
    }
  },

  update: async (id, updates = {}) => {
    const folderStore = useFolderStore.getState();
    if (updates.folderId && !(await folderStore.exists(updates.folderId))) {
      throw new Error("Folder does not exist");
    }

    const notes = await storage.get("notes", {});

    if (!notes[id]) {
      throw new Error(`Note with id ${id} not found`);
    }

    const updatedNote = {
      ...notes[id],
      ...updates,
      updatedAt: Date.now(),
    };

    notes[id] = updatedNote;

    await storage.set("notes", notes);

    set((state) => ({
      data: {
        ...state.data,
        [id]: updatedNote,
      },
    }));

    await trackChange(`notes.${id}`, updatedNote);

    if (isIndexingEnabled) {
      await SpotSearch.indexItems({
        items: [
          {
            id,
            domain: "notes",
            title: updatedNote.title,
            snippet: getPlainText(updatedNote.content).slice(0, 500),
            keywords: updatedNote.labels,
            url: `beaver-pocket://note/${id}`,
          },
        ],
      });
    }

    return updatedNote;
  },

  moveToFolder: async (noteId, folderId) => {
    const folderStore = useFolderStore.getState();
    if (folderId && !(await folderStore.exists(folderId))) {
      throw new Error("Target folder does not exist");
    }
    return await get().update(noteId, { folderId });
  },

  moveMultipleToFolder: async (noteIds, folderId) => {
    const folderStore = useFolderStore.getState();
    if (folderId && !(await folderStore.exists(folderId))) {
      throw new Error("Target folder does not exist");
    }
    const store = get();
    const results = [];
    for (const noteId of noteIds) {
      if (store.data[noteId]) {
        const result = await store.update(noteId, { folderId });
        results.push(result);
      }
    }
    return results;
  },

  delete: async (id) => {
    const notes = await storage.get("notes", {});

    if (!notes[id]) return null;

    delete notes[id];

    const deletedIds = { ...get().deletedIds, [id]: Date.now() };

    set({
      data: Object.fromEntries(
        Object.entries(get().data).filter(([key]) => key !== id)
      ),
      deletedIds,
    });

    await storage.set("notes", notes);
    await storage.set("deletedIds", deletedIds);

    await trackChange(`notes.${id}`, null);
    await trackChange("deletedIds", deletedIds);

    if (isIndexingEnabled) {
      await SpotSearch.deleteItems({ ids: [id] });
    }

    return id;
  },

  duplicateToFolder: async (noteId, targetFolderId) => {
    const store = get();
    const originalNote = store.data[noteId];
    if (!originalNote) throw new Error("Note not found");
    const folderStore = useFolderStore.getState();
    if (targetFolderId && !(await folderStore.exists(targetFolderId))) {
      throw new Error("Target folder does not exist");
    }
    const duplicatedNote = await store.add({
      ...originalNote,
      id: undefined,
      title: `${originalNote.title} (Copy)`,
      folderId: targetFolderId,
    });
    return duplicatedNote;
  },

  convertNote: (id) => {
    const store = get();
    const note = store.data[id];
    const footnotes = [];
    note.content.content = store.uncollapseHeading(
      note.content.content,
      footnotes
    );
    if (footnotes.length) unCollapsedFootnotes(note, footnotes);
  },

  uncollapseHeading: (contents, footnotes) => {
    if (!contents.length) return contents;
    let newContents = [];
    const store = get();
    for (const content of contents) {
      newContents.push(content);
      if (content.type === "heading") {
        let collapsedContent = content.attrs.collapsedContent ?? [];
        let collapsedFootnotes = content.attrs.collapsedFootnotes ?? [];
        if (collapsedFootnotes.length) footnotes.push(...collapsedFootnotes);
        if (typeof collapsedContent === "string")
          collapsedContent = collapsedContent
            ? JSON.parse(collapsedContent)
            : [];
        content.attrs.open = true;
        content.attrs.collapsedContent = null;
        content.attrs.collapsedFootnotes = null;
        if (collapsedContent.length)
          newContents = [
            ...newContents,
            ...store.uncollapseHeading(collapsedContent, footnotes),
          ];
      }
    }
    return newContents;
  },

  lockNote: async (id, password) => {
    if (!password) return;
    const store = get();
    try {
      const note = store.data[id];
      if (!note) {
        throw new Error("Note not found");
      }

      if (note.isLocked) {
        console.log("Note is already locked");
        return;
      }

      const encrypted = AES.encrypt(
        JSON.stringify(note.content),
        password
      ).toString();

      await store.update(id, {
        content: { type: "doc", content: [encrypted] },
        isLocked: true,
      });

      console.log(`Note ${id} locked successfully`);
    } catch (error) {
      console.error("Error locking note:", error);
      throw error;
    }
  },

  unlockNote: async (id, password) => {
    if (!password) return;
    const store = get();
    try {
      const note = store.data[id];
      if (!note) {
        throw new Error("Note not found");
      }

      if (!note.isLocked) {
        console.log("Note is not locked");
        return;
      }

      const decrypted = AES.decrypt(note.content.content[0], password).toString(
        Utf8
      );

      if (!decrypted) {
        throw new Error("Failed to decrypt - invalid password");
      }

      const content = JSON.parse(decrypted);

      console.log("Note decrypted successfully");

      const collapsibleHeading = Preferences.get("collapsible");
      const isCollapsible = collapsibleHeading === "true";

      if (!isCollapsible) store.convertNote(id);

      await store.update(id, { content, isLocked: false });

      console.log(`Note ${id} unlocked successfully`);
    } catch (e) {
      console.error("Error unlocking note:", e);
      throw new Error("Failed to unlock note. Please check your password.");
    }
  },

  addLabel: async (id, labelId) => {
    const store = get();
    const note = store.data[id];
    if (!note || note.labels.includes(labelId)) return;
    note.labels.push(labelId);
    await store.update(id, { labels: note.labels });
  },

  removeLabel: async (id, labelId) => {
    const store = get();
    const note = store.data[id];
    if (!note || !note.labels.includes(labelId)) return;
    note.labels = note.labels.filter((l) => l !== labelId);
    await store.update(id, { labels: note.labels });
  },

  cleanupDeletedIds: async (days = 30) => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const newDeleted = { ...get().deletedIds };
    Object.entries(newDeleted).forEach(([id, ts]) => {
      if (ts < cutoff) delete newDeleted[id];
    });
    set({ deletedIds: newDeleted });
    await storage.set("deletedIds", newDeleted);
    await trackChange("deletedIds", newDeleted);
  },
}));
