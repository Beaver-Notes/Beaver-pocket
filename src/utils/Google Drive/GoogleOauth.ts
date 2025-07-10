import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { GoogleDriveAPI } from "./GoogleDriveAPI";

const IOS_CLIENT_ID = import.meta.env.VITE_IOS_GOOGLE_CLIENT_ID;
const ANDROID_CLIENT_ID = import.meta.env.VITE_ANDROID_GOOGLE_CLIENT_ID;

class DriveService {
  private driveAPI: GoogleDriveAPI | null = null;
  private accessToken: string | null = null;

  async initialize(): Promise<void> {
    let clientId = "";

    const platform = Capacitor.getPlatform();

    if (platform === "ios") {
      clientId = IOS_CLIENT_ID;
    } else if (platform === "android") {
      clientId = ANDROID_CLIENT_ID;
    } else {
      throw new Error("Unsupported platform");
    }

    await GoogleAuth.initialize({
      clientId,
      scopes: ["profile", "email", "https://www.googleapis.com/auth/drive"],
      grantOfflineAccess: true,
    });

    await this.loadAccessToken();
  }

  async signIn(): Promise<void> {
    const googleUser = await GoogleAuth.signIn();
    this.accessToken = googleUser.authentication.accessToken;
    this.driveAPI = new GoogleDriveAPI(this.accessToken);
    await SecureStoragePlugin.set({
      key: "access_token",
      value: this.accessToken,
    });
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async signOut(): Promise<void> {
    await GoogleAuth.signOut();
    await SecureStoragePlugin.remove({ key: "access_token" });
    this.accessToken = null;
    this.driveAPI = null;
  }

  private async loadAccessToken(): Promise<void> {
    try {
      const { value } = await SecureStoragePlugin.get({ key: "access_token" });
      if (value) {
        this.accessToken = value;
        this.driveAPI = new GoogleDriveAPI(value);
      }
    } catch {
      // silent fail, user not signed in
    }
  }

  getDriveAPI(): GoogleDriveAPI | null {
    return this.driveAPI;
  }

  isAuthenticated(): boolean {
    return !!this.driveAPI;
  }
}

export const driveService = new DriveService();
