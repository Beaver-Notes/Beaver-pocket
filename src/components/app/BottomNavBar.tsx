import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Keyboard } from "@capacitor/keyboard";
import { useNoteStore } from "@/store/note";
import Mousetrap from "../../utils/mousetrap";
import Icon from "../ui/Icon";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "@/utils/translations";

const BottomNavBar: React.FC = () => {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const noteStore = useNoteStore.getState();
  const router = useNavigate();

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

  const handleEditNote = () => {
    const editedNote = localStorage.getItem("lastNoteEdit");
    if (editedNote) {
      router(`/editor/${editedNote}`);
    }
  };

  const [translations, setTranslations] = useState<Record<string, any>>({
    accessibility: {},
    home: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  function addNote() {
    noteStore.add().then(({ id }: { id: string }) => {
      router(`/editor/${id}`);
    });
  }

  useEffect(() => {
    Mousetrap.bind("alt+n", (e) => {
      e.preventDefault();
      addNote();
    });

    Mousetrap.bind("mod+shift+n", (e) => {
      e.preventDefault();
      router("/");
    });

    Mousetrap.bind("mod+shift+w", (e) => {
      e.preventDefault();
      handleEditNote();
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
      Mousetrap.unbind("alt+n");
      Mousetrap.unbind("mod+shift+n");
      Mousetrap.unbind("mod+shift+w");
      Mousetrap.unbind("mod+shift+a");
      Mousetrap.unbind("mod+,");
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <div className="element-to-hide spacingdiv">
      <nav className="fixed bottom-6 inset-x-2 bg-[#2D2C2C] p-3 shadow-lg rounded-full w-[calc(100%-1rem)] sm:w-[calc(100%-10rem)] lg:w-[50%] xl:w-[40%] mx-auto z-50">
        <div className="flex justify-between items-center">
          <Link to="/">
            <button
              aria-label={translations.accessibility.home}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="HomeLine"
                className="text-white hover:text-primary h-10 w-10"
              />
            </button>
          </Link>

          <button
            onClick={() => {
              const last = localStorage.getItem("lastNoteEdit");
              if (last) router(`/editor/${last}`);
            }}
            aria-label={translations.accessibility.editNote}
            className="w-12 h-12 flex items-center justify-center"
          >
            <Icon
              name="Edit2Line"
              className="text-white hover:text-primary h-10 w-10"
            />
          </button>

          <button
            onClick={addNote}
            aria-label={translations.accessibility.createNew}
            className="w-12 h-12 flex items-center justify-center"
          >
            <Icon
              name="AddFill"
              className="text-white hover:text-primary h-10 w-10"
            />
          </button>

          <Link to="/archive">
            <button
              aria-label={translations.accessibility.archive}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="ArchiveDrawerLine"
                className="text-white hover:text-primary h-10 w-10"
              />
            </button>
          </Link>

          <Link to="/settings">
            <button
              aria-label={translations.accessibility.settings}
              className="w-12 h-12 flex items-center justify-center"
            >
              <Icon
                name="Settings4Line"
                className="text-white hover:text-primary h-10 w-10"
              />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
