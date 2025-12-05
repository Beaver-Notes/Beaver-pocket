import { create } from "zustand";
import { useStorage } from "@/composable/storage";

const storage = useStorage();

export const useAppStore = create((set, get) => ({
  // state
  setting: {
    collapsibleHeading: true,
  },
  loading: false,

  // actions
  retrieve: async () => {
    const collapsible = await storage.get("collapsibleHeading", true);

    set({
      setting: {
        collapsibleHeading:
          typeof collapsible === "boolean"
            ? collapsible
            : collapsible === "true",
      },
    });
  },

  setSettingStorage: (key, value) => {
    storage.set(key, value);
    set((state) => ({
      setting: {
        ...state.setting,
        [key]: value,
      },
    }));
  },

  setLoading: (value) => set({ loading: value }),
}));
