import React, { useEffect, useState } from "react";
import { useTranslation } from "../../utils/translations";
import Icon from "../UI/Icon";

interface SearchReplaceBarProps {
  editor: any;
  setShowFind: any;
}

const Find: React.FC<SearchReplaceBarProps> = ({ editor, setShowFind }) => {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any>>({
    search: {},
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

  useEffect(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (text) setQuery(text);
  }, [editor]);

  const startSearch = () => {
    if (!editor) return;
    editor.commands.setSearchTerm(query);
    editor.commands.setReplaceTerm(replaceWith);
    editor.commands.setCaseSensitive(caseSensitive);
    editor.commands.nextSearchResult();
  };

  const goToSelection = () => {
    if (!editor) return;
    const { results, resultIndex } = editor.storage?.searchAndReplace || {};
    const position = results?.[resultIndex];

    if (!position) return;

    editor.commands.setTextSelection(position);

    const { node } = editor.view.domAtPos(editor.state.selection.anchor);
    if (node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const findNextResult = () => {
    if (!editor) return;
    editor.commands.nextSearchResult();
    goToSelection();
  };

  const findPreviousResult = () => {
    if (!editor) return;
    editor.commands.previousSearchResult();
    goToSelection();
  };

  const replaceText = () => {
    if (!editor || !replaceWith) return;
    editor.commands.replace();
  };

  const replaceAllText = () => {
    if (!editor || !replaceWith) return;
    editor.commands.replaceAll();
  };

  const toggleCaseSensitive = () => {
    if (!editor) return;
    setCaseSensitive(!caseSensitive);
    editor.commands.setCaseSensitive(caseSensitive);
  };

  const handleClose = () => {
    if (!editor) return;
    setShowFind(false);
    setQuery("");
    setReplaceWith("");
    editor.commands.setSearchTerm("");
    editor.commands.setReplaceTerm("");
    editor.commands.resetIndex();
  };

  return (
    <div className="fixed sm:top-8 top-12 bg-white dark:bg-[#232222] flex items-center left-0 w-full z-30 px-4">
      <div className="flex items-center w-full space-x-2 justify-center">
        <div className="relative flex items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-primary text-neutral-800 overflow-hidden mr-2">
          <Icon
            name="Search2Line"
            className="text-neutral-800 dark:text-[color:var(--selected-dark-text)] mr-2 w-8"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translations.search.searchplaceholder}
            className="text-lg text-neutral-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full truncate"
            onKeyUp={startSearch}
          />
          <div className="absolute right-2 rtl:left-2 top-1/2 transform -translate-y-1/2 text-sm opacity-40 font-medium truncate">
            {editor?.storage?.searchAndReplace?.resultIndex + 1 || 0} /
            {editor?.storage?.searchAndReplace?.results?.length || 0}
          </div>
        </div>
        <div className="hidden md:block flex items-center flex-grow bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-lg p-2 outline-none outline-primary text-neutral-800">
          <input
            value={replaceWith}
            onChange={(e) => setReplaceWith(e.target.value)}
            placeholder={translations.search.replaceplaceholder}
            className="text-lg text-neutral-800 bg-transparent dark:bg-transparent px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
            onKeyUp={startSearch}
          />
        </div>
        <div className="hidden md:flex">
          <button
            className={`p-3 hover:bg-opacity-25 rounded-md text-base bg-neutral-200 bg-opacity-20 
      dark:bg-[#353333] bg-[#F8F8F7] dark:bg-[#353333] ${
        caseSensitive ? "text-primary" : ""
      }`}
            onClick={toggleCaseSensitive}
          >
            <Icon name="FontSize" />
          </button>
        </div>
        <div className="hidden lg:flex items-center space-x-2">
          <button
            title="Alt+Enter"
            disabled={!replaceWith}
            onClick={replaceText}
            className="p-3 hover:bg-opacity-25 rounded-md text-base bg-neutral-200 bg-opacity-20 
      dark:bg-[#353333] bg-[#F8F8F7] dark:bg-[#353333]"
          >
            {translations.search.replace}
          </button>
          <button
            title="Ctrl+Alt+Enter"
            disabled={!replaceWith}
            onClick={replaceAllText}
            className="p-3 hover:bg-opacity-25 rounded-md text-base bg-neutral-200 bg-opacity-20 
      dark:bg-[#353333] bg-[#F8F8F7] dark:bg-[#353333]"
          >
            {translations.search.replaceall}
          </button>
        </div>
        {/* Find Previous Button */}
        <button
          disabled={!query}
          onClick={findPreviousResult}
          className="p-3  hover:bg-opacity-25 rounded-lg text-lg bg-neutral-200 bg-opacity-20 dark:bg-[#353333]"
        >
          <Icon
            name="ArrowUp"
            className="dark:text-neutral-200 text-neutral-600"
          />
        </button>
        {/* Find Next Button */}
        <button
          disabled={!query}
          onClick={findNextResult}
          className="p-3  hover:bg-opacity-25 rounded-lg text-lg bg-neutral-200 bg-opacity-20 dark:bg-[#353333]
 bg-[#F8F8F7] dark:bg-[#353333]"
        >
          <Icon
            name="ArrowDown"
            className="dark:text-neutral-200 text-neutral-600"
          />
        </button>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-3  hover:bg-opacity-25 rounded-lg text-lg bg-neutral-200 bg-opacity-20 dark:bg-[#353333]
 bg-[#F8F8F7] dark:bg-[#353333]"
        >
          <Icon name="CloseLine" />
        </button>
      </div>
    </div>
  );
};

export default Find;
