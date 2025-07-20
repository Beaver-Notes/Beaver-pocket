import EditorComponent from "../../components/note/NoteEditor";
import { useNavigate, useParams } from "react-router-dom";
import * as CryptoJS from "crypto-js";
import { useEffect, useState } from "react";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Note } from "../../store/types";
import Icon from "@/components/UI/Icon";
import { useTranslation } from "@/utils/translations";
import emitter from "tiny-emitter/instance";

const STORAGE_PATH = "notes/data.json";

interface Props {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

function Editor({ notesState, setNotesState }: Props) {
  const navigate = useNavigate();
  const { note } = useParams<{ note: string }>();
  const [translations, setTranslations] = useState<Record<string, any>>({
    editor: {},
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

  const unlockNote = async (noteId: string): Promise<void> => {
    console.time("unlockNote");
    try {
      let password: string | null = null;
      console.time("SecureStoragePlugin.get");
      const globalPasswordResult = await SecureStoragePlugin.get({
        key: "globalPassword",
      }).catch(() => null);
      console.timeEnd("SecureStoragePlugin.get");
      const storedGlobalPassword = globalPasswordResult?.value;

      const biometricAvailable = await NativeBiometric.isAvailable();

      if (!storedGlobalPassword) {
        password = await promptForPassword();
        if (password) {
          console.time("SecureStoragePlugin.set");
          await SecureStoragePlugin.set({
            key: "globalPassword",
            value: password,
          });
          console.timeEnd("SecureStoragePlugin.set");
        } else {
          return;
        }
      } else {
        if (biometricAvailable) {
          try {
            console.time("NativeBiometric.verifyIdentity");
            await NativeBiometric.verifyIdentity({
              reason: `${translations.editor.biometricReason}`,
              title: `${translations.editor.biometricTitle}`,
            });
            console.timeEnd("NativeBiometric.verifyIdentity");
            password = storedGlobalPassword;
          } catch {
            password = await promptForPassword();
            if (!password) {
              return;
            }
          }
        } else {
          password = await promptForPassword();
          if (!password) {
            return;
          }
        }
      }

      console.time("Filesystem read for unlock");
      const result = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      console.timeEnd("Filesystem read for unlock");

      let notes;
      if (typeof result.data === "string") {
        console.time("JSON parse for unlock");
        notes = JSON.parse(result.data).data.notes;
        console.timeEnd("JSON parse for unlock");
      } else {
        const dataText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(result.data as Blob);
        });
        console.time("JSON parse for unlock from Blob");
        notes = JSON.parse(dataText).data.notes;
        console.timeEnd("JSON parse for unlock from Blob");
      }

      const updatedNote = { ...notes[noteId] };

      if (updatedNote.isLocked) {
        console.time("CryptoJS.AES.decrypt");
        const decryptedContent = CryptoJS.AES.decrypt(
          updatedNote.content.content[0],
          password
        ).toString(CryptoJS.enc.Utf8);
        console.timeEnd("CryptoJS.AES.decrypt");

        if (!decryptedContent) {
          alert(translations.editor.wrongpasswd);
          return;
        }

        updatedNote.content = JSON.parse(decryptedContent);
        updatedNote.isLocked = false;
      } else {
        console.time("CryptoJS.AES.encrypt");
        const encryptedContent = CryptoJS.AES.encrypt(
          JSON.stringify(updatedNote.content),
          password
        ).toString();
        console.timeEnd("CryptoJS.AES.encrypt");

        updatedNote.content = { type: "doc", content: [encryptedContent] };
        updatedNote.isLocked = true;
      }

      notes[noteId] = updatedNote;

      console.time("Filesystem write");
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      console.timeEnd("Filesystem write");

      setNotesState(notes);
    } catch (error) {
      alert(translations.editor.lockerror);
    }
    console.timeEnd("unlockNote");
  };

  const promptForPassword = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      emitter.emit("show-dialog", "prompt", {
        title: translations.card.enterpasswd,
        okText: translations.card.setkey,
        body: translations.settings.warning,
        cancelText: translations.card.cancel,
        placeholder: translations.card.Password,
        allowedEmpty: false,
        onConfirm: (value: string) => {
          resolve(value); // Resolve with password
          return true; // Close modal
        },
        onCancel: () => {
          resolve(null); // Resolve as cancelled
        },
      });
    });
  };

  const Cancel = () => {
    navigate(-1);
  };

  if (!note) {
    return <div>{translations.editor.noNoteId || "-"}</div>;
  }

  const noteData = notesState[note];

  if (!noteData) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <div className="text-xl font-bold text-center">
          {translations.editor.noteNotFound || "-"}
        </div>
      </div>
    );
  }

  if (noteData.isLocked) {
    return (
      <div className="h-[80vh] w-screen flex flex-col justify-center items-center">
        <Icon name="LockLine" className="w-32 h-32" />
        <p>{translations.editor.unlocktoedit || "-"}</p>
        <div className="flex flex-col gap-2 pt-2 w-2/4">
          <button
            className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl text-center"
            onClick={() => unlockNote(note)}
          >
            {translations.editor.unlock || "-"}
          </button>
          <button
            className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl text-center"
            onClick={Cancel}
          >
            {translations.editor.cancel || "-"}
          </button>
        </div>
      </div>
    );
  }

  localStorage.setItem("lastNoteEdit", note);

  return (
    <EditorComponent
      note={noteData}
      notesState={notesState}
      setNotesState={setNotesState}
      translations={translations}
    />
  );
}

export default Editor;
