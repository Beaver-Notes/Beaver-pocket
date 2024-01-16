export const hashStringWithWebCrypto = async (input: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
  
    const buffer = await crypto.subtle.digest('SHA-256', data);
  
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashedString = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  
    return hashedString;
  };
  