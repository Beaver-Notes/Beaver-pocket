import { useEffect, useState } from "react";
import { useLabelStore } from "@/store/label";
import { useSearchParams } from "react-router-dom";
import Icon from "../ui/Icon";
import { useTranslation } from "@/utils/translations";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleLabelFilterChange: (value: string) => void;
  setSortingOption: (value: string) => void;
  setSortOrder: (value: "asc" | "desc") => void;
  sortOrder: string;
  sortingOptions: string;
  setActiveLabel: (value: string) => void;
  activeLabel: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  handleLabelFilterChange,
  setSortingOption,
  setActiveLabel,
  setSortOrder,
  sortingOptions,
  sortOrder,
  activeLabel,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLabel = searchParams.get("label");
  const labelStore = useLabelStore.getState();
  const labels = labelStore.data;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any>>({
    filter: {},
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

  // Load labels when component mounts
  useEffect(() => {
    const loadLabels = async () => {
      await labelStore.retrieve();
    };
    loadLabels();
  }, []);

  // Handle label from URL params on initial load
  useEffect(() => {
    if (urlLabel) {
      setActiveLabel(urlLabel);
      handleLabelFilterChange(urlLabel);
    }
  }, []);

  const handleLabelChange = (value: string) => {
    setActiveLabel(value);
    handleLabelFilterChange(value);

    // Update URL params
    if (value) {
      searchParams.set("label", value);
    } else {
      searchParams.delete("label");
    }
    setSearchParams(searchParams);
  };
  return (
    <div className="bg-transparent px-4 sm:px-4">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-center gap-2 md:gap-3 lg:justify-center">
          <div className="relative flex items-center w-full md:w-full lg:w-[22em] h-12 px-4 bg-neutral-50 dark:bg-neutral-750 rounded-full ring-2 ring-primary mb-2">
            <Icon
              name="Search2Line"
              className="text-neutral-600 dark:text-[color:var(--selected-dark-text)]"
            />
            <input
              type="text"
              placeholder={translations.filter.searchNotes}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ml-2 w-full bg-transparent text-lg text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none placeholder-neutral-400"
            />
          </div>

          <div className="sm:hidden relative">
            {/* round trigger button */}
            <button
              type="button"
              className="p-2.5 bg-neutral-50 dark:bg-neutral-750 rounded-full"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-label={translations.filter.sortBy}
            >
              <Icon name="ArrowUpDownLine" />
            </button>

            {/* dropdown (simple) */}
            {isMobileOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50">
                {[
                  {
                    value: "updatedAt",
                    label: translations.filter.lastUpdated,
                  },
                  {
                    value: "createdAt",
                    label: translations.filter.creationDate,
                  },
                  {
                    value: "alphabetical",
                    label: translations.filter.alphabetical,
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`flex items-center w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors ${
                      sortingOptions === opt.value
                        ? "bg-secondary bg-opacity-20"
                        : ""
                    }`}
                    onClick={() => {
                      setSortingOption(opt.value);
                      setIsMobileOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {/* Label Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLabelOpen((prev) => !prev)}
                className="h-12 rounded-full pl-4 pr-3 w-full bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none flex items-center justify-between"
              >
                {activeLabel || translations.filter.selectlabel}
                <Icon
                  name="ArrowDownSLine"
                  className={`ml-4 transition-transform duration-200 pointer-events-none ${
                    isLabelOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isLabelOpen && (
                <div className="absolute mt-1 w-full bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50">
                  <button
                    className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                      activeLabel === "" ? "bg-secondary bg-opacity-20" : ""
                    }`}
                    onClick={() => {
                      handleLabelChange("");
                      setIsLabelOpen(false);
                    }}
                  >
                    {translations.filter.selectlabel}
                  </button>
                  {labels?.map((label: string) => (
                    <button
                      key={label}
                      className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                        activeLabel === label
                          ? "bg-secondary bg-opacity-20"
                          : ""
                      }`}
                      onClick={() => {
                        handleLabelChange(label);
                        setIsLabelOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center">
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="h-12 px-3 border-r rounded-l-full bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none"
              >
                {sortOrder === "asc" ? (
                  <Icon name="SortAsc" />
                ) : (
                  <Icon name="SortDesc" />
                )}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortOpen((prev) => !prev)}
                  className="h-12 pl-3 pr-3 rounded-r-full bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none flex items-center justify-between w-full"
                >
                  {
                    {
                      updatedAt: translations.filter.lastUpdated,
                      createdAt: translations.filter.creationDate,
                      alphabetical: translations.filter.alphabetical,
                    }[sortingOptions]
                  }
                  <Icon
                    name="ArrowDownSLine"
                    className={`ml-4 transition-transform duration-200 pointer-events-none ${
                      isSortOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSortOpen && (
                  <div className="absolute mt-1 right-0 w-full bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50">
                    {[
                      {
                        value: "updatedAt",
                        label: translations.filter.lastUpdated,
                      },
                      {
                        value: "createdAt",
                        label: translations.filter.creationDate,
                      },
                      {
                        value: "alphabetical",
                        label: translations.filter.alphabetical,
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                          sortingOptions === opt.value
                            ? "bg-secondary bg-opacity-20"
                            : ""
                        }`}
                        onClick={() => {
                          setSortingOption(opt.value);
                          setIsSortOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="hidden sm:grid md:hidden grid-cols-2 gap-2 md:gap-3 mt-2 w-full">
          {/* Label Selector */}
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setIsLabelOpen((prev) => !prev)}
              className="h-12 w-full rounded-full pl-4 pr-5 bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none flex items-center justify-between"
            >
              {activeLabel || translations.filter.selectlabel}
              <Icon
                name="ArrowDownSLine"
                className={`transition-transform duration-200 pointer-events-none ${
                  isLabelOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isLabelOpen && (
              <div className="absolute mt-1 w-full bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50">
                <button
                  className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                    activeLabel === "" ? "bg-secondary bg-opacity-20" : ""
                  }`}
                  onClick={() => {
                    handleLabelChange("");
                    setIsLabelOpen(false);
                  }}
                >
                  {translations.filter.selectlabel}
                </button>
                {labels?.map((label: string) => (
                  <button
                    key={label}
                    className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                      activeLabel === label ? "bg-secondary bg-opacity-20" : ""
                    }`}
                    onClick={() => {
                      handleLabelChange(label);
                      setIsLabelOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sorting Section */}
          <div className="flex items-center w-full">
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="h-12 px-3 border-r rounded-l-full bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none"
              aria-label={
                sortOrder === "asc"
                  ? translations.filter.ascending
                  : translations.filter.descending
              }
            >
              {sortOrder === "asc" ? (
                <Icon name="SortAsc" />
              ) : (
                <Icon name="SortDesc" />
              )}
            </button>

            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="h-12 pl-3 pr-3 w-full rounded-r-full bg-neutral-50 dark:bg-neutral-750 text-neutral-800 dark:text-[color:var(--selected-dark-text)] outline-none flex items-center justify-between"
              >
                {
                  {
                    updatedAt: translations.filter.lastUpdated,
                    createdAt: translations.filter.creationDate,
                    alphabetical: translations.filter.alphabetical,
                  }[sortingOptions]
                }

                <Icon
                  name="ArrowDownSLine"
                  className={`ml-4 transition-transform duration-200 pointer-events-none ${
                    isSortOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isSortOpen && (
                <div className="absolute mt-1 right-0 w-full bg-neutral-100 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-lg z-50">
                  {[
                    {
                      value: "updatedAt",
                      label: translations.filter.lastUpdated,
                    },
                    {
                      value: "createdAt",
                      label: translations.filter.creationDate,
                    },
                    {
                      value: "alphabetical",
                      label: translations.filter.alphabetical,
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      className={`block w-full text-left px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 ${
                        sortingOptions === opt.value
                          ? "bg-secondary bg-opacity-20"
                          : ""
                      }`}
                      onClick={() => {
                        setSortingOption(opt.value);
                        setIsSortOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
