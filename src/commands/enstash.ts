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
  validateSecretLength
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
    .name('stashed')
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

  let secret: string;
  const secretArgs = program.args;

  if (secretArgs.length > 0) {
    secret = secretArgs.join(' ');
  } else {
    try {
      secret = await readFromStdin();
    } catch (error: any) {
      exitWithMessage(`Failed to read from stdin: ${error.message}`);
    }
  }

  // Input validation
  if (!validateSecretContent(secret)) {
    exitWithMessage('Secret cannot be empty or whitespace only');
  }

  if (!validateSecretLength(secret, MAX_SECRET_LENGTH)) {
    exitWithMessage(`Secret too long (max ${MAX_SECRET_LENGTH} characters)`);
  }

  try {
    // Encrypt the secret
    const encryptionResult = encrypt(secret);

    try {
      if (encryptionResult.key.length !== KEY_LENGTH) {
        throw new Error(`Encryption key must be ${KEY_LENGTH} bytes`);
      }

      const payload = createPayload(encryptionResult);
      const encoded = Buffer.from(encodePayload(payload));

      if (encoded.length > MAX_PAYLOAD_SIZE) {
        exitWithMessage(`Encrypted payload is ${encoded.length} bytes (limit is ${MAX_PAYLOAD_SIZE})`);
      }

      const config = loadEnvConfig();

      // Use fetch with retry for network resilience
      const { fetchWithRetry } = await import('../utils/fetch-retry');
      
      const response = await fetchWithRetry(`${config.apiBaseUrl}/enstash`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: encodePayload(payload)
      });

      if (!response.ok) {
        exitWithMessage('Failed to create stash');
      }

      const result = await response.json() as { id: string };
      const token = formatStashToken(result.id, encryptionResult.key);
      console.log(token);

    } finally {
      zeroBuffer(encryptionResult.key);
      secret = ''; // Encourage GC cleanup
    }

  } catch (error: any) {
    exitWithMessage("Operation failed. Please try again.");
  }
}
