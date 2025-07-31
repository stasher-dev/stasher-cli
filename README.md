# Stasher CLI

[![npm version](https://badge.fury.io/js/stasher-cli.svg)](https://www.npmjs.com/package/stasher-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Secure secret sharing with burn-after-read functionality. Share sensitive information that automatically deletes after being read.

This is my first foray into software engineering—built to solve a real problem with minimalism and security in mind.

## Quickstart

```bash
# Try it now - no installation required
npx enstash "my secret message"
# Returns: uuid:key (share this token)

npx destash "uuid:key"  
# Returns: my secret message (burns after reading)
```

## Installation

```bash
# Install globally
npm install -g stasher-cli

# Or use directly with npx (no installation required)
npx enstash "my secret message"
```

## Usage

The output of `enstash` is a token in the form `uuid:base64key`, which you'll need to retrieve or delete the secret.

### Limits

- **Maximum secret size**: 4KB (4,096 characters)
- **Automatic expiration**: 10 minutes
- **Burn-after-read**: Secrets are deleted after first access

### Store a Secret
```bash
# From command line argument
enstash "my secret message"

# Or with npx
npx enstash "my secret message"

# From stdin
echo "my secret" | enstash
cat secret.txt | enstash

# From stdin with npx
echo "my secret" | npx enstash
```

### Retrieve a Secret
```bash
# Use the token returned from enstash
destash "uuid:base64key"

# Or with npx
npx destash "uuid:base64key" 
```

### Delete a Secret
```bash
# Manually delete before it's read
unstash "uuid"
unstash "uuid:base64key"

# Or with npx
npx unstash "uuid"
npx unstash "uuid:base64key"
```

## Features

- 🔐 **Client-side encryption** - AES-256-GCM encryption
- 🔥 **Burn-after-read** - Secrets are deleted after first retrieval
- ⏰ **10-minute TTL** - All secrets expire automatically if not retreived
- 🚀 **Zero-knowledge** - Server never sees plaintext
- 📱 **Cross-platform** - Works on Linux, macOS, Windows

## Examples

```bash
# Store a password
enstash "mypassword123"
# → Outputs: a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key...
# (uuid:base64key is a one-time-use token used to retrieve your secret)

# Retrieve it (burns after reading)
destash "a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key..."
# → Outputs: mypassword123

# Store from a file (up to 4KB)
cat ~/.ssh/config | enstash
# → Outputs: <stash-token>

# Store an API key
enstash "API_KEY=sk-1234567890abcdef"

# Store multi-line content
enstash "line 1
line 2
line 3"

# Copy to clipboard (macOS)
destash "token" | pbcopy

# Copy to clipboard (Linux)
# Requires xclip installed: sudo apt install xclip
destash "token" | xclip -selection clipboard

# Error handling - secret too large
enstash "$(cat very-large-file.txt)"
# → Error: Secret too long (max 4096 characters)

# Error handling - invalid token
destash "invalid-token"
# → Error: Invalid stash token format

# Delete a secret before reading (manual cleanup)
unstash "a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key..."
# → Outputs: Secret deleted successfully

# Delete using just the UUID (if you don't have the full token)
unstash "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
# → Outputs: Secret deleted successfully

# Use case: Cancel a shared secret
echo "sensitive-data" | enstash
# → a1b2c3d4-e5f6-7890-abcd-ef1234567890:base64key...
# (Oops, shared with wrong person - delete it!)
unstash "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
# → Secret deleted successfully
```

## How It Works

1. **Encrypt**: Your secret is encrypted client-side with AES-256-GCM
2. **Store**: Only the encrypted data is sent for stashing
3. **Share**: You get a token containing the UUID and decryption key which you can share via any channel you prefer
4. **Retrieve**: The recipient uses the token to decrypt the secret
5. **Burn**: The stash is permanently deleted after first access

## Security Model

- **🔐 AES-256-GCM Encryption** - Military-grade encryption standard
- **🚫 Zero-Knowledge** - Even the server operator cannot decrypt your secrets
- **🔥 Burn-After-Read** - Secrets are permanently deleted after first access
- **⏰ Auto-Expiry** - 10-minute maximum lifetime regardless of access
- **🛡️ Perfect Forward Secrecy** - Each secret uses a unique encryption key
- **💾 Memory Safety** - Sensitive data is zeroed out from memory after use
- **📝 No Disk Storage** - Secrets are never written to disk or log files

### Memory Safety Implementation

Stasher takes care to minimize secret exposure in memory. This includes:

- **Buffer zeroing**: Key material and plaintext are erased with `.fill(0)` in memory buffers
- **String cleanup**: Sensitive strings are replaced with empty strings immediately after use
- **Short-lived scope**: Secret material is held in RAM only during encryption/decryption operations
- **Process isolation**: Each operation runs as a short-lived CLI process, reducing risk of memory leaks

While these precautions help, JavaScript environments like Node.js don't allow perfect memory control—so it's best used for short-lived secrets, not long-term vaults.

## Requirements

- Node.js 16 or higher
- Internet connection

## License

MIT

## Related Projects
- 🛠 **Stasher CLI** – The command-line client (this repo)
- ☁️ **Stasher Worker** – Cloudflare Worker backend written in TypeScript using KV storage

## Todo

- [ ] Add `--json` output format for programmatic use
- [ ] Support custom TTL (time-to-live) settings
- [ ] Add `--verbose` flag for debugging
- [ ] Web interface integration
- [ ] Binary file support with base64 encoding
