import React from "react";
import ArchiveDrawerLineIcon from "remixicon-react/ArchiveLineIcon";
import Settings4LineIcon from "remixicon-react/SettingsLineIcon";
import HomeLineIcon from "remixicon-react/HomeLineIcon";
import AddFillIcon from "remixicon-react/AddFillIcon";
import { Link } from "react-router-dom";

interface BottomNavBarProps {
  onCreateNewNote: () => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ onCreateNewNote }) => {
  return (
    <div className={`spacingdiv`}>
      <nav className="fixed bottom-6 inset-x-2 bg-[#2D2C2C] p-3 shadow-lg rounded-full sm:hidden w-[calc(100%-1rem)]">
        <div className="flex justify-between">
          <a href="#" className="p-2" onClick={onCreateNewNote}>
            <AddFillIcon className="text-white hover:text-amber-400 h-8 w-8" />
          </a>
          <Link to="/">
            <button className="p-2">
              <HomeLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
          <Link to="/archive">
            <button className="p-2">
              <ArchiveDrawerLineIcon className="text-white hover:text-amber-400 h-8 w-8" />
            </button>
          </Link>
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
