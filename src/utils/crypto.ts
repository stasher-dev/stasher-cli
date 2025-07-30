import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { KEY_LENGTH, IV_LENGTH, TAG_LENGTH } from './constants';

export interface EncryptionResult {
  key: Buffer;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
}

export interface PayloadStructure {
  iv: string;
  tag: string;
  ciphertext: string;
}

export interface StashTokenParts {
  id: string;
  key: Buffer;
}
/**
 * Helper function to zero out sensitive buffers
 * Callers are responsible for zeroing encryption keys, ciphertext, etc.
 */
export function zeroBuffer(buf: Buffer): void {
    buf.fill(0);
}

/**
 * Helper function to encode key as base64 string
 * Prevents accidental UTF-8 encoding with .toString()
 */
export function encodeKey(key: Buffer): string {
    return key.toString('base64');
}

/**
 * Format a complete stash token (id:base64key)
 * Encapsulates the standard token format used throughout the CLI
 */
export function formatStashToken(id: string, key: Buffer): string {
    return `${id}:${encodeKey(key)}`;
}
/**
 * Encode payload as JSON string for HTTP requests
 * Centralizes payload serialization logic
 */
export function encodePayload(payload: PayloadStructure): string {
    return JSON.stringify(payload);
}

/**
 * Decode JSON string back to payload object
 * Useful for token inspection or offline processing
 */
export function parsePayload(encoded: string): PayloadStructure {
    return JSON.parse(encoded);
}
/**
 * Encrypt a secret using AES-256-GCM
 * NOTE: Callers must zero out returned buffers (key, iv, ciphertext, tag)
 */
export function encrypt(secret: string): EncryptionResult {
    // Generate key and IV using defined constants
    const key = randomBytes(KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Encrypt using AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update(secret, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return { key, iv, ciphertext, tag };
}
export function createPayload(result: EncryptionResult): PayloadStructure {
    return {
        iv: result.iv.toString('base64'),
        tag: result.tag.toString('base64'),
        ciphertext: result.ciphertext.toString('base64')
    };
}
/**
 * Decrypt payload using AES-256-GCM
 * NOTE: Callers must zero out input buffers and returned buffer
 */
export function decrypt(payload: PayloadStructure, key: Buffer): string {
    // Convert base64 strings back to buffers
    const iv = Buffer.from(payload.iv, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    
    // Validate cryptographic component lengths
    if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV length: must be ${IV_LENGTH} bytes`);
    }
    if (tag.length !== TAG_LENGTH) {
        throw new Error(`Invalid auth tag length: must be ${TAG_LENGTH} bytes`);
    }
    if (key.length !== KEY_LENGTH) {
        throw new Error(`Invalid key length: must be ${KEY_LENGTH} bytes`);
    }
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
}

/**
 * Decode a stash token (uuid:base64key) and return the components
 */
export function decodeStashToken(token: string): StashTokenParts {
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) {
        throw new Error('Invalid token format: missing colon separator');
    }
    
    const id = token.substring(0, colonIndex);
    const keyBase64 = token.substring(colonIndex + 1);
    const key = Buffer.from(keyBase64, 'base64');
    
    return { id, key };
}
