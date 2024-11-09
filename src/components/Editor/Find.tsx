import React, { useEffect, useRef, useState } from "react";
import icons from "../../lib/remixicon-react";
import Icons from "../../lib/remixicon-react";

interface FindProps {
  editor: any;
  setShowFind: any;
}

const Find: React.FC<FindProps> = ({ editor, setShowFind }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  console.log(searchTerm);
  console.log(searchInputRef);

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

  const focusEditor = () => {
    editor?.commands.focus();
  };

  // Translations
  const [translations, setTranslations] = useState({
    editor: {
      searchTerm: "editor.searchTerm",
      replaceTerm: "editor.replaceTerm",
      find: "editor.find",
      replace: "editor.replace",
      replaceAll: "editor.replaceAll",
    },
  });

  useEffect(() => {
    // Load translations
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

  const handleClose = () => {
    setShowFind(false);
    setSearchTerm('');  // Clear the search term when closing
    editor?.chain().resetIndex().run();  // Reset the search index and highlights
  };
  
  useEffect(() => {
    if (searchTerm) {
      editor?.chain()
        .setSearchTerm(searchTerm)
        .resetIndex()  // Reset any previous search index before starting a new search
        .run();
    } else {
      editor?.chain().resetIndex().run();  // If no search term, reset the index
    }
  }, [searchTerm, editor]);

  return (
    <div className="pt-4 bg-white dark:bg-[#232222] overflow-enabled h-auto w-full bg-transparent z-30 no-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full">
        {/* Search Input and Button */}
        <div className="flex items-center sm:col-span-1 w-full space-x-2">
          <div className="flex w-full px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-neutral-800">
            <icons.Search2LineIcon className="text-neutral-800 dark:text-[color:var(--selected-dark-text)] h-6 w-6 mr-2" />
            <input
              className="text-lg text-neutral-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={translations.editor.searchTerm || "-"}
            />
          </div>
          <button
            className="p-3 sm:hidden hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleSearch}
          >
            <icons.Search2LineIcon />
          </button>
          <button
            className="p-3 sm:hidden hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleClose}
          >
            <Icons.CloseLineIcon
              className={`border-none text-red-500 text-xl w-7 h-7`}
            />
          </button>
        </div>

        {/* Replace Input */}
        <div className="hidden sm:flex items-center sm:col-span-1 w-full space-x-2">
          <div className="flex w-full px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-neutral-800">
            <input
              className="text-lg text-neutral-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
              type="text"
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder={translations.editor.replaceTerm || "-"}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center sm:col-span-1 w-full space-x-2">
          <button
            className="flex-grow sm:flex-grow-0 p-3 w-full sm:w-auto hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleSearch}
          >
            {translations.editor.find || "-"}
          </button>
          <button
            className="flex-grow sm:flex-grow-0 p-3 w-full sm:w-auto rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplace}
          >
            {translations.editor.replace || "-"}
          </button>
          <button
            className="flex-grow sm:flex-grow-0 p-3 w-full sm:w-auto rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleClose}
          >
            <Icons.CloseLineIcon
              className={`border-none text-red-500 text-xl w-7 h-7`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Find;
