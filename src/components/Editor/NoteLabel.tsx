import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";
import { Note } from "../../store/types";
import dayjs from "dayjs";

type Props = {
    note: Note;
    onChange: (content: JSONContent, title?: string) => void;
  };

function NoteLabels({
    onChange,
    note,
  }: Props){
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(
    null
  );
  const extractLabelsFromNote = (note: Note): string[] => {
    return note.labels || [];
  };
  const labelsArray: string[] = extractLabelsFromNote(note);
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

    const noteLabelNode = {
      type: "noteLabel",
      attrs: {
        id: labelToAdd,
        label: null,
      },
    };

    if (Array.isArray(updatedNote.content)) {
      updatedNote.content = {
        type: "doc",
        content: [noteLabelNode],
      };
    } else if (updatedNote.content && typeof updatedNote.content === "object") {
      if (
        "content" in updatedNote.content &&
        Array.isArray(updatedNote.content.content)
      ) {
        updatedNote.content.content.push(noteLabelNode);
      } else {
        updatedNote.content = {
          type: "doc",
          content: [noteLabelNode],
        };
      }
    } else {
      updatedNote.content = {
        type: "doc",
        content: [noteLabelNode],
      };
    }

    if (!updatedNote.labels) {
      updatedNote.labels = [labelToAdd];
    } else {
      updatedNote.labels.push(labelToAdd);
    }

    onChange(updatedNote.content);
  };

      // Translations
      const [translations, setTranslations] = useState({
        editor: {
         addLabel: "editor.addLabel",
        }
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
    <div className="flex flex-wrap mt-2 gap-2">
      {labelsArray.map((label, index) => (
        <span
          key={index}
          className="text-lg bg-amber-400 bg-opacity-10 text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
          onClick={() => {
            setEditingLabelIndex(index);
            const updatedLabels = [...labelsArray];
            updatedLabels[index] = label; 
            updateLabelsInNote(label, label); 
          }}
        >
          {editingLabelIndex === index ? (
            <div
              className="min-w-0 flex-auto bg-transparent outline-none"
              contentEditable
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const updatedLabels = [...labelsArray];
                  updatedLabels[index] = e.currentTarget.innerText.trim();
                  setEditingLabelIndex(null);
                  updateLabelsInNote(label, e.currentTarget.innerText.trim()); // Fix: Pass both labelToUpdate and newLabel
                }
              }}
            >
              {label}
            </div>
          ) : (
            `#${label}`
          )}
        </span>
      ))}
      <div
        className="is-empty labelinput"
        contentEditable
        data-placeholder={translations.editor.addLabel || "-"}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.currentTarget.innerText.trim() !== "") {
            addLabelToNote(e.currentTarget.innerText.trim());
            e.currentTarget.innerText = ""; 
          }
        }}
      />
    </div>
  );
};

export default NoteLabels;
