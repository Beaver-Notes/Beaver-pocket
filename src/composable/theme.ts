import { useState, useEffect, useCallback, useRef } from "react";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { StatusBar, Style } from "@capacitor/status-bar";

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark" | "system">("system");
  const mediaQueryListener = useRef<((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null>(null);

  const applyThemeClass = (theme: "light" | "dark") => {
    const rootElement = document.documentElement;
    rootElement.classList.remove("light", "dark"); // ensure only one
    rootElement.classList.add(theme);
  };

  const isDark = useCallback(() => {
    if (currentTheme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return currentTheme === "dark";
  }, [currentTheme]);

  const setTheme = useCallback(
    async (name: "light" | "dark" | "system", isSystem = false) => {
      if (mediaQueryListener.current) {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaQueryListener.current);
        mediaQueryListener.current = null;
      }

      setCurrentTheme(isSystem ? "system" : name);

      const resolvedTheme =
        isSystem && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : !isSystem && name === "dark"
          ? "dark"
          : "light";

      applyThemeClass(resolvedTheme);

      await Preferences.set({ key: "theme", value: isSystem ? "system" : name });

      if (isSystem) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        mediaQueryListener.current = (e) => {
          if (currentTheme === "system") {
            const newTheme = e.matches ? "dark" : "light";
            applyThemeClass(newTheme);
          }
        };
        mediaQuery.addEventListener("change", mediaQueryListener.current);
      }
    },
    [currentTheme]
  );

  const loadTheme = useCallback(async () => {
    const { value } = await Preferences.get({ key: "theme" });
    const savedTheme = (value as "light" | "dark" | "system") || "system";
    setTheme(savedTheme, savedTheme === "system");
  }, [setTheme]);

  useEffect(() => {
    if (Capacitor.getPlatform() === "android") {
      (async () => {
        try {
          await EdgeToEdge.setBackgroundColor({
            color: isDark() ? "#262626" : "#ffffff",
          });
          await StatusBar.setStyle({
            style: isDark() ? Style.Dark : Style.Light,
          });
        } catch (err) {
          console.warn("Failed to set system UI theme:", err);
        }
      })();
    }
  }, [currentTheme, isDark]);

  useEffect(() => {
    loadTheme();
    return () => {
      if (mediaQueryListener.current) {
        window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaQueryListener.current);
        mediaQueryListener.current = null;
      }
    };
  }, [loadTheme]);

  return { isDark, setTheme, loadTheme, currentTheme };
}
