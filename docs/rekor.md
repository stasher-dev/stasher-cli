# Rekor Transparency Log Verification

Verify that all Stasher CLI signatures are publicly logged in the Rekor transparency log for full auditability.

## What is Rekor?

Rekor is a tamper-resistant transparency log for software supply chain artifacts. Every Cosign signature is automatically logged to Rekor, providing a public, immutable record of all signing events.

## Search for Signatures

### By Artifact Hash
```bash
# Get latest version and download artifact
VERSION=$(npm view stasher-cli version)
npm pack stasher-cli@$VERSION

# Calculate artifact hash
ARTIFACT_HASH=$(sha256sum stasher-cli-$VERSION.tgz | cut -d' ' -f1)
echo "Artifact hash: $ARTIFACT_HASH"

# Search Rekor by hash
curl -s "https://search.sigstore.dev/api/v1/search" \
  -d "{\"hash\":\"$ARTIFACT_HASH\"}" \
  -H "Content-Type: application/json" | jq
```

### Web Interface Search
Visit [search.sigstore.dev](https://search.sigstore.dev) and search by:
- **Artifact hash**: SHA256 of the stasher-cli package
- **Email**: Look for GitHub Actions workflow identity
- **Repository**: `github.com/stasher-dev/stasher-cli`

## Install Rekor CLI

```bash
# macOS
brew install rekor-cli

# Linux
curl -sL https://rekor.sigstore.dev/api/v1/log/publicKey | base64 -d > /tmp/rekor-pub.pem
curl -sO https://github.com/sigstore/rekor/releases/latest/download/rekor-cli-linux-amd64
chmod +x rekor-cli-linux-amd64
sudo mv rekor-cli-linux-amd64 /usr/local/bin/rekor-cli

# Windows
# Download from: https://github.com/sigstore/rekor/releases
```

## Verify with Rekor CLI

### Search by Artifact Hash
```bash
# Download and hash the artifact
VERSION=$(npm view stasher-cli version)
npm pack stasher-cli@$VERSION
ARTIFACT_HASH=$(sha256sum stasher-cli-$VERSION.tgz | cut -d' ' -f1)

# Search Rekor log
rekor-cli search --artifact-hash $ARTIFACT_HASH
```

### Search by Repository
```bash
# Search all entries for the repository
rekor-cli search --pki-format x509 --email "https://github.com/stasher-dev/stasher-cli/.github/workflows/release.yml@refs/heads/main"
```

### Get Specific Entry
```bash
# Get entry details by UUID (from search results)
ENTRY_UUID="your-entry-uuid-here"
rekor-cli get --uuid $ENTRY_UUID
```

## Verify Entry Inclusion

```bash
# Verify an entry is included in the log
rekor-cli verify --uuid $ENTRY_UUID --pki-format x509

# Verify against artifact
rekor-cli verify --artifact stasher-cli-$VERSION.tgz \
  --signature stasher-cli-$VERSION.tgz.sig \
  --pki-format x509
```

## Understanding Rekor Entries

A typical Rekor entry for Stasher CLI contains:

```json
{
  "uuid": "24296fb24b8ad77a-abcd1234567890ab",
  "attestation": {
    "data": "base64-encoded-signature-data"
  },
  "body": {
    "apiVersion": "0.0.1",
    "kind": "hashedrekord",
    "spec": {
      "data": {
        "hash": {
          "algorithm": "sha256",
          "value": "artifact-hash-here"
        }
      },
      "signature": {
        "content": "signature-bytes",
        "publicKey": {
          "content": "certificate-data"
        }
      }
    }
  },
  "integratedTime": 1691403521,
  "logID": "c0d23d6ad406973f9559f3ba2d1ca01f84147d8ffc5b8445c224f98b9591801d",
  "logIndex": 23456789,
  "verification": {
    "signedEntryTimestamp": "timestamp-signature"
  }
}
```

### Key Fields:
- **uuid**: Unique identifier for this log entry
- **integratedTime**: Unix timestamp when logged to Rekor
- **logIndex**: Sequential index in the transparency log  
- **body.spec.data.hash**: SHA256 of the signed artifact
- **body.spec.signature.publicKey**: Certificate used for signing
- **verification**: Timestamp signature from Rekor

## Audit Trail Verification

### Complete Audit Trail
```bash
#!/bin/bash
set -e

VERSION=$(npm view stasher-cli version)
echo "🔍 Auditing complete signature trail for stasher-cli@$VERSION"

# 1. Download artifact
npm pack stasher-cli@$VERSION
ARTIFACT_HASH=$(sha256sum stasher-cli-$VERSION.tgz | cut -d' ' -f1)

# 2. Download signature  
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.sig"

# 3. Verify signature with Cosign (checks Rekor automatically)
echo "🔐 Verifying signature..."
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=stasher-cli-$VERSION.tgz.sig \
  stasher-cli-$VERSION.tgz

# 4. Search Rekor explicitly
echo "📜 Searching Rekor transparency log..."
rekor-cli search --artifact-hash $ARTIFACT_HASH

# 5. Get entry details
ENTRY_UUID=$(rekor-cli search --artifact-hash $ARTIFACT_HASH | head -1)
if [ -n "$ENTRY_UUID" ]; then
  echo "📋 Rekor entry details:"
  rekor-cli get --uuid $ENTRY_UUID --format json | jq '{
    uuid: .UUID,
    logIndex: .LogIndex, 
    integratedTime: .IntegratedTime,
    artifactHash: .Body.HashedRekordObj.data.hash.value,
    signatureTime: (.IntegratedTime | todate)
  }'
fi

echo "✅ Complete audit trail verified"
```

### Timeline Verification
```bash
# Compare GitHub Actions run time with Rekor log time
ENTRY_UUID=$(rekor-cli search --artifact-hash $ARTIFACT_HASH | head -1)
REKOR_TIME=$(rekor-cli get --uuid $ENTRY_UUID --format json | jq '.IntegratedTime')

echo "Rekor log time: $(date -d @$REKOR_TIME)"
echo "Compare with GitHub Actions run time for consistency"
```

## Monitoring and Alerting

### Automated Monitoring
```bash
#!/bin/bash
# Monitor script for new Stasher CLI releases

LAST_CHECKED_FILE="last-rekor-check.txt"
if [ -f "$LAST_CHECKED_FILE" ]; then
  LAST_CHECKED=$(cat "$LAST_CHECKED_FILE")
else
  LAST_CHECKED=0
fi

# Search for new entries since last check
rekor-cli search --email "https://github.com/stasher-dev/stasher-cli/.github/workflows/release.yml@refs/heads/main" | \
while read entry_uuid; do
  ENTRY_TIME=$(rekor-cli get --uuid $entry_uuid --format json | jq '.IntegratedTime')
  if [ "$ENTRY_TIME" -gt "$LAST_CHECKED" ]; then
    echo "🔔 New Stasher CLI signature found: $entry_uuid"
    echo "   Logged at: $(date -d @$ENTRY_TIME)"
    # Send notification, update monitoring dashboard, etc.
  fi
done

echo $(date +%s) > "$LAST_CHECKED_FILE"
```

## Trust Properties

The Rekor transparency log provides:

✅ **Immutable Record** - Entries cannot be deleted or modified  
✅ **Public Auditability** - Anyone can verify the complete log  
✅ **Timeline Proof** - Cryptographic proof of when signatures occurred  
✅ **Consistency Verification** - Log consistency can be mathematically verified  
✅ **Non-repudiation** - Signers cannot deny creating signatures  
✅ **Detection of Attacks** - Any tampering attempts would be publicly visible

## Advanced Usage

### Bulk Verification
```bash
# Verify all Stasher CLI releases in Rekor
for version in $(npm view stasher-cli versions --json | jq -r '.[]'); do
  echo "Checking v$version..."
  npm pack stasher-cli@$version
  HASH=$(sha256sum stasher-cli-$version.tgz | cut -d' ' -f1)
  if rekor-cli search --artifact-hash $HASH > /dev/null; then
    echo "✅ v$version found in Rekor"
  else
    echo "❌ v$version NOT found in Rekor"
  fi
  rm stasher-cli-$version.tgz
done
```

### Log Consistency Check
```bash
# Verify Rekor log consistency
rekor-cli loginfo
rekor-cli verify --checkpoint
```

## Troubleshooting

**Error: "no matching entries found"**
- Check that the artifact hash is correct
- Verify the package was actually signed (older versions may not be)
- Ensure network connectivity to Rekor service

**Error: "failed to verify log inclusion"**  
- Try again after a few minutes (propagation delay)
- Check Rekor service status at [status.sigstore.dev](https://status.sigstore.dev)

**Error: "certificate not found"**
- The signing certificate may have expired
- Check that you're searching with the correct identity pattern

## Learn More

- [Rekor Documentation](https://docs.sigstore.dev/rekor/overview)
- [Transparency Log Specification](https://github.com/google/trillian/blob/master/docs/papers/VerifiableDataStructures.pdf)
- [Sigstore Architecture](https://docs.sigstore.dev/about/overview/)