import { useState, useEffect, useCallback, useRef } from "react";
import { Preferences } from "@capacitor/preferences";

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
            applyThemeClass(e.matches ? "dark" : "light");
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
