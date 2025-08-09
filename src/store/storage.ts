
import {
    Directory,
    Encoding,
    Filesystem,
} from "@capacitor/filesystem";

export async function migrateDataJson() {
    const oldPath = "notes/data.json";
    const newPath = "data.json";

    try {
        // Read the old file if it exists
        const oldFile = await Filesystem.readFile({
            path: oldPath,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
        });

        // Write the file to the new location
        await Filesystem.writeFile({
            path: newPath,
            directory: Directory.Data,
            data: oldFile.data,
            encoding: Encoding.UTF8,
        });

        // Optionally delete the old file (if you want to clean up)
        await Filesystem.deleteFile({
            path: oldPath,
            directory: Directory.Data,
        });

        console.log("Migration successful: data.json moved.");
    } catch (e) {
        console.log("Migration skipped or failed:", e);
    }

    // Ensure required folders exist
    const paths = ["file-assets", "note-assets", "export"];
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
