import { Command } from 'commander';
import { loadEnvConfig } from '../utils/config';
import { extractUUID, validateUUID } from '../utils/validation';

function exitWithMessage(msg: string): never {
  console.error(msg);
  process.exit(1);
}

export async function runUnstash(): Promise<void> {
  const program = new Command();

  program
    .name('stashed')
    .description('Manually delete a one-time secret before it’s accessed')
    .usage('<uuid[:key]>')
    .argument('<token>', 'Stash uuid or full token in the format uuid:base64key')
    .version('1.0.0')
    .addHelpText('after', `
💡 Examples:
  unstash "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  unstash "a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key"
    `)
    .parse();

  const rawInput = program.args[0];

  if (!rawInput) {
    exitWithMessage('No stash token or uuid provided.');
  }

  // Allow either full token or just the UUID
  const uuid = extractUUID(rawInput);
  if (!uuid || !validateUUID(uuid)) {
    exitWithMessage('Invalid format. Expected uuid or stash token');
  }

  try {
    const config = loadEnvConfig();

    const response = await fetch(`${config.apiBaseUrl}/unstash/${uuid}`, {
      method: 'DELETE'
    });

    if (response.status === 404) {
      exitWithMessage('Stash not found or already deleted.');
    }

    if (response.status === 410) {
      const errorData = await response.json();
      const errorMessage = errorData.error === 'Expired' 
        ? 'This stash has expired' 
        : 'This stash has already been consumed';
      exitWithMessage(errorMessage);
    }

    if (!response.ok) {
      exitWithMessage(`Failed to delete stash: HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`Stash ${result.id} has been permanently deleted.`);

    process.exit(0);

  } catch (error: any) {
    exitWithMessage('Failed to delete stash. Please try again.');
  }
}
