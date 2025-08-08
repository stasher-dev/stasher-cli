# Stasher CLI

Secure, one-time secret sharing from the terminal.

## Overview

- Encrypts locally using AES-256-GCM  
- Backend stores ciphertext only (no keys)  
- Burn-after-read (single access)  
- 10-minute TTL with proactive + reactive cleanup  
- Runs via `npx`

## Quick Start

```bash
# Create a secret
npx enstash "example secret"
# → Outputs: uuid:key

# Retrieve and delete
npx destash "uuid:key"

# Delete without reading
npx unstash "uuid"

# From a string
enstash "secret"

# From a file
cat file.txt | enstash

# From stdin with npx
echo "secret" | npx enstash