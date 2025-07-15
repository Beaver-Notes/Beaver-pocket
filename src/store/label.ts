import {
  Filesystem,
  Directory,
  FilesystemEncoding,
} from "@capacitor/filesystem";

const STORAGE_PATH = "notes/data.json";

interface FullData {
  data: {
    notes: Record<string, any>;
    labels: string[];
    lockStatus: Record<string, any>;
    isLocked: Record<string, any>;
    deletedIds: Record<string, number>;
  };
}

const getInitialData = (): FullData => ({
  data: {
    notes: {},
    labels: [],
    lockStatus: {},
    isLocked: {},
    deletedIds: {},
  },
});

export class LabelStore {
  private _labels: string[] = [];

  constructor() {
    // Initialize with empty labels - call retrieve() to load from storage
  }

  get labels(): string[] {
    return [...this._labels]; // Return a copy to prevent direct mutation
  }

  private async readData(): Promise<FullData> {
    try {
      const file = await Filesystem.readFile({
        path: STORAGE_PATH,
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });

      const parsed = JSON.parse(
        typeof file.data === "string" ? file.data : await file.data.text()
      );

      return parsed?.data ? parsed : getInitialData();
    } catch (error) {
      console.warn("No existing data found or error reading file:", error);
      return getInitialData();
    }
  }

  private async writeData(newData: FullData): Promise<void> {
    try {
      await Filesystem.writeFile({
        path: STORAGE_PATH,
        data: JSON.stringify(newData),
        directory: Directory.Data,
        encoding: FilesystemEncoding.UTF8,
      });
    } catch (error) {
      console.error("Error writing data:", error);
    }
  }

  async retrieve(): Promise<string[]> {
    const fullData = await this.readData();
    this._labels = fullData.data.labels || [];
    console.log(this._labels);
    return [...this._labels];
  }

  async add(name: string): Promise<string | null> {
    if (typeof name !== "string" || name.trim() === "") return null;

    const validName = name.trim().slice(0, 50);
    const fullData = await this.readData();

    if (fullData.data.labels.includes(validName)) return null;

    fullData.data.labels.push(validName);
    await this.writeData(fullData);
    this._labels = fullData.data.labels;
    return validName;
  }

  async delete(label: string): Promise<string | null> {
    const fullData = await this.readData();
    const index = fullData.data.labels.indexOf(label);

    if (index === -1) return null;

    fullData.data.labels.splice(index, 1);
    await this.writeData(fullData);
    this._labels = fullData.data.labels;
    return label;
  }

  getByIds(ids: string[]): string[] {
    return ids.filter((id) => this._labels.includes(id));
  }
}

export const labelStore = new LabelStore();