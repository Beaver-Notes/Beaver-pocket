export const base64ToBlob = (base64String: string, type: string): Blob => {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: type });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const blobToString = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      console.error("[ERROR] FileReader failed:", reader.error);
      reject(new Error("Failed to read Blob as string."));
    };
    reader.readAsText(blob);
  });
};

export const base64Encode = (str: string): string => {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  } catch (error) {
    console.error("[ERROR] Failed to encode string to base64:", error);
    throw error;
  }
};
