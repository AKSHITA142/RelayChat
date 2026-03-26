import { config } from "../config";

const RSA_ALGORITHM = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const AES_ALGORITHM = "AES-GCM";
const AES_IV_LENGTH = 12;
const MESSAGE_VERSION = 1;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const importedPublicKeyCache = new Map();
const importedPrivateKeyCache = new Map();
const decryptedAttachmentCache = new Map();
const DEVICE_ID_STORAGE_KEY = "relaychat-e2ee-device-id";
const HISTORY_SYNC_NEEDED_PREFIX = "relaychat-history-sync-needed-";

const getPrivateKeyStorageKey = (userId) => `relaychat-e2ee-private-key-${userId}`;
const getPublicKeyStorageKey = (userId) => `relaychat-e2ee-public-key-${userId}`;
const E2EE_PUBLIC_KEY_PREFIX = "relaychat-e2ee-public-key-";
const E2EE_PRIVATE_KEY_PREFIX = "relaychat-e2ee-private-key-";
const getCurrentDeviceId = () => {
  const existingDeviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existingDeviceId) return existingDeviceId;

  const newDeviceId = window.crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, newDeviceId);
  return newDeviceId;
};

const getHistorySyncNeededStorageKey = (userId, deviceId = getCurrentDeviceId()) =>
  `${HISTORY_SYNC_NEEDED_PREFIX}${userId}-${deviceId}`;

const getCurrentDeviceLabel = () => `${navigator.platform || "Browser"} - ${navigator.userAgent.includes("Mobile") ? "Mobile" : "Browser"}`;

const toBase64 = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
};

const fromBase64 = (base64) => {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

const generateIdentityKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(RSA_ALGORITHM, true, ["encrypt", "decrypt"]);
  const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKey, privateKey };
};

const getStoredKeyPair = (userId) => {
  const storedPrivateKey = localStorage.getItem(getPrivateKeyStorageKey(userId));
  const storedPublicKey = localStorage.getItem(getPublicKeyStorageKey(userId));

  if (storedPrivateKey && storedPublicKey) {
    return {
      publicKey: JSON.parse(storedPublicKey),
      privateKey: JSON.parse(storedPrivateKey),
    };
  }

  return null;
};

const cloneStoredKeyPairToUser = (sourceUserId, targetUserId) => {
  const sourcePrivateKey = localStorage.getItem(getPrivateKeyStorageKey(sourceUserId));
  const sourcePublicKey = localStorage.getItem(getPublicKeyStorageKey(sourceUserId));

  if (!sourcePrivateKey || !sourcePublicKey) {
    return null;
  }

  localStorage.setItem(getPrivateKeyStorageKey(targetUserId), sourcePrivateKey);
  localStorage.setItem(getPublicKeyStorageKey(targetUserId), sourcePublicKey);

  return {
    publicKey: JSON.parse(sourcePublicKey),
    privateKey: JSON.parse(sourcePrivateKey),
  };
};

const findStoredKeyPairByPublicKey = (expectedPublicKey) => {
  const expectedPublicKeyJson = JSON.stringify(expectedPublicKey);

  for (let index = 0; index < localStorage.length; index += 1) {
    const storageKey = localStorage.key(index);
    if (!storageKey?.startsWith(E2EE_PUBLIC_KEY_PREFIX)) {
      continue;
    }

    const storedPublicKeyJson = localStorage.getItem(storageKey);
    if (storedPublicKeyJson !== expectedPublicKeyJson) {
      continue;
    }

    const sourceUserId = storageKey.slice(E2EE_PUBLIC_KEY_PREFIX.length);
    const storedPrivateKeyJson = localStorage.getItem(`${E2EE_PRIVATE_KEY_PREFIX}${sourceUserId}`);
    if (!storedPrivateKeyJson) {
      continue;
    }

    return {
      sourceUserId,
      publicKey: JSON.parse(storedPublicKeyJson),
      privateKey: JSON.parse(storedPrivateKeyJson),
    };
  }

  return null;
};

