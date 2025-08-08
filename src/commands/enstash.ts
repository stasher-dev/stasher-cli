import { Command } from 'commander';
import { loadEnvConfig } from '../utils/config';
import {
  encrypt,
  createPayload,
  encodePayload,
  formatStashToken,
  zeroBuffer
} from '../utils/crypto';
import {
  validateSecretContent,
  validateSecretLength,
  validateSecretBufferContent,
  validateSecretBufferLength
} from '../utils/validation';
import { readFromStdin } from '../utils/input';
import { MAX_SECRET_LENGTH, MAX_PAYLOAD_SIZE, KEY_LENGTH } from '../utils/constants';

function exitWithMessage(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export async function runEnstash(): Promise<void> {
  const program = new Command();

  program
    .name('stasher')
    .description('Encrypt and upload a one-time secret to stashed.dev')
    .usage('[secret...]')
    .argument('[secret...]', 'Secret string (defaults to reading from stdin if no arguments)')
    .version('1.0.0')
    .addHelpText('after', `
  Examples:
  echo "secret" | enstash
  enstash "API_KEY=abc123"
  enstash "my secret"
    `)
    .parse();

  let secretBuffer: Buffer;
  const secretArgs = program.args;

  if (secretArgs.length > 0) {
    // Convert command line args to buffer
    const secretString = secretArgs.join(' ');
    // Input validation for string input
    if (!validateSecretContent(secretString)) {
      exitWithMessage('Secret cannot be empty or whitespace only');
    }
    if (!validateSecretLength(secretString, MAX_SECRET_LENGTH)) {
      exitWithMessage(`Secret too long (max ${MAX_SECRET_LENGTH} characters)`);
    }
    secretBuffer = Buffer.from(secretString, 'utf8');
  } else {
    try {
      secretBuffer = await readFromStdin();
    } catch (error: any) {
      exitWithMessage(`Failed to read from stdin: ${error.message}`);
    }
    
    // Input validation for buffer input
    if (!validateSecretBufferContent(secretBuffer)) {
      exitWithMessage('Secret cannot be empty or whitespace only');
    }
    if (!validateSecretBufferLength(secretBuffer, MAX_SECRET_LENGTH)) {
      exitWithMessage(`Secret too long (max ${MAX_SECRET_LENGTH} bytes)`);
    }
  }

  let secretBytes: Uint8Array | undefined;
  try {
    // Convert to Uint8Array for encryption (minimal copy)
    secretBytes = new Uint8Array(secretBuffer.buffer, secretBuffer.byteOffset, secretBuffer.byteLength);
    
    // Encrypt the secret
    const encryptionResult = encrypt(secretBytes);

    try {
      if (encryptionResult.key.length !== KEY_LENGTH) {
        throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`);
      }

      const payload = createPayload(encryptionResult);
      const bodyStr = encodePayload(payload);
      const bodyBytes = Buffer.byteLength(bodyStr, 'utf8');
      
      if (bodyBytes > MAX_PAYLOAD_SIZE) {
        exitWithMessage(`Encrypted payload is ${bodyBytes} bytes (limit is ${MAX_PAYLOAD_SIZE})`);
      }

      const config = loadEnvConfig();

      // Use fetch with retry for network resilience
      const { fetchWithRetry } = await import('../utils/fetch-retry');
      
      const response = await fetchWithRetry(`${config.apiBaseUrl}/enstash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr
      });

      if (!response.ok) {
        exitWithMessage('Failed to create stash');
      }

      const result = await response.json() as { id: string };
      const token = formatStashToken(result.id, encryptionResult.key);
      process.stdout.write(token + '\n');

    } finally {
      // Zero out all sensitive data
      zeroBuffer(encryptionResult.key);
      zeroBuffer(secretBuffer);    // Sufficient - zeros underlying memory including secretBytes view
    }

  } catch (error: any) {
    exitWithMessage("Operation failed. Please try again.");
  }
}
