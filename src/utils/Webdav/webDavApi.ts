import axios, { AxiosRequestConfig } from "axios";
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

  private async createRequestConfig(): Promise<AxiosRequestConfig> {
    const { username, password } = this.options;
    const authToken = btoa(`${username}:${password}`);

    return {
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/xml",
      },
    };
  }

  async get(path: string): Promise<string> {
    try {
      const config = await this.createRequestConfig();
      const url = `${this.options.baseUrl}/${path}`;
      const response = await axios.get(url, config);
      return response.data; // Extract and return the file content
    } catch (error) {
      throw new Error(`Failed to GET ${path}: ${error}`);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      await WebDAV.createFolder({
        url: `${this.options.baseUrl}/${folderPath}`,
        username: this.options.username,
        password: this.options.password,
      });
      console.log(`${this.options.baseUrl}/${folderPath}`);
    } catch (error) {
      throw new Error(`Failed to create folder: ${error}`);
    }
  }

  async folderExists(path: string): Promise<boolean> {
    try {
      await WebDAV.checkFolderExists({
        url: `${this.options.baseUrl}/${path}`,
        username: this.options.username,
        password: this.options.password,
      });
      return true;
    } catch (error) {
      return false; // If an error occurs, assume the folder doesn't exist
    }
  }

  async upload(fileName: string, content: string | Blob): Promise<void> {
    try {
      const config = await this.createRequestConfig();
      await axios.put(`${this.options.baseUrl}/${fileName}`, content, config);
    } catch (error) {
      throw new Error(`Failed to upload file: ${fileName}`);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const config = await this.createRequestConfig();
      await axios.request({
        method: "DELETE",
        url: `${this.options.baseUrl}/${folderPath}`,
        headers: config.headers,
      });
    } catch (error) {
      throw new Error(`Failed to delete folder at ${folderPath}: ${error}`);
    }
  }

  async getDirectoryContent(path: string): Promise<any[]> {
    try {
      const result = await WebDAV.listContents({
        url: `${this.options.baseUrl}/${path}`,
        username: this.options.username,
        password: this.options.password,
      });
      return JSON.parse(result.data);
    } catch (error) {
      console.error("Error getting directory contents on Android:", error);
      throw new Error(`Failed to get directory content on Android: ${error}`);
    }
  }
}
