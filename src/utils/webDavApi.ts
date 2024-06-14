import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import xml2js from 'xml2js';

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

  private async parseXmlResponse(response: AxiosResponse<string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const parser = new xml2js.Parser();
      parser.parseString(response.data, (err: any, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async get(path: string): Promise<string> {
    try {
      const config = await this.createRequestConfig();
      const url = `${this.options.baseUrl}/${path}`;
      console.log('GET request URL:', url); // Log the URL
      const response = await axios.get(url, config);
      const responseData: string = response.data; // Extract response data
      console.log('File Content:', responseData); // Log the file content
      return responseData; // Return the response data
    } catch (error) {
      throw new Error(`Failed to GET ${path}`);
    }
  }  

  async createFolder(folderPath: string): Promise<void> {
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

  async folderExists(path: string): Promise<boolean> {
    try {
      const config = await this.createRequestConfig();
      const url = `${this.options.baseUrl}/${path}`;
      console.log('GET request URL:', url); // Log the URL
      const response = await axios.get(url, config); 
      return response.status !== 404;
    } catch (error) {
      // If an error occurs or the folder doesn't exist, return false
      return false;
    }
  }
  
  async propFind(path: string, depth: number = 1): Promise<any> {
    try {
      const config = await this.createRequestConfig();
      const body = `
        <?xml version="1.0" encoding="UTF-8"?>
        <d:propfind xmlns:d="DAV:">
          <d:prop>
            <d:getlastmodified/>
          </d:prop>
        </d:propfind>
      `;
      const headers = {
        ...config.headers,
        Depth: depth.toString(),
      };
      const response = await axios.request({
        method: 'PROPFIND',
        url: `${this.options.baseUrl}/${path}`,
        data: body,
        headers,
      });
      return this.parseXmlResponse(response);
    } catch (error) {
      throw new Error(`Failed to PROPFIND ${path}`);
    }
  }

  async upload(filePath: string, content: string|Blob): Promise<void> {
    try {
      const config = await this.createRequestConfig();
      await axios.put(`${this.options.baseUrl}/${filePath}`, content, config);
    } catch (error) {
      throw new Error(`Failed to upload ${filePath}`);
    }
  }  

  async deleteFolder(folderPath: string): Promise<void> {
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

  async getDirectoryContent(path: string): Promise<any> {
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
      return response.data; // Assuming you want to return the raw XML response
    } catch (error:any) {
      throw new Error(`Failed to get content of directory at ${path}: ${error.message}`);
    }
  }
  
}
