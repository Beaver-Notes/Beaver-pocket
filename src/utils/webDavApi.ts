import { isPlatform } from "@ionic/react";
import axios, { AxiosRequestConfig } from 'axios';
import WebDAV from './androidDavApi';

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
        'Content-Type': 'application/xml',
      },
    };
  }

  /**
   * GET file content
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async get(path: string): Promise<string> {
    if (isPlatform('android')) {
      try {
        const result = await WebDAV.getFileContent({
          url: `${this.options.baseUrl}/${path}`,
          username: this.options.username,
          password: this.options.password,
        });
        return result.fileContent; // Extract the file content from the plugin's response
      } catch (error) {
        throw new Error(`Failed to GET file from WebDAV on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        const url = `${this.options.baseUrl}/${path}`;
        const response = await axios.get(url, config);
        return response.data; // Extract and return the file content
      } catch (error) {
        throw new Error(`Failed to GET ${path}`);
      }
    }
  }

  /**
   * Create folder
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async createFolder(folderPath: string): Promise<void> {
    if (isPlatform('android')) {
      try {
        await WebDAV.createFolder({
          url: `${this.options.baseUrl}/${folderPath}`,
          username: this.options.username,
          password: this.options.password,
        });
      } catch (error) {
        throw new Error(`Failed to create folder on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        await axios.request({
          method: 'MKCOL',
          url: `${this.options.baseUrl}/${folderPath}`,
          headers: config.headers,
        });
      } catch (error) {
        throw new Error(`Failed to create folder at ${folderPath}`);
      }
    }
  }

  /**
   * Check if folder exists
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async folderExists(path: string): Promise<boolean> {
    if (isPlatform('android')) {
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
    } else {
      try {
        const config = await this.createRequestConfig();
        const response = await axios.get(`${this.options.baseUrl}/${path}`, config);
        return response.status !== 404;
      } catch (error) {
        return false;
      }
    }
  }

  /**
   * Upload a file
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async upload(filePath: string, content: string | Blob): Promise<void> {
    if (isPlatform('android')) {
      try {
        await WebDAV.uploadFile({
          url: `${this.options.baseUrl}/${filePath}`,
          username: this.options.username,
          password: this.options.password,
          filePath: filePath,
        });
      } catch (error) {
        throw new Error(`Failed to upload file on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        await axios.put(`${this.options.baseUrl}/${filePath}`, content, config);
      } catch (error) {
        throw new Error(`Failed to upload ${filePath}`);
      }
    }
  }

  /**
   * Delete folder
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async deleteFolder(folderPath: string): Promise<void> {
    if (isPlatform('android')) {
      try {
        await WebDAV.deleteFolder({
          url: `${this.options.baseUrl}/${folderPath}`,
          username: this.options.username,
          password: this.options.password,
        });
      } catch (error) {
        throw new Error(`Failed to delete folder on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        await axios.request({
          method: 'DELETE',
          url: `${this.options.baseUrl}/${folderPath}`,
          headers: config.headers,
        });
      } catch (error) {
        throw new Error(`Failed to delete folder at ${folderPath}`);
      }
    }
  }

  /**
   * Get directory content
   * Uses WebDAVPlugin if running on Android, otherwise uses Axios for web/other platforms.
   */
  async getDirectoryContent(path: string): Promise<any> {
    if (isPlatform('android')) {
      try {
        const result = await WebDAV.listContents({
          url: `${this.options.baseUrl}/${path}`,
          username: this.options.username,
          password: this.options.password,
        });
        return result.contents;
      } catch (error) {
        throw new Error(`Failed to get directory content on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        const requestBody = `
          <propfind xmlns="DAV:">
            <prop>
              <getlastmodified xmlns="DAV:"/>
              <getcontentlength xmlns="DAV:"/>
              <executable xmlns="http://apache.org/dav/props/"/>
              <resourcetype xmlns="DAV:"/>
            </prop>
          </propfind>`;
        const headers = {
          ...config.headers,
          'Content-Type': 'application/xml',
          Accept: 'application/xml',
          Depth: 'infinity',
        };
        const response = await axios.request({
          method: 'PROPFIND',
          url: `${this.options.baseUrl}/${path}`,
          data: requestBody,
          headers,
        });
        return response.data;
      } catch (error: any) {
        throw new Error(`Failed to get content of directory at ${path}: ${error.message}`);
      }
    }
  }
}
