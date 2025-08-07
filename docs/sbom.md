# SBOM Verification Guide

Verify Software Bill of Materials (SBOM) for complete dependency transparency and license compliance.

## What is an SBOM?

A Software Bill of Materials (SBOM) is a comprehensive inventory of all software components, dependencies, and metadata used in building an application. Stasher CLI generates SPDX-compliant SBOMs with complete dependency trees.

## Download and Verify SBOM

```bash
# Get latest version
VERSION=$(npm view stasher-cli version)

# Download SBOM and signature
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/sbom.spdx.json"
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/sbom.spdx.json.sig"

# Verify SBOM signature
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=sbom.spdx.json.sig \
  sbom.spdx.json
```

## Verify SBOM Attestation

```bash
# Download SBOM attestation
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/sbom.spdx.json.intoto.jsonl"

# Verify SBOM attestation
cosign verify-attestation \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --type=https://spdx.dev/Document \
  sbom.spdx.json
```

## Inspect SBOM Contents

### View All Dependencies
```bash
# Show all packages with versions and licenses
jq -r '.packages[] | select(.name != null and .name != "") | 
  "\(.name) | \(.versionInfo // "unknown") | \(.licenseConcluded // "unknown")"' \
  sbom.spdx.json | sort
```

### Check for Specific Licenses
```bash
# Find all GPL licensed components
jq -r '.packages[] | select(.licenseConcluded | contains("GPL")) | 
  "\(.name): \(.licenseConcluded)"' sbom.spdx.json

# Find all MIT licensed components  
jq -r '.packages[] | select(.licenseConcluded | contains("MIT")) | 
  "\(.name): \(.licenseConcluded)"' sbom.spdx.json
```

### Dependency Analysis
```bash
# Count total dependencies
jq '.packages | length' sbom.spdx.json

# Show dependency tree depth
jq -r '.packages[] | select(.relationshipType == "DEPENDS_ON") | 
  "\(.sourcePackage) -> \(.relatedElement)"' sbom.spdx.json | head -20

# Find dependencies with known vulnerabilities (if present)
jq -r '.packages[] | select(.vulnerabilities != null) | 
  "\(.name): \(.vulnerabilities)"' sbom.spdx.json
```

## SBOM Structure

The SPDX SBOM contains:

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "creationInfo": {
    "created": "2025-08-07T10:19:30Z",
    "creators": ["Tool: syft-v1.11.1"],
    "licenseListVersion": "3.24"
  },
  "name": "stasher-cli",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-javascript-npm-commander-14.0.0",
      "name": "commander", 
      "versionInfo": "14.0.0",
      "downloadLocation": "https://registry.npmjs.org/commander/-/commander-14.0.0.tgz",
      "filesAnalyzed": false,
      "licenseConcluded": "MIT",
      "licenseDeclared": "MIT",
      "copyrightText": "NOASSERTION"
    }
  ],
  "relationships": [
    {
      "spdxElementId": "SPDXRef-DOCUMENT",
      "relationshipType": "DESCRIBES", 
      "relatedSpdxElement": "SPDXRef-Package-javascript-npm-stasher-cli-1.3.17"
    }
  ]
}
```

## License Compliance Check

### Generate License Report
```bash
#!/bin/bash
echo "# Stasher CLI License Report"
echo "Generated: $(date)"
echo ""

echo "## Direct Dependencies"
jq -r '.packages[] | select(.name != null and .name != "" and (.relationshipType // "") != "DEPENDS_ON") | 
  "- **\(.name)** (\(.versionInfo // "unknown")) - \(.licenseConcluded // "unknown")"' \
  sbom.spdx.json | sort

echo ""
echo "## All Dependencies by License"
jq -r '.packages[] | select(.name != null and .name != "" and .licenseConcluded != null) | .licenseConcluded' \
  sbom.spdx.json | sort | uniq -c | sort -nr

echo ""
echo "## Potential License Issues"
jq -r '.packages[] | select(.licenseConcluded != null and (.licenseConcluded | contains("GPL") or contains("AGPL"))) | 
  " \(.name) (\(.versionInfo)) - \(.licenseConcluded)"' sbom.spdx.json
```

## Security Analysis

### Find Outdated Dependencies
```bash
# Extract package list for security scanning
jq -r '.packages[] | select(.name != null and .name != "" and .versionInfo != null) | 
  "\(.name)@\(.versionInfo)"' sbom.spdx.json > dependency-list.txt

# Use with npm audit (requires package.json context)
npm audit --audit-level=moderate
```

### Check for Known Vulnerabilities
```bash
# If vulnerability data is embedded in SBOM
jq -r '.packages[] | select(.vulnerabilities != null) | 
  "\(.name) (\(.versionInfo)) has vulnerabilities: \(.vulnerabilities)"' sbom.spdx.json

# Check for external vulnerability references
jq -r '.packages[] | select(.externalRefs[]? | .referenceCategory == "SECURITY") | 
  "\(.name): \(.externalRefs[] | select(.referenceCategory == "SECURITY") | .referenceLocator)"' sbom.spdx.json
```

## Compliance Automation

### CI/CD License Check
```bash
#!/bin/bash
set -e

VERSION=$(npm view stasher-cli version)
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/sbom.spdx.json"

# Verify SBOM signature first
curl -L -O "https://github.com/stasher-dev/stasher-cli/releases/download/v$VERSION/sbom.spdx.json.sig"
cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature=sbom.spdx.json.sig \
  sbom.spdx.json

# Check for prohibited licenses
PROHIBITED_LICENSES=("GPL-2.0" "GPL-3.0" "AGPL-3.0" "LGPL-2.1" "LGPL-3.0")
for license in "${PROHIBITED_LICENSES[@]}"; do
  if jq -e --arg license "$license" '.packages[] | select(.licenseConcluded == $license)' sbom.spdx.json > /dev/null; then
    echo "Found prohibited license: $license"
    jq -r --arg license "$license" '.packages[] | select(.licenseConcluded == $license) | 
      "  - \(.name) (\(.versionInfo))"' sbom.spdx.json
    exit 1
  fi
done

echo "✅ License compliance check passed"
```

## Integration with Supply Chain Tools

### SPDX Validation
```bash
# Install SPDX tools
pip install spdx-tools

# Validate SBOM format
spdx-validate sbom.spdx.json
```

### Export to Other Formats
```bash
# Convert SPDX to CycloneDX (if needed)
# Note: requires additional tools like cyclone-dx-cli
```

## What the SBOM Proves

**Complete Dependency List** - Every package used in the build  
**License Compliance** - All licenses clearly identified  
**Version Tracking** - Exact versions for reproducibility  
**Supply Chain Transparency** - Full dependency provenance  
**Security Baseline** - Foundation for vulnerability management  
**Audit Trail** - Cryptographically signed dependency manifest

## Learn More

- [SPDX Specification](https://spdx.github.io/spdx-spec/)
- [NTIA SBOM Minimum Elements](https://www.ntia.doc.gov/files/ntia/publications/sbom_minimum_elements_report.pdf)
- [Syft SBOM Generator](https://github.com/anchore/syft)