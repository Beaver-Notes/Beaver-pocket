import { registerPlugin } from "@capacitor/core";

export interface WebDAVPlugin {
  createFolder(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<void>;
  checkFolderExists(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<void>;
  deleteFolder(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<void>;
  uploadFile(options: {
    url: string;
    username: string;
    password: string;
    fileName: string;
    content: string | Blob;
  }): Promise<void>;
  listContents(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    contents: Array<{
      name: string;
      isDirectory: boolean;
      contentLength: number;
      lastModified: string;
    }>;
  }>;
  downloadFile(options: {
    url: string;
    username: string;
    password: string;
    destinationPath: string;
  }): Promise<void>;
  getFileContent(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{ fileContent: string }>;
}

const WebDAV = registerPlugin<WebDAVPlugin>("WebDAV");

export default WebDAV;