import { isPlatform } from "@ionic/react";
import axios, { AxiosRequestConfig } from "axios";
import WebDAV from "../Android/androidDavApi";

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
    if (isPlatform("android")) {
      try {
        const response = await WebDAV.createFolder({
          url: `${this.options.baseUrl}/${folderPath}`,
          username: this.options.username,
          password: this.options.password,
        });
        alert(response.message); // Display success message from WebDAV plugin
      } catch (error) {
        alert(`Failed to create folder on Android: ${error}`); // Display error message
        throw new Error(`Failed to create folder on Android: ${error}`);
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        await axios.request({
          method: "MKCOL",
          url: `${this.options.baseUrl}/${folderPath}`,
          headers: config.headers,
        });
        alert(`Folder created successfully at ${folderPath}`); // Success alert
      } catch (error) {
        alert(`Failed to create folder at ${folderPath}: ${error}`); // Error alert
        throw new Error(`Failed to create folder at ${folderPath}: ${error}`);
      }
    }
  }

  async folderExists(path: string): Promise<boolean> {
    if (isPlatform("android")) {
      try {
        await WebDAV.checkFolderExists({
          url: `${this.options.baseUrl}/${path}`,
          username: this.options.username,
          password: this.options.password,
        });
        alert(`Folder exists at ${path}`); // Success message
        return true;
      } catch (error) {
        alert(`Folder does not exist at ${path}`); // Error message
        return false; // If an error occurs, assume the folder doesn't exist
      }
    } else {
      try {
        const config = await this.createRequestConfig();
        const response = await axios.get(`${this.options.baseUrl}/${path}`, config);
        alert(`Folder exists at ${path}`); // Success message
        return response.status !== 404;
      } catch (error) {
        alert(`Folder does not exist at ${path}`); // Error message
        return false;
      }
    }
  }

  async upload(fileName: string, content: string | Blob): Promise<void> {
    try {
      const config = await this.createRequestConfig();
      await axios.put(`${this.options.baseUrl}/${fileName}`, content, config);
      alert(`File uploaded successfully: ${fileName}`); // Success message
    } catch (error) {
      alert(`Failed to upload file: ${fileName}`); // Error message
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
      alert(`Folder deleted successfully at ${folderPath}`); // Success message
    } catch (error) {
      alert(`Failed to delete folder at ${folderPath}: ${error}`); // Error message
      throw new Error(`Failed to delete folder at ${folderPath}: ${error}`);
    }
  }

  async getDirectoryContent(path: string): Promise<any> {
    if (isPlatform("android")) {
      try {
        // Make the call to WebDAV to get directory contents as raw XML
        const result = await WebDAV.listContents({
          url: `${this.options.baseUrl}/${path}`,
          username: this.options.username,
          password: this.options.password,
        });
  
        // Check if result contains the XML response
        if (result && result.xml) {
          console.log("Received XML response: ", result.xml);
          alert(result.xml); // This will show the XML response in an alert
          // You can now parse this XML and display folder contents
        } else {
          console.log("No XML response received.");
          alert("No XML response received.");
        }
  
        return result;
      } catch (error) {
        console.error("Error getting directory contents on Android:", error);
        alert(`Failed to get directory content on Android: ${error}`); // Error message
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
          "Content-Type": "application/xml",
          Accept: "application/xml",
          Depth: "infinity",
        };
        const response = await axios.request({
          method: "PROPFIND",
          url: `${this.options.baseUrl}/${path}`,
          data: requestBody,
          headers,
        });
        alert(`Directory content retrieved successfully at ${path}`); // Success message
        return response.data;
      } catch (error: any) {
        alert(`Failed to get content of directory at ${path}: ${error.message}`); // Error message
        throw new Error(
          `Failed to get content of directory at ${path}: ${error.message}`
        );
      }
    }
  }
}
