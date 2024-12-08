const crypto = require('crypto');

// Generate a key from the user's hashed password
const deriveKey = (hashedPassword) => {
    return crypto.createHash('sha256').update(hashedPassword).digest();
};

// Encrypt file content
const encryptContent = (content, hashedPassword) => {
    const key = deriveKey(hashedPassword);
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encrypted = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
};

// Decrypt file content
const decryptContent = (encryptedData, ivHex, hashedPassword) => {
    const key = deriveKey(hashedPassword);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
};

module.exports = { encryptContent, decryptContent };