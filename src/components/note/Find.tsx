import React, { useEffect, useState, useRef, useCallback } from "react";
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isIOSRef = useRef(/iPad|iPhone|iPod/.test(navigator.userAgent));
  const keyboardOpenRef = useRef(false);
  const lastFocusedInputRef = useRef<HTMLInputElement | null>(null);

  // Track keyboard state on iOS
  useEffect(() => {
    if (!isIOSRef.current) return;

    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement) {
        keyboardOpenRef.current = true;
        lastFocusedInputRef.current = e.target;
      }
    };

    const handleFocusOut = () => {
      // Delay to check if focus moved to another input
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT') {
          keyboardOpenRef.current = false;
          lastFocusedInputRef.current = null;
        }
      }, 100);
    };

    // Listen for viewport changes that indicate keyboard show/hide
    const handleVisualViewportChange = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        keyboardOpenRef.current = keyboardHeight > 100;
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
      }
    };
  }, []);

  // Prevent scrolling on focus for iOS
  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (!isIOSRef.current) return;
    
    lastFocusedInputRef.current = e.target;
    keyboardOpenRef.current = true;
    
    // Prevent scroll by temporarily fixing the body position
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    // Restore after a short delay
    setTimeout(() => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    }, 100);
  }, []);

  // Enhanced button handler that preserves keyboard state
  const createButtonHandler = useCallback((action: () => void) => {
    return (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      
      if (isIOSRef.current && keyboardOpenRef.current && lastFocusedInputRef.current) {
        // Store current input state
        const currentInput = lastFocusedInputRef.current;
        const cursorPos = currentInput.selectionStart || 0;
        
        // Execute action
        action();
        
        // Immediately restore focus without triggering scroll
        requestAnimationFrame(() => {
          if (currentInput && document.contains(currentInput)) {
            currentInput.focus({ preventScroll: true });
            currentInput.setSelectionRange(cursorPos, cursorPos);
          }
        });
      } else {
        action();
      }
    };
  }, []);

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
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (text) setQuery(text);
  }, [editor]);

  // Prevent iOS zoom and add better styles
  useEffect(() => {
    if (!isIOSRef.current) return;

    // Add CSS to prevent zoom and improve input handling
    const style = document.createElement('style');
    style.textContent = `
      .ios-input-fix {
        font-size: 16px !important;
        transform: translateZ(0);
        -webkit-user-select: text;
        user-select: text;
        -webkit-touch-callout: none;
      }
      .ios-button-fix {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        touch-action: manipulation;
      }
      .search-container {
        -webkit-overflow-scrolling: touch;
        transform: translate3d(0, 0, 0);
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const startSearch = useCallback(() => {
    if (!editor) return;
    editor.commands.setSearchTerm(query);
    editor.commands.setReplaceTerm(replaceWith);
    editor.commands.setCaseSensitive(caseSensitive);
    editor.commands.nextSearchResult();
  }, [editor, query, replaceWith, caseSensitive]);

  const goToSelection = useCallback(() => {
    if (!editor) return;
    const { results, resultIndex } = editor.storage?.searchAndReplace || {};
    const position = results?.[resultIndex];

    if (!position) return;

    editor.commands.setTextSelection(position);

    // Only scroll if keyboard is not open on iOS
    if (!isIOSRef.current || !keyboardOpenRef.current) {
      const { node } = editor.view.domAtPos(editor.state.selection.anchor);
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [editor]);

  const findNextResult = createButtonHandler(() => {
    if (!editor) return;
    editor.commands.nextSearchResult();
    goToSelection();
  });

  const findPreviousResult = createButtonHandler(() => {
    if (!editor) return;
    editor.commands.previousSearchResult();
    goToSelection();
  });

  const replaceText = createButtonHandler(() => {
    if (!editor || !replaceWith) return;
    editor.commands.replace();
  });

  const replaceAllText = createButtonHandler(() => {
    if (!editor || !replaceWith) return;
    editor.commands.replaceAll();
  });

  const toggleCaseSensitive = createButtonHandler(() => {
    if (!editor) return;
    setCaseSensitive(!caseSensitive);
    editor.commands.setCaseSensitive(!caseSensitive);
  });

  const toggleReplace = createButtonHandler(() => {
    setShowReplace(!showReplace);
  });

  const handleClose = createButtonHandler(() => {
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
  });

  // Keyboard handlers that maintain focus
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (e.shiftKey) {
        editor?.commands.previousSearchResult();
      } else {
        editor?.commands.nextSearchResult();
      }
      goToSelection();
      
      // Keep focus and cursor position
      const input = e.target as HTMLInputElement;
      const cursorPos = input.selectionStart || 0;
      setTimeout(() => {
        input.focus({ preventScroll: true });
        input.setSelectionRange(cursorPos, cursorPos);
      }, 10);
    }
  };

  const handleReplaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (e.altKey) {
        replaceAllText(e as any);
      } else {
        replaceText(e as any);
      }
      
      // Keep focus and cursor position
      const input = e.target as HTMLInputElement;
      const cursorPos = input.selectionStart || 0;
      setTimeout(() => {
        input.focus({ preventScroll: true });
        input.setSelectionRange(cursorPos, cursorPos);
      }, 10);
    }
  };

  const resultInfo = editor?.storage?.searchAndReplace || {};
  const currentResult = (resultInfo.resultIndex ?? -1) + 1;
  const totalResults = resultInfo.results?.length ?? 0;

  return (
    <div
      className={`fixed inset-x-0 z-40 transition-all duration-300 ease-out mx-2 search-container ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-4 sm:translate-y-4 opacity-0"
      } bottom-20`}
    >
      <div
        ref={containerRef}
        className="relative bg-white dark:bg-neutral-800 border rounded-xl shadow-lg overflow-hidden w-full sm:w-fit sm:mx-auto"
      >
        {/* Desktop */}
        <div className="hidden sm:flex items-center p-2 space-x-2">
          <div className="relative flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 min-w-0 max-w-xs">
            <Icon
              name="Search2Line"
              className="text-neutral-500 dark:text-neutral-400 mr-2 w-4 h-4 flex-shrink-0"
            />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={translations.search.searchplaceholder || "Search..."}
              className={`flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 min-w-0 ${isIOSRef.current ? 'ios-input-fix' : ''}`}
              onKeyUp={startSearch}
              onKeyDown={handleSearchKeyDown}
              onFocus={handleInputFocus}
              autoFocus
            />
            {totalResults > 0 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 flex-shrink-0">
                {currentResult}/{totalResults}
              </div>
            )}
          </div>

          <div className="flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 max-w-xs">
            <input
              ref={replaceInputRef}
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder={translations.search.replaceplaceholder || "Replace..."}
              className={`flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 ${isIOSRef.current ? 'ios-input-fix' : ''}`}
              onKeyUp={startSearch}
              onKeyDown={handleReplaceKeyDown}
              onFocus={handleInputFocus}
            />
          </div>

          <div className="flex items-center space-x-1">
            <button
              disabled={!query || totalResults === 0}
              onMouseDown={findPreviousResult}
              onTouchStart={findPreviousResult}
              className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Previous (Shift+Enter)"
            >
              <Icon name="ArrowUp" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            
            <button
              disabled={!query || totalResults === 0}
              onMouseDown={findNextResult}
              onTouchStart={findNextResult}
              className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Next (Enter)"
            >
              <Icon name="ArrowDown" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            
            <button
              disabled={!replaceWith || !query}
              onMouseDown={replaceText}
              onTouchStart={replaceText}
              className={`px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Replace (Alt+Enter)"
            >
              Replace
            </button>
            
            <button
              disabled={!replaceWith || !query}
              onMouseDown={replaceAllText}
              onTouchStart={replaceAllText}
              className={`px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Replace All (Ctrl+Alt+Enter)"
            >
              All
            </button>
            
            <button
              onMouseDown={toggleCaseSensitive}
              onTouchStart={toggleCaseSensitive}
              className={`p-2 rounded-lg transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''} ${
                caseSensitive
                  ? "bg-secondary bg-opacity-20 text-primary"
                  : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
              }`}
              title="Case Sensitive"
            >
              <Icon name="FontSize" className="w-4 h-4" />
            </button>
            
            <button
              onMouseDown={handleClose}
              onTouchStart={handleClose}
              className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ml-2 ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Close (Esc)"
            >
              <Icon name="CloseLine" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="sm:hidden">
          <div className="flex items-center p-2 space-x-2">
            <div className="relative flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5 min-w-0">
              <Icon
                name="Search2Line"
                className="text-neutral-500 dark:text-neutral-400 mr-2 w-4 h-4 flex-shrink-0"
              />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={translations.search.searchplaceholder || "Search..."}
                className={`flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 min-w-0 ${isIOSRef.current ? 'ios-input-fix' : ''}`}
                onKeyUp={startSearch}
                onKeyDown={handleSearchKeyDown}
                onFocus={handleInputFocus}
                autoFocus
              />
              {totalResults > 0 && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 ml-2 flex-shrink-0">
                  {currentResult}/{totalResults}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={!query || totalResults === 0}
                onMouseDown={findPreviousResult}
                onTouchStart={findPreviousResult}
                className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
                title="Previous (Shift+Enter)"
              >
                <Icon name="ArrowUp" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </button>
              
              <button
                disabled={!query || totalResults === 0}
                onMouseDown={findNextResult}
                onTouchStart={findNextResult}
                className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
                title="Next (Enter)"
              >
                <Icon name="ArrowDown" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            <button
              onMouseDown={toggleReplace}
              onTouchStart={toggleReplace}
              className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Toggle Replace"
            >
              <Icon
                name={showReplace ? "ArrowUpSLine" : "ArrowDownSLine"}
                className="w-4 h-4 text-neutral-600 dark:text-neutral-400"
              />
            </button>

            <button
              onMouseDown={handleClose}
              onTouchStart={handleClose}
              className={`p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
              title="Close (Esc)"
            >
              <Icon name="CloseLine" className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>

          <div
            className={`transition-all duration-200 ease-in-out overflow-hidden ${
              showReplace ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
              <div className="flex items-center space-x-2">
                <div className="flex items-center flex-1 border bg-neutral-50 dark:bg-neutral-750 rounded-lg px-3 py-2.5">
                  <input
                    ref={replaceInputRef}
                    value={replaceWith}
                    onChange={(e) => setReplaceWith(e.target.value)}
                    placeholder={translations.search.replaceplaceholder || "Replace..."}
                    className={`flex-1 text-sm bg-transparent outline-none text-neutral-800 dark:text-neutral-200 ${isIOSRef.current ? 'ios-input-fix' : ''}`}
                    onKeyUp={startSearch}
                    onKeyDown={handleReplaceKeyDown}
                    onFocus={handleInputFocus}
                  />
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    disabled={!replaceWith || !query}
                    onMouseDown={replaceText}
                    onTouchStart={replaceText}
                    className={`px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
                    title="Replace (Alt+Enter)"
                  >
                    Replace
                  </button>
                  
                  <button
                    disabled={!replaceWith || !query}
                    onMouseDown={replaceAllText}
                    onTouchStart={replaceAllText}
                    className={`px-3 py-2 text-xs rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''}`}
                    title="Replace All (Ctrl+Alt+Enter)"
                  >
                    All
                  </button>
                  
                  <button
                    onMouseDown={toggleCaseSensitive}
                    onTouchStart={toggleCaseSensitive}
                    className={`p-2 rounded-lg transition-colors ${isIOSRef.current ? 'ios-button-fix' : ''} ${
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