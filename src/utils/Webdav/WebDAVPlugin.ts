import { registerPlugin } from "@capacitor/core";

export interface WebDAVPlugin {
  /**
   * Creates a new folder at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode or uploaded cert.
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
   * Uses the current security mode set by setInsecureMode or uploaded cert.
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
   * Uses the current security mode set by setInsecureMode or uploaded cert.
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
   * Uses the current security mode set by setInsecureMode or uploaded cert.
   */
  uploadFile(options: {
    url: string;
    username: string;
    password: string;
    content: string;
  }): Promise<{
    message: string;
  }>;

  /**
   * Deletes a folder at the specified WebDAV URL.
   * Uses the current security mode set by setInsecureMode or uploaded cert.
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
   * Uses the current security mode set by setInsecureMode or uploaded cert.
   */
  getFile(options: {
    url: string;
    username: string;
    password: string;
  }): Promise<{
    content: string;
  }>;

  /**
   * Sets the security mode for WebDAV operations.
   * If insecure is true, it allows insecure connections (HTTP).
   * If insecure is false, it enforces secure connections (HTTPS).
   */
  setInsecureMode(options: { insecure: boolean }): Promise<{ message: string }>;

  /**
   * Uploads a self-signed SSL certificate to be trusted for HTTPS connections.
   * The `certificate` should be a base64-encoded string in DER format (iOS) or PEM format (Android).
   * Optionally pass an `alias` to identify the certificate (useful if supporting multiple certs).
   */
  uploadCertificate(options: {
    certificate: string;
    alias?: string;
  }): Promise<{
    message: string;
  }>;
}

const WebDAV = registerPlugin<WebDAVPlugin>("WebDAV");

export default WebDAV;