export const ensureIdentityKeyPair = async (userId, expectedPublicKey = null) => {
  const storedKeyPair = getStoredKeyPair(userId);
  if (storedKeyPair) {
    if (!expectedPublicKey || JSON.stringify(storedKeyPair.publicKey) === JSON.stringify(expectedPublicKey)) {
      return storedKeyPair;
    }
  }

  if (expectedPublicKey) {
    const matchingStoredKeyPair = findStoredKeyPairByPublicKey(expectedPublicKey);
    if (matchingStoredKeyPair) {
      return cloneStoredKeyPairToUser(matchingStoredKeyPair.sourceUserId, userId);
    }

    throw new Error("This device is missing the original encryption key for this account");
  }

  const keyPair = await generateIdentityKeyPair();
  localStorage.setItem(getPrivateKeyStorageKey(userId), JSON.stringify(keyPair.privateKey));
  localStorage.setItem(getPublicKeyStorageKey(userId), JSON.stringify(keyPair.publicKey));
  return keyPair;
};

export const ensureE2EERegistration = async (apiClient, user) => {
  if (!user?._id) return null;
  const currentDeviceId = getCurrentDeviceId();
  const knownDevices = Array.isArray(user.encryptionDevices) ? user.encryptionDevices : [];
  const currentRegisteredDevice = knownDevices.find((device) => device.deviceId === currentDeviceId);

  if (currentRegisteredDevice?.publicKey) {
    const { publicKey } = await ensureIdentityKeyPair(user._id, currentRegisteredDevice.publicKey);
    const updatedUser = {
      ...user,
      encryptionPublicKey: publicKey,
      encryptionDevices: knownDevices,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  }

  if (user.encryptionPublicKey && knownDevices.length === 0) {
    const { publicKey } = await ensureIdentityKeyPair(user._id, user.encryptionPublicKey);
    const response = await apiClient.post("/user/encryption-key", {
      publicKey,
      deviceId: currentDeviceId,
      deviceLabel: getCurrentDeviceLabel(),
    });
    const updatedUser = {
      ...user,
      encryptionPublicKey: response.data.user?.encryptionPublicKey || publicKey,
      encryptionDevices: response.data.user?.encryptionDevices || [
        { deviceId: currentDeviceId, publicKey, label: getCurrentDeviceLabel() }
      ],
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  }

  const { publicKey } = await ensureIdentityKeyPair(user._id);
  const response = await apiClient.post("/user/encryption-key", {
    publicKey,
    deviceId: currentDeviceId,
    deviceLabel: getCurrentDeviceLabel(),
  });
  localStorage.setItem(getHistorySyncNeededStorageKey(user._id, currentDeviceId), "true");
  const updatedUser = {
    ...user,
    encryptionPublicKey: response.data.user?.encryptionPublicKey || publicKey,
    encryptionDevices: response.data.user?.encryptionDevices || [
      { deviceId: currentDeviceId, publicKey, label: getCurrentDeviceLabel() }
    ],
  };
  localStorage.setItem("user", JSON.stringify(updatedUser));
  return updatedUser;

};

const importPublicKey = async (publicKeyJwk) => {
  const cacheKey = JSON.stringify(publicKeyJwk);
  if (importedPublicKeyCache.has(cacheKey)) {
    return importedPublicKeyCache.get(cacheKey);
  }

  const importedKey = await window.crypto.subtle.importKey("jwk", publicKeyJwk, RSA_ALGORITHM, true, ["encrypt"]);
  importedPublicKeyCache.set(cacheKey, importedKey);
  return importedKey;
};

const importPrivateKey = async (privateKeyJwk) => {
  const cacheKey = JSON.stringify(privateKeyJwk);
  if (importedPrivateKeyCache.has(cacheKey)) {
    return importedPrivateKeyCache.get(cacheKey);
  }

  const importedKey = await window.crypto.subtle.importKey("jwk", privateKeyJwk, RSA_ALGORITHM, true, ["decrypt"]);
  importedPrivateKeyCache.set(cacheKey, importedKey);
  return importedKey;
};

const importAesKey = async (rawKey, usages) => (
  window.crypto.subtle.importKey("raw", rawKey, { name: AES_ALGORITHM }, false, usages)
);

const wrapAesKeyForRecipients = async (rawAesKey, recipients) => Promise.all(
  recipients.map(async ({ userId, deviceId, publicKey }) => {
    const wrappedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await importPublicKey(publicKey),
      rawAesKey
    );

    return {
      userId,
      deviceId,
      key: toBase64(wrappedKey),
    };
  })
);

export const encryptDirectMessage = async ({ content, recipients }) => {
  const aesKey = await window.crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    textEncoder.encode(content)
  );

  const encryptedKeys = await wrapAesKeyForRecipients(rawAesKey, recipients);

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv.buffer),
    algorithm: AES_ALGORITHM,
    version: MESSAGE_VERSION,
    encryptedKeys,
  };
};

