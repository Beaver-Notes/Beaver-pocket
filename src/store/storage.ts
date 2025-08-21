import { Encoding, Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { useNoteStore } from "@/store/note";
import { useStorage } from "@/composable/storage";
import { Note } from "./types";

export async function migrateData() {
    const MIGRATION_KEY = "notes_migrated";


    const { value } = await Preferences.get({ key: MIGRATION_KEY });
    if (value === "true") {
        console.log("Migration already completed, skipping.");
        return;
    }

    const noteStore = useNoteStore.getState();
    const storage = useStorage();
    const oldPath = "notes/data.json";
    const newPath = "data.json";

    try {
        const oldFile = await Filesystem.readFile({
            path: oldPath,
            directory: FilesystemDirectory.Data,
            encoding: Encoding.UTF8,
        });

        console.log(oldFile.data);
        const dataJson = JSON.parse(oldFile.data as string);

        await Filesystem.writeFile({
            path: newPath,
            directory: FilesystemDirectory.Data,
            data: oldFile.data,
            encoding: Encoding.UTF8,
        });


        let notesToMigrate = {};

        if (dataJson.data?.notes) {
            notesToMigrate = dataJson.data.notes;
        } else if (dataJson.notes) {
            notesToMigrate = Array.isArray(dataJson.notes)
                ? dataJson.notes.reduce(
                    (acc: any, note: Note) => ({ ...acc, [note.id]: note }),
                    {}
                )
                : dataJson.notes;
        } else {
            notesToMigrate = dataJson;
        }

        await storage.set("notes", notesToMigrate);
        await noteStore.retrieve();


        await Filesystem.deleteFile({
            path: oldPath,
            directory: FilesystemDirectory.Data,
        });


        await Preferences.set({ key: MIGRATION_KEY, value: "true" });

        console.log("Migration successful: data.json moved & loaded.");
    } catch (e) {
        console.log("Migration skipped or failed:", e);
    }


    const paths = ["file-assets", "note-assets", "export"];
    for (const path of paths) {
        try {
            await Filesystem.mkdir({
                path,
                directory: FilesystemDirectory.Data,
                recursive: true,
            });
        } catch (error) {
            console.error("Error creating directory:", path, error);
        }
    }
}
