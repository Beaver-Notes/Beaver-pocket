import React, { useEffect, useState } from "react";
import { WebDavService } from "./deps/WebDavApi";
import { useExportDav, useImportDav } from "./utility/WebdavUtil";
import ServerLineIcon from "remixicon-react/ServerLineIcon";
import BottomNavBar from "../../components/Home/BottomNavBar";
import { v4 as uuid } from "uuid";
import { useNotesState } from "../../store/Activenote";
import { useSaveNote } from "../../store/notes";

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

  const { setNotesState, setActiveNoteId } = useNotesState();
  const { saveNote } = useSaveNote();
  const [isArchiveVisible, setIsArchiveVisible] = useState(false);

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

  return (
    <div>
      <div className="mx-10 sm:mx-32 lg:mx-72 mt-2 mb-2 items-center align-center text-center space-y-4">
        <section className="">
          <div className="flex flex-col">
            <div className="ml-4 space-y-2">
              <p className="ml-2 text-4xl text-left font-bold">
                Sync with <br /> WebDAV
              </p>
              <div className="flex justify-center items-center">
                <div className="bg-neutral-200 bg-opacity-40 rounded-full w-36 h-36 flex justify-center items-center">
                  <ServerLineIcon className="w-32 h-32 text-gray-700 p-2" />
                </div>
              </div>
              <input
                type="text"
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                value={baseUrl}
                placeholder="https://server.example"
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <input
                type="text"
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                className="bg-neutral-200 bg-opacity-40 w-full text-neutral-800 outline-none p-2 text-lg rounded-xl"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={login}
              >
                Log in
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={exportdata}
              >
                Export data
              </button>
              <button
                className="bg-neutral-200 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
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
                  <div className="peer h-8 w-[3.75rem] rounded-full border bg-slate-200 after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  <span className="inline-block ml-2 align-middle">
                    Auto sync
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>
        <BottomNavBar
          onCreateNewNote={handleCreateNewNote}
          onToggleArchiveVisibility={() =>
            setIsArchiveVisible(!isArchiveVisible)
          }
        />
      </div>
    </div>
  );
};

export default ExampleComponent;
