# Cosign Verification Guide

Verify Stasher CLI signatures using Cosign with GitHub OIDC keyless signing.

## Install Cosign

```bash
# macOS
brew install cosign

# Linux
curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Windows
# Download from: https://github.com/sigstore/cosign/releases
```

## Verify npm Package

```bash
# Get latest version
VERSION=$(npm view stasher-cli version)

# Download package and signature
npm pack stasher-cli@$VERSION
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.sig"

# Verify signature
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=stasher-cli-$VERSION.tgz.sig \
  stasher-cli-$VERSION.tgz
```

## Verify Built Artifacts

```bash
# Download built JavaScript files and signatures
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/dist.tar.gz"
tar -xzf dist.tar.gz

# Verify individual built files (example)
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/dist/index.js.sig"
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=dist/index.js.sig \
  dist/index.js
```

## Verify Checksums

```bash
# Download and verify checksums
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/checksums.txt"
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/checksums.txt.sig"

# Verify checksums signature
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=checksums.txt.sig \
  checksums.txt

# Verify file integrity
sha256sum -c checksums.txt
```

## Understanding the Identity

The certificate identity shows exactly what signed the artifacts:

- **Identity**: `https://github.com/stasher-dev/stasher-cli/.github/workflows/release.yml@refs/heads/main`
- **OIDC Issuer**: `https://token.actions.githubusercontent.com`
- **Certificate Authority**: Fulcio (Sigstore)

This proves the signature came from the GitHub Actions workflow in the official repository.

## Troubleshooting

**Error: "certificate identity does not match"**
- Use `--certificate-identity-regexp` for pattern matching
- Ensure you're using the correct repository pattern

**Error: "signature verification failed"**  
- Verify you downloaded the correct .sig file
- Check that the artifact hasn't been modified locally

**Error: "cosign not found"**
- Install cosign using the instructions above
- Ensure it's in your PATH

## Automation

For CI/CD verification:

```bash
#!/bin/bash
set -e

VERSION=$(npm view stasher-cli version)
npm pack stasher-cli@$VERSION

curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.sig"

cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=stasher-cli-$VERSION.tgz.sig \
  stasher-cli-$VERSION.tgz

echo "✅ Stasher CLI signature verified successfully"
```