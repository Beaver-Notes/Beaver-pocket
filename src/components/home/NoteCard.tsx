import { Note } from "../../store/types";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { JSONContent } from "@tiptap/react";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Icon from "../ui/Icon";
import { useTranslation } from "@/utils/translations";
import UiCard from "../ui/Card";
import { truncateText } from "@/utils/helper";
import { useNoteStore } from "@/store/note";
import { usePasswordStore } from "@/store/passwd";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import emitter from "tiny-emitter/instance";

import "dayjs/locale/it";
import "dayjs/locale/de";
import "dayjs/locale/zh";
import "dayjs/locale/nl";
import "dayjs/locale/es";
import "dayjs/locale/uk";
import "dayjs/locale/ru";
import "dayjs/locale/fr";
import "dayjs/locale/tr";
import { Preferences } from "@capacitor/preferences";
import FolderTree from "./FolderTree";

interface BookmarkedProps {
  note: Note;
  onUpdate?: (updatedNote: Note) => void;
  onLabelSelect?: (label: string) => void;
}

dayjs.extend(relativeTime);

const NoteCard: React.FC<BookmarkedProps> = ({
  note,
  onUpdate,
  onLabelSelect,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const passwordStore = usePasswordStore();
  const noteStore = useNoteStore();
  const navigate = useNavigate();

  const [translations, setTranslations] = useState<Record<string, any>>({
    card: {},
    accessibility: {},
  });

  useEffect(() => {
    const run = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }

      const selectedLanguage = await Preferences.get({
        key: "selectedLanguage",
      });

      dayjs.locale(selectedLanguage.value ?? "en"); // fallback if null
    };

    run();
  }, []);

  function formatDate(date: string | number) {
    return dayjs(date).fromNow();
  }

  async function emitUpdate(payload: Note) {
    if (onUpdate) {
      onUpdate(payload);
    }
  }

  async function toggleBookmark(note: Note) {
    await emitUpdate({ ...note, isBookmarked: !note.isBookmarked });
  }

  async function toggleArchive(note: Note) {
    await emitUpdate({ ...note, isArchived: !note.isArchived });
  }

  async function setActiveLabel(label: string) {
    if (onLabelSelect) {
      onLabelSelect(label);
    }
  }

  const handleDeleteNote = async (note: Note) => {
    const isConfirmed = window.confirm(translations.card.confirmDelete);

    if (isConfirmed) {
      try {
        await noteStore.delete(note.id);
      } catch (error) {
        alert(error);
      }
    }
  };

  const handleClickNote = async (note: Note) => {
    navigate(`/note/${note.id}`);
  };

  function getPlainText(content: JSONContent | string): string {
    if (typeof content === "string") return content;

    if (Array.isArray(content.content)) {
      return content.content.map(getPlainText).join(" ");
    }

    if (content.text) {
      return content.text;
    }

    return "";
  }

  const lockNote = async (note: Note): Promise<void> => {
    try {
      await passwordStore.retrieve();
      const biometricAvailable = await NativeBiometric.isAvailable();

      const showPasswordPrompt = (): Promise<void> => {
        return new Promise((resolve) => {
          emitter.emit("show-dialog", "prompt", {
            title:
              translations.card.setPasswordTitle || "Set a master password",
            placeholder: translations.card.password || "Enter new password",
            okText: translations.card.ok || "OK",
            cancelText: translations.card.cancel || "Cancel",
            onConfirm: async (password: string) => {
              if (!password) {
                alert(
                  translations.card.passwordRequired || "Password required"
                );
                resolve();
                return;
              }

              try {
                if (!passwordStore.passwordHash) {
                  await passwordStore.setSharedKey(password);
                }

                if (biometricAvailable.isAvailable) {
                  await NativeBiometric.setCredentials({
                    username: "beaver-pocket",
                    password,
                    server: "beaver-pocket",
                  });
                }

                await noteStore.lockNote(note.id, password);

                const updatedNote = await noteStore.getById(note.id);
                if (onUpdate && updatedNote) {
                  onUpdate(updatedNote);
                }

                console.log("Note locked successfully.");
              } catch (error) {
                console.error("Error setting password:", error);
                alert("Failed to set password");
              }

              resolve();
            },
            onCancel: () => resolve(),
          });
        });
      };

      if (!passwordStore.passwordHash) {
        await showPasswordPrompt();
        return;
      }

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

          const rawPassword = creds.password;
          if (!rawPassword)
            throw new Error("No password in biometric storage.");

          await noteStore.lockNote(note.id, rawPassword);

          const updatedNote = await noteStore.getById(note.id);
          if (onUpdate && updatedNote) {
            onUpdate(updatedNote);
          }

          return;
        } catch (error) {
          console.error("Biometric failed:", error);
          await showPasswordPrompt();
          return;
        }
      }

      await showPasswordPrompt();
    } catch (error) {
      console.error("Unexpected error locking note:", error);
      alert("An error occurred while trying to lock the note.");
    }
  };

  const unlockNote = async (note: Note): Promise<void> => {
    try {
      const existing = await passwordStore.retrieve();
      const biometricAvailable = await NativeBiometric.isAvailable();

      const promptForPassword = (): Promise<string | null> => {
        return new Promise((resolve) => {
          emitter.emit("show-dialog", "prompt", {
            title: existing
              ? translations.card.setPasswordTitle ||
                "Enter your master password"
              : translations.card.setPasswordTitle || "Set a master password",
            placeholder: translations.card.password || "Enter password",
            okText: translations.card.ok || "OK",
            cancelText: translations.card.cancel || "Cancel",
            onConfirm: (password: string) => resolve(password || null),
            onCancel: () => resolve(null),
          });
        });
      };

      let password: string | null = null;

      // Try biometrics first if available and a password already exists
      if (existing && biometricAvailable.isAvailable) {
        try {
          const verified = await NativeBiometric.verifyIdentity({
            reason:
              translations.card.biometricReason ||
              "Authenticate to unlock note",
            title:
              translations.card.biometricTitle || "Biometric Authentication",
          })
            .then(() => true)
            .catch(() => false);

          if (verified) {
            const creds = await NativeBiometric.getCredentials({
              server: "beaver-pocket",
            });
            password = creds.password;
          }
        } catch (biometricError) {
          console.warn("Biometric failed or cancelled:", biometricError);
        }
      }

      if (!password) {
        password = await promptForPassword();
        if (!password) {
          console.log("Unlock cancelled by user.");
          return;
        }
      }

      // If this is the first time, set the master key before unlocking
      if (!existing) {
        await passwordStore.setSharedKey(password);

        if (biometricAvailable.isAvailable) {
          await NativeBiometric.setCredentials({
            username: "beaver-pocket",
            password,
            server: "beaver-pocket",
          });
        }
      }

      await noteStore.unlockNote(note.id, password);
      console.log(`Note (ID: ${note.id}) is unlocked`);

      const updatedNote = await noteStore.getById(note.id);
      if (onUpdate && updatedNote) {
        onUpdate(updatedNote);
      }
    } catch (error) {
      console.error("Error unlocking note:", error);
      alert(translations.card.unlockError || "Failed to unlock note");
    }
  };

  return (
    <div className="h-full">
      <UiCard
        className="hover:ring-2 ring-secondary group note-card transition flex flex-col h-full"
        padding="p-5"
      >
        <div className="flex flex-col h-full">
          <div className="font-semibold text-lg block line-clamp leading-tight">
            {note.title || translations.card.untitledNote}
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
                    <button
                      key={label}
                      className="inline-block hover:underline cursor-pointer"
                      aria-label={`${translations.accessibility.label} ${label}`}
                      onClick={() => {
                        setActiveLabel(label);
                      }}
                    >
                      #{label}
                    </button>
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
            {note.isLocked ? (
              <div className="flex flex-col items-center">
                <button
                  className="flex items-center justify-center"
                  aria-label="Unlock note"
                  onClick={(e) => {
                    e.stopPropagation();
                    unlockNote(note);
                  }}
                >
                  <Icon
                    name="LockClosed"
                    className="w-24 h-24 text-[#52525C] dark:text-[color:var(--selected-dark-text)]"
                  />
                </button>
                <p>{translations.card.unlocktoedit || "Tap to unlock"}</p>
              </div>
            ) : (
              <div
                aria-label={`Content: ${
                  truncateText(getPlainText(note.content ?? ""), 160) ||
                  translations.card.content
                }`}
              >
                {truncateText(getPlainText(note.content ?? ""), 160) ||
                  translations.card.content}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 mt-auto">
            <div className="flex items-center">
              {!note.isArchived && (
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
                  onClick={() => {
                    toggleBookmark(note);
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
              )}
              <button
                className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                aria-pressed={note.isArchived}
                aria-label={`Archive note ${
                  note.isArchived ? "Unarchive" : "Archive"
                }`}
                onClick={() => {
                  toggleArchive(note);
                }}
              >
                {note.isArchived ? (
                  <Icon name="ArchiveDrawerFill" className="w-8 h-8 mr-2" />
                ) : (
                  <Icon name="ArchiveDrawerLine" className="w-8 h-8 mr-2" />
                )}
              </button>
              {note.isLocked ? (
                <button
                  className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                  aria-pressed={note.isLocked}
                  aria-label={`Lock note ${note.isLocked ? "Unlock" : "Lock"}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await unlockNote(note);
                  }}
                >
                  <Icon name="LockOpen" className="w-8 h-8 mr-2" />
                </button>
              ) : (
                <button
                  className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                  aria-pressed={note.isLocked}
                  aria-label={`Lock note ${note.isLocked ? "Unlock" : "Lock"}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await lockNote(note);
                  }}
                >
                  <Icon name="LockClosed" className="w-8 h-8 mr-2" />
                </button>
              )}
              <button
                className="hover:text-neutral-900 dark:hover:text-[color:var(--selected-dark-text)]"
                aria-pressed={note.isLocked}
                aria-label={`Lock note ${note.isLocked ? "Unlock" : "Lock"}`}
                onClick={() => setShowModal(true)}
              >
                <Icon name="FolderTransferLine" className="w-8 h-8 mr-2" />
              </button>
              <button
                className="text-[#52525C] py-2 hover:text-red-500 dark:text-[color:var(--selected-dark-text)] w-auto"
                aria-label="Delete note"
                onClick={() => {
                  handleDeleteNote(note);
                }}
              >
                <Icon name="DeleteBinLine" className="w-8 h-8 mr-2" />
              </button>
            </div>
            <div className="flex-grow"></div>
            <p className="text-overflow">
              {note.isLocked
                ? translations.card.isLocked
                : formatDate(note.createdAt)}
            </p>
          </div>
        </div>
      </UiCard>
      <FolderTree
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        note={note}
        mode="note"
      />
    </div>
  );
};

export default NoteCard;
