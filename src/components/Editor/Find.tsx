import React, { useRef, useState } from "react";
import Search2LineIcon from "remixicon-react/Search2LineIcon";

interface FindProps {
  editor: any; // Adjust the type of editor according to your setup
}

const Find: React.FC<FindProps> = ({ editor }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (searchTerm) {
      editor
        ?.chain()
        .setSearchTerm(searchTerm)
        .setReplaceTerm(replaceTerm)
        .resetIndex()
        .run();
      focusEditor();
    }
  };

  const handleReplace = () => {
    if (searchTerm && replaceTerm) {
      editor
        ?.chain()
        .setSearchTerm(searchTerm)
        .setReplaceTerm(replaceTerm)
        .resetIndex()
        .replace()
        .run();
      focusEditor();
    }
  };

  const handleReplaceAll = () => {
    if (searchTerm && replaceTerm) {
      editor
        ?.chain()
        .setSearchTerm(searchTerm)
        .setReplaceTerm(replaceTerm)
        .resetIndex()
        .replaceAll()
        .run();
      focusEditor();
    }
  };

  const focusEditor = () => {
    editor?.commands.focus();
  };

  return (
    <div className="pt-4 bg-white dark:bg-[#232222] overflow-enabled h-auto w-full bg-transparent z-50 no-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex items-center sm:mr-2 mb-2 space-x-2">
          <div className="flex px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
            <Search2LineIcon className="text-gray-800 dark:text-white h-6 w-6 mr-2" />
            <input
              className="text-lg text-gray-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-white w-full"
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search term"
            />
          </div>
        </div>
        <div className="flex items-center mb-2 sm:mr-2 space-x-2">
          <div className="flex px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
            <input
              className="text-lg text-gray-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-white w-full"
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace term"
            />
          </div>
        </div>
        <div className="flex pb-4 sm:pb-2 items-center space-x-2">
          <button
            className="px-3 py-2.5 w-1/2 sm:w-1/3 hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleSearch}
          >
            Find
          </button>
          <button
            className="px-3 py-2.5 w-1/2 sm:w-1/3  rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplace}
          >
            Replace
          </button>
          <button
            className="px-3 py-2.5 w-1/2 sm:w-1/3  rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplaceAll}
          >
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};

export default Find;
