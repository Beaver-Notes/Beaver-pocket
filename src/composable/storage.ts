import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";

function getFilePath(storeName: string) {
  return `${storeName}.json`;
}

async function readStore(storeName: string): Promise<Record<string, any>> {
  try {
    const contents = await Filesystem.readFile({
      path: getFilePath(storeName),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(typeof contents.data === 'string' ? contents.data : await contents.data.text());
  } catch (e) {

    return {};
  }
}

async function writeStore(storeName: string, data: Record<string, any>) {
  await Filesystem.writeFile({
    path: getFilePath(storeName),
    directory: Directory.Data,
    data: JSON.stringify(data),
    encoding: Encoding.UTF8,
  });
}

export function useStorage(name = "data") {
  return {
    async get(key: string, def?: any, storeName?: string) {
      const data = await readStore(storeName || name);
      return key in data ? data[key] : def;
    },

    async set(key: string, value: any, storeName?: string) {
      const store = storeName || name;
      const data = await readStore(store);
      console.log(data);
      data[key] = value;
      await writeStore(store, data);
    },

    async has(key: string, storeName?: string) {
      const data = await readStore(storeName || name);
      return key in data;
    },

    async replace(newData: Record<string, any>, storeName?: string) {
      await writeStore(storeName || name, newData);
    },

    async delete(key: string, storeName?: string) {
      const store = storeName || name;
      const data = await readStore(store);
      delete data[key];
      await writeStore(store, data);
    },

    async clear(storeName?: string) {
      await writeStore(storeName || name, {});
    },

    async store(storeName?: string) {
      return await readStore(storeName || name);
    },
  };
}
