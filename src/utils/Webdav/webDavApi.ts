import WebDAV from "./WebDAVPlugin";

interface WebDavOptions {
  baseUrl: string;
  username: string;
  password: string;
}

export class WebDavService {
  private options: WebDavOptions;

  constructor(options: WebDavOptions) {
    this.options = options;
  }

  // Helper to build full URL
  private buildUrl(path: string): string {
    return `${this.options.baseUrl}/${path}`;
  }

  // Helper to convert Blob to base64 string (if needed)
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove prefix like "data:application/octet-stream;base64,"
        const base64 = base64data.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async get(path: string): Promise<string> {
    try {
      const url = this.buildUrl(path);
      const result = await WebDAV.getFile({
        url,
        username: this.options.username,
        password: this.options.password,
      });
      // result.content is base64 encoded, convert to utf8 string if needed
      const decoded = atob(result.content);
      return decoded;
    } catch (error) {
      throw new Error(`Failed to GET ${path}: ${error}`);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      // First check if folder exists
      const exists = await this.folderExists(folderPath);
      if (exists) {
        console.log(`Folder already exists at ${this.buildUrl(folderPath)}`);
        return; // Early exit - no error, folder already there
      }

      // Folder does not exist, create it
      await WebDAV.createFolder({
        url: this.buildUrl(folderPath),
        username: this.options.username,
        password: this.options.password,
      });
      console.log(`Folder created at ${this.buildUrl(folderPath)}`);
    } catch (error) {
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  async folderExists(path: string): Promise<boolean> {
    try {
      await WebDAV.checkFolderExists({
        url: this.buildUrl(path),
        username: this.options.username,
        password: this.options.password,
      });
      return true;
    } catch {
      return false; // Assume does not exist on error
    }
  }

  async upload(fileName: string, content: string | Blob): Promise<void> {
    try {
      let base64Content: string;
      if (typeof content === "string") {
        // Assume it's already base64 encoded string
        base64Content = content;
      } else {
        base64Content = await this.blobToBase64(content);
      }

      await WebDAV.uploadFile({
        url: this.buildUrl(fileName),
        username: this.options.username,
        password: this.options.password,
        content: base64Content,
      });
      console.log(`File uploaded: ${this.buildUrl(fileName)}`);
    } catch (error) {
      throw new Error(`Failed to upload file: ${fileName} - ${error}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      await WebDAV.deleteFolder({
        url: this.buildUrl(folderPath),
        username: this.options.username,
        password: this.options.password,
      });
      console.log(`Folder deleted at ${this.buildUrl(folderPath)}`);
    } catch (error) {
      throw new Error(`Failed to delete folder at ${folderPath}: ${error}`);
    }
  }

  async getDirectoryContent(path: string): Promise<any[]> {
    try {
      const result = await WebDAV.listContents({
        url: this.buildUrl(path),
        username: this.options.username,
        password: this.options.password,
      });
      // Assuming the response data is JSON string
      return JSON.parse(result.data);
    } catch (error) {
      console.error("Error getting directory contents:", error);
      throw new Error(`Failed to get directory content: ${error}`);
    }
  }
}
