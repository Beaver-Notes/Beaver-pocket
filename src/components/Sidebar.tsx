import { Link } from 'react-router-dom';
import AddFillIcon from 'remixicon-react/AddFillIcon';
import ArchiveLineIcon from 'remixicon-react/ArchiveLineIcon';
import BookletLineIcon from 'remixicon-react/BookletLineIcon';
import SunLineIcon from 'remixicon-react/SunLineIcon';
import MoonLineIcon from 'remixicon-react/MoonClearLineIcon';
import SettingsLineIcon from 'remixicon-react/SettingsLineIcon';
import Upload2LineIcon from "remixicon-react/Upload2LineIcon";
import Download2LineIcon from "remixicon-react/Download2LineIcon";
import { ChangeEvent } from 'react';

interface SidebarProps {
  onCreateNewNote: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  exportData: () => void;
  handleImportData: (event: ChangeEvent<HTMLInputElement>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onCreateNewNote,
  isDarkMode,
  toggleTheme,
  exportData,
  handleImportData,
}) => {
  return (
          <div className="fixed top-0 left-0 h-screen flex flex-col items-center justify-between p-2 bg-[#F8F8F7] dark:bg-[#353333] hidden sm:flex">
      <div className="py-5">
        <button
          className="hidden mb-2 p-2 bg-[#EBEBEA] dark:bg-[#2D2C2C] dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex"
          onClick={onCreateNewNote}
        >
          <AddFillIcon className="text-amber-400 h-8 w-8" />
        </button>

        <Link to="/">
          <button
            className="hidden mb-2 p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex"
          >
            <BookletLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
          </button>
        </Link>

        <Link to="/archive">
          <button
            className="hidden p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex"
          >
            <ArchiveLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
          </button>
        </Link>
      </div>
      <div className="fixed bottom-6 gap-y-2">
        <button onClick={toggleTheme} className="hidden p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex">
          {isDarkMode ? <SunLineIcon className="text-neutral-800 dark:text-white h-8 w-8" /> : <MoonLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />}
        </button>
        <button className="hidden p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex" onClick={exportData}>
          <Upload2LineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
        </button>

        <label htmlFor="importData" className="hidden p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex">
          <Download2LineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
        </label>
        <input
          className="hidden"
          type="file"
          id="importData"
          accept=".json"
          onChange={handleImportData}
        />
        <Link to="/settings">
          <button className="hidden p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex">
            <SettingsLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
          </button>
        </Link>
      </div>
    </div>
  );
}

export default Sidebar;
