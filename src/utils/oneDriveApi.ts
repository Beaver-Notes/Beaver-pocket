export type FileMetadata = {
  id: string;
  name: string;
  mimeType: string;
};

export class OneDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Create a folder in OneDrive
  async createFolder(
    folderName: string,
    parentId: string | null = null
  ): Promise<string | null> {
    const endpoint = parentId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${parentId}/children`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    const metadata = {
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      });

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
    const endpoint = parentId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${parentId}/children`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Error checking folder existence:", error);
        throw new Error(`Error checking folder existence: ${response.statusText}`);
      }

      const data = await response.json();
      const folder = data.value.find((item: any) => item.name === folderName && item.folder);

      return folder ? folder.id : null; // Return folder ID if found
    } catch (error) {
      console.error("Exception in checkFolderExists:", error);
      throw error;
    }
  }

  // Delete a folder by its ID
  async deleteFolder(folderId: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}`,
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
  ): Promise<void> {    
    try {
      // Prepare the upload URL for OneDrive
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${fileName}:/content`;

      alert(uploadUrl);
  
      const response = await fetch(uploadUrl, {
        method: "PUT", // Use PUT to upload content directly
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: content, // Send only the file blob in the body
      });
  
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
    const endpoint = folderId
      ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
      : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Error listing contents:", error);
        throw new Error(`Error listing contents: ${response.statusText}`);
      }

      const data = await response.json();
      return data.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        mimeType: item.file ? item.file.mimeType : "folder",
      }));
    } catch (error) {
      console.error("Exception in listContents:", error);
      throw error;
    }
  }

  // Download a file by its ID
  async downloadFile(fileId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
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
