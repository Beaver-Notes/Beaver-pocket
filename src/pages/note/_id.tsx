import EditorComponent from "../../components/note/NoteEditor";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import emitter from "tiny-emitter/instance";
import { useNoteStore } from "@/store/note";
import { usePasswordStore } from "@/store/passwd";
import { Preferences } from "@capacitor/preferences";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

function Note() {
  const passwordStore = usePasswordStore();
  const noteStore = useNoteStore();
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

  const unlockNote = async (noteid: any): Promise<void> => {
    try {
      await passwordStore.retrieve();
      const biometricAvailable = await NativeBiometric.isAvailable();

      const promptForPassword = (): Promise<string | null> => {
        return new Promise((resolve) => {
          emitter.emit("show-dialog", "prompt", {
            title:
              translations.card.setPasswordTitle ||
              "Enter your master password",
            placeholder: translations.card.password || "Enter password",
            okText: translations.card.ok || "OK",
            cancelText: translations.card.cancel || "Cancel",
            onConfirm: (password: string) => {
              if (!password) {
                alert(
                  translations.card.passwordRequired || "Password required"
                );
                resolve(null);
              } else {
                resolve(password);
              }
            },
            onCancel: () => resolve(null),
          });
        });
      };

      let encryptionKey: string | null = null;

      if (biometricAvailable.isAvailable) {
        try {
          const verified = await NativeBiometric.verifyIdentity({
            reason:
              translations.card.biometricReason || "Authenticate to lock note",
            title:
              translations.card.biometricTitle || "Biometric Authentication",
          })
            .then(() => true)
            .catch(() => false);

          if (!verified) return;

          const creds = await NativeBiometric.getCredentials({
            server: "beaver-pocket",
          });

          encryptionKey = creds.password;
        } catch (biometricError) {
          console.warn("Biometric failed or cancelled:", biometricError);
        }
      }

      if (!encryptionKey) {
        const password = await promptForPassword();
        if (!password) {
          console.log("Unlock cancelled by user.");
          return;
        }
        encryptionKey = passwordStore.deriveEncryptionKey(password);
      }

      await noteStore.unlockNote(noteid, encryptionKey);
      console.log(`Note (ID: ${noteid}) is unlocked`);

      const updatedNote = await noteStore.getById(noteid);
      if (noteStore.update && updatedNote) {
        noteStore.update(updatedNote);
      }
    } catch (error) {
      console.error("Error unlocking note:", error);
      alert(translations.card.unlockError || "Failed to unlock note");
    }
  };

  useEffect(() => {
    const handleFileEmbedClick = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;
      const { src, fileName } = eventData;

      try {
        const result = await Filesystem.getUri({
          directory: Directory.Data,
          path: src,
        });

        const resolvedFilePath = result.uri;
        const encodedFilePath = resolvedFilePath.replace(/ /g, "%20");

        await Share.share({
          title: `Open ${fileName}`,
          url: encodedFilePath,
          dialogTitle: `Share ${fileName}`,
        });
      } catch (error) {
        console.log(`Error sharing ${fileName}: ${(error as any).message}`);
      }
    };

    document.addEventListener("fileEmbedClick", handleFileEmbedClick);

    return () => {
      document.removeEventListener("fileEmbedClick", handleFileEmbedClick);
    };
  });

  const Cancel = () => {
    navigate(-1);
  };

  if (!note) {
    return <div>{translations.editor.noNoteId || "-"}</div>;
  }

  const noteData = noteStore.getById(note);

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
            onClick={() => unlockNote(noteData.id)}
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

  Preferences.set({ key: "lastNoteEdit", value: note });

  return <EditorComponent note={noteData} translations={translations} />;
}

export default Note;
