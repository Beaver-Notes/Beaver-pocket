import axios from "axios";

export type FileMetadata = {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
};

export class GoogleDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private get axiosInstance() {
    return axios.create({
      baseURL: "https://www.googleapis.com/drive/v3",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
  }

  async createFolder(
    folderName: string,
    parentId: string | null = null
  ): Promise<string | null> {
    const metadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : [],
    };

    try {
      const response = await this.axiosInstance.post("/files", metadata);
      return response.data.id || null;
    } catch (error: any) {
      console.error(
        "Error creating folder:",
        error.response?.data || error.message
      );
      throw new Error(
        `Error creating folder: ${error.response?.statusText || error.message}`
      );
    }
  }

  async checkFolderExists(
    folderName: string,
    parentId: string | null = null
  ): Promise<string | null> {
    const query =
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder'` +
      (parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`);

    try {
      const response = await this.axiosInstance.get("/files", {
        params: {
          q: query,
          fields: "files(id,name)",
        },
      });
      return response.data.files?.length > 0 ? response.data.files[0].id : null;
    } catch (error: any) {
      console.error(
        "Error checking folder existence:",
        error.response?.data || error.message
      );
      throw new Error(
        `Error checking folder existence: ${
          error.response?.statusText || error.message
        }`
      );
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    try {
      await this.axiosInstance.delete(`/files/${folderId}`);
    } catch (error: any) {
      console.error(
        "Error deleting folder:",
        error.response?.data || error.message
      );
      throw new Error(
        `Error deleting folder: ${error.response?.statusText || error.message}`
      );
    }
  }

  async uploadFile(
    fileName: string,
    content: Blob | string,
    parentId: string,
    mimeType: string
  ): Promise<void> {
    const metadata = { name: fileName, parents: [parentId] };
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );
    const fileBlob =
      typeof content === "string"
        ? new Blob([content], { type: mimeType || "text/plain" })
        : content;
    form.append("file", fileBlob);

    try {
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: form,
        }
      );
      if (!response.ok)
        throw new Error(`Error uploading file: ${response.statusText}`);
      console.log("File uploaded successfully.");
    } catch (error) {
      console.error("Exception in uploadFile:", error);
      throw error;
    }
  }

  async listContents(folderId: string): Promise<FileMetadata[]> {
    try {
      const response = await this.axiosInstance.get("/files", {
        params: {
          q: `'${folderId}' in parents`,
          fields: "files(id,name,mimeType,createdTime)",
        },
      });
      return response.data.files || [];
    } catch (error: any) {
      console.error(
        "Error listing contents:",
        error.response?.data || error.message
      );
      throw new Error(
        `Error listing contents: ${error.response?.statusText || error.message}`
      );
    }
  }

  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileId}`, {
        params: { alt: "media" },
        responseType: "text",
      });
      return response.data;
    } catch (error: any) {
      console.error(
        "Error downloading file:",
        error.response?.data || error.message
      );
      throw new Error(
        `Error downloading file: ${error.response?.statusText || error.message}`
      );
    }
  }
}
