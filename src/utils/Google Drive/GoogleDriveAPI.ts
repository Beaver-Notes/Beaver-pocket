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

  // Create a folder in Google Drive
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
      return response.data.id || null; // Return folder ID if successful
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

  // Check if a folder exists in the root or specified folder
  async checkFolderExists(
    folderName: string,
    parentId: string | null = null
  ): Promise<string | null> {
    const query =
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder'` +
      (parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`);

    try {
      const response = await this.axiosInstance.get(`/files`, {
        params: {
          q: query,
          fields: "files(id,name)",
        },
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id; // Return folder ID if found
      }

      return null; // Folder does not exist
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

  // Delete a folder by its ID
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
    const metadata = {
      name: fileName,
      parents: [parentId], // Specify the folder ID
    };

    // Create a FormData object to hold the metadata and file content
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );

    // Determine if the content is a Blob or a string and set the MIME type
    const fileBlob =
      typeof content === "string"
        ? new Blob([content], { type: mimeType || "text/plain" }) // Default to 'text/plain' for strings
        : content;

    form.append("file", fileBlob);

    try {
      // Make a POST request to upload the file
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`, // Use the provided access token
          },
          body: form, // Attach the form data
        }
      );

      // Check for a successful response
      if (!response.ok) {
        const error = await response.text();
        console.error("Error uploading file:", error);
        throw new Error(`Error uploading file: ${response.statusText}`);
      }

      console.log("File uploaded successfully.");
    } catch (error) {
      console.error("Exception in uploadFile:", error);
      throw error;
    }
  }

  // List contents of a folder
  async listContents(folderId: string): Promise<FileMetadata[]> {
    try {
      const response = await this.axiosInstance.get(`/files`, {
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

  // Download a file by its ID
  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/files/${fileId}`, {
        params: { alt: "media" },
        responseType: "text", // Assuming the file is text
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
