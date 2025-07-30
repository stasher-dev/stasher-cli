# Stasher CLI

Secure secret sharing with burn-after-read functionality. Share sensitive information that automatically deletes after being read.

## Installation

```bash
# Install globally
npm install -g stasher-cli

# Or use directly with npx (no installation required)
```bash
npx stasher-cli enstash "my secret message"
```

## Usage

The output of `enstash` is a token in the form `uuid:base64key`, which you'll need to retrieve or delete the secret.

### Limits

- **Maximum secret size**: 4KB (4,096 characters)
- **Maximum encrypted payload**: 10KB  
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
echo "my secret" | npx stasher-cli enstash
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
- ⏰ **10-minute TTL** - All secrets expire automatically
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
```

## How It Works

1. **Encrypt**: Your secret is encrypted client-side with AES-256-GCM
2. **Store**: Only the encrypted data is sent for stashing
3. **Share**: You get a token containing the UUID and decryption key which you can share via any channel you prefer
4. **Retrieve**: The recipient uses the token to decrypt the secret
5. **Burn**: The stash is permanently deleted after first access

## Security

- **Zero-knowledge**: The server never sees your plaintext secrets
- **Client-side crypto**: All encryption/decryption happens on your device
- **Perfect forward secrecy**: Each secret uses a unique encryption key
- **Automatic expiration**: Secrets are deleted after 10 minutes maximum
- **Burn-after-read**: Secrets are deleted immediately after being accessed

## Requirements

- Node.js 16 or higher
- Internet connection

## License

MIT

## Related
- [Stasher CLI](https://github.com/johnny-stasher/stasher-cli) - This CLI tool
- [Stasher Worker](https://github.com/johnny-stasher/stasher-worker) - API backend
