import React, { useEffect, useState } from "react";
import { WebDavService } from "./deps/WebDavApi";
import "./css/main.css";
import "./css/fonts.css";
import { useExportDav, useImportDav } from "./utility/WebdavUtil";
import ServerLineIcon from "remixicon-react/ServerLineIcon";
import BottomNavBar from "../../components/Home/BottomNavBar";
import { v4 as uuid } from "uuid";
import { useNotesState } from "../../store/Activenote";
import { useSaveNote } from "../../store/notes";
import EyeLineIcon from "remixicon-react/EyeLineIcon";
import EyeCloseLineIcon from "remixicon-react/EyeCloseLineIcon";
import Sidebar from "../../components/Home/Sidebar";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { useHandleImportData } from "../../utils/importUtils";
import { useExportData } from "../../utils/exportUtils";
import { loadNotes } from "../../store/notes";
import { Note } from "../../store/types";


const ExampleComponent: React.FC = () => {
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
    new WebDavService({
      baseUrl: baseUrl,
      username: username,
      password: password,
    })
  );
  // Translations
  const [translations] = useState({
    about: {
      title: "about.title",
      app: "about.app",
      description: "about.description",
      version: "about.version",
      website: "about.website",
      github: "about.github",
      donate: "about.donate",
      copyright: "about.Copyright",
    },
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareTitle: "home.shareTitle",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importError: "home.importError",
      importInvalid: "home.importInvalid",
      title: "home.title",
    },
  });
  const [showInputContent, setShowInputContent] = useState(false);
  const { notesState, setNotesState ,setActiveNoteId } = useNotesState();
  const { saveNote } = useSaveNote();
  const { importUtils } = useHandleImportData();
  const { exportUtils } = useExportData();
  const [searchQuery] = useState<string>("");
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);

  const handleCreateNewNote = () => {
    const newNote = {
      id: uuid(),
      title: translations.home.title || "New Note",
      content: { type: "doc", content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };
    setNotesState((prevNotes) => ({
      ...prevNotes,
      [newNote.id]: newNote,
    }));
    setActiveNoteId(newNote.id);
    saveNote(newNote);
  };

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

  const { exportdata } = useExportDav();
  const { HandleImportData } = useImportDav();

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

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  const navigate = useNavigate();

  const handleSwipe = (eventData: any) => {
    const isRightSwipe = eventData.dir === "Right";
    const isSmallSwipe = Math.abs(eventData.deltaX) < 250;

    if (isRightSwipe && isSmallSwipe) {
      eventData.event.preventDefault();
    } else if (isRightSwipe) {
      navigate(-1); // Navigate back
    }
  };

  const handlers = useSwipeable({
    onSwiped: handleSwipe,
  });

  const exportData = () => {
    exportUtils(notesState); // Pass notesState as an argument
  };

  const handleImportData = () => {
    importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes); // Pass notesState as an argument
  };

  return (
    <div {...handlers}>
      <div className="safe-area"></div>
      <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />           <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <section className="">
          <div className="flex flex-col">
            <div className="space-y-2">
              <p className="ml-2 text-4xl text-left font-bold">
                Sync with <br /> WebDAV
              </p>
              <div className="flex justify-center items-center">
                <div className="relative bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 rounded-full w-36 h-36 flex justify-center items-center">
                  <ServerLineIcon className="w-32 h-32 text-gray-800 dark:text-neutral-200 p-3" />
                </div>
              </div>
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border-amber-300 focus:border-amber-400 focus:outline-none focus:border-amber-300 border-2 p-2 rounded-xl pr-10"
                value={baseUrl}
                placeholder="https://server.example"
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border-amber-300 focus:border-amber-400 focus:outline-none focus:border-amber-300 border-2 p-2 rounded-xl pr-10"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div className="relative">
                <input
                  className="w-full p-3 dark:bg-neutral-800 border-amber-300 focus:border-amber-400 focus:outline-none focus:border-amber-300 border-2 p-2 rounded-xl pr-10"
                  type={showInputContent ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  onClick={toggleInputContentVisibility}
                  className="absolute right-0 py-2.5 text-sm dark:text-white text-gray-500 focus:outline-none"
                >
                  {showInputContent ? (
                    <EyeLineIcon className="w-8 h-8 mr-2" />
                  ) : (
                    <EyeCloseLineIcon className="w-8 h-8 mr-2" />
                  )}
                </button>
              </div>
              <button
                className="bg-neutral-200 dark:text-white dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={login}
              >
                Log in
              </button>
              <button
                className="bg-neutral-200 dark:text-white dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                Export data
              </button>
              <button
                className="bg-neutral-200 dark:text-white dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={HandleImportData}
              >
                Import Data
              </button>
              <div className="flex items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="switch"
                    type="checkbox"
                    checked={autoSync}
                    onChange={handleSyncToggle}
                    className="peer sr-only"
                  />
                  <label htmlFor="switch" className="hidden"></label>
                  <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  <span className="inline-block ml-2 align-middle">
                    Auto sync
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>
        <BottomNavBar onCreateNewNote={handleCreateNewNote} />
      </div>
    </div>
  );
};

export default ExampleComponent;
