import { registerPlugin } from "@capacitor/core";

// Define the interface for the WebDAV plugin
export interface WebDAVPlugin {
  createFolder(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
  }>;

  checkFolderExists(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
  }>;

  listContents(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    data: string;
  }>;
}


// Register the WebDAV plugin with Capacitor
const WebDAV = registerPlugin<WebDAVPlugin>("WebDAV");

export default WebDAV;