import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useHandleImportData } from "../../utils/importUtils";
import { useNavigate } from "react-router-dom";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { Zip } from "capa-zip";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import { ScopedStorage } from "@daniele-rolli/capacitor-scoped-storage";
import { useStorage } from "@/composable/storage";

const Sync: React.FC = () => {
  const storage = useStorage();
  const platform = Capacitor.getPlatform();
  const { importUtils } = useHandleImportData();
  const navigate = useNavigate();

  async function exportData() {
    const { folder } = await ScopedStorage.pickFolder();
    if (!folder?.id) return;

    const folderName = `Beaver Notes ${new Date().toISOString().slice(0, 10)}`;
    await ScopedStorage.mkdir({ folder, path: folderName, recursive: true });

    // Collect data
    let data: any = await storage.store();
    try {
      data.lockedNotes = JSON.parse(
        localStorage.getItem("lockedNotes") || "{}"
      );
    } catch {
      data.lockedNotes = {};
    }

    // Write main export file
    await ScopedStorage.writeFile({
      folder,
      path: `${folderName}/data.json`,
      data: JSON.stringify({ data }),
      encoding: "utf8",
    });

    // Copy assets
    await Promise.all([
      copyDir(folder, "note-assets", `${folderName}/assets`),
      copyDir(folder, "file-assets", `${folderName}/file-assets`),
    ]);
  }

  async function copyDir(
    folder: { id: string; name?: string },
    src: string,
    dest: string
  ) {
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

  const join = (...parts: string[]) =>
    parts.filter(Boolean).join("/").replace(/\/+/g, "/");

  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      return new Promise((reject) => {
        fileReader.onload = async () => {
          const fileDataUrl = fileReader.result as string;

          // Write file to filesystem under "file-assets/noteId" directory
          const filePath = `export/${file.name}`;
          try {
            await Filesystem.writeFile({
              path: filePath,
              data: fileDataUrl.split(",")[1], // Write only base64 data
              directory: FilesystemDirectory.Data,
              recursive: true,
            });

            await Zip.unzip({
              sourceFile: filePath,
              destinationPath: `export/${file.name
                .split(".")
                .slice(0, -1)
                .join(".")}`,
            });

            await Filesystem.deleteFile({
              path: filePath,
              directory: FilesystemDirectory.Data,
            });
          } catch (error) {
            console.error("Error writing file to filesystem:", error);
            reject(error); // Reject promise on error
          }
        };

        fileReader.onerror = (error) => {
          console.error("Error reading file:", error);
          reject(error); // Reject promise on error
        };
      });
    }
    importUtils();
  };

  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");

  // Translations
  const [translations, setTranslations] = useState<Record<string, any>>({
    sync: {},
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
                    <label
                      htmlFor="file-upload-input"
                      className="w-full flex items-center justify-center h-20  bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl"
                      aria-label={translations.sync.importData || "-"}
                    >
                      <Icon
                        name="Download2Line"
                        className="w-12 h-12 text-neutral-800 dark:text-neutral-300"
                      />
                    </label>
                    <input
                      type="file"
                      onChange={handleImportData}
                      id="file-upload-input"
                      className="hidden"
                    />
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
