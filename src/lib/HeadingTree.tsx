import React, { useState, useEffect } from 'react';
import Search2LineIcon from 'remixicon-react/Search2LineIcon';
import "../css/main.css";
import dayjs from 'dayjs';

type HeadingTreeProps = {
  onHeadingClick: (heading: string) => void;
};

const HeadingTree: React.FC<HeadingTreeProps> = ({ onHeadingClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHeading, setSelectedHeading] = useState<string | null>(null);

  const handleHeadingClick = (heading: string) => {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    const headingElement = headings.find(
      (element) => element.textContent?.toLowerCase() === heading.toLowerCase()
    );

    if (headingElement) {
      headingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onHeadingClick(heading);
      setSelectedHeading(heading);
    }
  };

  const closeHeadingTree = () => {
    setSelectedHeading(null);
  };

  window.addEventListener('click', closeHeadingTree);

  useEffect(() => {
    document.addEventListener('click', closeHeadingTree);

    return () => {
      document.removeEventListener('click', closeHeadingTree);
    };
  }, []);

  const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(
    (heading) => heading.textContent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

      // Translations
      const [translations, setTranslations] = useState({
        editor: {
          searchHeadings: "editor.searchHeadings",
        }
      });
    
      useEffect(() => {
        // Load translations
        const loadTranslations = async () => {
          const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
          try {
            const translationModule = await import(
              `../assets/locales/${selectedLanguage}.json`
            );
    
            setTranslations({ ...translations, ...translationModule.default });
            dayjs.locale(selectedLanguage);
          } catch (error) {
            console.error("Error loading translations:", error);
          }
        };
    
        loadTranslations();
      }, []);   

  return (
    <div className="fixed right-2 sm:right-10 md:right-20 lg:right-60 top-20 p-3 bg-white rounded-xl dark:bg-[#2D2C2C] border-2 dark:border-neutral-800 z-50 w-64">
      <div className="mb-2">
        <div className="flex items-center relative">
          <Search2LineIcon className="ml-2 dark:text-gray-200 text-gray-600 absolute left-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={translations.editor.searchHeadings || "-"}
            className="py-2 outline-none px-4 rounded-xl w-full bg-input bg-transparent transition ring-neutral-200 ring-2 dark:ring-neutral-600 focus:ring-2 focus:ring-amber-300 pl-10"
          />
        </div>
      </div>
      <div className="py-1" role="none">
        {headings.map((heading, index) => (
          <button
            key={index}
            onClick={() => handleHeadingClick(heading.textContent || '')}
            className={`w-full text-left block text-lg rounded-xl px-4 py-2 text-[16px] hover:bg-amber-400 hover:bg-opacity-10 hover:text-amber-400 hover:text-opacity-100 ${
              (index === 0 && !selectedHeading) ? 'bg-amber-400 bg-opacity-10 text-amber-400 text-opacity-100 mb-2 text-lg' : ''
            }`}
            role="menuitem"
          >
            {truncateHeading(heading.textContent || '', 2)}
          </button>
        ))}
      </div>
    </div>
  );
};


const truncateHeading = (text: string, words: number) => {
  const wordsArray = text.split(' ');
  const truncatedText = wordsArray.slice(0, words).join(' ');
  return wordsArray.length > words ? `${truncatedText}...` : truncatedText;
};

export default HeadingTree;
