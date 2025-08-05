import { create } from "zustand";
import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const PASSWORD_HASH_KEY = "password_hash";
const ENCRYPTION_KEY_STORAGE = "encryption_key_storage";
const SALT_KEY = "encryption_salt";

export const usePasswordStore = create(
  (set, get) => ({
    passwordHash: "",
    encryptionSalt: "",
    isSecureStorageAvailable: false,

    retrieve: async () => {
      try {
        await SecureStoragePlugin.keys();
        set({ isSecureStorageAvailable: true });
      } catch {
        console.warn("Secure storage not available, using fallback");
      }

      const { isSecureStorageAvailable } = get();
      let passwordHash = "";
      let encryptionSalt = "";

      if (isSecureStorageAvailable) {
        const hash = await SecureStoragePlugin.get({
          key: PASSWORD_HASH_KEY,
        }).catch(() => null);
        const salt = await SecureStoragePlugin.get({ key: SALT_KEY }).catch(
          () => null
        );

        passwordHash = hash?.value || "";
        encryptionSalt = salt?.value || "";
      }

      set({ passwordHash, encryptionSalt });
    },

    setSharedKey: async (password) => {
      const salt = CryptoJS.SHA256(password).toString().slice(0, 32);
      const hash = await bcrypt.hash(password, await bcrypt.genSalt(12));
      const encryptionKey = get().deriveEncryptionKey(password);

      set({ passwordHash: hash, encryptionSalt: salt });

      if (get().isSecureStorageAvailable) {
        await SecureStoragePlugin.set({
          key: PASSWORD_HASH_KEY,
          value: hash,
        });
        await SecureStoragePlugin.set({ key: SALT_KEY, value: salt });
        await SecureStoragePlugin.set({
          key: ENCRYPTION_KEY_STORAGE,
          value: encryptionKey,
        });
      }
    },

    isValidPassword: async (password) => {
      const { passwordHash } = get();
      if (!passwordHash) {
        await get().retrieve();
      }
      return await bcrypt.compare(password, get().passwordHash);
    },

    deriveEncryptionKey: (password) => {
      const salt = CryptoJS.SHA256(password).toString().slice(0, 32);
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 100000,
        hasher: CryptoJS.algo.SHA256,
      }).toString();
      return key;
    },

    resetPassword: async (currentPassword, newPassword) => {
      const valid = await get().isValidPassword(currentPassword);
      if (!valid) throw new Error("Invalid current password");

      await get().setSharedKey(newPassword);

      return true;
    },

    resetAllData: async () => {
      if (get().isSecureStorageAvailable) {
        await SecureStoragePlugin.remove({ key: PASSWORD_HASH_KEY }).catch(
          () => {}
        );
        await SecureStoragePlugin.remove({ key: SALT_KEY }).catch(() => {});
        await SecureStoragePlugin.remove({ key: ENCRYPTION_KEY_STORAGE }).catch(
          () => {}
        );
      }

      set({
        passwordHash: "",
        encryptionSalt: "",
      });
    },
  }),
  {
    name: "password-storage",
    partialize: (state) => ({
      isSecureStorageAvailable: state.isSecureStorageAvailable,
    }),
  }
);
