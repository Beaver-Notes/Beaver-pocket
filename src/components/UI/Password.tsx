import React, { useState, useEffect } from "react";
import "../../assets/css/Modal.css"; // Import your CSS file for modal styles
import dayjs from "dayjs";
import Icon from "./Icon";
import { useTranslation } from "@/utils/translations";

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
  const [translations, setTranslations] = useState<Record<string, any>>({
    home: {},
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

  return (
    <div
      className={`modal-container ${isVisible ? "show" : "hide"}`}
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
    >
      <div className="fixed inset-0 z-40 flex justify-center items-center bg-black bg-opacity-20">
        <div className="bg-white dark:bg-[#2D2C2C] w-2/3 sm:w-2/5 p-4 rounded-lg shadow-lg">
          {/* Modal Title */}
          <h2
            id="modal-title"
            className="text-2xl font-semibold dark:text-[color:var(--selected-dark-text)] mb-4"
          >
            {title}
          </h2>

          {/* Input Field */}
          <div className="relative">
            <label htmlFor="password-input" className="sr-only">
              {translations.home.enterpasswd}
            </label>
            <input
              id="password-input"
              type={showInputContent ? "text" : "password"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full dark:bg-neutral-800 border-secondary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 mb-4 rounded-lg pr-10"
              placeholder={translations.home.enterpasswd}
              aria-labelledby="modal-title"
            />

            {/* Toggle Password Visibility Button */}
            <button
              onClick={toggleInputContentVisibility}
              className="absolute right-0 py-1.5 text-sm dark:text-[color:var(--selected-dark-text)] text-neutral-500 focus:outline-none"
              aria-label={
                showInputContent
                  ? translations.home.hidePassword
                  : translations.home.showPassword
              }
            >
              {showInputContent ? (
                <Icon name="EyeLine" className="mr-2" />
              ) : (
                <Icon name="EyeCloseLine" className="mr-2" />
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 justify-end">
            <button
              onClick={handleCancel}
              className="p-3 text-xl w-1/2 bg-neutral-100 dark:bg-neutral-700 dark:text-[color:var(--selected-dark-text)] text-neutral-700 rounded-lg hover:bg-neutral-200"
              aria-label={translations.home.cancel}
            >
              {translations.home.cancel}
            </button>
            <button
              onClick={handleConfirm}
              className="p-3 w-1/2 text-xl bg-primary text-white rounded-lg hover:bg-secondary mr-2"
              aria-label={translations.home.confirm}
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
