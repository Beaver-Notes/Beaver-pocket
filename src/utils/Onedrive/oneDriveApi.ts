export type FileMetadata = {
  name: string;
  mimeType: string;
};

export class OneDriveAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Create a folder in OneDrive using a path
  async createFolder(folderPath: string): Promise<void> {
    const endpoint = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
      folderPath
    )}`;

    const metadata = {
      folder: {},
      "@microsoft.graph.conflictBehavior": "fail",
    };

    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
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
    } catch (error) {
      console.error("Exception in createFolder:", error);
      throw error;
    }
  }

  // Get metadata of a file or folder by path
  async filesGetMetadata(filePath: string): Promise<FileMetadata | null> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
          filePath
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) return null; // File/folder does not exist
        const error = await response.text();
        console.error("Error fetching metadata:", error);
        throw new Error(`Error fetching metadata: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        name: data.name,
        mimeType: data.file ? data.file.mimeType : "folder",
      };
    } catch (error) {
      console.error("Exception in getMetadata:", error);
      throw error;
    }
  }

  // Delete a folder or file by path
  async deleteItem(filePath: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
          filePath
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Error deleting item:", error);
        throw new Error(`Error deleting item: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Exception in deleteItem:", error);
      throw error;
    }
  }

  // Upload a file to a specific folder by path
  async uploadFile(filePath: string, content: Blob | string): Promise<void> {
    try {
      const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
        filePath
      )}:/content`;

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: content,
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

  // List contents of a folder by path
  async listContents(folderPath: string): Promise<FileMetadata[]> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
          folderPath
        )}:/children`,
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
      return data.value.map((item: any) => ({
        name: item.name,
        mimeType: item.file ? item.file.mimeType : "folder",
      }));
    } catch (error) {
      console.error("Exception in listContents:", error);
      throw error;
    }
  }

  // Download a file by path
  async downloadFile(filePath: string): Promise<Blob> {
    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(
          filePath
        )}:/content`,
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

      return await response.blob(); // Return file as Blob
    } catch (error) {
      console.error("Exception in downloadFile:", error);
      throw error;
    }
  }
}