export const encryptGroupMessage = async ({ content, recipients }) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("No group recipients available for encryption");
  }

  const aesKey = await window.crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    textEncoder.encode(content)
  );
  const encryptedKeys = await wrapAesKeyForRecipients(rawAesKey, recipients);

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv.buffer),
    algorithm: AES_ALGORITHM,
    version: MESSAGE_VERSION,
    encryptedKeys,
  };
};

const decryptWrappedContentKeyForUser = async (message, currentUserId) => {
  const storedPrivateKey = localStorage.getItem(getPrivateKeyStorageKey(currentUserId));
  if (!storedPrivateKey) {
    throw new Error("Missing local encryption private key");
  }

  const currentDeviceId = getCurrentDeviceId();
  const allUserEntries = (message?.encryptedContent?.encryptedKeys || []).filter((entry) => {
    const entryUserId = entry?.userId?._id || entry?.userId;
    return entryUserId?.toString() === currentUserId.toString();
  });

  if (allUserEntries.length === 0) {
    throw new Error("No encrypted message key available for this user");
  }

  const privateKey = await importPrivateKey(JSON.parse(storedPrivateKey));
  
  // First try the exact device match
  const exactMatch = allUserEntries.find(entry => !entry?.deviceId || entry.deviceId === currentDeviceId);
  if (exactMatch) {
    try {
      return await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromBase64(exactMatch.key));
    } catch (err) {
      // Fallback
    }
  }

  // Fallback: try all keys (for cloud backup restores where deviceId changed)
  for (const entry of allUserEntries) {
    try {
      return await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromBase64(entry.key));
    } catch (err) {
      continue;
    }
  }

  throw new Error("Failed to decrypt message key with the current private key");
};

export const decryptDirectMessage = async (message, currentUserId) => {
  if (!message?.encryptedContent?.ciphertext || !currentUserId) {
    return message?.content || "";
  }

  const rawAesKey = await decryptWrappedContentKeyForUser(message, currentUserId);

  const aesKey = await importAesKey(rawAesKey, ["decrypt"]);
  const plaintext = await window.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: new Uint8Array(fromBase64(message.encryptedContent.iv)) },
    aesKey,
    fromBase64(message.encryptedContent.ciphertext)
  );

  return textDecoder.decode(plaintext);
};

export const hydrateDecryptedMessage = async (message, currentUserId) => {
  if (!message?.encryptedContent?.ciphertext) {
    return message;
  }

  try {
    const content = await decryptDirectMessage(message, currentUserId);
    return {
      ...message,
      content,
      isEncrypted: true,
    };
  } catch (error) {
    console.error("Failed to decrypt message:", error);
    return {
      ...message,
      content: "[Unable to decrypt message]",
      isEncrypted: true,
      encryptionError: true,
    };
  }
};

export const hydrateChatPreview = async (chat, currentUserId) => {
  if (!chat?.lastMessage?.encryptedContent?.ciphertext) {
    return chat;
  }

  return {
    ...chat,
    lastMessage: await hydrateDecryptedMessage(chat.lastMessage, currentUserId),
  };
};

export const encryptAttachmentFile = async ({
  file,
  recipients,
}) => {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("No attachment recipients available for encryption");
  }

  const aesKey = await window.crypto.subtle.generateKey(
    { name: AES_ALGORITHM, length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const fileBuffer = await file.arrayBuffer();
  const encryptedFileBuffer = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    aesKey,
    fileBuffer
  );
  const metadataIv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  const metadataCiphertext = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv: metadataIv },
    aesKey,
    textEncoder.encode(JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    }))
  );
  const encryptedKeys = await wrapAesKeyForRecipients(rawAesKey, recipients);

  return {
    encryptedFile: new File(
      [encryptedFileBuffer],
      `enc-${Date.now()}-${window.crypto.randomUUID()}.bin`,
      { type: "application/octet-stream" }
    ),
    metadata: {
      iv: toBase64(iv.buffer),
      metadataIv: toBase64(metadataIv.buffer),
      metadataCiphertext: toBase64(metadataCiphertext),
      algorithm: AES_ALGORITHM,
      version: MESSAGE_VERSION,
      size: file.size,
      encryptedKeys,
    }
  };
};

