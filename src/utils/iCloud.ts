import { registerPlugin } from '@capacitor/core';

export interface iCloudPlugin {
    createFolder(options: { folderName: string }): Promise<{ success: boolean }>;
    checkFolderExists(options: { folderName: string }): Promise<{ exists: boolean }>;
    deleteFolder(options: { folderName: string }): Promise<{ success: boolean }>;
    uploadFile(options: { fileName: string, fileData: string }): Promise<{ success: boolean }>;
    listContents(options: { folderName: string }): Promise<{ files: Array<{ name: string, type: 'file' | 'directory' }> }>;
    downloadFile(options: { fileName: string }): Promise<{ fileData: string }>;
  }  

const iCloud = registerPlugin<iCloudPlugin>('iCloud');

export default iCloud;
