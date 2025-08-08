/**
 * Validation utilities used across all CLI commands
 */
import { KEY_LENGTH, MAX_SECRET_LENGTH } from './constants';

// UUID v4 format validation (used by destash and unstash)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Base64/Base64url validation - accepts both standard and URL-safe variants
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
// Tightened base64url regex - requires at least one character
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;
// Stash format (uuid:key) validation - accepts both base64 and base64url keys
const STASH_FORMAT_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([A-Za-z0-9+/=_-]+)$/i;

/**
 * Compute decoded length of base64/base64url string without allocation
 * Works for both standard base64 (with =) and base64url (unpadded)
 */
function decodedLenB64Any(s: string): number {
    const len = s.length;
    // If there is '=' padding, use actual padding count
    if (s.includes('=')) {
        const padChars = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
        // length must be multiple of 4 for standard base64
        if (len % 4 !== 0) return -1; // invalid length
        return (len / 4) * 3 - padChars;
    }
    // Unpadded (base64url or unpadded base64): compute as-if padded
    const mod = len % 4;
    const addPad = mod ? 4 - mod : 0; // 0..3
    return Math.floor(((len + addPad) * 3) / 4) - addPad;
}
export type StashParseResult =
  | { success: true; data: { id: string; key: string } }
  | { success: false; error: string };

/**
 * Validate UUID format (used by unstash and destash)
 */
export function validateUUID(uuid: string): boolean {
    return UUID_REGEX.test(uuid);
}
/**
 * Validate base64/base64url string format
 * Accepts both standard base64 and URL-safe base64url
 * Rejects empty strings
 */
export function validateBase64(input: string): boolean {
    if (!input || input.length === 0) {
        return false;
    }
    
    // Check base64url (unpadded) first
    if (BASE64URL_REGEX.test(input)) {
        return true;
    }
    // Check standard base64 (with padding)
    if (!BASE64_REGEX.test(input)) {
        return false;
    }
    // Standard base64 length should be multiple of 4 (with padding)
    return input.length % 4 === 0;
}

/**
 * Validate and parse stash format (uuid:key) used by destash
 */
export function validateAndParseStashFormat(input: string): StashParseResult {
    if (typeof input !== 'string') {
        return { success: false, error: 'Stash token must be a string' };
    }
    const s = input.trim();
    if (!s) {
        return { success: false, error: 'Stash token is empty' };
    }
    
    const match = s.match(STASH_FORMAT_REGEX);
    if (!match) {
        if (!s.includes(':')) {
            return { success: false, error: 'Missing colon separator. Expected format: uuid:base64urlkey' };
        }
        const [id, key] = s.split(':', 2);
        if (!validateUUID(id)) {
            return { success: false, error: 'Invalid uuid format' };
        }
        if (!key) {
            return { success: false, error: 'Missing key after colon' };
        }
        return { success: false, error: 'Invalid stash token format' };
    }
    
    const [, id, key] = match;
    // Additional validation: ensure key is valid base64/base64url
    if (!validateBase64(key)) {
        return { success: false, error: 'Invalid base64url key' };
    }
    
    // Fast-fail on impossible key lengths (no allocations)
    const decLen = decodedLenB64Any(key);
    if (decLen !== KEY_LENGTH) {
        return { success: false, error: `Invalid key length: expected ${KEY_LENGTH} bytes` };
    }
    
    // Only now normalize + decode to verify the base64 is well-formed
    let padded = key.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) {
        padded += '=';
    }
    
    try {
        Buffer.from(padded, 'base64'); // throws if truly malformed
    } catch {
        return { success: false, error: 'Invalid base64/base64url key' };
    }
    
    return { success: true, data: { id, key } };
}
/**
 * Legacy function for backward compatibility - returns null on error
 */
export function parseStashFormat(input: string): { id: string; key: string } | null {
    const result = validateAndParseStashFormat(input);
    return result.success ? result.data! : null;
}

/**
 * Validate secret length for enstash (prevent overly large secrets)
 */
export function validateSecretLength(secret: string, maxLength: number = MAX_SECRET_LENGTH): boolean {
    return typeof secret === 'string' && secret.length > 0 && secret.length <= maxLength;
}

/**
 * Validate that secret is not just whitespace
 */
export function validateSecretContent(secret: string): boolean {
    return typeof secret === 'string' && secret.trim().length > 0;
}

/**
 * Validate secret buffer length for enstash (prevent overly large secrets)
 */
export function validateSecretBufferLength(secretBuffer: Buffer, maxLength: number = MAX_SECRET_LENGTH): boolean {
    return Buffer.isBuffer(secretBuffer) && secretBuffer.length > 0 && secretBuffer.length <= maxLength;
}

/**
 * Validate that secret buffer is not just whitespace when converted to string
 */
export function validateSecretBufferContent(secretBuffer: Buffer): boolean {
    if (!Buffer.isBuffer(secretBuffer) || secretBuffer.length === 0) {
        return false;
    }
    // Convert to string for whitespace check, but only temporarily
    const str = secretBuffer.toString('utf8');
    return str.trim().length > 0;
}

/**
 * Validate stash token format (uuid:key)
 * Explicit helper for clearer callsites
 */
export function validateStashToken(token: string): boolean {
    const result = validateAndParseStashFormat(token);
    return result.success;
}

/**
 * Extract UUID from either full stash format (uuid:key) or just UUID
 */
export function extractUUID(input: string): string | null {
    const s = typeof input === 'string' ? input.trim() : '';
    // First try to parse as full stash format
    const stashParsed = validateAndParseStashFormat(s);
    if (stashParsed.success) {
        return stashParsed.data.id;
    }
    // Then try as direct UUID
    return validateUUID(s) ? s : null;
}