const decryptWrappedKeyForUser = async (encryptedKeys, currentUserId) => {
  const storedPrivateKey = localStorage.getItem(getPrivateKeyStorageKey(currentUserId));
  if (!storedPrivateKey) {
    throw new Error("Missing local encryption private key");
  }

  const currentDeviceId = getCurrentDeviceId();
  const allUserEntries = (encryptedKeys || []).filter((entry) => {
    const entryUserId = entry?.userId?._id || entry?.userId;
    return entryUserId?.toString() === currentUserId.toString();
  });

  if (allUserEntries.length === 0) {
    throw new Error("No encrypted attachment key available for this user");
  }

  const privateKey = await importPrivateKey(JSON.parse(storedPrivateKey));

  // First try the exact device match
  const exactMatch = allUserEntries.find(entry => !entry?.deviceId || entry.deviceId === currentDeviceId);
  if (exactMatch) {
    try {
      return await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromBase64(exactMatch.key));
    } catch (err) {
      // Fallback
    }
  }

  // Fallback: Try all keys
  for (const entry of allUserEntries) {
    try {
      return await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromBase64(entry.key));
    } catch (err) {
      continue;
    }
  }

  throw new Error("Failed to decrypt attachment key with the current private key");
};

export const getDecryptedAttachmentData = async (message, currentUserId) => {
  if (!message?.encryptedFile?.iv || !message?.fileUrl) {
    return message?.fileUrl ? {
      url: config.endpoints.files(message.fileUrl),
      fileName: message.fileName || "Attachment",
      mimeType: message.fileType || "application/octet-stream",
    } : null;
  }

  const cacheKey = `${message._id}:${message.updatedAt || message.createdAt || ""}`;
  if (decryptedAttachmentCache.has(cacheKey)) {
    return decryptedAttachmentCache.get(cacheKey);
  }

  const rawAesKey = await decryptWrappedKeyForUser(message.encryptedFile.encryptedKeys, currentUserId);
  const aesKey = await importAesKey(rawAesKey, ["decrypt"]);
  const response = await fetch(config.endpoints.files(message.fileUrl));
  const encryptedFileBuffer = await response.arrayBuffer();
  const decryptedFileBuffer = await window.crypto.subtle.decrypt(
    { name: AES_ALGORITHM, iv: new Uint8Array(fromBase64(message.encryptedFile.iv)) },
    aesKey,
    encryptedFileBuffer
  );

  let decryptedMetadata = {
    fileName: message.fileName || "Attachment",
    mimeType: message.fileType || "application/octet-stream",
  };

  if (message.encryptedFile.metadataCiphertext && message.encryptedFile.metadataIv) {
    const metadataPlaintext = await window.crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: new Uint8Array(fromBase64(message.encryptedFile.metadataIv)) },
      aesKey,
      fromBase64(message.encryptedFile.metadataCiphertext)
    );
    decryptedMetadata = JSON.parse(textDecoder.decode(metadataPlaintext));
  }

  const blob = new Blob([decryptedFileBuffer], {
    type: decryptedMetadata.mimeType || "application/octet-stream"
  });
  const attachmentData = {
    url: URL.createObjectURL(blob),
    fileName: decryptedMetadata.fileName || "Attachment",
    mimeType: decryptedMetadata.mimeType || "application/octet-stream",
    size: decryptedMetadata.size || message.encryptedFile.size || blob.size,
  };
  decryptedAttachmentCache.set(cacheKey, attachmentData);
  return attachmentData;
};

