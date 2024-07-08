import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";
import { Note } from "../../store/types";
import dayjs from "dayjs";
import icons from "../../lib/remixicon-react"; // Adjust the import path as needed

type Props = {
  position: any;
  note: Note;
  onChange: (content: JSONContent, title?: string) => void;
  editor: any;
  textAfterHash: string | null;
  setHashPosition: any;
  setHashPopupPosition: any;
  setTextAfterHash: any;
};

function NoteLabels({ onChange, note, setHashPosition, setHashPopupPosition, setTextAfterHash, editor, position, textAfterHash }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [globalLabels, setGlobalLabels] = useState<string[]>([]);
  const [translations, setTranslations] = useState({
    editor: {
      addLabel: "editor.addLabel",
    },
  });

  const extractLabelsFromNote = (note: Note): string[] => {
    return note.labels || [];
  };

  useEffect(() => {
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
    setGlobalLabels(extractLabelsFromNote(note));
  }, [note]);

  useEffect(() => {
    const checkForDeletedLabels = () => {
      const contentArray = editor.getJSON().content || [];
      const currentLabels = contentArray
        .filter((node: any) => node.type === "noteLabel" && node.attrs?.id)
        .map((node: any) => node.attrs.id);

      globalLabels.forEach((label) => {
        if (!currentLabels.includes(label)) {
          updateLabelsInNote(label, "");
          setGlobalLabels((prevLabels) =>
            prevLabels.filter((lbl) => lbl !== label)
          );
        }
      });
    };

    editor.on("update", checkForDeletedLabels);
    return () => {
      editor.off("update", checkForDeletedLabels);
    };
  }, [editor, globalLabels]);

  useEffect(() => {
    if (textAfterHash) {
      setNewLabel(textAfterHash);
    }
  }, [textAfterHash]);

  const updateLabelsInNote = (labelToUpdate: string, newLabel: string) => {
    const updatedNote = { ...note };

    if (
      typeof updatedNote.content === "object" &&
      updatedNote.content !== null
    ) {
      const contentArray =
        "content" in updatedNote.content &&
        Array.isArray(updatedNote.content.content)
          ? updatedNote.content.content
          : [];

      const labelIndex = updatedNote.labels?.indexOf(labelToUpdate);

      if (labelIndex !== -1) {
        if (newLabel.trim() === "") {
          updatedNote.labels.splice(labelIndex, 1);

          const existingNoteLabelIndex = contentArray.findIndex(
            (node: any) =>
              node.type === "noteLabel" &&
              node.attrs &&
              node.attrs.id === labelToUpdate
          );

          if (existingNoteLabelIndex !== -1) {
            contentArray.splice(existingNoteLabelIndex, 1);
          }
        } else {
          updatedNote.labels[labelIndex] = newLabel;

          const existingNoteLabelIndex = contentArray.findIndex(
            (node: any) =>
              node.type === "noteLabel" &&
              node.attrs &&
              node.attrs.id === labelToUpdate
          );

          if (
            existingNoteLabelIndex !== -1 &&
            contentArray[existingNoteLabelIndex]?.attrs
          ) {
            contentArray[existingNoteLabelIndex] = {
              type: "noteLabel",
              attrs: {
                id: newLabel,
                label: newLabel,
              },
            };
          }
        }

        onChange(updatedNote.content);
      }
    }
  };

  const addLabelToNote = (labelToAdd: string) => {
    const updatedNote = { ...note };
  
    // Find the position of the hash and the text after it
    const content = editor.getText();
    const hashIndex = content.lastIndexOf("#");
    const range = editor.state.tr.selection;
  
    if (hashIndex !== -1) {
      editor
        .chain()
        .focus()
        .deleteRange({
          from: hashIndex,
          to: range.to,
        })
        .insertContent({
          type: "paragraph",
          content: [
            {
              type: "noteLabel",
              attrs: { id: labelToAdd, label: labelToAdd },
            },
          ],
        })
        .run();
        
      // Close the hash popup after replacing the text
      setHashPopupPosition(null);
      setHashPosition(null);
      setTextAfterHash("");
    }
  
    if (!updatedNote.labels) {
      updatedNote.labels = [labelToAdd];
    } else {
      updatedNote.labels.push(labelToAdd);
    }
  
    setGlobalLabels(extractLabelsFromNote(updatedNote));
  };  

  const handleAddLabel = () => {
    if (newLabel.trim() !== "") {
      addLabelToNote(newLabel.trim());
      setNewLabel("");
    }
  };

  return (
    <div
      className="z-50 mt-6 fixed bg-white dark:bg-[#232222] shadow border-2 shadow dark:border-neutral-600 rounded-lg min-w-12 min-h-14 p-2"
      style={{ left: position.left, top: position.top }}
    >
      <div className="flex items-center p-2">
        <icons.AddFillIcon />
        <input
          type="text"
          value={newLabel}
          readOnly
          onClick={handleAddLabel}
          placeholder={translations.editor.addLabel || "-"}
          className="flex-1 bg-transparent"
        />
      </div>
    </div>
  );
}

export default NoteLabels;
