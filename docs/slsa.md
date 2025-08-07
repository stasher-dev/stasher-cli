# SLSA v1 Attestation Verification

Verify supply chain provenance with SLSA v1 attestations for complete build transparency.

## What is SLSA?

SLSA (Supply-chain Levels for Software Artifacts) is a security framework that ensures the integrity of software artifacts and build systems. SLSA v1 attestations provide detailed metadata about how software was built.

## Install slsa-verifier

```bash
# Install Go-based SLSA verifier (recommended)
go install github.com/slsa-framework/slsa-verifier/v2/cli/slsa-verifier@latest

# Or use cosign for manual inspection
brew install cosign  # macOS
```

## Verify with slsa-verifier (Recommended)

```bash
# Get latest version
VERSION=$(npm view stasher-cli version)

# Download artifact and attestation
npm pack stasher-cli@$VERSION
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.intoto.jsonl"

# Automated SLSA verification
slsa-verifier verify-artifact \
  --provenance-path stasher-cli-$VERSION.tgz.intoto.jsonl \
  --source-uri github.com/stasher-dev/stasher-cli \
  --source-tag v$VERSION \
  stasher-cli-$VERSION.tgz

# ✅ This verifies:
# - Artifact was built from the specified source repository
# - Build happened at the specified tag/commit
# - Build process matches expected GitHub Actions workflow
# - No tampering occurred between build and release
```

## Manual Inspection with Cosign

```bash
# Verify and decode attestation
cosign verify-attestation \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --type=https://slsa.dev/provenance/v1 \
  stasher-cli-$VERSION.tgz | jq .payload -r | base64 -d | jq
```

## What's in the Attestation?

The SLSA v1 attestation contains detailed metadata:

### Build Environment
```json
{
  "buildDefinition": {
    "buildType": "https://github.com/Attestations/GitHubActionsWorkflow@v1",
    "externalParameters": {
      "workflow": {
        "repository": "https://github.com/stasher-dev/stasher-cli",
        "ref": "refs/tags/v1.3.17"
      }
    },
    "internalParameters": {
      "github": {
        "event_name": "push",
        "repository_id": "123456789",
        "repository_owner_id": "987654321"
      }
    },
    "resolvedDependencies": [
      {
        "uri": "git+https://github.com/stasher-dev/stasher-cli@refs/tags/v1.3.17",
        "digest": {
          "sha1": "abcd1234..."
        }
      }
    ]
  },
  "runDetails": {
    "builder": {
      "id": "https://github.com/actions/runner/github-hosted"
    },
    "metadata": {
      "invocationId": "https://github.com/stasher-dev/stasher-cli/actions/runs/123456789",
      "startedOn": "2025-08-07T10:18:41Z",
      "finishedOn": "2025-08-07T10:20:15Z"
    }
  }
}
```

### What This Proves

✅ **Source Repository** - Exact GitHub repository and commit  
✅ **Build Trigger** - What triggered the build (tag push)  
✅ **Build Environment** - GitHub-hosted runner details  
✅ **Build Time** - When the build started and finished  
✅ **Workflow Identity** - Exact workflow file that performed the build  
✅ **Dependencies** - All input dependencies with their hashes  
✅ **Toolchain** - Node.js, npm, TypeScript versions used

## Verify Specific Claims

### Check Source Repository
```bash
# Extract source URI from attestation
cosign verify-attestation \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --type=https://slsa.dev/provenance/v1 \
  stasher-cli-$VERSION.tgz | \
  jq -r '.payload | @base64d | fromjson | .predicate.buildDefinition.resolvedDependencies[0].uri'
```

### Check Build Time  
```bash
# Extract build metadata
cosign verify-attestation \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --type=https://slsa.dev/provenance/v1 \
  stasher-cli-$VERSION.tgz | \
  jq -r '.payload | @base64d | fromjson | .predicate.runDetails.metadata | {startedOn, finishedOn}'
```

### Check Workflow Identity
```bash
# Verify the exact workflow that built this
cosign verify-attestation \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --type=https://slsa.dev/provenance/v1 \
  stasher-cli-$VERSION.tgz | \
  jq -r '.payload | @base64d | fromjson | .predicate.buildDefinition.buildType'
```

## Integration Examples

### CI/CD Verification Pipeline
```bash
#!/bin/bash
set -e

VERSION="$1"
if [[ -z "$VERSION" ]]; then
  VERSION=$(npm view stasher-cli version)
fi

echo "🔍 Verifying SLSA attestation for stasher-cli@$VERSION"

npm pack stasher-cli@$VERSION
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/stasher-cli-$VERSION.tgz.intoto.jsonl"

slsa-verifier verify-artifact \
  --provenance-path stasher-cli-$VERSION.tgz.intoto.jsonl \
  --source-uri github.com/stasher-dev/stasher-cli \
  --source-tag v$VERSION \
  stasher-cli-$VERSION.tgz

echo "✅ SLSA v1 attestation verified - supply chain integrity confirmed"
```

## Troubleshooting

**Error: "failed to verify SLSA provenance"**
- Check that you're using the correct version numbers
- Ensure the attestation file matches the artifact
- Verify network connectivity to GitHub

**Error: "source tag mismatch"**
- Make sure the `--source-tag` matches exactly (including 'v' prefix)
- Check that the attestation was created for the correct release

**Warning: "This does not look like a supported SLSA predicate"**
- Ensure you downloaded the `.intoto.jsonl` file, not `.json`
- Verify the attestation format is correct

## Learn More

- [SLSA Framework](https://slsa.dev)
- [SLSA Verifier](https://github.com/slsa-framework/slsa-verifier)
- [GitHub SLSA Generator](https://github.com/slsa-framework/slsa-github-generator)