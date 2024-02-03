import { Link, useNavigate } from "react-router-dom";
import AddFillIcon from "remixicon-react/AddFillIcon";
import ArchiveLineIcon from "remixicon-react/ArchiveLineIcon";
import BookletLineIcon from "remixicon-react/BookletLineIcon";
import SunLineIcon from "remixicon-react/SunLineIcon";
import MoonLineIcon from "remixicon-react/MoonClearLineIcon";
import SettingsLineIcon from "remixicon-react/SettingsLineIcon";
import Upload2LineIcon from "remixicon-react/Upload2LineIcon";
import Download2LineIcon from "remixicon-react/Download2LineIcon";
import { ChangeEvent, useEffect } from "react";

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
  const history = useNavigate();
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "n") {
          event.preventDefault();
          onCreateNewNote();
        } else if (event.shiftKey && event.key === "L") {
          event.preventDefault();
          toggleTheme();
        } else if (event.shiftKey && event.key === "N") {
          history("/");
        }
        else if (event.shiftKey && event.key === "A") {
          history("/archive");
        }
        else if (event.shiftKey && event.key === "E") {
          exportData();
        }
        else if (event.shiftKey && event.key === "U") {
          const importInput = document.getElementById(
            "importData"
          ) as HTMLInputElement;
          importInput.click();
        }
        if (event.key === ",") {
          event.preventDefault();
          history("/settings");
        }
      } 
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [onCreateNewNote, toggleTheme, exportData]);
  return (
    <div className="hidden sm:mr-16 sm:block">
      <div className="fixed top-0 left-0 h-screen flex flex-col items-center justify-between p-2.5 bg-[#F8F8F7] dark:bg-[#353333] hidden sm:flex">
        <div className="py-5">
          <button
            className="hidden mb-2 p-2 bg-[#EBEBEA] dark:bg-[#2D2C2C] dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex"
            onClick={onCreateNewNote}
          >
            <AddFillIcon className="text-amber-400 h-8 w-8" />
          </button>

          <Link to="/">
            <button className="hidden hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] mb-2 p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex">
              <BookletLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
            </button>
          </Link>

          <Link to="/archive">
            <button className="hidden hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex">
              <ArchiveLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
            </button>
          </Link>
        </div>
        <div className="fixed bottom-6 gap-y-2">
          <button
            onClick={toggleTheme}
            className="hidden p-2 hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex"
          >
            {isDarkMode ? (
              <SunLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
            ) : (
              <MoonLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
            )}
          </button>
          <button
            className="hidden p-2 hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex"
            onClick={exportData}
          >
            <Upload2LineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
          </button>

          <label
            htmlFor="importData"
            className="hidden hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex"
          >
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
            <button className="hidden hover:bg-[#EBEBEA] hover:dark:bg-[#2D2C2C] p-2 dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex sm:flex">
              <SettingsLineIcon className="text-neutral-800 dark:text-white h-8 w-8" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
