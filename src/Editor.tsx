import EditorComponent from "./components/Editor/EditorComponent";
import { useNavigate, useParams } from "react-router-dom";
import icons from "./lib/remixicon-react";
import ReactDOM from "react-dom";
import * as CryptoJS from "crypto-js";
import ModularPrompt from "./components/ui/Dialog";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { NativeBiometric } from "capacitor-native-biometric";

const STORAGE_PATH = "notes/data.json";

type Props = {
  notesState: any;
  setNotesState: (notes:any) => void;
};

function Editor({notesState, setNotesState}: Props) {
  const navigate = useNavigate();
  const { note } = useParams<{ note: string }>();
  const [translations, setTranslations] = useState({
    home: {
      bookmarked: "home.bookmarked",
      all: "home.all",
      messagePt1: "home.messagePt1",
      messagePt2: "home.messagePt2",
      messagePt3: "home.messagePt3",
      unlocktoedit: "home.unlocktoedit",
      noContent: "home.noContent",
      title: "home.title",
      confirmDelete: "home.confirmDelete",
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importInvalid: "home.importInvalid",
      importError: "home.importError",
      biometricsReason: "home.biometricsReason",
      biometricsTitle: "home.biometricsTitle",
      subtitle: "home.subtitle",
      biometricFace: "home.biometricFace",
      biometricTouch: "home.biometricFinger",
      biometricError: "home.biometricError",
      biometricPassword: "home.biometricPassword",
      biometricWrongPassword: "home.biometricWrongPassword",
      biometricSuccess: "home.biometricSuccess",
      subtitle2: "home.subtitle2",
      biometricUnlock: "home.biometricUnlock",
      bookmarkError: "home.bookmarkError",
      archiveError: "home.archiveError",
      shareTitle: "home.shareTitle",
      wrongpasswd: "home.wrongpasswd",
      lockerror: "home.lockerror",
      enterpasswd: "home.enterpasswd",
    },
  });

  useEffect(() => {
    console.time("loadTranslations");
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        console.time("Translation module import");
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
        );
        console.timeEnd("Translation module import");

        setTranslations({ ...translations, ...translationModule.default });
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
    console.timeEnd("loadTranslations");
  }, []);

  const unlockNote = async (noteId: string): Promise<void> => {
    console.time("unlockNote");
    try {
      let password: string | null = null;
      console.time("SecureStoragePlugin.get");
      const globalPasswordResult = await SecureStoragePlugin.get({ key: "globalPassword" }).catch(() => null);
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
              reason: "Unlock your notes",
              title: "Unlock with Biometrics",
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
          alert(translations.home.wrongpasswd);
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
      alert(translations.home.lockerror);
    }
    console.timeEnd("unlockNote");
  };

  const promptForPassword = async (): Promise<string | null> => {
    const promptRoot = document.createElement("div");
    document.body.appendChild(promptRoot);

    return new Promise<string | null>((resolve) => {
      const handleConfirm = (value: string | null) => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        document.body.removeChild(promptRoot);
        resolve(value);
      };
      const handleCancel = () => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        document.body.removeChild(promptRoot);
        resolve(null);
      };
      ReactDOM.render(
        <ModularPrompt
          title="Enter Password"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />,
        promptRoot
      );
    });
  };

  const Cancel = () => {
    navigate(-1);
  };

  if (!note) {
    return <div>No note ID provided</div>;
  }

  const noteData = notesState[note];

  if (!noteData) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <div className="text-xl font-bold text-center">Note not found</div>
      </div>
    );
  }

  if (noteData.isLocked) {
    return (
      <div className="h-[80vh] w-screen flex flex-col justify-center items-center">
        <icons.LockLineIcon className="w-32 h-32" />
        <p>Unlock to edit</p>
        <div className="flex flex-col gap-2 pt-2 w-2/4">
          <button
            className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl text-center"
            onClick={() => unlockNote(note)}
          >
            Unlock
          </button>
          <button
            className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl text-center"
            onClick={Cancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  localStorage.setItem("lastNoteEdit", note);

  console.time("EditorComponent render");
  const EditorComponentWithTiming = (note: any) => {
    const component = <EditorComponent {...note} />;
    console.timeEnd("EditorComponent render");
    return component;
  };

  return <EditorComponentWithTiming note={noteData} />;
}

export default Editor;
