export type FileMetadata = {
  id: string;
  name: string;
  mimeType: string;
};

export class GoogleDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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
      const response = await fetch(
        "https://www.googleapis.com/drive/v3/files",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error creating folder:", error);
        throw new Error(`Error creating folder: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id || null; // Return folder ID if successful
    } catch (error) {
      console.error("Exception in createFolder:", error);
      throw error;
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
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name)`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error checking folder existence:", error);
        throw new Error(
          `Error checking folder existence: ${response.statusText}`
        );
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id; // Return folder ID if found
      }

      return null; // Folder does not exist
    } catch (error) {
      console.error("Exception in checkFolderExists:", error);
      throw error;
    }
  }

  // Delete a folder by its ID
  async deleteFolder(folderId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${folderId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error deleting folder:", error);
        throw new Error(`Error deleting folder: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Exception in deleteFolder:", error);
      throw error;
    }
  }

  // Upload a file to a specific folder
  async uploadFile(
    fileName: string,
    content: Blob | string,
    parentId: string,
    mimeType: string
  ): Promise<void> {
    const metadata = {
      name: fileName,
      parents: [parentId],
    };

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );

    // Dynamically set the MIME type based on the file type
    const fileBlob =
      typeof content === "string"
        ? new Blob([content], { type: mimeType || "text/plain" }) // Fallback to 'text/plain' for strings
        : content; // If content is already a Blob, use it directly

    form.append("file", fileBlob);

    try {
      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error uploading file:", error);
        throw new Error(`Error uploading file: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Exception in uploadFile:", error);
      throw error;
    }
  }

  // List contents of a folder
  async listContents(folderId: string): Promise<FileMetadata[]> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents&fields=files(id,name,mimeType)`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error listing contents:", error);
        throw new Error(`Error listing contents: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Exception in listContents:", error);
      throw error;
    }
  }

  // Download a file by its ID
  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error downloading file:", error);
        throw new Error(`Error downloading file: ${response.statusText}`);
      }

      return await response.text(); // Assuming the file is a text file
    } catch (error) {
      console.error("Exception in downloadFile:", error);
      throw error;
    }
  }
}
