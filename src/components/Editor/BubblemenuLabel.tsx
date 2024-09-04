import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";
import { Note } from "../../store/types";
import dayjs from "dayjs";
import icons from "../../lib/remixicon-react"; // Adjust the import path as needed

type Props = {
  hashPopupPosition: { top: number; left: number } | any;
  note: Note;
  handleChangeNoteContent: (
    content: JSONContent,
    title?: string,
    labels?: string[]
  ) => void;
  editor: any;
  textAfterHash: string | null;
  setHashPosition: any;
  setHashPopupPosition: any;
  setTextAfterHash: any;
  uniqueLabels: string[];
  onClickLabel: (labelToAdd: string) => void;
};

function NoteLabels({
  note,
  hashPopupPosition,
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
  }, [note]);

  useEffect(() => {
    if (textAfterHash) {
      setNewLabel(textAfterHash);
    }
  }, [textAfterHash]);

  return (
    <div
      className="z-50 fixed bg-white dark:bg-[#232222] shadow border-2 shadow dark:border-neutral-600 rounded-lg min-w-12 min-h-14 p-2"
      style={{ top: hashPopupPosition.top, left: hashPopupPosition.left }}
    >
      <div className="flex items-center p-2">
        <icons.AddFillIcon />
        <input
          type="text"
          value={newLabel}
          readOnly
          onClick={() => onClickLabel(newLabel)}
          placeholder={translations.editor.addLabel || "-"}
          className="flex-1 bg-transparent"
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
