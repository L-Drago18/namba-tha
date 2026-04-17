import CryptoJS from 'crypto-js';

export const encryptMessage = (text: string, secretKey: string) => {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
};

export const decryptMessage = (ciphertext: string, secretKey: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "[Decryption Failed]";
  }
};

// Generate a random key for the session if needed
export const generateKey = () => CryptoJS.lib.WordArray.random(32).toString();
