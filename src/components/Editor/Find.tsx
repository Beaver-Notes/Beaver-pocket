import React, { useEffect, useRef, useState } from "react";
import icons from "../../lib/remixicon-react";

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

  return (
    <div className="pt-4 bg-white dark:bg-[#232222] overflow-enabled h-auto w-full bg-transparent z-50 no-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full">
        {/* Search Input and Button */}
        <div className="flex items-center sm:col-span-1 w-full space-x-2">
          <div className="flex w-full px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
            <icons.Search2LineIcon className="text-gray-800 dark:text-[color:var(--selected-dark-text)] h-6 w-6 mr-2" />
            <input
              className="text-lg text-gray-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
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
        </div>

        {/* Replace Input */}
        <div className="hidden sm:flex items-center sm:col-span-1 w-full space-x-2">
          <div className="flex w-full px-2 items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-amber-400 text-gray-800">
            <input
              className="text-lg text-gray-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
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
            className="flex-grow sm:flex-grow-0 px-3 py-2.5 w-full sm:w-auto hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] rounded-lg text-lg bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleSearch}
          >
            {translations.editor.find || "-"}
          </button>
          <button
            className="flex-grow sm:flex-grow-0 px-3 py-2.5 w-full sm:w-auto rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplace}
          >
            {translations.editor.replace || "-"}
          </button>
          <button
            className="flex-grow sm:flex-grow-0 px-3 py-2.5 w-full sm:w-auto rounded-lg text-lg hover:bg-[#EAEAEA] dark:hover:bg-[#413F3F] bg-[#F8F8F7] dark:bg-[#353333]"
            onClick={handleReplaceAll}
          >
            {translations.editor.replaceAll || "-"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Find;
