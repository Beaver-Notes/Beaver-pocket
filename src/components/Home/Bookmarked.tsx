import { Note } from "../../store/types";
import DeleteBinLineIcon from "remixicon-react/DeleteBinLineIcon";
import Bookmark3LineIcon from "remixicon-react/Bookmark3LineIcon";
import Bookmark3FillIcon from "remixicon-react/Bookmark3FillIcon";
import LockClosedIcon from "remixicon-react/LockLineIcon";
import { JSONContent } from "@tiptap/react";
import LockOpenIcon from "remixicon-react/LockUnlockLineIcon";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface BookmarkedProps {
  notesList: Note[];
  activeNoteId: string | null;
  handleToggleBookmark: (
    noteId: string,
    event: React.MouseEvent
  ) => Promise<void>;
  handleToggleLock: (noteId: string, event: React.MouseEvent) => Promise<void>;
  handleDeleteNote: (noteId: string, event: React.MouseEvent) => Promise<void>;
  handleClickNote: (note: Note) => Promise<void>;
  truncateContentPreview: (
    content: JSONContent | string | JSONContent[]
  ) => string;
}

const Bookmarked: React.FC<BookmarkedProps> = ({
  notesList,
  activeNoteId,
  handleToggleBookmark,
  handleToggleLock,
  handleDeleteNote,
  handleClickNote,
  truncateContentPreview,
}) => {
  // Translations
  const [translations, setTranslations] = useState({
    home: {
      unlocktoedit: "home.unlocktoedit",
    },
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
    <div className="grid py-2 grid-cols-1 md:grid-cols-3 lg-grid-cols-3 gap-4 cursor-pointer rounded-md items-center justify-center">
      {notesList.map((note) => {
        if (note.isBookmarked && !note.isArchived) {
          return (
            <div
              key={note.id}
              role="button"
              tabIndex={0}
              className={
                note.id === activeNoteId
                  ? "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
                  : "p-3 cursor-pointer rounded-xl bg-[#F8F8F7] text-black dark:text-white dark:bg-[#2D2C2C]"
              }
              onClick={() => handleClickNote(note)}
            >
              <div className="h-44 overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  <div className="text-2xl">{note.title}</div>
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
                        <LockClosedIcon className="w-24 h-24 text-[#52525C] dark:text-white" />
                      </button>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {translations.home.unlocktoedit}
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
                              className="text-[#52525C] py-2 dark:text-white w-auto"
                              onClick={(e) => handleToggleBookmark(note.id, e)}
                            >
                              {note.isBookmarked ? (
                                <Bookmark3FillIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <Bookmark3LineIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 dark:text-white w-auto"
                              onClick={(e) => handleToggleLock(note.id, e)}
                            >
                              {note.isLocked ? (
                                <LockClosedIcon className="w-8 h-8 mr-2" />
                              ) : (
                                <LockOpenIcon className="w-8 h-8 mr-2" />
                              )}
                            </button>
                            <button
                              className="text-[#52525C] py-2 hover:text-red-500 dark:text-white w-auto"
                              onClick={(e) => handleDeleteNote(note.id, e)}
                            >
                              <DeleteBinLineIcon className="w-8 h-8 mr-2" />
                            </button>
                          </div>
                          <div className="text-lg text-gray-500 dark:text-gray-400 overflow-hidden whitespace-nowrap overflow-ellipsis">
                            {dayjs(note.createdAt).fromNow()}
                          </div>
                        </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export default Bookmarked;
