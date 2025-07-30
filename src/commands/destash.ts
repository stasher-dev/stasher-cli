import { Command } from 'commander';
import { loadEnvConfig } from '../utils/config';
import { decodeStashToken, decrypt, parsePayload, zeroBuffer } from '../utils/crypto';
import { extractUUID, validateUUID } from '../utils/validation';

function exitWithMessage(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export async function runDestash(): Promise<void> {
  const program = new Command();

  program
    .name('stashed')
    .description('Retrieve and decrypt a one-time secret from stashed.info')
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
    exitWithMessage('No stash token provided. Expected format: uuid:base64key');
  }

  const uuid = extractUUID(rawInput);
  if (!uuid || !validateUUID(uuid)) {
    exitWithMessage('Invalid stash token format. Expected: uuid:base64key');
  }

  try {
    const config = loadEnvConfig();

    // Fetch encrypted payload from API
    const response = await fetch(`${config.apiBaseUrl}/destash/${uuid}`, {
      method: 'GET'
    });

    if (response.status === 404) {
      exitWithMessage('Stash not found or already retrieved.');
    }

    if (!response.ok) {
      exitWithMessage(`Failed to fetch stash: HTTP ${response.status}`);
    }

    const encrypted = await response.json();

    // Decode and decrypt
    const { key } = decodeStashToken(rawInput);
    const payload = encrypted; // encrypted is already the parsed payload object

    const plaintext = decrypt(payload, key);
    console.log(plaintext);

    zeroBuffer(key);

  } catch (error: any) {
    exitWithMessage('Failed to retrieve or decrypt secret.');
  }
}
