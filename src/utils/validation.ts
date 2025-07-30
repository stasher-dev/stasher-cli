/**
 * Validation utilities used across all CLI commands
 */
// UUID v4 format validation (used by destash and unstash)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Base64 validation - strengthened to prevent false positives
const BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
// Stash format (uuid:key) validation  
const STASH_FORMAT_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([A-Za-z0-9+/=]+)$/i;
export interface StashParseResult {
  success: boolean;
  error?: string;
  data?: { id: string; key: string };
}

/**
 * Validate UUID format (used by unstash and destash)
 */
export function validateUUID(uuid: string): boolean {
    return UUID_REGEX.test(uuid);
}
/**
 * Validate base64 string format
 */
export function validateBase64(input: string): boolean {
    if (!BASE64_REGEX.test(input)) {
        return false;
    }
    // Additional check: base64 length should be multiple of 4 (with padding)
    return input.length % 4 === 0;
}

/**
 * Validate and parse stash format (uuid:key) used by destash
 */
export function validateAndParseStashFormat(input: string): StashParseResult {
    if (typeof input !== 'string') {
        return { success: false, error: 'Stash token must be a string' };
    }
    if (!input.trim()) {
        return { success: false, error: 'Stash token is empty' };
    }
    const match = input.match(STASH_FORMAT_REGEX);
    if (!match) {
        if (!input.includes(':')) {
            return { success: false, error: 'Missing colon separator. Expected format: uuid:base64key' };
        }
        const parts = input.split(':');
        if (parts.length !== 2) {
            return { success: false, error: 'Invalid format. Expected exactly one colon separator' };
        }
        const [id, key] = parts;
        if (!validateUUID(id)) {
            return { success: false, error: 'Invalid uuid format' };
        }
        if (!key) {
            return { success: false, error: 'Missing base64 key after colon' };
        }
        return { success: false, error: 'Invalid stash token format' };
    }
    const [, id, key] = match;
    // Additional validation: ensure key is valid base64
    if (!validateBase64(key)) {
        return { success: false, error: 'Invalid base64 key format' };
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
export function validateSecretLength(secret: string, maxLength: number = 100000): boolean {
    return typeof secret === 'string' && secret.length > 0 && secret.length <= maxLength;
}

/**
 * Validate that secret is not just whitespace
 */
export function validateSecretContent(secret: string): boolean {
    return typeof secret === 'string' && secret.trim().length > 0;
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
    // First try to parse as full stash format
    const stashParsed = validateAndParseStashFormat(input);
    if (stashParsed.success) {
        return stashParsed.data!.id;
    }
    // Then try as direct UUID
    if (validateUUID(input)) {
        return input;
    }
    return null;
}
