import WebDAV from "./WebDAVPlugin";
import mime from "mime";

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

  private buildUrl(path: string): string {
    return `${this.options.baseUrl}/${path}`;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64 = base64data.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async get(path: string): Promise<Blob> {
    try {
      const url = this.buildUrl(path);
      const result = await WebDAV.getFile({
        url,
        username: this.options.username,
        password: this.options.password,
      });

      const byteArray = Uint8Array.from(atob(result.content), (c) =>
        c.charCodeAt(0)
      );
      const mimeType = mime.getType(path) || undefined;
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      throw new Error(`Failed to GET ${path}: ${error}`);
    }
  }

  async createFolder(folderPath: string): Promise<void> {
    try {
      const exists = await this.folderExists(folderPath);
      if (exists) {
        return;
      }

      await WebDAV.createFolder({
        url: this.buildUrl(folderPath),
        username: this.options.username,
        password: this.options.password,
      });
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
      return false;
    }
  }

  async upload(fileName: string, content: string | Blob): Promise<void> {
    try {
      let base64Content: string;
      if (typeof content === "string") {
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
    } catch (error) {
      throw new Error(`Failed to delete folder at ${folderPath}: ${error}`);
    }
  }

  async getDirectoryContent(
    path: string
  ): Promise<{ name: string; type: "file" | "directory" }[]> {
    try {
      const response = await WebDAV.listContents({
        url: this.buildUrl(path),
        username: this.options.username,
        password: this.options.password,
      });

      const xmlString = response.data;

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "application/xml");

      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Error parsing XML response");
      }


      let responses = Array.from(xmlDoc.getElementsByTagName("d:response"));

      if (responses.length === 0) {
        responses = Array.from(xmlDoc.getElementsByTagName("D:response"));
      }

      if (responses.length === 0) {
        responses = Array.from(xmlDoc.getElementsByTagName("response"));
      }


      if (responses.length === 0) {
        console.warn("No responses found in XML");
        return [];
      }

      const items = responses.map((responseElem) => {

        let hrefElem =
          responseElem.getElementsByTagName("d:href")[0] ||
          responseElem.getElementsByTagName("D:href")[0] ||
          responseElem.getElementsByTagName("href")[0];

        const href = hrefElem?.textContent || "";


        let resTypeElem =
          responseElem.getElementsByTagName("d:resourcetype")[0] ||
          responseElem.getElementsByTagName("D:resourcetype")[0] ||
          responseElem.getElementsByTagName("resourcetype")[0];


        const isDirectory = resTypeElem ?
          Array.from(resTypeElem.getElementsByTagName("*")).some((el) =>
            el.localName.toLowerCase() === "collection" ||
            el.nodeName.toLowerCase().includes("collection")
          ) : false;


        let name = decodeURIComponent(href).replace(/\/$/, "");
        name = name.substring(name.lastIndexOf("/") + 1);

        return {
          name,
          type: isDirectory ? ("directory" as const) : ("file" as const),
        };
      });


      const filteredItems = items.slice(1).filter((item) => item.name.length > 0);

      return filteredItems;
    } catch (error) {
      console.error("Error getting directory contents:", error);
      throw new Error(`Failed to get directory content: ${error}`);
    }
  }
}
