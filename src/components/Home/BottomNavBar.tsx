import React, { useState, useEffect } from "react";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import Settings4LineIcon from "remixicon-react/SettingsLineIcon";
import HomeLineIcon from "remixicon-react/HomeLineIcon";
import AddFillIcon from "remixicon-react/AddFillIcon";
import { Link } from "react-router-dom";

interface BottomNavBarProps {
  onCreateNewNote: () => void;
  onToggleArchiveVisibility: (isVisible: boolean) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onCreateNewNote, onToggleArchiveVisibility }) => {
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrollable, setIsScrollable] = useState(false);

  const handleScroll = () => {
    const currentScrollPos = window.pageYOffset;
    if (isScrollable) {
      setIsVisible(prevScrollPos > currentScrollPos);
    }
    setPrevScrollPos(currentScrollPos);
  };

  useEffect(() => {
    const checkScrollable = () => {
      setIsScrollable(document.body.scrollHeight > window.innerHeight);
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("resize", checkScrollable);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [prevScrollPos]);

  return (
    <div
      className={`spacingdiv flex justify-center sm:items-center ${
        isVisible ? "visible" : "hidden"
      }`}
    >
      <nav className="fixed bottom-6 inset-x-2 bg-[#2D2C2C] p-3 shadow-lg rounded-full sm:w-[calc(40%-1rem)] sm:mx-auto w-[calc(100%-1rem)]">
        <div className="flex justify-between items-center">
          <button className="p-2" onClick={onCreateNewNote}>
            <AddFillIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </button>
          <Link to="/">
            <button className="p-2">
              <HomeLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
          <button className="p-2" onClick={() => onToggleArchiveVisibility(true)}>
            <ArchiveDrawerLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </button>
          <Link to="/settings">
            <button className="p-2">
              <Settings4LineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
