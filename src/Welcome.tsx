import React, { useEffect, useState } from "react";
import "./css/fonts.css";
import "./css/welcome.css";
import ArrowRightLineIcon from "remixicon-react/ArrowRightLineIcon";
import ArrowLeftLineIcon from "remixicon-react/ArrowLeftLineIcon";
import { useNavigate } from "react-router-dom";
import { Note } from "./store/types";
import { version } from "../package.json";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import deTranslations from "./assets/locales/de.json";

const Welcome: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    "view1" | "view2" | "view3" | "view4" | "view5" | "view6"
  >("view1");

  const history = useNavigate();
  const [notesState, setNotesState] = useState<Record<string, Note>>({});
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);
  const [searchQuery] = useState<string>("");

  const handleViewChange = (
    view: "view1" | "view2" | "view3" | "view4" | "view5" | "view6"
  ) => {
    setCurrentView(view);
  };

  const [languageIndex, setLanguageIndex] = useState(0);
  const languagetitle = [
    "🌎 Select your language",
    "🌍 Seleziona la tua lingua",
    "🌍 Wählen Sie Ihre Sprache",
  ];

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

  // Translations
  const [translations, setTranslations] = useState({
    welcome: {
      next: "welcome.next",
      back: "welcome.back",
      welcomeTitle: "welcome.welcomeTitle",
      welcomeParagraph: "welcome.welcomeParagraph",
      welcomeWarning: "welcome.welcomeWarning",
      languageText: "welcome.languageText",
      getStarted: "welcome.getStarted",
      themeTitle: "welcome.themeTitle",
      themeText: "welcome.themeText",
      typographyTitle: "welcome.typographyTitle",
      typographyText: "welcome.typographyText",
      importTitle: "welcome.importTitle",
      importText: "welcome.importText",
      start: "welcome.start",
      startTitle: "welcome.startTitle",
      skip: "welcome.skip",
      dark: "welcome.dark",
      light: "welcome.light",
      system: "welcome.system",
      import: "welcome.import",
    },
  });

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "it", name: "Italiano", translations: itTranslations },
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    location.reload();
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLanguageIndex((prevIndex) => (prevIndex + 1) % languagetitle.length);
    }, 2000);

    return () => clearInterval(intervalId); // Cleanup the interval on component unmount
  }, []); // Empty dependency array ensures the effect runs only once on mount

  const STORAGE_PATH = "notes/data.json";

  async function createNotesDirectory() {
    const directoryPath = "notes";

    try {
      await Filesystem.mkdir({
        path: directoryPath,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (error: any) {
      console.error("Error creating the directory:", error);
    }
  }
  const loadNotes = async () => {
    try {
      await createNotesDirectory(); // Create the directory before reading/writing

      const fileExists = await Filesystem.stat({
        path: STORAGE_PATH,
        directory: Directory.Documents,
      });

      if (fileExists) {
        const data = await Filesystem.readFile({
          path: STORAGE_PATH,
          directory: Directory.Documents,
          encoding: FilesystemEncoding.UTF8,
        });

        if (data.data) {
          const parsedData = JSON.parse(data.data as string);

          if (parsedData?.data?.notes) {
            return parsedData.data.notes;
          } else {
            console.log(
              "The file is missing the 'notes' data. Returning an empty object."
            );
            return {};
          }
        } else {
          console.log("The file is empty. Returning an empty object.");
          return {};
        }
      } else {
        console.log("The file doesn't exist. Returning an empty object.");
        return {};
      }
    } catch (error) {
      console.error("Error loading notes:", error);
      return {};
    }
  };

  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);

        if (importedData && importedData.data && importedData.data.notes) {
          const importedNotes: Record<string, Note> = importedData.data.notes;

          // Load existing notes from data.json
          const existingNotes = await loadNotes();

          // Merge the imported notes with the existing notes
          const mergedNotes: Record<string, Note> = {
            ...existingNotes,
            ...importedNotes,
          };

          // Update the notesState with the merged notes
          setNotesState(mergedNotes);

          // Update the filteredNotes based on the search query
          const filtered = Object.values(mergedNotes).filter((note) => {
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

          Object.values(importedNotes).forEach((note) => {
            note.createdAt = new Date(note.createdAt);
            note.updatedAt = new Date(note.updatedAt);
          });

          // Save the merged notes to the data.json file
          await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data: { notes: mergedNotes } }),
            directory: Directory.Documents,
            encoding: FilesystemEncoding.UTF8,
          });

          alert("Data imported successfully!");
        } else {
          alert("Invalid data format.");
        }
      } catch (error) {
        console.error("Error while importing data:", error);
        alert("Error while importing data.");
      }
    };

    reader.readAsText(file);
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

  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );

  const fonts = [
    "Arimo",
    "Avenir",
    "Helvetica",
    "EB Garamond",
    "OpenDyslexic",
    "Ubuntu",
  ];

  useEffect(() => {
    document.documentElement.style.setProperty("--selected-font", selectedFont);
    localStorage.setItem("selected-font", selectedFont);
  }, [selectedFont]);

  const updateFont = (selectedFont: string) => {
    setSelectedFont(selectedFont);
  };

  return (
    <div className={`view ${currentView}`}>
      {currentView === "view1" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] mx-10 rounded-3xl">
            <div className="pt-2">
            <img src="./imgs/icon.png" alt="Beaver Notes Icon" className="w-40 h-40 mx-auto rounded-full"/>
            </div>
            <h3 className="text-center">
              {" "}
              {translations.welcome.welcomeTitle || "-"}
            </h3>
            <p className="text-center sm:mx-10">
              {translations.welcome.welcomeParagraph || "-"}
            </p>
            <div className="mt-4 sm:mt-1 bg-amber-300 bg-opacity-30 rounded-xl border-2 border-amber-300 border-opacity-60 sm:mx-10">
              <p className="p-2">
                {translations.welcome.welcomeWarning || "-"}
              </p>
            </div>
            <div className="flex items-center justify-center fixed bottom-20 inset-x-2">
              <p className="mt-2">V. {version}</p>
            </div>
            <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
              <button
                className="p-4 rounded-xl bg-[#2D2C2C] hover:bg-[#3a3939] text-white items-center justify-center"
                onClick={() => handleViewChange("view2")}
              >
                {translations.welcome.getStarted || "-"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view2" && (
        <div className={`flex items-center justify-center mt-[5em]`}>
          <div className="sm:w-[32em] mx-10 rounded-3xl">
            <h3 className="pt-4 text-center">{languagetitle[languageIndex]}</h3>
            <p className="text-center sm:mx-10">
              {translations.welcome.languageText || "-"}
            </p>
            <div className="relative pt-2">
              <select
                value={selectedLanguage}
                onChange={updateLanguage}
                className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 mt-2 flex items-center px-3 pointer-events-none">
                <svg
                  className="h-4 w-4 text-gray-500 dark:text-white"
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
            <div className="relative pt-2">
              <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view1")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" />
                  {translations.welcome.back || "-"}
                </button>
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view3")}
                >
                  {translations.welcome.next || "-"}
                  <ArrowRightLineIcon className="inline-block w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view3" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] mx-10 rounded-3xl">
            <h3 className="pt-4 text-center">
              {translations.welcome.themeTitle || "-"}
            </h3>
            <p className="pt-2 text-center sm:mx-10">
              {translations.welcome.themeText || "-"}
            </p>
            <div className="w-full sm:order-2 order-1">
              <div className="grid py-2 mt-10 w-full h-full grid-cols-3 gap-8 cursor-pointer rounded-md items-center justify-center">
                <button
                  className="bg-transparent rounded-xl"
                  onClick={() => toggleTheme(false)}
                >
                  <div className="w-auto mt-4 object-fit">
                    <svg
                      className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                      viewBox="0 0 512 512"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="512" height="512" rx="256" fill="#FFFFFF" />
                    </svg>
                  </div>
                  <p className="text-center py-2">
                    {translations.welcome.light || "-"}
                  </p>
                </button>
                <button
                  onClick={() => toggleTheme(true)}
                  className="bg-transparent rounded-xl"
                >
                  <div className="w-auto mt-4 object-fit">
                    <svg
                      className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                      viewBox="0 0 512 512"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect width="512" height="512" rx="256" fill="#282727" />
                    </svg>
                  </div>
                  <p className="text-center py-2">
                    {translations.welcome.dark || "-"}
                  </p>
                </button>
                <button
                  onClick={setAutoMode}
                  className="bg-transparent rounded-xl"
                >
                  <div className="w-auto mt-4 object-contain">
                    <svg
                      className="mx-auto my-auto w-auto sm:w-16 md:w-24 rounded-full border-2 dark:border-neutral-800"
                      viewBox="0 0 511 512"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M0 256C0 114.615 114.615 0 256 0V0V512V512C114.615 512 0 397.385 0 256V256Z"
                        fill="white"
                      />
                      <path
                        d="M256 0V0C396.833 0 511 115.167 511 256V256C511 396.833 396.833 512 256 512V512V0Z"
                        fill="#282727"
                      />
                    </svg>
                  </div>
                  <p className="text-center py-2">
                    {" "}
                    {translations.welcome.system || "-"}
                  </p>
                </button>
              </div>
              <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view2")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" />
                  {translations.welcome.back || "-"}
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view4")}
                >
                  {translations.welcome.next || "-"}
                  <ArrowRightLineIcon className="inline-block w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view4" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] mx-10 rounded-3xl">
            <h3 className="pt-4 text-center">
              {translations.welcome.typographyTitle || "-"}
            </h3>
            <p className="pt-2 text-center sm:mx-10">
              {translations.welcome.typographyText || "-"}
            </p>
            <div className="relative pt-2">
              <div className="grid grid-cols-1">
                {fonts.map((font) => (
                  <button
                    key={font}
                    className={`rounded-xl p-3 mx-2 dark:text-white text-gray-800 ${
                      selectedFont === font
                        ? "bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white"
                        : "bg-transparent"
                    }`}
                    onClick={() => updateFont(font)}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
              <button
                className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                onClick={() => handleViewChange("view3")}
              >
                <ArrowLeftLineIcon className="inline-block w-5 h-5" />
                {translations.welcome.back || "-"}
              </button>
              <button
                className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                onClick={() => handleViewChange("view5")}
              >
                {translations.welcome.next || "-"}
                <ArrowRightLineIcon className="inline-block w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view5" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] mx-10 rounded-3xl">
            <h3 className="pt-4 text-center">
              {translations.welcome.importTitle || "-"}
            </h3>
            <p className="pt-2 text-center sm:mx-10">
              {translations.welcome.importText || "-"}
            </p>
            <div className="mb-2 w-full p-4 text-xl rounded-xl items-center px-10 py-14">
              <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                <FileDownloadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
              </div>
              <div className="w-auto px-10 mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]">
                <label htmlFor="file">
                  <p className="text-center text-gray-800 dark:text-gray-300">
                  {translations.welcome.import || "-"}
                  </p>
                </label>
                <input
                  className="hidden"
                  type="file"
                  onChange={handleImportData}
                  id="file"
                  // @ts-ignore
                  directory=""
                  webkitdirectory=""
                />
              </div>
            </div>
            <div className="relative pt-2">
              <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view4")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" />{" "}
                  {translations.welcome.back || "-"}
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view6")}
                >
                  {translations.welcome.skip || "-"}
                  <ArrowRightLineIcon className="inline-block w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view6" && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center sm:w-[32em] mx-10 rounded-3xl">
            <h3 className="pt-4 text-center">
              {translations.welcome.startTitle || "-"}
            </h3>
            <div className="relative pt-2">
              <div className="flex items-center justify-center fixed bottom-6 inset-x-2">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view5")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" />{" "}
                  {translations.welcome.back || "-"}
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => history("/")}
                >
                  {translations.welcome.start || "-"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Welcome;
