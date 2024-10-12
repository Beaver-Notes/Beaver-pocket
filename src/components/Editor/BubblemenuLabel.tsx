import { useEffect, useState } from "react";
import dayjs from "dayjs";
import icons from "../../lib/remixicon-react"; // Adjust the import path as needed

type Props = {
  textAfterHash: string | null;
  uniqueLabels: string[];
  onClickLabel: (labelToAdd: string) => void;
};

function NoteLabels({
  textAfterHash,
  uniqueLabels,
  onClickLabel,
}: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [translations, setTranslations] = useState({
    editor: {
      addLabel: "editor.addLabel",
    },
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

  return (
    <div
      className="z-50 fixed bg-white dark:bg-[#232222] shadow-lg border border-neutral-300 dark:border-neutral-600 rounded-lg min-w-48 p-2"
    >
      <div className="flex items-center p-2">
        <icons.AddFillIcon />
        <input
          type="text"
          value={newLabel}
          readOnly
          onClick={() => onClickLabel(newLabel)}
          placeholder={translations.editor.addLabel || "-"}
          className="flex-1 bg-transparent outline-none"
        />
      </div>
      <div className="p-2">
        {uniqueLabels.slice(0, 5).map((label) => (
          <div
            key={label}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg cursor-pointer"
            onClick={() => onClickLabel(label)}
          >
            {label.length > 20 ? label.substring(0, 17) + "..." : label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NoteLabels;
