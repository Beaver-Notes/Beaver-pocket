import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { Note } from "./store/types";
import NoteEditor from "./Editor";
import useNoteEditor from "./store/useNoteActions";
import BottomNavBar from "./components/Home/BottomNavBar";
import "./css/main.css";
import "./css/fonts.css";
import "./css/settings.css";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import deTranslations from "./assets/locales/de.json";
import { useSaveNote, loadNotes } from "./store/notes";
import { useSwipeable } from "react-swipeable";
import Sidebar from "./components/Home/Sidebar";
import { useExportData } from "./utils/exportUtils";
import { useHandleImportData } from "./utils/importUtils";
import Icons from "./lib/remixicon-react";

const Settings: React.FC = () => {
  const { saveNote } = useSaveNote();
  const { exportUtils } = useExportData();
  const { importUtils } = useHandleImportData();

  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );

  const [selectedCodeFont, setSelectedCodeFont] = useState<string>(
    localStorage.getItem("selected-font-code") || "JetBrains Mono"
  );

  const Codefonts = ["JetBrains Mono", "Anonymous Pro", "Source Code Pro", "Hack"];

  const fonts = [
    "Arimo",
    "Avenir",
    "Helvetica",
    "EB Garamond",
    "OpenDyslexic",
    "Ubuntu",
  ];

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

  useEffect(() => {
    document.documentElement.style.setProperty("--selected-font", selectedFont);
    localStorage.setItem("selected-font", selectedFont);
  }, [selectedFont]);

  const updateFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFont(e.target.value);
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--selected-font-code",
      selectedCodeFont
    );
    localStorage.setItem("selected-font-code", selectedCodeFont);
  }, [selectedCodeFont]);

  const updatCodeFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCodeFont(e.target.value);
  };

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  // State to manage dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  // Effect to update the classList and localStorage when darkMode or themeMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  // Function to toggle dark mode
  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  // Function to set theme mode to auto based on device preference
  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
  };

  const [notesState, setNotesState] = useState<Record<string, Note>>({});

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery] = useState<string>("");

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  }, []);

  useEffect(() => {
    const filtered = Object.values(notesState).filter((note) => {
      const titleMatch = note.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const contentMatch = JSON.stringify(note.content)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return titleMatch || contentMatch;
    });

    setFilteredNotes(
      Object.fromEntries(filtered.map((note) => [note.id, note]))
    );
  }, [searchQuery, notesState]);

  const handleCloseEditor = () => {
    setActiveNoteId(null);
  };

  const exportData = () => {
    exportUtils(notesState); // Pass notesState as an argument
  };

  const handleImportData = () => {
    importUtils(setNotesState, loadNotes, searchQuery, setFilteredNotes); // Pass notesState as an argument
  };

  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  const { title, setTitle, handleChangeNoteContent } = useNoteEditor(
    activeNoteId,
    notesState,
    setNotesState,
    saveNote
  );

  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");
  const [filteredNotes, setFilteredNotes] =
    useState<Record<string, Note>>(notesState);

  const notesList = Object.values(filteredNotes).sort((a, b) => {
    switch (sortingOption) {
      case "alphabetical":
        return a.title.localeCompare(b.title);
      case "createdAt":
        const createdAtA = typeof a.createdAt === "number" ? a.createdAt : 0;
        const createdAtB = typeof b.createdAt === "number" ? b.createdAt : 0;
        return createdAtA - createdAtB;
      case "updatedAt":
      default:
        const updatedAtA = typeof a.updatedAt === "number" ? a.updatedAt : 0;
        const updatedAtB = typeof b.updatedAt === "number" ? b.updatedAt : 0;
        return updatedAtA - updatedAtB;
    }
  });
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

  // Translations
  const [translations, setTranslations] = useState({
    settings: {
      apptheme: "settings.apptheme",
      light: "settings.light",
      dark: "settings.dark",
      system: "settings.system",
      selectlanguage: "settings.selectlanguage",
      encryptwpasswd: "settings.encryptwpasswd",
      selectfont: "settings.selectfont",
      iedata: "settings.iedata",
      importdata: "settings.importdata",
      exportdata: "settings.exportdata",
      About: "settings.About",
      Shortcuts: "settings.Shortcuts",
      title: "settings.title",
      Inputpassword: "settings.Inputpassword",
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
      enterpasswd: "home.enterpasswd",
    },
  });

  const [wd, setwd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  useEffect(() => {
    setwd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const toggleBackground = () => {
    const newValue = !wd;
    localStorage.setItem("expand-editor", newValue.toString());
    setwd(newValue);
  };

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
        );
        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []); // Empty dependency array means this effect runs once on mount

  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "en"
  );

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "it", name: "Italiano", translations: itTranslations },
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    window.location.reload(); // Reload the page
  };

  const [selectedOption, setSelectedOption] = useState("System");

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  const [ClearFontChecked, setClearFontChecked] = useState(
    localStorage.getItem("selected-dark-text") === "#CCCCCC"
  );

  const toggleClearFont = () => {
    const newValue = !ClearFontChecked;
    setClearFontChecked(newValue);
    localStorage.setItem("selected-dark-text", newValue ? "#CCCCCC" : "white");
    document.documentElement.style.setProperty(
      "selected-dark-text",
      newValue ? "#CCCCCC" : "white"
    );
    window.location.reload();
  };

  return (
    <div {...handlers}>
      <div className="safe-area"></div>
      <div className="grid sm:grid-cols-[auto,1fr]">
        <Sidebar
          onCreateNewNote={handleCreateNewNote}
          isDarkMode={darkMode}
          toggleTheme={() => toggleTheme(!darkMode)}
          exportData={exportData}
          handleImportData={handleImportData}
        />

        <div className="overflow-y-hidden mb-12">
          {!activeNoteId && (
            <div className="py-2 w-full flex flex-col border-gray-300 overflow-auto">
              <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
                <p className="text-4xl font-bold text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
                  {" "}
                  {translations.settings.title || "-"}
                </p>
                <div className="w-full sm:order-2 order-1">
                  <p className="text-xl pt-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                    {translations.settings.apptheme || "-"}
                  </p>
                  <div className="w-auto p-4 mx-auto">
                    <div className="switches-container">
                      <input
                        type="radio"
                        id="switchMonthly"
                        name="switchPlan"
                        value="Light"
                        checked={selectedOption === "Light"}
                        onChange={(e) => {
                          toggleTheme(false);
                          handleOptionChange(e);
                        }}
                      />
                      <input
                        type="radio"
                        id="switchYearly"
                        name="switchPlan"
                        value="Dark"
                        checked={selectedOption === "Dark"}
                        onChange={(e) => {
                          toggleTheme(true);
                          handleOptionChange(e);
                        }}
                      />
                      <input
                        type="radio"
                        id="switchDay"
                        name="switchPlan"
                        value="System"
                        checked={selectedOption === "System"}
                        onChange={(e) => {
                          setAutoMode();
                          handleOptionChange(e);
                        }}
                      />
                      <label htmlFor="switchMonthly">Light</label>
                      <label htmlFor="switchYearly">Dark</label>
                      <label htmlFor="switchDay">System</label>
                      <div className="switch-wrapper">
                        <div className="switch">
                          <div>Light</div>
                          <div>Dark</div>
                          <div>System</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectfont || "-"}
                </p>
                <div className="relative pt-2">
                  <select
                    value={selectedFont}
                    onChange={updateFont}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-500 dark:text-[color:var(--selected-dark-text)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  Select Font Code
                </p>
                <div className="relative pt-2">
                <select
                  value={selectedCodeFont}
                  onChange={updatCodeFont}
                  className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                >
                  {Codefonts.map((Codefonts) => (
                    <option key={Codefonts} value={Codefonts}>
                      {Codefonts}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-500 dark:text-[color:var(--selected-dark-text)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl pt-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectlanguage || "-"}
                </p>
                <div className="relative pt-2">
                  <select
                    value={selectedLanguage}
                    onChange={updateLanguage}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                    <svg
                      className="h-4 w-4 text-gray-500 dark:text-[color:var(--selected-dark-text)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl py-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectlanguage || "-"}
                </p>
                <section className="py-2 bg-neutral-50 dark:bg-[#2D2C2C] p-2 rounded-xl">
                  <div className="flex items-center py-2 justify-between">
                    <div>
                      <span className="block text-lg align-left">
                        Expand page
                      </span>
                      <span className="block text-sm align-left">
                        Extends the editor size to full screen
                      </span>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        id="switch"
                        type="checkbox"
                        checked={wd}
                        onChange={toggleBackground}
                        className="peer sr-only"
                      />
                      <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                    </label>
                  </div>
                  <div className="flex items-center py-2 border-t-2 dark:border-neutral-600 justify-between">
                    <div>
                      <span className="block text-lg align-left">
                        Clear Font
                      </span>
                      <span className="block text-sm align-left">
                        Changes color scheme on OLED devices
                      </span>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        id="switch"
                        type="checkbox"
                        checked={ClearFontChecked}
                        onChange={toggleClearFont}
                        className="peer sr-only"
                      />
                      <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                    </label>
                  </div>
                </section>
                <div className="pb-4">
                  <div className="flex flex-col gap-2 pt-2">
                    <Link
                      to="/Sync"
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icons.SyncLineIcon className="w-6 h-6 mr-2" />
                      Sync
                    </Link>
                    <Link
                      to="/about"
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icons.InformationLineIcon className="w-6 h-6 mr-2" />
                      {translations.settings.About || "-"}
                    </Link>
                    <Link
                      to="/shortcuts"
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icons.KeyboardLineIcon className="w-6 h-6 mr-2" />
                      {translations.settings.Shortcuts || "-"}
                    </Link>
                  </div>
                </div>
              </div>
              <BottomNavBar onCreateNewNote={handleCreateNewNote} />
            </div>
          )}
        </div>
        <div>
          {activeNote && (
            <NoteEditor
              notesList={notesList}
              note={activeNote}
              title={title}
              onTitleChange={setTitle}
              onChange={handleChangeNoteContent}
              onCloseEditor={handleCloseEditor}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
