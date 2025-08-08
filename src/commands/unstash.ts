import { Command } from 'commander';
import { loadEnvConfig } from '../utils/config';
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

export async function runUnstash(): Promise<void> {
  const program = new Command();

  program
    .name('stasher')
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
    exitWithMessage('No stash token or uuid provided.', 2); // Invalid input
  }

  // Allow either full token or just the UUID
  const uuid = extractUUID(rawInput);
  if (!uuid || !validateUUID(uuid)) {
    exitWithMessage('Invalid format. Expected uuid or stash token', 2); // Invalid input
  }

  try {
    const config = loadEnvConfig();

    // Use fetch with retry for network resilience
    const { fetchWithRetry } = await import('../utils/fetch-retry');
    
    // Time-bound the request to prevent hanging
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 10_000); // 10s
    const response = await fetchWithRetry(`${config.apiBaseUrl}/unstash/${uuid}`, {
      method: 'DELETE',
      signal: ac.signal,
    });
    clearTimeout(timeout);

    if (response.status === 404) {
      exitWithMessage('Stash not found or already deleted.', 3); // Not found
    }

    if (response.status === 410) {
      const { error } = await response.json().catch(() => ({}));
      const msg = (error === 'Expired') ? 'This stash has expired.' : 'This stash has already been consumed.';
      exitWithMessage(msg, 4); // Expired/consumed
    }

    if (!response.ok) {
      exitWithMessage(`Failed to delete stash: HTTP ${response.status}`, 5); // Network error
    }

    // Guard JSON parsing - don't crash if server returns HTML on errors
    let result;
    try {
      result = await response.json();
    } catch (e) {
      exitWithMessage('Server returned invalid response format.', 5); // Network error
    }
    
    process.stdout.write(`Stash ${result.id} has been permanently deleted.\n`);

  } catch (error: any) {
    // Handle network/timeout errors
    if (error?.name === 'AbortError') {
      exitWithMessage('Request timed out after 10 seconds.', 5); // Network error
    }
    exitWithMessage('Failed to delete stash. Please try again.', 5); // Network error (general)
  }
}
