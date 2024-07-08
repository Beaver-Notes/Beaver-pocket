import React, { useEffect } from "react";
import icons from "../../lib/remixicon-react";
import { Link } from "react-router-dom";
import { Keyboard } from "@capacitor/keyboard";

interface BottomNavBarProps {
  onCreateNewNote: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onCreateNewNote }) => {
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

  const handleEditNote = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    event.preventDefault();
    const editedNote = localStorage.getItem("lastNoteEdit")
    if (editedNote) {
      const customEvent = new CustomEvent('editNote', { detail: { editedNote } });
      document.dispatchEvent(customEvent);
    }
  };

  return (
    <div className={` element-to-hide spacingdiv`}>
      <nav className="fixed bottom-6 inset-x-2 bg-[#2D2C2C] p-3 shadow-lg rounded-full sm:hidden w-[calc(100%-1rem)]">
        <div className="flex justify-between">
        <Link to="/">
            <button className="p-2">
              <icons.HomeLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
        <a href="#" onClick={handleEditNote} className="p-2">
            <icons.Edit2LineIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </a>
          <a href="#" className="p-2" onClick={onCreateNewNote}>
            <icons.AddFillIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </a>
          <Link to="/archive">
            <button className="p-2">
              <icons.ArchiveDrawerLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
          <Link to="/settings">
            <button className="p-2">
              <icons.Settings4LineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
