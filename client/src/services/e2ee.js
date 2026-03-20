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

const getPrivateKeyStorageKey = (userId) => `relaychat-e2ee-private-key-${userId}`;
const getPublicKeyStorageKey = (userId) => `relaychat-e2ee-public-key-${userId}`;
const E2EE_PUBLIC_KEY_PREFIX = "relaychat-e2ee-public-key-";
const E2EE_PRIVATE_KEY_PREFIX = "relaychat-e2ee-private-key-";

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

  if (user.encryptionPublicKey) {
    const { publicKey } = await ensureIdentityKeyPair(user._id, user.encryptionPublicKey);
    const updatedUser = {
      ...user,
      encryptionPublicKey: publicKey,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  }

  const { publicKey } = await ensureIdentityKeyPair(user._id);
  const localPublicKeyJson = JSON.stringify(publicKey);
  const remotePublicKeyJson = JSON.stringify(user.encryptionPublicKey || null);

  if (localPublicKeyJson !== remotePublicKeyJson) {
    const response = await apiClient.post("/user/encryption-key", { publicKey });
    const updatedUser = {
      ...user,
      encryptionPublicKey: response.data.user?.encryptionPublicKey || publicKey,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    return updatedUser;
  }

  return {
    ...user,
    encryptionPublicKey: publicKey,
  };
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
  recipients.map(async ({ userId, publicKey }) => {
    const wrappedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      await importPublicKey(publicKey),
      rawAesKey
    );

    return {
      userId,
      key: toBase64(wrappedKey),
    };
  })
);

export const encryptDirectMessage = async ({ content, senderId, recipientId, senderPublicKey, recipientPublicKey }) => {
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

  const encryptedKeys = await wrapAesKeyForRecipients(rawAesKey, [
    { userId: senderId, publicKey: senderPublicKey },
    { userId: recipientId, publicKey: recipientPublicKey },
  ]);

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

export const decryptDirectMessage = async (message, currentUserId) => {
  if (!message?.encryptedContent?.ciphertext || !currentUserId) {
    return message?.content || "";
  }

  const storedPrivateKey = localStorage.getItem(getPrivateKeyStorageKey(currentUserId));
  if (!storedPrivateKey) {
    throw new Error("Missing local encryption private key");
  }

  const encryptedKeyEntry = (message.encryptedContent.encryptedKeys || []).find((entry) => {
    const entryUserId = entry?.userId?._id || entry?.userId;
    return entryUserId?.toString() === currentUserId.toString();
  });

  if (!encryptedKeyEntry?.key) {
    throw new Error("No encrypted message key available for this user");
  }

  const privateKey = await importPrivateKey(JSON.parse(storedPrivateKey));
  const rawAesKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(encryptedKeyEntry.key)
  );

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

  const encryptedKeyEntry = (encryptedKeys || []).find((entry) => {
    const entryUserId = entry?.userId?._id || entry?.userId;
    return entryUserId?.toString() === currentUserId.toString();
  });

  if (!encryptedKeyEntry?.key) {
    throw new Error("No encrypted attachment key available for this user");
  }

  const privateKey = await importPrivateKey(JSON.parse(storedPrivateKey));
  return window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    fromBase64(encryptedKeyEntry.key)
  );
};

export const getDecryptedAttachmentData = async (message, currentUserId) => {
  if (!message?.encryptedFile?.iv || !message?.fileUrl) {
    return message?.fileUrl ? {
      url: `http://localhost:5002${message.fileUrl}`,
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
  const response = await fetch(`http://localhost:5002${message.fileUrl}`);
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
