function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value:string) {
  return Uint8Array.from(atob(value),char=>char.charCodeAt(0));
}

export async function encryptToken(token:string,keyBase64:string) {
  const keyBytes = Uint8Array.from(atob(keyBase64), char=>char.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must contain 32 bytes');
  const key = await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(token));
  return {encryptedToken:bytesToBase64(new Uint8Array(encrypted)),iv:bytesToBase64(iv)};
}

export async function decryptToken(encryptedToken:string,ivBase64:string,keyBase64:string) {
  const keyBytes = base64ToBytes(keyBase64);
  if (keyBytes.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must contain 32 bytes');
  const key = await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['decrypt']);
  const decrypted = await crypto.subtle.decrypt({name:'AES-GCM',iv:base64ToBytes(ivBase64)},key,base64ToBytes(encryptedToken));
  return new TextDecoder().decode(decrypted);
}
