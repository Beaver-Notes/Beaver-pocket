import React, { useEffect, useState } from "react";
import icons from "../../lib/remixicon-react";
import { Link, useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { Keyboard } from "@capacitor/keyboard";
import { useExportDav } from "../../utils/Webdav/webDavUtil";
import { useSaveNote } from "../../store/notes";
import { Note } from "../../store/types";
import Mousetrap from "../../utils/mousetrap";

interface NavbarProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const BottomNavBar: React.FC<NavbarProps> = ({ setNotesState }) => {
  const { saveNote } = useSaveNote(setNotesState);
  const navigate = useNavigate();
  useEffect(() => {
    const handleKeyboardShow = () => {
      document.body.classList.add("keyboard-visible");
    };

    const handleKeyboardHide = () => {
      document.body.classList.remove("keyboard-visible");
    };

    Keyboard.addListener("keyboardWillShow", handleKeyboardShow);
    Keyboard.addListener("keyboardWillHide", handleKeyboardHide);
    // Cleanup listeners on component unmount
    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  const buttonClicked = () => {
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      const dropboxExport = new CustomEvent("dropboxExport");
      document.dispatchEvent(dropboxExport);
    } else if (syncValue === "webdav") {
      const { exportdata } = useExportDav();
      exportdata();
    } else if (syncValue === "iCloud") {
      const iCloudExport = new CustomEvent("iCloudExport");
      document.dispatchEvent(iCloudExport);
    } else if (syncValue === "googledrive") {
      const driveExport = new CustomEvent("driveExport");
      document.dispatchEvent(driveExport);
    } else if (syncValue === "onedrive") {
      const onedriveExport = new CustomEvent("onedriveExport");
      document.dispatchEvent(onedriveExport);
    }
  };

  const handleEditNote = () => {
    buttonClicked;
    const editedNote = localStorage.getItem("lastNoteEdit");
    if (editedNote) {
      navigate(`/editor/${editedNote}`);
    }
  };

  const [translations, setTranslations] = useState({
    accessibility: {
      home: "accessibility.home",
      editNote: "accessibility.home",
      createNew: "accessibility.createNew",
      archive: "accessibility.archive",
      settings: "accessibility.archive"
    },
    home: {
      title: "home.title",
    },
  });

  useEffect(() => {
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

  const handleCreateNewNote = async () => {
    const newNote = {
      id: uuid(),
      title: `${translations.home.title || "-"}`,
      content: { type: "doc", content: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      labels: [],
      isBookmarked: false,
      isArchived: false,
      isLocked: false,
      lastCursorPosition: 0,
    };

    await saveNote(newNote);
    navigate(`/editor/${newNote.id}`);
  };

  useEffect(() => {
    Mousetrap.bind("mod+n", (e) => {
      e.preventDefault();
      handleCreateNewNote();
    });

    Mousetrap.bind("mod+shift+n", (e) => {
      e.preventDefault();
      navigate("/");
    });

    Mousetrap.bind("mod+shift+w", (e) => {
      e.preventDefault();
      handleEditNote();
    });

    Mousetrap.bind("mod+shift+a", (e) => {
      e.preventDefault();
      navigate("/archive");
    });

    Mousetrap.bind("mod+,", (e) => {
      e.preventDefault();
      navigate("/archive");
    });

    return () => {
      Mousetrap.unbind("mod+n");
      Mousetrap.unbind("mod+shift+n");
      Mousetrap.unbind("mod+shift+w");
      Mousetrap.unbind("mod+shift+a");
      Mousetrap.unbind("mod+,");
    };
  }, []);

  return (
    <div className={`element-to-hide spacingdiv`}>
      <nav className="fixed bottom-6 inset-x-2 bg-[#2D2C2C] p-3 shadow-lg rounded-full w-[calc(100%-1rem)] sm:w-[calc(100%-10rem)] lg:w-[50%] xl:w-[40%] mx-auto">
        <div className="flex justify-between">
          <Link to="/">
            <button
              className="p-2"
              onClick={() => buttonClicked()}
              aria-label={translations.accessibility.home}
              >
              <icons.HomeLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>

          <button
            onClick={handleEditNote}
            className="p-2"
            aria-label={translations.accessibility.editNote}
          >
            <icons.Edit2LineIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </button>

          <button
            className="p-2"
            onClick={handleCreateNewNote}
            aria-label={translations.accessibility.createNew}
            >
            <icons.AddFillIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </button>

          <Link to="/archive">
            <button
              className="p-2"
              onClick={() => buttonClicked()}
              aria-label={translations.accessibility.archive}
            >
              <icons.ArchiveDrawerLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>

          <Link to="/settings">
            <button
              className="p-2"
              onClick={() => buttonClicked()}
              aria-label={translations.accessibility.settings}
            >
              <icons.Settings4LineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