export const buildHistorySyncUpdate = async ({
  message,
  currentUserId,
  targetUserId,
  targetDeviceId,
  targetPublicKey,
}) => {
  const syncUpdate = {
    messageId: message?._id,
  };

  if (message?.encryptedContent?.ciphertext) {
    const rawMessageKey = await decryptWrappedContentKeyForUser(message, currentUserId);
    const wrappedMessageKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await importPublicKey(targetPublicKey),
      rawMessageKey
    );

    syncUpdate.encryptedContentKey = {
      userId: targetUserId,
      deviceId: targetDeviceId,
      key: toBase64(wrappedMessageKey),
    };
  }

  if (message?.encryptedFile?.iv) {
    const rawAttachmentKey = await decryptWrappedKeyForUser(message.encryptedFile.encryptedKeys, currentUserId);
    const wrappedAttachmentKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await importPublicKey(targetPublicKey),
      rawAttachmentKey
    );

    syncUpdate.encryptedFileKey = {
      userId: targetUserId,
      deviceId: targetDeviceId,
      key: toBase64(wrappedAttachmentKey),
    };
  }

  if (!syncUpdate.encryptedContentKey && !syncUpdate.encryptedFileKey) {
    return null;
  }

  return syncUpdate;
};

export const buildDeviceRecipients = (users = []) => (
  users.flatMap((user) => {
    const userId = user?._id || user?.userId || user?.id;
    if (!userId) return [];

    if (Array.isArray(user.encryptionDevices) && user.encryptionDevices.length > 0) {
      return user.encryptionDevices
        .filter((device) => device?.publicKey && device?.deviceId)
        .map((device) => ({
          userId,
          deviceId: device.deviceId,
          publicKey: device.publicKey,
        }));
    }

    if (user.encryptionPublicKey) {
      return [{
        userId,
        deviceId: `legacy-${userId}`,
        publicKey: user.encryptionPublicKey,
      }];
    }

    return [];
  })
);

export const needsHistorySync = (userId) => localStorage.getItem(getHistorySyncNeededStorageKey(userId)) === "true";
export const markHistorySyncComplete = (userId) => localStorage.removeItem(getHistorySyncNeededStorageKey(userId));

const deriveKeyFromPin = async (pin, saltStr) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = saltStr ? new Uint8Array(fromBase64(saltStr)) : window.crypto.getRandomValues(new Uint8Array(16));

  const key = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  return { key, salt: saltStr ? saltStr : toBase64(salt.buffer) };
};

export const backupPrivateKeyToCloud = async (apiClient, userId, pin) => {
  const storedPrivateKey = localStorage.getItem(getPrivateKeyStorageKey(userId));
  if (!storedPrivateKey) throw new Error("No local private key to backup");

  const { key, salt } = await deriveKeyFromPin(pin);
  const iv = window.crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH));
  
  const enc = new TextEncoder();
  const encryptedFileBuffer = await window.crypto.subtle.encrypt(
    { name: AES_ALGORITHM, iv },
    key,
    enc.encode(storedPrivateKey)
  );

  await apiClient.post("/user/backup", {
    encryptedKey: toBase64(encryptedFileBuffer),
    salt,
    iv: toBase64(iv.buffer)
  });
};

export const restorePrivateKeyFromCloud = async (apiClient, userId, pin) => {
  const response = await apiClient.get("/user/backup");
  const { encryptedKey, salt, iv } = response.data;
  
  const { key } = await deriveKeyFromPin(pin, salt);
  
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: AES_ALGORITHM, iv: new Uint8Array(fromBase64(iv)) },
      key,
      fromBase64(encryptedKey)
    );
    const dec = new TextDecoder();
    const privateKeyStr = dec.decode(decryptedBuffer);
    
    // Verify valid JSON
    const privateKeyJwk = JSON.parse(privateKeyStr);
    
    // Reconstruct the public key JWK from the private key components
    const publicKeyJwk = {
      kty: privateKeyJwk.kty || "RSA",
      n: privateKeyJwk.n,
      e: privateKeyJwk.e,
      alg: privateKeyJwk.alg || "RSA-OAEP-256",
      ext: true,
      key_ops: ["encrypt"]
    };
    
    localStorage.setItem(getPrivateKeyStorageKey(userId), privateKeyStr);
    localStorage.setItem(getPublicKeyStorageKey(userId), JSON.stringify(publicKeyJwk));
    
    // Also, if there are old history sync requests, clear them so it doesn't block the UI
    const currentDeviceId = getCurrentDeviceId();
    localStorage.removeItem(getHistorySyncNeededStorageKey(userId, currentDeviceId));
    
    // Make sure we also have a device id if we need to fake one or keep the existing
    return true;
  } catch (err) {
    throw new Error("Invalid password or corrupted backup");
  }
};

export { getCurrentDeviceId, getCurrentDeviceLabel };
