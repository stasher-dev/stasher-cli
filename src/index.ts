#!/usr/bin/env node

import { basename } from 'path';
import { runEnstash } from './commands/enstash';
import { runDestash } from './commands/destash';
import { runUnstash } from './commands/unstash';

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
    else {
        console.error('This utitility can be used with the following commands "enstash", "destash", or "unstash commands"');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
