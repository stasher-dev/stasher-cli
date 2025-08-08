import { Command } from 'commander';
import { loadEnvConfig } from '../utils/config';
import { decodeStashToken, decrypt, parsePayload, zeroBuffer } from '../utils/crypto';
import { extractUUID, validateUUID } from '../utils/validation';

/**
 * Exit codes for CI/script automation:
 * 0 = success
 * 1 = general error
 * 2 = invalid input format 
 * 3 = stash not found
 * 4 = stash expired or already consumed
 * 5 = network/timeout error
 * 6 = decryption/authentication failure
 */
function exitWithMessage(msg: string, exitCode: number = 1): never {
  console.error(msg);
  process.exit(exitCode);
}

export async function runDestash(): Promise<void> {
  const program = new Command();

  program
    .name('stasher')
    .description('Retrieve and decrypt a one-time secret from stasher.dev')
    .usage('<uuid:base64key>')
    .argument('<token>', 'The stash token in the format uuid:base64key')
    .version('1.0.0')
    .addHelpText('after', `
💡 Examples:
   destash "a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key..."
   npx destash "uuid:base64key"
    `)
    .parse();

  const rawInput = program.args[0];

  if (!rawInput) {
    exitWithMessage('No stash token provided. Expected format: uuid:base64key', 2); // Invalid input
  }

  const uuid = extractUUID(rawInput);
  if (!uuid || !validateUUID(uuid)) {
    exitWithMessage('Invalid stash token format. Expected: uuid:base64key', 2); // Invalid input
  }

  try {
    const config = loadEnvConfig();

    // Use fetch with retry for network resilience
    const { fetchWithRetry } = await import('../utils/fetch-retry');
    
    // Time-bound the request to prevent hanging
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10_000); // 10s
    const response = await fetchWithRetry(`${config.apiBaseUrl}/destash/${uuid}`, {
      method: 'GET',
      signal: ac.signal,
    });
    clearTimeout(timeout);

    if (response.status === 404) {
      exitWithMessage('Stash not found or already retrieved.', 3); // Not found
    }

    if (response.status === 410) {
      const { error } = await response.json().catch(() => ({}));
      const msg = (error === 'Expired') ? 'This stash has expired.' : 'This stash has already been consumed.';
      exitWithMessage(msg, 4); // Expired/consumed
    }

    if (!response.ok) {
      exitWithMessage(`Failed to fetch stash: HTTP ${response.status}`, 5); // Network error
    }

    const encrypted = await response.json();

    // Decode and decrypt with proper key cleanup
    let key: Buffer | undefined;
    try {
      ({ key } = decodeStashToken(rawInput));
      const payload = encrypted; // encrypted is already the parsed payload object
      const plaintext = decrypt(payload, key);
      process.stdout.write(plaintext + '\n');
    } catch (e) {
      exitWithMessage('Failed to retrieve or decrypt secret.', 6); // Decrypt/auth failure
    } finally {
      zeroBuffer(key);
    }

  } catch (error: any) {
    // Handle network/timeout errors
    if (error?.name === 'AbortError') {
      exitWithMessage('Request timed out after 10 seconds.', 5); // Network error
    }
    exitWithMessage('Failed to retrieve or decrypt secret.', 5); // Network error (general)
  }
}
