#!/usr/bin/env node

import { basename } from 'path';
import { runEnstash } from './commands/enstash';
import { runDestash } from './commands/destash';
import { runUnstash } from './commands/unstash';
import { runExstash } from './commands/exstash';

async function main(): Promise<void> {
    const scriptName = basename(process.argv[1]);
    if (scriptName.includes('enstash')) {
        return runEnstash();
    }
    else if (scriptName.includes('destash')) {
        return runDestash();
    }
    else if (scriptName.includes('unstash')) {
        return runUnstash();
    }
    else if (scriptName.includes('exstash')) {
        return runExstash();
    }
    else {
        console.error('Usage: Call this script as "enstash", "destash", "unstash", or "exstash"');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
