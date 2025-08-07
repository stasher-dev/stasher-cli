# Stasher CLI Verification Guide

Complete cryptographic verification for Stasher CLI releases using industry-standard tools.

## Overview

Every Stasher CLI release is:
- **Signed** with Cosign using GitHub OIDC keyless signing
- **Attested** with SLSA v1 provenance metadata  
- **SBOM included** with complete dependency transparency
- **Logged** to public Rekor transparency log

## Quick Verification

```bash
# Install the CLI
npm install -g stasher-cli

# Verify the installed package
VERSION=$(npm list -g stasher-cli --depth=0 | grep stasher-cli | cut -d@ -f2)
echo "Installed version: $VERSION"

# Download and verify signature
npm pack stasher-cli@$VERSION
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.sig"

# Verify with cosign
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=stasher-cli-$VERSION.tgz.sig \
  stasher-cli-$VERSION.tgz
```

## Detailed Guides

- [🔐 Cosign Verification](./cosign.md) - Signature verification with Cosign
- [🧾 SLSA Attestation](./slsa.md) - Supply chain provenance verification  
- [📋 SBOM Verification](./sbom.md) - Software bill of materials
- [📜 Rekor Transparency](./rekor.md) - Public transparency log verification

## Trust Chain

1. **Source Code** → GitHub repository with commit signatures
2. **Build Process** → GitHub Actions with OIDC identity
3. **Artifacts** → Signed npm packages with Cosign
4. **Attestation** → SLSA v1 provenance with complete metadata
5. **Transparency** → All signatures logged to public Rekor log
6. **Distribution** → npm registry with integrity verification

## Security Properties

✅ **Authenticity** - Verifiable GitHub Actions build  
✅ **Integrity** - Tamper-evident signatures  
✅ **Non-repudiation** - Cryptographic proof of origin  
✅ **Supply Chain Security** - Complete build environment captured  
✅ **Dependency Transparency** - Full SBOM with licenses  
✅ **Public Auditability** - Rekor transparency log

## Getting Help

- [GitHub Issues](https://github.com/stasher-dev/stasher-cli/issues)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [SLSA Framework](https://slsa.dev)