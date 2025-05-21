import { registerPlugin } from "@capacitor/core";

// Define the interface for the WebDAV plugin
export interface WebDAVPlugin {
  /**
   * Creates a new folder at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  createFolder(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
  }>;

  /**
   * Checks if a folder exists at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  checkFolderExists(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
    exists: boolean;
  }>;

  /**
   * Lists the contents of a folder at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  listContents(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
    data: string;
  }>;
}

// Register the WebDAV plugin with Capacitor
const WebDAV = registerPlugin<WebDAVPlugin>("WebDAV");

export default WebDAV;
