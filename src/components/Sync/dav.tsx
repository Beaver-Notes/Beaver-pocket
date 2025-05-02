import React, { useEffect, useState } from "react";
import { WebDavService } from "../../utils/Webdav/webDavApi";
import icons from "../../lib/remixicon-react";
import { Note } from "../../store/types";

interface WebdavProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Webdav: React.FC<WebdavProps> = () => {
  // Correctly destructuring props
  const [baseUrl, setBaseUrl] = useState<string>(
    () => localStorage.getItem("baseUrl") || ""
  );
  const [username, setUsername] = useState<string>(
    () => localStorage.getItem("username") || ""
  );
  const [password, setPassword] = useState<string>(
    () => localStorage.getItem("password") || ""
  );
  const [] = useState(
    () =>
      new WebDavService({
        baseUrl: baseUrl,
        username: username,
        password: password,
      })
  );
  // Translations
  //@ts-ignore
  const [translations, setTranslations] = useState({
    webdav: {
      title: "webdav.title",
      login: "webdav.login",
      username: "webdav.username",
      password: "webdav.password",
      export: "webdav.export",
      import: "webdav.import",
      autoSync: "wevdav.autoSync",
    },
    accessibility: {
      webdavUrl: "accessibility.webdavUrl",
      hidePasswd: "accessibility.hidePasswd",
      showPasswd: "accessibility.showPasswd",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  const [showInputContent, setShowInputContent] = useState(false);

  useEffect(() => {
    localStorage.setItem("baseUrl", baseUrl);
    localStorage.setItem("username", username);
    localStorage.setItem("password", password);
  }, [baseUrl, username, password]);

  const login = async () => {
    try {
      localStorage.setItem("baseUrl", baseUrl);
      localStorage.setItem("username", username);
      localStorage.setItem("password", password);
      location.reload();
    } catch (error) {
      console.log("Error logging in");
    }
  };

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "webdav";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "webdav" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "webdav" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "webdav";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  const toggleInputContentVisibility = () => {
    setShowInputContent(!showInputContent);
  };

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <section>
          <div className="flex flex-col">
            <div className="space-y-2">
              <p
                className="text-4xl text-left font-bold p-4"
                aria-label="Webdav"
              >
                Webdav
              </p>
              <div className="flex justify-center items-center">
                <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
                  <icons.CloudLine className="w-32 h-32 text-neutral-800 dark:text-neutral-200" />
                </div>
              </div>
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                value={baseUrl}
                placeholder="https://server.example"
                onChange={(e) => setBaseUrl(e.target.value)}
                aria-label={translations.accessibility.webdavUrl}
              />
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                placeholder={translations.webdav.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-label={translations.webdav.username}
              />
              <div className="relative">
                <input
                  className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                  type={showInputContent ? "text" : "password"}
                  placeholder={translations.webdav.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label={translations.webdav.password}
                />
                <button
                  onClick={toggleInputContentVisibility}
                  className="absolute right-0 py-2.5 text-sm dark:text-[color:var(--selected-dark-text)] text-neutral-500 focus:outline-none"
                  aria-label={
                    showInputContent
                      ? translations.accessibility.hidePasswd
                      : translations.accessibility.showPasswd
                  }
                >
                  {showInputContent ? (
                    <icons.EyeLineIcon className="w-8 h-8 mr-2" />
                  ) : (
                    <icons.EyeCloseLineIcon className="w-8 h-8 mr-2" />
                  )}
                </button>
              </div>
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={login}
                aria-label={translations.webdav.login}
              >
                {translations.webdav.login || "-"}
              </button>
              <div className="flex items-center py-2 justify-between">
                <div>
                  <p
                    className="block text-lg align-left"
                    aria-label={translations.webdav.autoSync}
                  >
                    {translations.webdav.autoSync || "-"}
                  </p>
                </div>
                <label
                  className="relative inline-flex cursor-pointer items-center"
                  aria-label={translations.webdav.autoSync}
                >
                  <input
                    id="switch"
                    type="checkbox"
                    checked={autoSync}
                    onChange={handleSyncToggle}
                    className="peer sr-only"
                    aria-checked={autoSync}
                    aria-labelledby="auto-sync-toggle"
                  />
                  <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Webdav;
