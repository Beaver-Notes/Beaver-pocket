import { create } from "zustand";
import CryptoES from "crypto-es";
import bcrypt from "bcryptjs";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const PASSWORD_STORAGE = "password_payload";

function deriveKeyFromPassword(password, salt, iterations = 100000) {
  return CryptoES.PBKDF2(password, CryptoES.enc.Base64.parse(salt), {
    keySize: 256 / 32,
    iterations,
    hasher: CryptoES.algo.SHA256,
  });
}

export const usePasswordStore = create((set, get) => ({
  hash: "",

  async retrieve() {
    try {
      const result = await SecureStoragePlugin.get({ key: PASSWORD_STORAGE }).catch(() => null);
      if (!result?.value) return "";

      const parsed = JSON.parse(result.value);
      set({ hash: parsed.hash });
      return parsed.hash;
    } catch (err) {
      console.error("Error retrieving password:", err);
      return "";
    }
  },

  async setPassword(password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const payload = JSON.stringify({ hash: hashedPassword });
      await SecureStoragePlugin.set({ key: PASSWORD_STORAGE, value: payload });
      set({ hash: hashedPassword });
    } catch (err) {
      console.error("Error setting password:", err);
      throw err;
    }
  },

  async isValidPassword(enteredPassword) {
    try {
      const { hash } = get();
      return await bcrypt.compare(enteredPassword, hash);
    } catch (err) {
      console.error("Error validating password:", err);
      return false;
    }
  },

  deriveKEK(password, salt, iterations = 100000) {
    return deriveKeyFromPassword(password, salt, iterations);
  },
}));
