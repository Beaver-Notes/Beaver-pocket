import ArrowDownS from "remixicon-react/ArrowDownSLineIcon";
import ArrowUpDownLineIcon from "remixicon-react/ArrowUpDownLineIcon";
import Download2LineIcon from "remixicon-react/Download2LineIcon";
import Upload2LineIcon from "remixicon-react/Upload2LineIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import { useEffect, useState } from "react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  handleLabelFilterChange: (value: string) => void;
  setSortingOption: (value: string) => void;
  uniqueLabels: string[];

  exportData: () => void;
  handleImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  handleLabelFilterChange,
  setSortingOption,
  uniqueLabels,
  exportData,
  handleImportData,
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
      const selectedLanguage = localStorage.getItem('selectedLanguage') || 'en';
      const translationModule = await import(`../assets/locales/${selectedLanguage}.json`);
      setTranslations({ ...translations, ...translationModule.default });
    };

    loadTranslations();
  }, []);

  return (
    <div className="bg-transparent px-6">
      <div className="flex justify-center">
        <div className="apply relative w-full md:w-[22em] mb-2 h-12 p-4 bg-[#F8F8F7] dark:bg-[#2D2C2C] align-middle inline rounded-full text-gray-800 cursor-pointer flex items-center justify-start dark:text-white mr-2;">
          <div>
            <Search2LineIcon className="text-gray-800 dark:text-white h-6 w-6" />
          </div>
          <input
            className="text-xl text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] px-2 outline-none dark:text-white w-full"
            type="text"
            placeholder={translations.search.searchNotes}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="md:block hidden relative inline-flex items-center">
          <div>
            <select
              id="labelSelect"
              onChange={(e) => handleLabelFilterChange(e.target.value)}
              className="rounded-full ml-2 pl-4 pr-10 p-3 h-12 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
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
        <div className="md:block hidden relative inline-flex items-center">
          <select
            onChange={(e) => setSortingOption(e.target.value)}
            className="rounded-full ml-2 pl-4 pr-10 p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
          >
            <option value="updatedAt">{translations.search.lastUpdated}</option>
            <option value="createdAt">{translations.search.creationDate}</option>
            <option value="alphabetical">{translations.search.alphabetical}</option>
          </select>
          <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
      <div className="items-center">
        <div className="md:w-[22em] h-12 flex items-center justify-start mx-auto sm:hidden overflow-hidden">
          <div className="border-r-2 border-gray-300 dark:border-neutral-800 p-3 rounded-l-full bg-[#F8F8F7] text-center dark:bg-[#2D2C2C] flex-grow text-gray-800 dark:bg-[#2D2C2C] dark:text-white outline-none">
            <button
              className="bg-[#F8F8F7] w-full dark:bg-[#2D2C2C] dark:text-white rounded-full font-semibold text-gray-800 cursor-pointer flex items-center justify-center"
              onClick={exportData}
            >
              <Upload2LineIcon />
            </button>
          </div>
          <div className="border-l-2 border-gray-300 dark:border-neutral-800 p-3 rounded-r-full bg-[#F8F8F7] dark:bg-[#2D2C2C] text-center flex-grow mr-2 text-gray-800 dark:bg-[#2D2C2C] dark:text-white outline-none">
            <div className="bg-[#F8F8F7] w-full dark:bg-[#2D2C2C] dark:text-white rounded-full font-semibold text-gray-800 cursor-pointer flex items-center justify-center">
              <label htmlFor="file">
                <Download2LineIcon />
              </label>
              <input
                className="hidden"
                type="file"
                onChange={handleImportData}
                id="file"
                // @ts-ignore
                directory=""
                webkitdirectory=""
              />
            </div>
          </div>
          <div className="relative inline-flex items-center">
            <select
              id="labelSelect"
              onChange={(e) => handleLabelFilterChange(e.target.value)}
              className="rounded-full pl-4 pr-10 p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-white outline-none appearance-none"
            >
              <option value="">Select Label</option>
              {uniqueLabels.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <ArrowDownS className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div className="py-2 block sm:hidden relative inline-flex items-center">
          <ArrowUpDownLineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
          <select
            onChange={(e) => setSortingOption(e.target.value)}
            className="bg-transparent text-lg dark:text-white outline-none appearance-none pl-10"
          >
            <option value="updatedAt">{translations.search.lastUpdated}</option>
            <option value="createdAt">{translations.search.creationDate}</option>
            <option value="alphabetical">{translations.search.alphabetical}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;