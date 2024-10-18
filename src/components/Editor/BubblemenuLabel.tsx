import { useEffect, useState } from "react";
import dayjs from "dayjs";
import Mousetrap from "mousetrap";
import icons from "../../lib/remixicon-react"; // Adjust the import path as needed

type Props = {
  textAfterHash: string | null;
  uniqueLabels: string[];
  onClickLabel: (labelToAdd: string) => void;
};

function NoteLabels({ textAfterHash, uniqueLabels, onClickLabel }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0); // For keyboard navigation
  const [translations, setTranslations] = useState({
    editor: {
      addLabel: "editor.addLabel",
    },
    accessibility: {
      addLabel: "editor.addLabel",
      labelSuggestions: "accessibility.LabelSuggestions",
      selectLabel: "accessibility.SelectLabel"
    }
  });

  // Load translations based on language setting
  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations((prevTranslations) => ({
          ...prevTranslations,
          ...translationModule.default,
        }));
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  // Set the new label based on the text after the hash (triggered suggestion)
  useEffect(() => {
    if (textAfterHash) {
      setNewLabel(textAfterHash);
    }
  }, [textAfterHash]);

  const filteredLabels = uniqueLabels
    .filter(
      (label) =>
        typeof label === "string" &&
        label.toLowerCase().includes(newLabel.toLowerCase())
    )
    .slice(0, 5); // Limit to the first 5 matching labels

  // Set up keyboard shortcuts using Mousetrap
  useEffect(() => {
    Mousetrap.bind("down", () => {
      setHighlightedIndex((prevIndex) =>
        Math.min(prevIndex + 1, filteredLabels.length - 1)
      );
    });

    Mousetrap.bind("up", () => {
      setHighlightedIndex((prevIndex) => Math.max(prevIndex - 1, 0));
    });

    Mousetrap.bind("enter", () => {
      if (filteredLabels.length > 0) {
        onClickLabel(filteredLabels[highlightedIndex]);
      }
    });

    return () => {
      Mousetrap.unbind("down");
      Mousetrap.unbind("up");
      Mousetrap.unbind("enter");
    };
  }, [highlightedIndex, filteredLabels]);

  return (
    <section
      className="z-50 fixed bg-white dark:bg-[#232222] shadow-lg border border-neutral-300 dark:border-neutral-600 rounded-lg min-w-48 p-2"
      aria-labelledby="labelSection"
      role="dialog"
    >
      <div className="flex items-center p-2">
        <button aria-label={translations.accessibility.addLabel} className="mr-2">
          <icons.AddFillIcon />
        </button>
        <input
          type="text"
          value={newLabel}
          readOnly
          onClick={() => onClickLabel(newLabel)}
          placeholder={translations.editor.addLabel}
          aria-label={translations.editor.addLabel}
          className="flex-1 bg-transparent outline-none"
        />
      </div>
      <ul
        role="list"
        aria-label={translations.accessibility.labelSuggestions}
        className="p-2"
      >
        {filteredLabels.map((label, index) => (
          <li key={label}>
            <button
              aria-label={`${translations.accessibility.selectLabel} ${label}`}
              className={`p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer w-full text-left ${
                highlightedIndex === index
                  ? "bg-neutral-200 dark:bg-neutral-600"
                  : ""
              }`}
              onClick={() => onClickLabel(label)}
              onMouseOver={() => setHighlightedIndex(index)} // To highlight on hover
            >
              {label.length > 20 ? `${label.substring(0, 17)}...` : label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default NoteLabels;
