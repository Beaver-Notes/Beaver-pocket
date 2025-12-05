import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Keyboard } from "@capacitor/keyboard";
import { useNoteStore } from "@/store/note";
import Mousetrap from "../../utils/mousetrap";
import Icon from "../ui/Icon";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "@/utils/translations";
import { useFolderStore } from "@/store/folder";
import emitter from "tiny-emitter/instance";

const BottomNavBar: React.FC = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const folderStore = useFolderStore();
  const noteStore = useNoteStore.getState();
  const router = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() === "web") return;

    Keyboard.addListener("keyboardWillShow", () => {
      setKeyboardVisible(true);
    });

    Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  const [translations, setTranslations] = useState<Record<string, any>>({
    accessibility: {},
    home: {},
  });

  useEffect(() => {
    const fetchTranslations = () => {
      useTranslation().then((trans) => {
        if (trans) setTranslations(trans);
      });
    };
    fetchTranslations();
  }, []);

  const addNote = useCallback(() => {
    noteStore.add().then(({ id }: { id: string }) => {
      router(`/note/${id}`);
    });
  }, [noteStore, router]);

  const addFolder = useCallback(() => {
    folderStore.add();
  }, [folderStore]);

  useEffect(() => {
    Mousetrap.bind("alt+n", (e) => {
      e.preventDefault();
      addNote();
    });

    Mousetrap.bind("mod+shift+f", (e) => {
      e.preventDefault();
      addFolder();
    });

    Mousetrap.bind("mod+shift+n", (e) => {
      e.preventDefault();
      router("/");
    });

    Mousetrap.bind("mod+shift+a", (e) => {
      e.preventDefault();
      router("/archive");
    });

    Mousetrap.bind("mod+,", (e) => {
      e.preventDefault();
      router("/archive");
    });

    return () => {
      Mousetrap.unbind("mod+n");
      Mousetrap.unbind("mod+shift+n");
      Mousetrap.unbind("mod+shift+w");
      Mousetrap.unbind("mod+shift+a");
      Mousetrap.unbind("mod+shift+f");
      Mousetrap.unbind("mod+,");
    };
  }, []);

  useEffect(() => {
    emitter.on("new-note", addNote);
    emitter.on("new-folder", addFolder);

    return () => {
      emitter.off("new-note", addNote);
      emitter.off("new-folder", addFolder);
    };
  }, []);

  if (keyboardVisible) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="element-to-hide spacingdiv">
      <nav className="fixed border-neutral-800 bottom-6 inset-x-2 bg-neutral-750 p-3 shadow-lg rounded-full w-[calc(100%-1rem)] sm:w-[calc(100%-10rem)] lg:w-[50%] xl:w-[40%] mx-auto z-50">
        <div className="flex justify-between items-center">
          <Link to="/">
            <button
              aria-label={translations.accessibility.home}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="HomeLine"
                className={`${
                  isActive("/") ? "text-secondary" : "text-white"
                } h-10 w-10`}
              />
            </button>
          </Link>

          <button
            onClick={addFolder}
            aria-label={translations.accessibility.addFolder}
            className="w-12 h-12 flex items-center justify-center"
          >
            <Icon
              name="FolderAddLine"
              className="text-white hover:text-secondary h-10 w-10"
            />
          </button>

          <button
            onClick={addNote}
            aria-label={translations.accessibility.createNew}
            className="w-12 h-12 flex items-center justify-center"
          >
            <Icon
              name="AddFill"
              className="text-white hover:text-secondary h-10 w-10"
            />
          </button>

          <Link to="/archive">
            <button
              aria-label={translations.accessibility.archive}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="ArchiveDrawerLine"
                className={`${
                  isActive("/archive") ? "text-secondary" : "text-white"
                } h-10 w-10`}
              />
            </button>
          </Link>

          <Link to="/settings">
            <button
              aria-label={translations.accessibility.settings}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="SettingsLine"
                className={`${
                  isActive("/settings") ? "text-secondary" : "text-white"
                } h-10 w-10`}
              />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
