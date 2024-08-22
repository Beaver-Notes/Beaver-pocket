import { Note } from "../../store/types";
import dayjs from "dayjs";
import Icons from "../../lib/remixicon-react";
import { useNotesState } from "../../store/Activenote";
import ReactDOM from "react-dom";
import ModularPrompt from "../ui/Dialog";
import * as CryptoJS from "crypto-js";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { NativeBiometric } from "capacitor-native-biometric";
import {
  useDeleteNote,
  useToggleBookmark,
  useToggleArchive,
} from "../../store/notes";
import {
  Directory,
  Filesystem,
  FilesystemEncoding,
} from "@capacitor/filesystem";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";

interface BookmarkedProps {
  note: Note;
  setNotesState: (notes: any) => void;
}

const NoteCard: React.FC<BookmarkedProps> = ({ note, setNotesState }) => {
  const { activeNoteId, notesState } = useNotesState();

  const STORAGE_PATH = "notes/data.json";
  const navigate = useNavigate();
  const { deleteNote } = useDeleteNote();
  const { toggleArchive } = useToggleArchive();
  const { toggleBookmark } = useToggleBookmark();
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);

  const handleToggleLock = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      let password: string | null = null;
      const globalPasswordResult = await SecureStoragePlugin.get({
        key: "globalPassword",
      }).catch(() => null);
      const storedGlobalPassword = globalPasswordResult?.value;

      // Check if biometric authentication is available
      const biometricAvailable = await NativeBiometric.isAvailable();

      // If global password is not set, prompt for it
      if (!storedGlobalPassword) {
        password = await promptForPassword();
        if (password) {
          await SecureStoragePlugin.set({
            key: "globalPassword",
            value: password,
          });
        } else {
          return; // Exit if no password is provided
        }
      } else {
        // If biometric authentication is available, use it to unlock
        if (biometricAvailable.isAvailable) {
          try {
            await NativeBiometric.verifyIdentity({
              reason: "Unlock your notes",
              title: "Unlock with Biometrics",
            });
            password = storedGlobalPassword; // Use the stored global password
          } catch {
            // Biometric authentication failed, ask for password
            password = await promptForPassword();
            if (!password) {
              return; // Exit if no password is provided
            }
          }
        } else {
          // If biometric authentication is not available, prompt for the password
          password = await promptForPassword();
          if (!password) {
            return; // Exit if no password is provided
          }
        }
      }

      // Load the notes from storage
      const result = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      let notes;
      if (typeof result.data === "string") {
        notes = JSON.parse(result.data).data.notes;
      } else {
        const dataText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(result.data as Blob);
        });
        notes = JSON.parse(dataText).data.notes;
      }

      const updatedNote = { ...notes[noteId] };

      // Check if the note is locked
      if (updatedNote.isLocked) {
        // Note is locked, try to decrypt it
        const decryptedContent = CryptoJS.AES.decrypt(
          updatedNote.content.content[0],
          password
        ).toString(CryptoJS.enc.Utf8);

        if (!decryptedContent) {
          // If decryption fails (wrong password), show error message and exit
          alert(translations.home.wrongpasswd);
          return;
        }

        // Update note content with decrypted content and unlock the note
        updatedNote.content = JSON.parse(decryptedContent);
        updatedNote.isLocked = false;
      } else {
        // Note is unlocked, encrypt the content
        const encryptedContent = CryptoJS.AES.encrypt(
          JSON.stringify(updatedNote.content),
          password
        ).toString();

        // Update note content with encrypted content and lock the note
        updatedNote.content = { type: "doc", content: [encryptedContent] };
        updatedNote.isLocked = true;
      }

      // Update the notes array with the updated note
      notes[noteId] = updatedNote;

      // Save the updated notes array to storage
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({ data: { notes } }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      // Update the state with the updated notes array
      setNotesState(notes);
    } catch (error) {
      alert(translations.home.lockerror);
    }
  };

  // Helper function to prompt the user for a password
  const promptForPassword = async (): Promise<string | null> => {
    // Define a div where the prompt will be rendered
    const promptRoot = document.createElement("div");
    document.body.appendChild(promptRoot);

    return new Promise<string | null>((resolve) => {
      const handleConfirm = (value: string | null) => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        resolve(value);
      };
      const handleCancel = () => {
        ReactDOM.unmountComponentAtNode(promptRoot);
        resolve(null); // Resolving with null for cancel action
      };
      ReactDOM.render(
        <ModularPrompt
          title={translations.home.enterpasswd}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />,
        promptRoot
      );
    });
  };

  const handleClickNote = async (note: Note) => {
    navigate(`/editor/${note.id}`);
  };

  // Translations
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

  const handleToggleBookmark = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const updatedNotes = await toggleBookmark(noteId);
      setNotesState(updatedNotes);
    } catch (error) {
      console.error(translations.home.bookmarkError, error);
      alert(translations.home.bookmarkError + (error as any).message);
    }
  };
  const handleToggleArchive = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const updatedNotes = await toggleArchive(noteId);
      setNotesState(updatedNotes);
    } catch (error) {
      console.error(translations.home.archiveError, error);
      alert(translations.home.archiveError + (error as any).message);
    }
  };

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const isConfirmed = window.confirm(translations.home.confirmDelete);

    if (isConfirmed) {
      try {
        await deleteNote(noteId);
        // Remove the deleted note from filteredNotes state
        setFilteredNotes((prevFilteredNotes) => {
          const updatedFilteredNotes = { ...prevFilteredNotes };
          delete updatedFilteredNotes[noteId];
          return updatedFilteredNotes;
        });
      } catch (error) {
        alert(error);
      }
    }
  };

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return translations.home.noContent;
    }
    if (
      content.content.length === 1 &&
      content.content[0].type === "paragraph" &&
      (!content.content[0].content || content.content[0].content.length === 0)
    ) {
      return "";
    }

    const paragraphText = content.content
      .filter((node) => node.type === "paragraph")
      .map((node) => {
        if (node.content && Array.isArray(node.content)) {
          const textContent = node.content
            .filter((innerNode) => innerNode.type === "text")
            .map((innerNode) => innerNode.text)
            .join(" ");
          return textContent;
        }
        return "";
      })
      .join(" ");

    return paragraphText || translations.home.noContent;
  }

  function truncateContentPreview(
    content: JSONContent | string | JSONContent[]
  ) {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent);
    } else if (content && content.content) {
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle);
    }

    if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }

  return (
    <div
      key={note.id}
      role="button"
      tabIndex={0}
      className={
        note.id === activeNoteId
          ? "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C]"
          : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C]"
      }
      onClick={() => handleClickNote(note)}
    >
      <div className="h-40 overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="text-xl font-bold">{note.title}</div>
          {note.isLocked ? (
            <div>
              <p></p>
            </div>
          ) : (
            <div>
              {note.labels.length > 0 && (
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="flex flex-wrap gap-1">
                    {note.labels.map((label) => (
                      <span
                        key={label}
                        className="text-amber-400 text-opacity-100 px-1 py-0.5 rounded-md"
                      >
                        #{label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {note.isLocked ? (
            <div className="flex flex-col items-center">
              <button className="flex items-center justify-center">
                <Icons.LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-[color:var(--selected-dark-text)]" />
              </button>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {translations.home.unlocktoedit || "-"}
              </p>
            </div>
          ) : (
            <div className="text-lg">
              {note.content && truncateContentPreview(note.content)}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center">
          <button
            className="text-[#52525C] py-2 dark:text-[color:var(--selected-dark-text)] w-auto"
            onClick={(e) => handleToggleBookmark(note.id, e)}
          >
            {note.isBookmarked ? (
              <Icons.Bookmark3FillIcon className="w-8 h-8 mr-2" />
            ) : (
              <Icons.Bookmark3LineIcon className="w-8 h-8 mr-2" />
            )}
          </button>
          <button
            className="text-[#52525C] py-2 dark:text-[color:var(--selected-dark-text)] w-auto"
            onClick={(e) => handleToggleArchive(note.id, e)} // Pass the event
          >
            {note.isArchived ? (
              <Icons.ArchiveDrawerFillIcon className="w-8 h-8 mr-2" />
            ) : (
              <Icons.ArchiveDrawerLineIcon className="w-8 h-8 mr-2" />
            )}
          </button>
          <button
            className="text-[#52525C] py-2 dark:text-[color:var(--selected-dark-text)] w-auto"
            onClick={(e) => handleToggleLock(note.id, e)}
          >
            {note.isLocked ? (
              <Icons.LockClosedIcon className="w-8 h-8 mr-2" />
            ) : (
              <Icons.LockOpenIcon className="w-8 h-8 mr-2" />
            )}
          </button>
          <button
            className="text-[#52525C] py-2 hover:text-red-500 dark:text-[color:var(--selected-dark-text)] w-auto"
            onClick={(e) => handleDeleteNote(note.id, e)}
          >
            <Icons.DeleteBinLineIcon className="w-8 h-8 mr-2" />
          </button>
        </div>
        <div className="text-lg text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap overflow-ellipsis">
          {dayjs(note.createdAt).fromNow()}
        </div>
      </div>
    </div>
  );
};

export default NoteCard;
