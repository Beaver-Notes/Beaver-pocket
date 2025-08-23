import { create } from "zustand";
import { useNoteStore } from "./note";
import { useLabelStore } from "./label";
import { usePasswordStore } from "./passwd";
import { useFolderStore } from "./folder";
import { useAppStore } from "./app";

export const useStore = create((set, get) => ({
  inReaderMode: false,
  activeNoteId: "",
  showPrompt: false,

  retrieve: async () => {
    const appStore = useAppStore.getState();
    const noteStore = useNoteStore.getState();
    const labelStore = useLabelStore.getState();
    const folderStore = useFolderStore.getState();
    const passwordStore = usePasswordStore.getState();

    try {
      const results = await Promise.allSettled([
        appStore.retrieve(),
        noteStore.retrieve(),
        labelStore.retrieve(),
        folderStore.retrieve(),
        passwordStore.retrieve(),
      ]);

      // Optional: Handle any rejected promises
      const errors = results
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason);

      if (errors.length > 0) {
        console.warn("Some stores failed to retrieve data:", errors);
      }

      // Return successful results
      return results
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);
    } catch (error) {
      console.error("Error during store retrieval:", error);
      throw error;
    }
  },
}));
