// label.js
import { create } from "zustand";
import { useStorage } from "@/composable/storage";
import { useNoteStore } from "./note";

const storage = useStorage();

export const useLabelStore = create((set, get) => ({
  data: [],

  getByIds: (ids) => ids.filter((id) => get().data.includes(id)),

  retrieve: async () => {
    return new Promise((resolve) => {
      storage.get("labels", []).then((data) => {
        set({ data });
        resolve(data);
      });
    });
  },

  add: (name) => {
    return new Promise((resolve) => {
      // Check if name is a string and not empty
      if (typeof name !== "string" || name.trim() === "") {
        console.error("Invalid name:", name);
        resolve(null);
        return;
      }

      const validName = name.slice(0, 50);

      set((state) => ({
        data: [...state.data, validName],
      }));

      storage.set("labels", get().data).then(() => resolve(validName));
    });
  },

  delete: async (id) => {
    try {
      const labelIndex = get().data.indexOf(id);

      if (labelIndex === -1) return null;

      const noteStore = useNoteStore.getState();

      for (const note of noteStore.notes) {
        const noteLabelIndex = note.labels.indexOf(id);

        if (noteLabelIndex !== -1) {
          const copyLabels = [...note.labels];
          copyLabels.splice(noteLabelIndex, 1);

          await noteStore.update(note.id, {
            labels: copyLabels,
          });
        }
      }

      set((state) => ({
        data: state.data.filter((_, index) => index !== labelIndex),
      }));

      await storage.set("labels", get().data);

      return id;
    } catch (error) {
      console.error(error);
    }
  },
}));
