import React, { useEffect, useState } from "react";
import { useTranslation } from "../../utils/translations";
import Icon from "../ui/Icon";

interface SearchReplaceBarProps {
  editor: any;
  setShowFind: any;
}

const Find: React.FC<SearchReplaceBarProps> = ({ editor, setShowFind }) => {
  const [query, setQuery] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
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

  // Animation entrance effect
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
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
    setIsVisible(false);
    setTimeout(() => {
      if (!editor) return;
      setShowFind(false);
      setQuery("");
      setReplaceWith("");
      editor.commands.setSearchTerm("");
      editor.commands.setReplaceTerm("");
      editor.commands.resetIndex();
    }, 200);
  };

  const resultInfo = editor?.storage?.searchAndReplace || {};
  const currentResult = (resultInfo.resultIndex ?? -1) + 1;
  const totalResults = resultInfo.results?.length ?? 0;

  return (
    <div
      className={`fixed inset-x-0 z-40 transition-all duration-300 ease-out mx-2 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 sm:translate-y-4 opacity-0"
      } bottom-20`}
    >
      <div className="relative bg-white dark:bg-neutral-800 border rounded-xl shadow-lg overflow-hidden w-full sm:w-fit sm:mx-auto">
        {/* Desktop */}
        <div className="hidden sm:flex items-center p-2 space-x-2">
          {/* Search Input */}
          <div className="relative flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 min-w-0 max-w-xs">
            <Icon
              name="Search2Line"
              className="text-neutral-500 dark:text-neutral-400 mr-2 w-4 h-4 flex-shrink-0"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={translations.search.searchplaceholder || "Search..."}
              className="flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 min-w-0"
              onKeyUp={startSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) {
                    findPreviousResult();
                  } else {
                    findNextResult();
                  }
                }
              }}
              autoFocus
            />
            {totalResults > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 flex-shrink-0">
                {currentResult}/{totalResults}
              </div>
            )}
          </div>

          {/* Replace Input */}
          <div className="flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 max-w-xs">
            <input
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder={
                translations.search.replaceplaceholder || "Replace..."
              }
              className="flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200"
              onKeyUp={startSearch}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.altKey) {
                    replaceAllText();
                  } else {
                    replaceText();
                  }
                }
              }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <button
              disabled={!query || totalResults === 0}
              onClick={findPreviousResult}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous (Shift+Enter)"
            >
              <Icon
                name="ArrowUp"
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>
            <button
              disabled={!query || totalResults === 0}
              onClick={findNextResult}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next (Enter)"
            >
              <Icon
                name="ArrowDown"
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>
            <button
              disabled={!replaceWith || !query}
              onClick={replaceText}
              className="px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Replace (Alt+Enter)"
            >
              Replace
            </button>
            <button
              disabled={!replaceWith || !query}
              onClick={replaceAllText}
              className="px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Replace All (Ctrl+Alt+Enter)"
            >
              All
            </button>
            <button
              onClick={toggleCaseSensitive}
              className={`p-2 rounded-lg transition-colors ${
                caseSensitive
                  ? "bg-secondary bg-opacity-20 text-primary"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
              title="Case Sensitive"
            >
              <Icon name="FontSize" className="w-4 h-4" />
            </button>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ml-2"
              title="Close (Esc)"
            >
              <Icon
                name="CloseLine"
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden">
          {/* Search */}
          <div className="flex items-center p-2 space-x-2">
            <div className="relative flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 min-w-0">
              <Icon
                name="Search2Line"
                className="text-neutral-500 dark:text-neutral-400 mr-2 w-4 h-4 flex-shrink-0"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  translations.search.searchplaceholder || "Search..."
                }
                className="flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 min-w-0"
                onKeyUp={startSearch}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (e.shiftKey) {
                      findPreviousResult();
                    } else {
                      findNextResult();
                    }
                  }
                }}
                autoFocus
              />
              {totalResults > 0 && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 flex-shrink-0">
                  {currentResult}/{totalResults}
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center space-x-1">
              <button
                disabled={!query || totalResults === 0}
                onClick={findPreviousResult}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous (Shift+Enter)"
              >
                <Icon
                  name="ArrowUp"
                  className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
                />
              </button>
              <button
                disabled={!query || totalResults === 0}
                onClick={findNextResult}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next (Enter)"
              >
                <Icon
                  name="ArrowDown"
                  className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
                />
              </button>
            </div>

            {/* Toggle Replace Button */}
            <button
              onClick={() => setShowReplace(!showReplace)}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Toggle Replace"
            >
              <Icon
                name={showReplace ? "ArrowUpSLine" : "ArrowDownSLine"}
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Close (Esc)"
            >
              <Icon
                name="CloseLine"
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>
          </div>

          {/* Replace */}
          <div
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              showReplace ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5">
                  <input
                    value={replaceWith}
                    onChange={(e) => setReplaceWith(e.target.value)}
                    placeholder={
                      translations.search.replaceplaceholder || "Replace..."
                    }
                    className="flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200"
                    onKeyUp={startSearch}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (e.altKey) {
                          replaceAllText();
                        } else {
                          replaceText();
                        }
                      }
                    }}
                  />
                </div>

                {/* Replace Controls */}
                <div className="flex items-center space-x-1">
                  <button
                    disabled={!replaceWith || !query}
                    onClick={replaceText}
                    className="px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Replace (Alt+Enter)"
                  >
                    Replace
                  </button>
                  <button
                    disabled={!replaceWith || !query}
                    onClick={replaceAllText}
                    className="px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Replace All (Ctrl+Alt+Enter)"
                  >
                    All
                  </button>
                  <button
                    onClick={toggleCaseSensitive}
                    className={`p-2 rounded-lg transition-colors ${
                      caseSensitive
                        ? "bg-secondary bg-opacity-20 text-primary"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                    title="Case Sensitive"
                  >
                    <Icon name="FontSize" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Find;
