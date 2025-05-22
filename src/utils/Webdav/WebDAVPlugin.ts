import { registerPlugin } from "@capacitor/core";

// Define the interface for the WebDAV plugin with full endpoints and comments
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

  /**
   * Uploads a file to the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  uploadFile(options: {
    url: string;
    username: string;
    password: string;
    content: string; // base64 encoded string
  }): Promise<{
    message: string;
  }>;

  /**
   * Deletes a folder at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  deleteFolder(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    message: string;
  }>;

  /**
   * Retrieves a file from the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode.
   */
  getFile(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    content: string; // base64 encoded string
  }>;
}

// Register the WebDAV plugin with Capacitor
const WebDAV = registerPlugin<WebDAVPlugin>("WebDAV");

export default WebDAV;
