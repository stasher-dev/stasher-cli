/**
 * Shared constants across the CLI application
 */

// Size limits
export const MAX_SECRET_LENGTH = 4096; // 4KB plaintext
export const MAX_PAYLOAD_SIZE = 10 * 1024; // 10KB encrypted JSON

// Timeout values
export const STDIN_TIMEOUT = 30000; // 30 second stdin timeout

// API configuration
export const DEFAULT_API_BASE_URL = 'https://api.stasher.dev';

// Cryptographic constants
export const KEY_LENGTH = 32; // 256-bit key
export const IV_LENGTH = 12; // 96-bit IV for GCM
export const TAG_LENGTH = 16; // 128-bit auth tag
