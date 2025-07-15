import icons from "../../lib/remixicon-react";
import { useEffect, useState } from "react";
import { labelStore } from "../../store/label";
import { useSearchParams } from "react-router-dom";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleLabelFilterChange: (value: string) => void;
  setSortingOption: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  handleLabelFilterChange,
  setSortingOption,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlLabel = searchParams.get("label");
  const [selectedLabel, setSelectedLabel] = useState(urlLabel || "");
  const labels = labelStore.labels;
  const [translations, setTranslations] = useState({
    filter: {
      searchNotes: "filter.searchNotes",
      selectlabel: "filter.selectlabel",
      lastUpdated: "filter.lastUpdated",
      creationDate: "filter.creationDate",
      alphabetical: "filter.alphabetical",
    },
  });

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
      setSelectedLabel(urlLabel);
      handleLabelFilterChange(urlLabel);
    }
  }, []);

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );
        setTranslations(translationModule.default);
      } catch (error) {
        console.error("Failed to load translations:", error);
      }
    };

    loadTranslations();
  }, []);

  const handleClearInput = () => {
    setSearchQuery("");
  };

  const handleLabelChange = (value: string) => {
    setSelectedLabel(value);
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
    <div className="bg-transparent px-6">
      <div className="flex justify-center">
        <div className="relative w-full ring-2 ring-primary sm:w-[22em] mb-2 h-12 p-4 bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-full text-neutral-800 flex items-center justify-start dark:text-[color:var(--selected-dark-text)] mr-2">
          <div>
            <icons.Search2LineIcon className="text-neutral-800 dark:text-[color:var(--selected-dark-text)] h-6 w-6" />
          </div>
          <input
            className="text-xl text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
            type="text"
            placeholder={translations.filter.searchNotes}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={handleClearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-800 dark:text-[color:var(--selected-dark-text)]"
            >
              <icons.DeleteBackLineIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        <div className="sm:block hidden relative inline-flex items-center">
          <div>
            <select
              id="labelSelect"
              value={selectedLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              className="rounded-full ml-2 pl-4 pr-10 p-3 h-12 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
            >
              <option value="">{translations.filter.selectlabel}</option>
              {labels?.map((label: string) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-2/3 pointer-events-none">
              <icons.ArrowDownSLineIcon className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="sm:block hidden relative inline-flex items-center">
          <select
            onChange={(e) => setSortingOption(e.target.value)}
            className="rounded-full ml-2 pl-4 pr-10 p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
          >
            <option value="updatedAt">{translations.filter.lastUpdated}</option>
            <option value="createdAt">
              {translations.filter.creationDate}
            </option>
            <option value="alphabetical">
              {translations.filter.alphabetical}
            </option>
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-2/3 pointer-events-none">
            <icons.ArrowDownSLineIcon className="h-6 w-6" />
          </div>
        </div>
      </div>
      <div className="items-center flex gap-2 justify-between w-full">
        <div className="sm:w-[22em] h-12 flex items-center justify-start sm:hidden overflow-hidden w-full">
          <div className="block bg-[#F8F8F7] p-3 w-full dark:bg-[#2D2C2C] rounded-full sm:hidden relative inline-flex items-center">
            <icons.ArrowUpDownLineIcon className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none h-6 w-6" />
            <select
              onChange={(e) => setSortingOption(e.target.value)}
              className="bg-transparent dark:text-[color:var(--selected-dark-text)] outline-none appearance-none pl-8 w-full"
            >
              <option value="updatedAt">
                {translations.filter.lastUpdated}
              </option>
              <option value="createdAt">
                {translations.filter.creationDate}
              </option>
              <option value="alphabetical">
                {translations.filter.alphabetical}
              </option>
            </select>
          </div>
        </div>
        <div className="sm:hidden relative inline-flex items-center w-full">
          <select
            id="mobileLabelSelect"
            value={selectedLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="rounded-full pr-10 p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none w-full"
          >
            <option value="">{translations.filter.selectlabel}</option>
            {labels?.map((label: string) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <icons.ArrowDownSLineIcon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
