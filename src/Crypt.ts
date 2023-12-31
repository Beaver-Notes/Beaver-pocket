  export async function generateEncryptionKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }
  
  export async function encryptData(data: string, key: CryptoKey): Promise<string> {
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      key,
      encodedData
    );
  
    // Convert the encrypted data to base64 using the TextDecoder
    const base64EncryptedData = btoa(
      new TextDecoder().decode(new Uint8Array(encryptedData))
    );
  
    return base64EncryptedData;
  }  
  
  // Function to decrypt data
  export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
    const encryptedDataUint8 = new Uint8Array(
      Array.from(atob(encryptedData), (c) => c.charCodeAt(0))
    );
  
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      key,
      encryptedDataUint8
    );
  
    return new TextDecoder().decode(decryptedData);
  }