import React, { useEffect, useState } from "react";
import "./css/fonts.css";
import ArrowRightLineIcon from "remixicon-react/ArrowRightLineIcon";
import ArrowLeftLineIcon from "remixicon-react/ArrowLeftLineIcon";
import { useNavigate } from "react-router-dom";
import { Note } from "./store/types";
import FileDownloadLineIcon from "remixicon-react/FileDownloadLineIcon";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";

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
    <div>
      {currentView === "view1" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] sm:h-[32em] mx-10 rounded-3xl sm:bg-gray-600 sm:bg-opacity-5 sm:dark:bg-gray-200">
            <div className="pt-2">
              <svg
                width="200"
                height="200"
                className="rounded-full mx-auto"
                viewBox="0 0 512 512"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="512" height="512" fill="url(#pattern0)" />
                <defs>
                  <pattern
                    id="pattern0"
                    patternContentUnits="objectBoundingBox"
                    width="1"
                    height="1"
                  >
                    <use href="#image0_1_3" transform="scale(0.00195312)" />
                  </pattern>
                  <image
                    id="image0_1_3"
                    width="512"
                    height="512"
                    href="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAACAKADAAQAAAABAAACAAAAAAD/wAARCAIAAgADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBAMDAwQFBAQEBAUHBQUFBQUHCAcHBwcHBwgICAgICAgICgoKCgoKCwsLCwsNDQ0NDQ0NDQ0N/9sAQwECAgIDAwMGAwMGDQkHCQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQ0N/90ABAAg/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACikJAGTwB1NZFzrunWuQZPMYdVj+b9en61jWxFKjHmqySXmXTpTm7QVzYorg7nxXcOSLWJYx2LHcfr6fzrDm1K/usied2B/hzhfyGBXz2K4swdK6p3k/uX46/genSyevLWdl/XkelzajZW+RLMikdV3fN+Q5rJm8UadGSIxJL6FVwP1wf0rz7rRXhVeMMTJ/uoJL73+n5HowyOlH45N/gdbL4rkIxBbqP99t36DH86ov4k1Nz8pRP91c/zzWBRXlVs+x9Teo16afkdsMvw0doL56mlJrGpy8tcuD/snb/LFVnvb2Th7iVvq5P8zVaiuKWOxMtJ1G/Vs3VClHWMUvkh29z1Yn6mkyaSiuZtvc1sLk0odx0Yj8abRQm1sBaS9vI/9XPIv0cj+tWE1jU4+VuXz74b+YNZtFb08ZiaatCo16NozlQpS+KKfyN6PxJqkf3nST/eUf8AsuK0IfFcoGJ7dW90Yr+hB/nXI0V30c+x1P4aj+ev53Oapl2Gmrclj0GDxRpsuBJ5kfuVyP0yf0rXg1CyuceTOjEnAGcH8jzXk9FetQ4uxMdKsVL8P6+446mSUn8Da/E9koryi31K+tcC3mZFHReq/kcit228UzphbqJZB/eX5T+XIP6V7mF4rwlWyqpxf3r71/kefVyavH4LP+v66ndUVj22vaZc4Hm+Wx/hk+X9en61rggjI5Br6GjiKVaPNSkmvI8upSnB2mrC0UUVsQFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/0P38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiq9xdW9onmXDhF9+/0HU/hXI33ieQlo7FCnbe45/Advx/KvOx2a4bBxvWlr26/d/SOnD4SrWdoI6+4ure0TzLiRY19Sev0HU/hXL3filPu2Ee7/bfp+Q5/MiuPlmlncyTMXY92OTUVfF43iyvUbjh48q+9/5L+tT3sPk1OKvV1f4F661G8u8m4lZgT93oo/AcVRoor5mrWnVlz1G2/NnrwhGCtFWQUUUVkUFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFXbXUb2yP+jyso/u9V/I8VSoq6dWpTkp05WfdEThGa5ZK6Ozs/FScLfR7c/wAadPyPP611VvdW93H5lvIrr7Hp9R1FeRVJFNLA4khdkYdCpwa+owPFeIpe7iFzrvs/8vw+Z5WIyalPWk7P8D2CiuJsfE7riO+XcOB5i9R9R0P4Yrrra6t7tPMt5Fdfbt9R1Ffa4HNMNi1+5lr2e/3f5aHgYjB1aD99ad+hYooor0DmCiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0f38ooooAKKKKACiiigAooooAKKKKACiiigAoorOv9TttOj3Tn5j91B94/59aipVhTi5zdkiowcnyxV2X2ZUBZiABySTgAVyupeJoo8xWAEjDrIfuj6Dv/L61zeo6vd6gxDtsi7Rjp+Pqay+lfC5rxTKd6WD0X83X5dvXf0PoMJkyVp1/u/zJri4nupTNcOXc9z/ACHoKhoor46pOU5Oc3ds91JJcsVZBRRRUjCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAqaC5uLRvMtpDGw7j+o71DRTjOUJKcHZoTSas9judN8SxykRXwEb/AN8fdP1Hb+X0rqVZXAZSCDyCK8drU0/V7vT2Cod8XeM9Pw9D9K+xyriqULU8bqv5uvz7+u/qeHjMnUveob9j1Cis7T9UtdRTdA3zD7yH7w/+tWjX3VKrCrBTpu6fVHz04ShLlkrMKKKK0JCiiigAooooAKKKKACiiigAooooA//S/fyiiigAooooAKKKKACiiigAooooAKKazKilmIAAySeABXDax4gabNtYkiPoz9C3sPQfz/nwZhmNHB0/aVX6LqzpwuEqV58sPv7Grq2vR2263syHlGQW6qh/qf0/lXESySTuZJWLsxySeTUFFfmeZ5pXxs71HaPRdF/wfM+tweDp4eNo79woooryjqCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAkilkgkWWJijryCpxXdaRr8d1i3u8JN0DdFb/A/59q4GivTyzNa2CnzU3ddV0f8AwfM5MXg6deNpb9z2SiuF0jxA0BFtektH/C56r7H2/UV3KsGAZTkHkEcg1+nZdmVHGU/aUn6rqj5PE4WpQlyzFooorvOYKKKKACiiigAooooAKKKKAP/T/fyiiigAooooAKKKKACiiigAqOWWOFDLKwVFGSx6CiWVIY2llIVFGWJ7CvO9W1aXUZNikrbqflX19z/nivKzXNaWCpc0tZPZf10OvCYSVeVlt1Y7V9akvyYospbg8DoX9z/Qf5GDRRX5fi8bVxNV1aru3/X3H12Hpwow5IIKKKK5DcKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAC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"
                  />
                </defs>
              </svg>
            </div>
            <h3 className="text-center">🎉 Welcome to Beaver Pocket</h3>
            <p className="text-center sm:mx-10">
              All the amazing features introduced with Beaver Notes are packed
              into the perfect note-taking app for you on the go.
            </p>
            <div className="mt-4 sm:mt-1 bg-amber-300 bg-opacity-30 rounded-xl border-2 border-amber-300 border-opacity-60 sm:mx-10">
              <p className="p-2">
                Beaver Pocket is currently in its alpha stage, which may lead to
                issues. Therefore it's advised to back up your data regularly.
                Please be aware that data loss is a possibility.
              </p>
            </div>
            <p className="text-center py-12 sm:hidden text-gray-600">
              V. 1.1-alpha
            </p>
            <div className="flex items-center justify-center sm:mt-8 fixed bottom-6 inset-x-2 sm:relative">
              <button
                className="p-4 rounded-xl bg-[#2D2C2C] hover:bg-[#3a3939] text-white items-center justify-center"
                onClick={() => handleViewChange("view2")}
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view2" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] sm:h-[32em] mx-10 rounded-3xl sm:bg-gray-600 sm:bg-opacity-5 sm:dark:bg-gray-200">
            <h3 className="pt-4 text-center">🪄 Set the Mood</h3>
            <p className="pt-2 text-center sm:mx-10">
              Choose the appearance that best suits your style. Rest assured,
              you can always revisit your preferences and make adjustments in
              the settings later on.
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
                  <p className="text-center py-2">Light</p>
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
                  <p className="text-center py-2">Dark</p>
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
                  <p className="text-center py-2">System</p>
                </button>
              </div>
              <div className="flex items-center justify-center sm:mt-[6.5em] fixed bottom-6 inset-x-2 sm:relative">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view1")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" /> Back
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view3")}
                >
                  Next <ArrowRightLineIcon className="inline-block w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view3" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] sm:h-[32em] mx-10 rounded-3xl sm:bg-gray-600 sm:bg-opacity-5 sm:dark:bg-gray-200">
            <h3 className="pt-4 text-center">✍️ Craft Your Typography</h3>
            <p className="pt-2 text-center sm:mx-10">
              Personalize your note-taking experience with fonts that reflect
              your style. You can always revisit and update this choice in the
              settings later.
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
            <div className="flex items-center justify-center sm:mt-10 fixed bottom-6 inset-x-2 sm:relative">
              <button
                className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                onClick={() => handleViewChange("view2")}
              >
                <ArrowLeftLineIcon className="inline-block w-5 h-5" /> Back
              </button>
              <button
                className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                onClick={() => handleViewChange("view4")}
              >
                Next <ArrowRightLineIcon className="inline-block w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view4" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] sm:h-[32em] mx-10 rounded-3xl sm:bg-gray-600 sm:bg-opacity-5 sm:dark:bg-gray-200">
            <h3 className="pt-4 text-center">🚚 Import your notes</h3>
            <p className="pt-2 text-center sm:mx-10">
              Effortlessly bring in your notes taken on Beaver Notes. Don't use
              the desktop app or not ready to import now? No worries — you can
              import them in settings anytime.
            </p>
            <div className="mb-2 w-full p-4 text-xl rounded-xl items-center px-10 py-14">
              <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                <FileDownloadLineIcon className="w-12 h-12 text-gray-800 dark:text-gray-300" />
              </div>
              <div className="w-auto px-10 mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]">
                <label htmlFor="file">
                  <p className="text-center text-gray-800 dark:text-gray-300">
                    click to Import
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
              <div className="flex items-center justify-center sm:mt-[3.2em] fixed bottom-6 inset-x-2 sm:relative">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view3")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" /> Back
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view5")}
                >
                  Skip <ArrowRightLineIcon className="inline-block w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view5" && (
        <div className="flex items-center justify-center mt-[5em]">
          <div className="sm:w-[32em] sm:h-[32em] mx-10 rounded-3xl sm:bg-gray-600 sm:bg-opacity-5 sm:dark:bg-gray-200">
            <h3 className="pt-4 text-center">🗞️ What's new</h3>
            <ul className="list-disc py-4 sm:mx-10">
              <li>🔒 Lock your notes with your face or finger</li>
              <li className="py-2">⌨️ Use Keyboard shortcuts to navigate</li>
              <li>📄 Export, Share and Import your notes</li>
              <li className="py-2">
                🧮 List your notes alphabetically, by creation or update date
              </li>
              <li>🔎 Browse through notes and labels</li>
              <li className="py-2">✍️ Choose the fonts you like best</li>
              <li>🗑️ Fixed issues in deleting notes</li>
            </ul>
            <div className="relative pt-2">
              <div className="flex items-center justify-center sm:mt-[8.5em] fixed bottom-6 inset-x-2 sm:relative">
                <button
                  className="p-4 mr-2 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => handleViewChange("view4")}
                >
                  <ArrowLeftLineIcon className="inline-block w-5 h-5" /> Back
                </button>
                <button
                  className="p-4 rounded-xl bg-[#2D2C2C] text-white items-center justify-center"
                  onClick={() => history("/")}
                >
                  Start Note-Taking
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
