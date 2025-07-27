import { Note } from "../../store/types";
import * as CryptoJS from "crypto-js";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
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
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";
import dayjs from "dayjs";
import "dayjs/locale/en";
import "dayjs/locale/de";
import "dayjs/locale/zh-cn";
import Icon from "../ui/Icon";
import { useTranslation } from "@/utils/translations";
import emitter from "tiny-emitter/instance";
import UiCard from "../ui/Card";

interface BookmarkedProps {
  note: Note;
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const NoteCard: React.FC<BookmarkedProps> = ({
  note,
  setNotesState,
  notesState,
}) => {
  const STORAGE_PATH = "notes/data.json";
  const navigate = useNavigate();
  const { deleteNote } = useDeleteNote(setNotesState, notesState);
  const { toggleArchive } = useToggleArchive();
  const { toggleBookmark } = useToggleBookmark();
  const [, setFilteredNotes] = useState<Record<string, Note>>(notesState);

  // Translations
  const [translations, setTranslations] = useState<Record<string, any>>({
    card: {},
    accessibility: {},
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

  const handleToggleBookmark = async (
    noteId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    try {
      const updatedNotes = await toggleBookmark(noteId);
      setNotesState(updatedNotes);
    } catch (error) {
      console.error(translations.card.bookmarkError, error);
      alert(translations.card.bookmarkError + (error as any).message);
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
      console.error(translations.card.archiveError, error);
      alert(translations.card.archiveError + (error as any).message);
    }
  };

  const handleDeleteNote = async (noteId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const isConfirmed = window.confirm(translations.card.confirmDelete);

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
              reason: `${translations.card.biometricReason}`,
              title: `${translations.card.biometricTitle}`,
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
          alert(translations.card.wrongpasswd);
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
      alert(translations.card.lockerror);
    }
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

  const handleClickNote = async (note: Note) => {
    navigate(`/editor/${note.id}`);
  };

  const MAX_CONTENT_PREVIEW_LENGTH = 150;

  function extractParagraphTextFromContent(content: JSONContent): string {
    if (!content || !Array.isArray(content.content)) {
      return translations.card.noContent;
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

    return paragraphText || translations.card.noContent;
  }

  function truncateContentPreview(
    content: JSONContent | string | JSONContent[] | undefined | null
  ): string {
    let text = "";

    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      const jsonContent: JSONContent = { type: "doc", content };
      text = extractParagraphTextFromContent(jsonContent) || "";
    } else if (content && typeof content === "object" && "content" in content) {
      const { title, ...contentWithoutTitle } = content;
      text = extractParagraphTextFromContent(contentWithoutTitle) || "";
    }

    text = text.replace(/(\S{30,})/g, "$1 ");

    if (text.length <= MAX_CONTENT_PREVIEW_LENGTH) {
      return text;
    } else {
      return text.slice(0, MAX_CONTENT_PREVIEW_LENGTH) + "...";
    }
  }

  return (
    <UiCard
      key={note.id}
      className="hover:ring-2 ring-secondary group note-card transition flex flex-col"
      padding="p-5"
    >
      <div>
        <div className="font-semibold text-lg block line-clamp leading-tight">
          {note.title}
        </div>

        {note.isLocked ? (
          <div>
            <p></p>
          </div>
        ) : (
          <div>
            {note.labels?.length > 0 && (
              <div className="text-primary dark:text-primary mt-2 mb-1 line-clamp w-full space-x-1">
                {note.labels.map((label) => (
                  <Link
                    to={`/?label=${label}`}
                    key={label}
                    className="inline-block hover:underline cursor-pointer"
                    aria-label={`${translations.accessibility.label} ${label}`}
                  >
                    #{label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className="text-neutral-600 block dark:text-[color:var(--selected-dark-text)] flex-1 overflow-hidden overflow-ellipsis"
          style={{ minHeight: "64px" }}
          onClick={() => handleClickNote(note)}
          aria-label={`${translations.accessibility.openNote} ${note.title}`}
        >
          {" "}
          {note.isLocked ? (
            <div className="flex flex-col items-center">
              <button
                className="flex items-center justify-center"
                aria-label="Unlock note"
                onClick={(e) => {
                  handleToggleLock(note.id, e);
                }}
              >
                <Icon
                  name="LockClosed"
                  className="w-24 h-24 text-[#52525C] dark:text-[color:var(--selected-dark-text)]"
                />
              </button>
              <p>{translations.card.unlocktoedit || "-"}</p>
            </div>
          ) : (
            <div
              aria-label={`Content: ${
                note.content && truncateContentPreview(note.content)
              }`}
            >
              {note.content && truncateContentPreview(note.content)}
            </div>
          )}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center">
              <button
                className={
                  note.isBookmarked
                    ? "text-primary opacity-90 hover:opacity-100"
                    : "hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)] transition"
                }
                aria-pressed={note.isBookmarked}
                aria-label={`Bookmark note ${
                  note.isBookmarked ? "Remove" : "Add"
                }`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering parent click event
                  handleToggleBookmark(note.id, e);
                }}
              >
                {note.isBookmarked ? (
                  <Icon
                    name="Bookmark3Fill"
                    className="w-8 h-8 mr-2 text-primary"
                  />
                ) : (
                  <Icon name="Bookmark3Line" className="w-8 h-8 mr-2" />
                )}
              </button>
              <button
                className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                aria-pressed={note.isArchived}
                aria-label={`Archive note ${
                  note.isArchived ? "Unarchive" : "Archive"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleArchive(note.id, e);
                }}
              >
                {note.isArchived ? (
                  <Icon name="ArchiveDrawerFill" className="w-8 h-8 mr-2" />
                ) : (
                  <Icon name="ArchiveDrawerLine" className="w-8 h-8 mr-2" />
                )}
              </button>
              <button
                className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                aria-pressed={note.isLocked}
                aria-label={`Lock note ${note.isLocked ? "Unlock" : "Lock"}`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering parent click event
                  handleToggleLock(note.id, e);
                }}
              >
                {note.isLocked ? (
                  <Icon name="LockClosed" className="w-8 h-8 mr-2" />
                ) : (
                  <Icon name="LockOpen" className="w-8 h-8 mr-2" />
                )}
              </button>
              <button
                className="text-[#52525C] py-2 hover:text-red-500 dark:text-[color:var(--selected-dark-text)] w-auto"
                aria-label="Delete note"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering parent click event
                  handleDeleteNote(note.id, e);
                }}
              >
                <Icon name="DeleteBinLine" className="w-8 h-8 mr-2" />
              </button>
            </div>
            <div
              className="text-lg text-neutral-500 dark:text-neutral-400 overflow-hidden whitespace-nowrap overflow-ellipsis"
              aria-label={`${dayjs(note.createdAt).fromNow()}`}
            >
              {dayjs(note.createdAt).fromNow()}
            </div>
          </div>
        </div>
      </div>
    </UiCard>
  );
};

export default NoteCard;
