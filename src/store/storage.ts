
import {
    Directory,
    Filesystem,
    FilesystemEncoding,
} from "@capacitor/filesystem";
import { Note, Folder } from "./types";
import { trackChange } from "../utils/sync";

const STORAGE_PATH = "notes/data.json";

export async function createNotesDirectory() {
    const paths = ["file-assets", "note-assets", "export", "notes"];
    for (const path of paths) {
        try {
            await Filesystem.mkdir({
                path,
                directory: Directory.Data,
                recursive: true,
            });
        } catch (error) {
            console.error("Error creating directory:", path, error);
        }
    }
}

function uncollapseHeading(contents: any[] = []): any[] {
    if (!Array.isArray(contents)) return contents;

    let newContents: any[] = [];
    for (const content of contents) {
        newContents.push(content);
        if (content.type === "heading") {
            let collapsed = content.attrs.collapsedContent ?? [];
            if (typeof collapsed === "string") {
                collapsed = collapsed ? JSON.parse(collapsed) : [];
            }
            content.attrs.open = true;
            content.attrs.collapsedContent = null;

            if (collapsed.length > 0) {
                newContents = [...newContents, ...uncollapseHeading(collapsed)];
            }
        }
    }
    return newContents;
}

export const loadData = async (): Promise<{
    notes: Record<string, Note>;
    folders: Record<string, Folder>;
    labels: string[];
    lockStatus: Record<string, any>;
    isLocked: Record<string, any>;
    deletedIds: Record<string, any>;
    deletedFolderIds: Record<string, any>;
}> => {
    try {
        try {
            await Filesystem.stat({
                path: STORAGE_PATH,
                directory: Directory.Data,
            });
        } catch {
            await createNotesDirectory();
            return {
                notes: {},
                folders: {},
                labels: [],
                lockStatus: {},
                isLocked: {},
                deletedIds: {},
                deletedFolderIds: {},
            };
        }

        const data = await Filesystem.readFile({
            path: STORAGE_PATH,
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
        });

        const raw =
            typeof data.data === "string" ? data.data : await data.data.text();
        const parsed = JSON.parse(raw);

        // Handle both old and new formats
        const finalData =
            parsed?.data && parsed.data.notes !== undefined
                ? parsed.data // New format
                : parsed?.notes !== undefined
                    ? parsed // Old format
                    : {
                        notes: {},
                        folders: {},
                        labels: [],
                        lockStatus: {},
                        isLocked: {},
                        deletedIds: {},
                        deletedFolderIds: {},
                    };

        const collapsibleSetting = localStorage.getItem("collapsibleHeading");
        const rawNotes = finalData.notes ?? {};
        const notes: Record<string, Note> = {};

        for (const noteId in rawNotes) {
            const note = rawNotes[noteId];

            if (!note?.id) continue;

            note.title = note.title || "";
            if (collapsibleSetting === "false" && note.content?.content) {
                note.content.content = uncollapseHeading(note.content.content);
            }

            notes[noteId] = note;
        }

        return {
            notes,
            folders: finalData.folders ?? {},
            labels: finalData.labels ?? [],
            lockStatus: finalData.lockStatus ?? {},
            isLocked: finalData.isLocked ?? {},
            deletedIds: finalData.deletedIds ?? {},
            deletedFolderIds: finalData.deletedFolderIds ?? {},
        };
    } catch (error) {
        console.error("Error loading data:", error);
        return {
            notes: {},
            folders: {},
            labels: [],
            lockStatus: {},
            isLocked: {},
            deletedIds: {},
            deletedFolderIds: {},
        };
    }
};

export const cleanupDeletedIds = async (days = 30) => {
    try {
        const data = await loadData();
        const now = Date.now();
        const cutoff = days * 24 * 60 * 60 * 1000;

        const cleanedDeletedIds = Object.fromEntries(
            Object.entries(data.deletedIds).filter(
                ([_, timestamp]) => now - timestamp < cutoff
            )
        );

        const cleanedDeletedFolderIds = Object.fromEntries(
            Object.entries(data.deletedFolderIds).filter(
                ([_, timestamp]) => now - timestamp < cutoff
            )
        );

        const updatedData = {
            ...data,
            deletedIds: cleanedDeletedIds,
            deletedFolderIds: cleanedDeletedFolderIds,
        };

        await saveData(updatedData);
    } catch (error) {
        console.error("Error during cleanup of deletedIds:", error);
    }
};

export const saveData = async (data: {
    notes: Record<string, Note>;
    folders: Record<string, Folder>;
    labels: string[];
    lockStatus: Record<string, any>;
    isLocked: Record<string, any>;
    deletedIds: Record<string, any>;
    deletedFolderIds: Record<string, any>;
}) => {
    try {
        await Filesystem.writeFile({
            path: STORAGE_PATH,
            data: JSON.stringify({ data }),
            directory: Directory.Data,
            encoding: FilesystemEncoding.UTF8,
        });

        await trackChange("notes", data.notes);
        await trackChange("folders", data.folders);
        await trackChange("deletedIds", data.deletedIds);
        await trackChange("deletedFolderIds", data.deletedFolderIds);
    } catch (error) {
        console.error("Error saving data:", error);
        throw error;
    }
};