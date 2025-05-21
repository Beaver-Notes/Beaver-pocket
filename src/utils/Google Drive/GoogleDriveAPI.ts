import axios, { AxiosInstance, AxiosError } from "axios";

export type FileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
};

export type GoogleDriveError = {
  message: string;
  status?: number;
  details?: unknown;
};

export class GoogleDriveAPI {
  private accessToken: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.axiosInstance = axios.create({
      baseURL: "https://www.googleapis.com/drive/v3",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  /**
   * Updates the access token and refreshes the axios instance headers
   */
  updateAccessToken(newToken: string): void {
    this.accessToken = newToken;
    this.axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
  }

  /**
   * Creates a new folder in Google Drive
   */
  async createFolder(
    folderName: string,
    parentId: string | null = null
  ): Promise<string> {
    const metadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    };

    try {
      const response = await this.axiosInstance.post("/files", metadata);
      return response.data.id;
    } catch (error) {
      throw this.handleError(error, "creating folder");
    }
  }

  /**
   * Checks if a folder exists and returns its ID if found
   */
  async checkFolderExists(
    folderName: string,
    parentId: string | null = null
  ): Promise<string | null> {
    const parentClause = parentId
      ? ` and '${parentId}' in parents`
      : ` and 'root' in parents`;

    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder'${parentClause}`;

    try {
      const response = await this.axiosInstance.get("/files", {
        params: {
          q: query,
          fields: "files(id,name)",
        },
      });

      const files = response.data.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      throw this.handleError(error, "checking folder existence");
    }
  }

  /**
   * Creates a folder if it doesn't exist, returns the ID either way
   */
  async getOrCreateFolder(
    folderName: string,
    parentId: string | null = null
  ): Promise<string> {
    const existingId = await this.checkFolderExists(folderName, parentId);
    if (existingId) return existingId;
    return this.createFolder(folderName, parentId);
  }

  /**
   * Deletes a file or folder by ID
   */
  async delete(fileId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/files/${fileId}`);
    } catch (error) {
      throw this.handleError(error, "deleting file/folder");
    }
  }

  async uploadFile(
    fileName: string,
    content: Blob | string,
    parentId: string,
    mimeType = "text/plain"
  ): Promise<string> {
    // 1. Check if file with the same name exists in the folder
    const existingFileId = await this.findFileIdByName(fileName, parentId);

    // Prepare file content blob
    const fileBlob =
      typeof content === "string"
        ? new Blob([content], { type: mimeType })
        : content;

    // 2. Prepare metadata
    const metadata = existingFileId
      ? { name: fileName } // Exclude 'parents' when updating
      : { name: fileName, parents: [parentId] };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    form.append("file", fileBlob);

    try {
      let response: Response;

      if (existingFileId) {
        // 3a. Update existing file
        response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`,
          {
            method: "PATCH",
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form,
          }
        );
      } else {
        // 3b. Create new file
        response = await fetch(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form,
          }
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      throw this.handleError(error, "uploading file");
    }
  }

  /**
   * Helper method to find a file by name in a folder, returns file ID or null
   */
  async findFileIdByName(
    fileName: string,
    parentId: string
  ): Promise<string | null> {
    const query = `name='${fileName}' and '${parentId}' in parents and trashed=false`;
    try {
      const response = await this.axiosInstance.get("/files", {
        params: {
          q: query,
          fields: "files(id, name)",
        },
      });
      const files = response.data.files || [];
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      throw this.handleError(error, "finding existing file");
    }
  }

  /**
   * Lists contents of a folder
   */
  async listContents(folderId: string): Promise<FileMetadata[]> {
    try {
      const response = await this.axiosInstance.get("/files", {
        params: {
          q: `'${folderId}' in parents`,
          fields: "files(id,name,mimeType,createdTime)",
          pageSize: 1000, // Increase default page size
        },
      });

      return response.data.files || [];
    } catch (error) {
      throw this.handleError(error, "listing contents");
    }
  }

  /**
   * Downloads a file by ID
   */
  async downloadFile(
    fileId: string,
    responseType: "text" | "blob" | "arraybuffer" = "text"
  ): Promise<string | Blob | ArrayBuffer> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileId}`, {
        params: { alt: "media" },
        responseType,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, "downloading file");
    }
  }

  /**
   * Common error handler for consistent error formatting
   */
  private handleError(error: unknown, operation: string): GoogleDriveError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      return {
        message: `Error ${operation}: ${
          axiosError.response?.statusText || axiosError.message
        }`,
        status: axiosError.response?.status,
        details: axiosError.response?.data,
      };
    }

    // Handle fetch or other errors
    return {
      message: `Error ${operation}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
