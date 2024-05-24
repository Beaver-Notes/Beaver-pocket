import React, { useState, useEffect } from "react";
import EyeLineIcon from "remixicon-react/EyeLineIcon";
import EyeCloseLineIcon from "remixicon-react/EyeCloseLineIcon";
import "./Modal.css"; // Import your CSS file for modal styles
import dayjs from "dayjs";

interface ModularPromptProps {
  title: string;
  initialValue?: string;
  onConfirm: (value: string | null) => void;
  onCancel?: () => void;
}

const ModularPrompt: React.FC<ModularPromptProps> = ({
  title,
  initialValue = "",
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [showInputContent, setShowInputContent] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleConfirm = () => {
    onConfirm(inputValue || null);
  };

  const handleCancel = () => {
    onCancel?.();
    setIsVisible(false);
  };

  const toggleInputContentVisibility = () => {
    setShowInputContent(!showInputContent);
  };

  // Translations
  const [translations, setTranslations] = useState({
    home: {
      enterpasswd: "home.enterpasswd",
      confirm: "home.confirm",
      cancel: "home.cancel"
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
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  return (
    <div className={`modal-container ${isVisible ? "show" : "hide"}`}>
      <div className="fixed inset-0 z-40 flex justify-center items-center bg-black bg-opacity-20">
        <div className="bg-white dark:bg-[#2D2C2C] w-[80%] p-4 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">{title}</h2>
          <div className="relative">
            <input
              type={showInputContent ? "text" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full dark:bg-neutral-800 border-amber-300 focus:border-amber-400 focus:outline-none focus:border-amber-300 border-2 p-2 mb-4 rounded-lg pr-10"
              placeholder= {translations.home.enterpasswd}
            />
            <button
              onClick={toggleInputContentVisibility}
              className="absolute right-0 py-1.5 text-sm dark:text-white text-gray-500 focus:outline-none"
            >
              {showInputContent ? (
                <EyeLineIcon className="w-8 h-8 mr-2" />
              ) : (
                <EyeCloseLineIcon className="w-8 h-8 mr-2" />
              )}
            </button>
          </div>
          <div className="flex space-x-2 justify-end">
            <button
              onClick={handleCancel}
              className="p-3 text-xl w-1/2 bg-gray-100 dark:bg-neutral-700 dark:text-white text-gray-700 rounded-lg hover:bg-gray-200"
            >
              {translations.home.cancel}
            </button>
            <button
              onClick={handleConfirm}
              className="p-3 w-1/2 text-xl bg-amber-400 text-white rounded-lg hover:bg-amber-300 mr-2"
            >
              {translations.home.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModularPrompt;
