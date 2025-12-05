import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import { ScopedStorage } from "@daniele-rolli/capacitor-scoped-storage";
import { useStorage } from "@/composable/storage";
import { processNotePaths } from "@/utils/merge";
import { useNoteStore } from "@/store/note";
import { useFolderStore } from "@/store/folder";
import { useLabelStore } from "@/store/label";
import { usePasswordStore } from "@/store/passwd";

const join = (...parts: string[]) =>
  parts.filter(Boolean).join("/").replace(/\/+/g, "/");

const Sync: React.FC = () => {
  const storage = useStorage();
  const noteStore = useNoteStore();
  const folderStore = useFolderStore();
  const labelStore = useLabelStore();
  const passwordStore = usePasswordStore();
  const platform = Capacitor.getPlatform();
  const navigate = useNavigate();

  // Export
  async function exportData() {
    const { folder } = await ScopedStorage.pickFolder();
    if (!folder?.id) return;

    const folderName = `Beaver Notes ${new Date().toISOString().slice(0, 10)}`;
    await ScopedStorage.mkdir({ folder, path: folderName, recursive: true });

    let data: any = await storage.store();
    try {
      data.lockedNotes = JSON.parse(
        localStorage.getItem("lockedNotes") || "{}"
      );
      await passwordStore.retrieve();
      if (passwordStore.passwordHash) {
        data.sharedKey = passwordStore.sharedKey;
        data.derivedKey = passwordStore.derivedKey;
      }
    } catch {
      data.lockedNotes = {};
    }

    await ScopedStorage.writeFile({
      folder,
      path: `${folderName}/data.json`,
      data: JSON.stringify({ data }),
      encoding: "utf8",
    });

    await Promise.all([
      copyDir(folder, "note-assets", `${folderName}/assets`),
      copyDir(folder, "file-assets", `${folderName}/file-assets`),
    ]);
  }

  async function copyDir(folder: { id: string }, src: string, dest: string) {
    await ScopedStorage.mkdir({ folder, path: dest, recursive: true });

    const items = await readDir(src);
    for (const name of items) {
      const srcPath = join(src, name);
      const destPath = join(dest, name);

      if (await isDirectory(srcPath)) {
        await ScopedStorage.mkdir({ folder, path: destPath, recursive: true });
        await copyDir(folder, srcPath, destPath);
      } else {
        const file = await Filesystem.readFile({
          path: srcPath,
          directory: FilesystemDirectory.Data,
        });
        await ScopedStorage.writeFile({
          folder,
          path: destPath,
          data: file.data.toString(),
          encoding: "base64",
        });
      }
    }
  }

  async function readDir(path: string): Promise<string[]> {
    try {
      const res: any = await Filesystem.readdir({
        path,
        directory: FilesystemDirectory.Data,
      });
      const list = res.files ?? [];
      return list.map((f: any) => (typeof f === "string" ? f : f.name));
    } catch {
      return [];
    }
  }

  async function isDirectory(path: string): Promise<boolean> {
    try {
      const stat: any = await Filesystem.stat({
        path,
        directory: FilesystemDirectory.Data,
      });
      return stat?.type === "directory" || (await readDir(path)).length > 0;
    } catch {
      return false;
    }
  }

  // Import
  async function mergeImportedData(data: any) {
    const keys = [
      { key: "notes", dfData: {} },
      { key: "folders", dfData: {} },
      { key: "labels", dfData: [] },
      { key: "lockStatus", dfData: {} },
      { key: "isLocked", dfData: {} },
    ];

    for (const { key, dfData } of keys) {
      const currentData = await storage.get(key, dfData);
      const importedData = data && data[key] != null ? data[key] : dfData;

      let mergedData: any;
      if (key === "labels") {
        const mergedArr = [...(currentData ?? []), ...(importedData ?? [])];
        mergedData = [...new Set(mergedArr)];
      } else {
        mergedData = { ...(currentData ?? {}), ...(importedData ?? {}) };
      }

      await storage.set(key, mergedData);
      await noteStore.retrieve();
      await folderStore.retrieve();
      await labelStore.retrieve();
    }
  }

  async function importData() {
    const { folder } = await ScopedStorage.pickFolder();
    if (!folder?.id) return false;

    try {
      const file = await ScopedStorage.readFile({
        folder,
        path: "data.json",
        encoding: "utf8",
      });
      const parsed = JSON.parse(file.data);
      let data = parsed.data ?? parsed;

      if (data?.notes) {
        const processedNotes: Record<string, any> = {};
        for (const [noteId, note] of Object.entries(data.notes)) {
          processedNotes[noteId] = processNotePaths(noteId, note as any);
        }
        data.notes = processedNotes;
      }

      if (data.sharedKey) {
        try {
          await passwordStore.importSharedKey(
            data.sharedKey,
            data.derivedKey
          );
        } catch (err) {
          console.error("Failed to import sharedKey:", err);
        }
      }

      await mergeImportedData(data);
    } catch (err) {
      console.error("Failed during import/merge:", err);
    } finally {
      try {
        await restoreAssets(folder);
      } catch (err) {
        console.error("Assets restore failed:", err);
      }
    }
  }

  // Assets
  async function ensureLocalDir(path: string) {
    try {
      const stat = await Filesystem.stat({
        path,
        directory: FilesystemDirectory.Data,
      });
      if (stat?.type === "directory") return; // already exists
    } catch {
      await Filesystem.mkdir({
        path,
        directory: FilesystemDirectory.Data,
        recursive: true,
      });
    }
  }

  async function restoreAssets(folder: { id: string }) {
    await ensureLocalDir("note-assets");
    await ensureLocalDir("file-assets");

    await Promise.all([
      restoreDir(folder, "assets", "note-assets"),
      restoreDir(folder, "file-assets", "file-assets"),
    ]);
  }

  async function restoreDir(
    folder: { id: string; name?: string },
    src: string,
    dest: string
  ) {
    try {
      const { entries } = await ScopedStorage.readdir({ folder, path: src });
      if (!entries?.length) {
        return;
      }

      await ensureLocalDir(dest);

      for (const entry of entries) {
        if (!entry?.name) {
          continue;
        }

        const srcPath = `${src}/${entry.name}`;
        const destPath = `${dest}/${entry.name}`;

        if (entry.isDir) {
          // recurse into subfolder
          await restoreDir(folder, srcPath, destPath);
        } else {
          // ensure subdir exists
          const slash = destPath.lastIndexOf("/");
          if (slash > -1) {
            await ensureLocalDir(destPath.slice(0, slash));
          }

          // copy file
          const file = await ScopedStorage.readFile({
            folder,
            path: srcPath,
            encoding: "base64",
          });

          await Filesystem.writeFile({
            path: destPath,
            directory: FilesystemDirectory.Data,
            data: file.data,
          });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  const [translations, setTranslations] = useState<Record<string, any>>({
    sync: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };
    fetchTranslations();
  }, []);

  return (
    <div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
            <div className="general py-2 space-y-8 w-full">
              <div className="general space-y-3 w-full">
                <p className="text-4xl font-bold">
                  {translations.sync.Sync || "-"}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/dropbox")}
                    aria-label="Dropbox"
                  >
                    <Icon
                      name="DropboxFill"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">Dropbox</p>
                  </button>

                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/dav")}
                    aria-label="Webdav"
                  >
                    <Icon
                      name="CloudLine"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">Webdav</p>
                  </button>

                  <button
                    className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
                      platform === "android" ? "hidden" : ""
                    }`}
                    onClick={() => navigate("/icloud")}
                    aria-label="iCloud"
                  >
                    <Icon
                      name="iCloud"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">iCloud</p>
                  </button>

                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/onedrive")}
                    aria-label="OneDrive"
                  >
                    <Icon
                      name="OneDrive"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">OneDrive</p>
                  </button>

                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/drive")}
                    aria-label="Google Drive"
                  >
                    <Icon
                      name="GDrive"
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">GDrive</p>
                  </button>
                </div>

                <div className="flex flex-row gap-2">
                  <div className="flex-1">
                    <button
                      className="w-full flex items-center justify-center h-20  bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl"
                      onClick={importData}
                      aria-label={translations.sync.importData || "-"}
                    >
                      <Icon
                        name="Download2Line"
                        className="w-12 h-12 text-neutral-800 dark:text-neutral-300"
                      />
                    </button>
                  </div>
                  <div className="flex-1">
                    <button
                      className="w-full flex items-center justify-center h-20  bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl"
                      onClick={exportData}
                      aria-label={translations.sync.exportData || "-"}
                    >
                      <Icon
                        name="Upload2Line"
                        className="w-12 h-12 text-neutral-800 dark:text-neutral-300"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sync;
