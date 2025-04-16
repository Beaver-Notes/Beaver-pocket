import { useState } from "react";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";

const STORAGE_PATH = "notes/data.json";

export const uselabelStore = () => {
  const [labels, setLabels] = useState<string[]>([]);

  const readData = async () => {
    try {
      const data = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
      return JSON.parse(
        typeof data.data === "string" ? data.data : await data.data.text()
      );
    } catch (error) {
      console.error("Error reading data:", error);
      return {
        notes: {},
        labels: [],
        lockStatus: false,
        isLocked: false,
        deletedIds: [],
      };
    }
  };

  const writeData = async (data: any) => {
    try {
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({
          notes: data.notes,
          labels: data.labels,
          lockStatus: data.lockStatus,
          isLocked: data.isLocked,
          deletedIds: data.deletedIds,
        }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
    } catch (error) {
      console.error("Error writing data:", error);
    }
  };

  const retrieve = async () => {
    const data = await readData();
    setLabels(data.labels);
    return data.labels;
  };

  const add = async (name: string) => {
    if (typeof name !== "string" || name.trim() === "") return null;
    const validName = name.slice(0, 50);
    const data = await readData();
    if (!data.labels.includes(validName)) {
      data.labels.push(validName);
      await writeData(data);
      setLabels(data.labels);
      return validName;
    }
    return null;
  };

  const remove = async (label: string) => {
    const data = await readData();
    const index = data.labels.indexOf(label);
    if (index === -1) return null;
    data.labels.splice(index, 1);
    // Remove from notes
    for (const noteId in data.notes) {
      const note = data.notes[noteId];
      const labelIndex = note.labels.indexOf(label);
      if (labelIndex !== -1) {
        note.labels.splice(labelIndex, 1);
        data.notes[noteId] = note;
      }
    }
    await writeData(data);
    setLabels(data.labels);
    return label;
  };

  const getByIds = (ids: string[]) => {
    return ids.filter((id) => labels.includes(id));
  };

  return {
    labels,
    retrieve,
    add,
    remove,
    getByIds,
  };
};
