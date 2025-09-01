import { create } from "zustand";
import CryptoES from "crypto-es";
import bcrypt from "bcryptjs";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const PASSWORD_STORAGE = "password_payload";
const LEGACY_STORAGE_KEY = "sharedKey";

function deriveKeyFromPassword(password) {
  const salt = CryptoES.SHA256(password).toString().slice(0, 32);
  return CryptoES.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000,
    hasher: CryptoES.algo.SHA256,
  }).toString();
}

export const usePasswordStore = create((set, get) => ({
  sharedKey: "",
  derivedKey: "",

  async deleteLegacyStorage() {
    await SecureStoragePlugin.remove({ key: LEGACY_STORAGE_KEY }).catch(
      () => {}
    );
  },

  async retrieve() {
    try {
      const result = await SecureStoragePlugin.get({
        key: PASSWORD_STORAGE,
      }).catch(() => null);

      if (!result?.value) {
        // fallback: legacy key
        const legacy = await SecureStoragePlugin.get({
          key: LEGACY_STORAGE_KEY,
        }).catch(() => null);
        set({ sharedKey: legacy?.value || "" });
        return legacy?.value || "";
      }

      // try parsing stored JSON
      try {
        const parsed = JSON.parse(result.value);
        set({ sharedKey: parsed.hash, derivedKey: parsed.key });
        return parsed.hash;
      } catch {
        // fallback: raw legacy string
        set({ sharedKey: result.value });
        return result.value;
      }
    } catch (err) {
      console.error("Error retrieving password:", err);
      return "";
    }
  },

  async setSharedKey(password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const derivedKey = deriveKeyFromPassword(password);

      const payload = JSON.stringify({ hash: hashedPassword, key: derivedKey });
      await SecureStoragePlugin.set({ key: PASSWORD_STORAGE, value: payload });
      await get().deleteLegacyStorage();

      set({ sharedKey: hashedPassword, derivedKey });
    } catch (err) {
      console.error("Error setting password:", err);
      throw err;
    }
  },

  async isValidPassword(enteredPassword) {
    try {
      const { sharedKey, derivedKey } = get();

      // bcrypt check
      const validLegacy = await bcrypt.compare(enteredPassword, sharedKey);
      if (validLegacy) return true;

      // derivedKey check
      const derived = deriveKeyFromPassword(enteredPassword);
      return derived === derivedKey;
    } catch (err) {
      console.error("Error validating password:", err);
      return false;
    }
  },

  async resetPassword(currentPassword, newPassword) {
    const isValid = await get().isValidPassword(currentPassword);
    if (!isValid) throw new Error("Current password is incorrect");

    await get().setSharedKey(newPassword);
    return true;
  },

  async importSharedKey(hash, derivedKey = null) {
    set({ sharedKey: hash, derivedKey });

    const payload = JSON.stringify({ hash, key: derivedKey });
    await SecureStoragePlugin.set({ key: PASSWORD_STORAGE, value: payload });
    await get().deleteLegacyStorage();
  },
}));
