import React, { useRef, useState } from "react";
import Search2LineIcon from "remixicon-react/Search2LineIcon";

interface FindProps {
  editor: any; // Adjust the type of editor according to your setup
}

const Find: React.FC<FindProps> = ({ editor }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [replaceTerm, setReplaceTerm] = useState("");
    const [caseSensitive] = useState(false);
  
    const searchInputRef = useRef(null);
  
    const handleSearch = () => {
      editor
        ?.chain()
        .setSearchTerm(searchTerm)
        .setReplaceTerm(replaceTerm)
        .setCaseSensitive(caseSensitive)
        .resetIndex()
        .run();
      focusEditor();
    };
  
    const handleReplace = () => {
      editor?.chain().replace(replaceTerm).run();
      focusEditor();
    };
  
    const handleReplaceAll = () => {
      editor?.chain().replaceAll(replaceTerm).run();
      focusEditor();
    };
  
    const focusEditor = () => {
      editor?.commands.focus();
    };

  return (
    <div className="pt-4 sm:block inset-x-2 bottom-0 overflow-enabled h-auto w-full bg-transparent z-50 no-scrollbar">
      <div className="flex items-center mb-2 space-x-2 w-full">
        <div className="flex mr-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
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
        <div className="flex items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
          <input
            className="text-lg text-gray-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-white w-full"
            type="text"
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace term"
          />
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-2.5 hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleSearch}
          >
            Find
          </button>
          <button
            className="px-3 py-2.5 rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplace}
          >
            Replace
          </button>
          <button
            className="px-3 py-2.5 rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
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
