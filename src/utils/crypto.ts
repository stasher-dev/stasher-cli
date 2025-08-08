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
 * Safely handles null/undefined buffers without throwing
 */
export function zeroBuffer(buf?: Buffer | null): void {
    if (buf && buf.length) buf.fill(0);
}

/**
 * Convert Buffer to base64url string (unpadded)
 * Uses base64url for terminal/URL safety (no +/= characters)
 */
function toBase64Url(b: Buffer): string {
    return b.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''); // Remove padding
}

/**
 * Helper function to encode key as base64url string (unpadded)
 * Uses base64url for terminal/URL safety (no +/= characters)
 */
export function encodeKey(key: Buffer): string {
    return toBase64Url(key);
}

/**
 * Format a complete stash token (id:base64urlkey)
 * Uses base64url encoding for terminal/URL safety
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
 * Decode base64url to Buffer
 * Since we now consistently emit base64url, no need to handle mixed content
 */
function decodeBase64Url(input: string): Buffer {
    // Add padding and decode base64url
    let padded = input;
    while (padded.length % 4) {
        padded += '=';
    }
    const normalized = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(normalized, 'base64');
}

/**
 * Validate base64url string format and check decoded byte length
 * Returns the decoded length without creating a Buffer copy
 */
function validateBase64AndGetLength(input: string, expectedLength?: number): number {
    if (typeof input !== 'string' || !input) {
        throw new Error('Base64url field must be a non-empty string');
    }
    
    // Validate base64url format (only URL-safe characters)
    if (!/^[A-Za-z0-9_-]*$/.test(input)) {
        throw new Error('Invalid base64url format');
    }
    
    // Calculate decoded length for base64url (add padding for calculation)
    let paddedLength = input.length;
    while (paddedLength % 4) {
        paddedLength++;
    }
    const decodedLength = Math.floor(paddedLength * 3 / 4) - 
        (paddedLength - input.length); // Subtract added padding
    
    if (expectedLength !== undefined && decodedLength !== expectedLength) {
        throw new Error(`Invalid decoded length: expected ${expectedLength} bytes, got ${decodedLength} bytes`);
    }
    
    return decodedLength;
}

/**
 * Decode JSON string back to payload object with strict validation
 * Validates field existence, base64url format, and exact byte lengths
 */
export function parsePayload(encoded: string): PayloadStructure {
    const parsed = JSON.parse(encoded);
    
    // Validate object structure
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Payload must be an object');
    }
    
    // Check required fields exist and are strings
    const requiredFields = ['iv', 'tag', 'ciphertext'];
    for (const field of requiredFields) {
        if (!(field in parsed)) {
            throw new Error(`Missing required field: ${field}`);
        }
        if (typeof parsed[field] !== 'string') {
            throw new Error(`Field ${field} must be a string`);
        }
    }
    
    // Validate base64url format and exact byte lengths
    validateBase64AndGetLength(parsed.iv, IV_LENGTH);
    validateBase64AndGetLength(parsed.tag, TAG_LENGTH);
    const ciphertextLength = validateBase64AndGetLength(parsed.ciphertext);
    
    if (ciphertextLength === 0) {
        throw new Error('Ciphertext cannot be empty');
    }
    
    return {
        iv: parsed.iv,
        tag: parsed.tag,
        ciphertext: parsed.ciphertext
    };
}
/**
 * Encrypt a secret using AES-256-GCM
 * NOTE: Callers must zero out returned buffers (key, iv, ciphertext, tag)
 * Accepts Uint8Array to minimize string copies in memory
 */
export function encrypt(secretBytes: Uint8Array): EncryptionResult {
    // Generate key and IV using defined constants
    const key = randomBytes(KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Encrypt using AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update(secretBytes);
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return { key, iv, ciphertext, tag };
}
export function createPayload(r: EncryptionResult): PayloadStructure {
    return {
        iv: toBase64Url(r.iv),
        tag: toBase64Url(r.tag),
        ciphertext: toBase64Url(r.ciphertext)
    };
}
/**
 * Decrypt payload using AES-256-GCM and return raw bytes
 * NOTE: Callers must zero out input buffers and returned buffer
 */
export function decryptToBytes(payload: PayloadStructure, key: Buffer): Buffer {
    // Validate key length first
    if (key.length !== KEY_LENGTH) {
        throw new Error(`Invalid key length: must be ${KEY_LENGTH} bytes`);
    }
    
    // Decode base64url directly to buffers (avoiding string normalization when possible)
    const iv = decodeBase64Url(payload.iv);
    const tag = decodeBase64Url(payload.tag);
    const ciphertext = decodeBase64Url(payload.ciphertext);
    
    // Validate cryptographic component lengths after decoding
    if (iv.length !== IV_LENGTH) {
        throw new Error(`Invalid IV length: must be ${IV_LENGTH} bytes`);
    }
    if (tag.length !== TAG_LENGTH) {
        throw new Error(`Invalid auth tag length: must be ${TAG_LENGTH} bytes`);
    }
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext);
    // Buffer.concat is required here for Node.js crypto API
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
}

/**
 * Decrypt payload using AES-256-GCM and return UTF-8 string
 * NOTE: Callers must zero out input buffers
 * Always wipes decrypted bytes, even if toString() throws
 */
export function decrypt(payload: PayloadStructure, key: Buffer): string {
    const buf = decryptToBytes(payload, key);
    try {
        return buf.toString('utf8');
    } finally {
        zeroBuffer(buf);
    }
}

/**
 * Decode a stash token (uuid:base64urlkey) and return the components
 * Accepts both base64url (preferred) and standard base64 for compatibility
 * Validates key length early to provide clear error messages
 */
export function decodeStashToken(token: string): StashTokenParts {
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) {
        throw new Error('Invalid stash token format: missing colon separator');
    }
    
    const id = token.substring(0, colonIndex).trim();
    let keyEncoded = token.substring(colonIndex + 1).trim();
    
    const key = decodeBase64Url(keyEncoded);
    
    // Validate key length early to catch truncated keys
    if (key.length !== KEY_LENGTH) {
        throw new Error(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length} bytes`);
    }
    
    return { id, key };
}
