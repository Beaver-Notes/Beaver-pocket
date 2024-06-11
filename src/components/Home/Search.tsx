import ArrowDownS from "remixicon-react/ArrowDownSLineIcon";
import ArrowUpDownLineIcon from "remixicon-react/ArrowUpDownLineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import { useEffect, useState } from "react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  handleLabelFilterChange: (value: string) => void;
  setSortingOption: (value: string) => void;
  uniqueLabels: string[];
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  handleLabelFilterChange,
  setSortingOption,
  uniqueLabels,
}) => {
  const [translations, setTranslations] = useState({
    search: {
      searchNotes: "search.searchNotes",
      selectlabel: "search.selectlabel",
      lastUpdated: "search.lastUpdated",
      creationDate: "search.creationDate",
      alphabetical: "search.alphabetical",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      const translationModule = await import(
        `../../assets/locales/${selectedLanguage}.json`
      );
      setTranslations({ ...translations, ...translationModule.default });
    };

    loadTranslations();
  }, []);

  return (
    <div className="bg-transparent px-6">
      <div className="flex justify-center">
        <div className="apply relative w-full sm:w-[22em] mb-2 h-12 p-4 bg-[#F8F8F7] dark:bg-[#2D2C2C] align-middle inline rounded-full text-gray-800 cursor-pointer flex items-center justify-start dark:text-[color:var(--selected-dark-text)] mr-2;">
          <div>
            <Search2LineIcon className="text-gray-800 dark:text-[color:var(--selected-dark-text)] h-6 w-6" />
          </div>
          <input
            className="text-xl text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] px-2 outline-none dark:text-[color:var(--selected-dark-text)] w-full"
            type="text"
            placeholder={translations.search.searchNotes}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="sm:block hidden relative inline-flex items-center">
          <div>
            <select
              id="labelSelect"
              onChange={(e) => handleLabelFilterChange(e.target.value)}
              className="rounded-full ml-2 pl-4 pr-10 p-3 h-12 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
            >
              <option value="">{translations.search.selectlabel}</option>
              {uniqueLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-2/3 pointer-events-none" />
          </div>
        </div>
        <div className="sm:block hidden relative inline-flex items-center">
          <select
            onChange={(e) => setSortingOption(e.target.value)}
            className="rounded-full ml-2 pl-4 pr-10 p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
          >
            <option value="updatedAt">{translations.search.lastUpdated}</option>
            <option value="createdAt">
              {translations.search.creationDate}
            </option>
            <option value="alphabetical">
              {translations.search.alphabetical}
            </option>
          </select>
          <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-2/3 pointer-events-none" />
        </div>
      </div>
      <div className="items-center flex gap-2 justify-between w-full">
        <div className="sm:w-[22em] h-12 flex items-center justify-start sm:hidden overflow-hidden w-full">
          <div className="block bg-[#F8F8F7] p-3 w-full dark:bg-[#2D2C2C] rounded-full sm:hidden relative inline-flex items-center">
            <ArrowUpDownLineIcon className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none" />
            <select
              onChange={(e) => setSortingOption(e.target.value)}
              className="bg-transparent dark:text-[color:var(--selected-dark-text)] outline-none appearance-none pl-8 w-full"
            >
              <option value="updatedAt">
                {translations.search.lastUpdated}
              </option>
              <option value="createdAt">
                {translations.search.creationDate}
              </option>
              <option value="alphabetical">
                {translations.search.alphabetical}
              </option>
            </select>
          </div>
        </div>
        <div className="relative inline-flex items-center w-full">
          <select
            id="labelSelect"
            onChange={(e) => handleLabelFilterChange(e.target.value)}
            className="sm:hidden rounded-full pr-10 p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none w-full"
          >
            <option value="">{translations.search.selectlabel}</option>
            {uniqueLabels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
