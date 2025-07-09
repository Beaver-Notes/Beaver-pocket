import { useState, useCallback } from "react";
import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";

const STORAGE_PATH = "notes/data.json";

interface AppData {
  notes: Record<string, any>;
  labels: string[];
  lockStatus: Record<string, any>;
  isLocked: Record<string, any>;
  deletedIds: Record<string, any>;
}

export const useLabelStore = () => {
  const [labels, setLabels] = useState<string[]>([]);

  const readData = useCallback(async (): Promise<AppData> => {
    try {
      const file = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      const parsed = JSON.parse(
        typeof file.data === "string" ? file.data : await file.data.text()
      );

      // Handle both wrapped and unwrapped data structures
      const actualData = parsed?.data ? parsed.data : parsed;

      return {
        notes: actualData.notes || {},
        labels: actualData.labels || [],
        lockStatus: actualData.lockStatus || {},
        isLocked: actualData.isLocked || {},
        deletedIds: actualData.deletedIds || {},
      };
    } catch (error) {
      console.error("Error reading data:", error);
      return {
        notes: {},
        labels: [],
        lockStatus: {},
        isLocked: {},
        deletedIds: {},
      };
    }
  }, []);

  const writeData = useCallback(async (data: AppData) => {
    try {
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify({
          data: {
            notes: data.notes,
            labels: data.labels,
            lockStatus: data.lockStatus,
            isLocked: data.isLocked,
            deletedIds: data.deletedIds,
          },
        }),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
    } catch (error) {
      console.error("Error writing data:", error);
      throw error;
    }
  }, []);

  const retrieve = useCallback(async (): Promise<string[]> => {
    try {
      const data = await readData();
      console.log(data);
      setLabels(data.labels);
      return data.labels;
    } catch (error) {
      console.error("Error retrieving labels:", error);
      return [];
    }
  }, [readData]);

  const add = useCallback(
    async (name: string): Promise<string | null> => {
      if (typeof name !== "string" || name.trim() === "") {
        console.warn("Invalid label name, skipping add.");
        return null;
      }

      const validName = name.trim().slice(0, 50);

      try {
        const data = await readData();

        if (data.labels.includes(validName)) {
          console.log(`Label "${validName}" already exists.`);
          return null;
        }

        data.labels.push(validName);
        await writeData(data);
        setLabels(data.labels);

        console.log(`Label "${validName}" added.`);
        return validName;
      } catch (error) {
        console.error("Error adding label:", error);
        return null;
      }
    },
    [readData, writeData]
  );

  const remove = useCallback(
    async (label: string): Promise<string | null> => {
      if (typeof label !== "string" || label.trim() === "") {
        console.warn("Invalid label name, skipping remove.");
        return null;
      }

      try {
        const data = await readData();
        const labelIndex = data.labels.indexOf(label);

        if (labelIndex === -1) {
          console.warn(`Label "${label}" not found.`);
          return null;
        }

        // Remove label from labels array
        data.labels.splice(labelIndex, 1);

        // Remove label from all notes that have it
        Object.keys(data.notes).forEach((noteId) => {
          const note = data.notes[noteId];
          if (note.labels && Array.isArray(note.labels)) {
            const noteLabelsIndex = note.labels.indexOf(label);
            if (noteLabelsIndex !== -1) {
              note.labels.splice(noteLabelsIndex, 1);
              console.log(`Removed label "${label}" from note ID "${noteId}".`);
            }
          }
        });

        await writeData(data);
        setLabels(data.labels);

        console.log(`Label "${label}" removed.`);
        return label;
      } catch (error) {
        console.error("Error removing label:", error);
        return null;
      }
    },
    [readData, writeData]
  );

  const getByIds = useCallback(
    (ids: string[]): string[] => {
      if (!Array.isArray(ids)) {
        console.warn("Invalid IDs array provided to getByIds");
        return [];
      }

      return ids.filter((id) => labels.includes(id));
    },
    [labels]
  );

  const exists = useCallback(
    (label: string): boolean => {
      return labels.includes(label);
    },
    [labels]
  );

  const count = useCallback((): number => {
    return labels.length;
  }, [labels]);

  return {
    labels,
    retrieve,
    add,
    remove,
    getByIds,
    exists,
    count,
  };
};
