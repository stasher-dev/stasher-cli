# Stasher CLI

Share secrets from your terminal. One-time only. No accounts. No backend. No BS.

## Why?

I just wanted to share a password.  
Not spin up a server. Not sign up for a "secure" web app.  
Not trust a Slack thread. Just. Send. A. Secret.

So I built Stasher — a burn-after-read, command-line tool for secure, ephemeral secret sharing.  
Built for people who are busy, paranoid, or both.

## "How Can I Trust You?"

That's what someone asked me — and they were right to.

Even if I say:

*"It's encrypted"*

*"The key never touches the server"*

*"No logs, no tracking, no metadata"...*

How do you know I'm being honest?

## I realized: the more secrecy your secrets require, the more transparency my system must offer.  
So I built Stasher to prove itself.

## Everything Is Verifiable

Every Stasher release:

Is cryptographically signed with Cosign

Includes a SLSA v1 provenance attestation

Publishes a signed SBOM with all dependencies + licenses

Is logged in the Rekor transparency log

Comes with full verification instructions

## Every Line of Code Is Public

Everything that runs Stasher is open and verifiable:

[CLI](https://github.com/stasher-dev/stasher-cli)

[API](https://github.com/stasher-dev/stasher-api)

[App](https://github.com/stasher-dev/stasher-app)

[CI/CD](https://github.com/stasher-dev/stasher-ci)

[Website](https://github.com/stasher-dev/stasher-website)

** The only thing we don't expose? Your secret. Everything else is yours to inspect.**

**Zero-knowledge encryption** – AES-256-GCM, done locally
**Burn-after-read** – one use, then it's gone forever
**CLI-first** – pipe it, script it, automate it
**No setup** – just run it with `npx`
 **10-minute expiry** – with proactive + reactive cleanup
**Full supply chain transparency** – signed, attested, and public

## Try It Now

```bash
npx enstash "the launch code is 🍌-42"
# → Outputs: uuid:key

npx destash "uuid:key"
# → Reveals the secret and deletes it forever
```

## Trust, But Actually Verify

```bash
# Verify latest release
VERSION=$(npm view stasher-cli version)
npm pack stasher-cli@$VERSION

cosign verify-blob \
  --certificate-identity-regexp="https://github.com/stasher-dev/stasher-cli/.*" \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --signature="stasher-cli-$VERSION.tgz.sig" \
  "stasher-cli-$VERSION.tgz"
```

**More:**

- **[Verification Overview](./docs/verification.md)**
- **[Cosign Signatures](./docs/cosign.md)**
- **[SLSA Attestation](./docs/slsa.md)**
- **[SBOM Verification](./docs/sbom.md)**
- **[Rekor Transparency](./docs/rekor.md)**

## 🛠 Usage

### Enstash (Create a Secret)

```bash
# From a string
enstash "don't forget to feed the AI"

# From a file
cat .env | enstash

# From stdin with npx
echo "my passphrase is secret123" | npx enstash
```

### Destash (Read + Burn)

```bash
destash "uuid:base64key"
npx destash "uuid:base64key"
```

### Unstash (Manual Delete)

```bash
unstash "uuid"
unstash "uuid:base64key"
```

## Examples

```bash
# Share Wi-Fi password with a guest
npx enstash "yesits1234dontjudge"

# Send a one-time OTP via Slack
npx enstash "OTP: 842991"

# Share a deployment key, then delete it
echo "DEPLOY_KEY=super-secret" | npx enstash
npx unstash "uuid"

# Send a secret via pigeon 
npx enstash "vault code: 1234#"
# (Remind them: 10-minute expiry)
```

## How It Works

### **Client-Side Encryption**

Stasher encrypts with **AES-256-GCM** before sending anything

It uploads: ciphertext, IV, and tag — **never the key**

You get a `uuid:base64key` token to share

### **Hybrid Expiry System** 

**Reactive expiry**: validated on every access  
**Proactive cleanup**: background Durable Object alarms  
**Atomic**: each stash is guarded by its own isolated gatekeeper (one DO per UUID)

### **Burn-After-Read**

Once `destash` is called, the secret is revealed and the stash is burned

No replays, no race conditions — **guaranteed**

## Limits

| Feature | Limit |
|---------|-------|
| Max size | 4 KB |
| Time to live | 10 minutes |
| Access | One-time |

## Install (Optional)

```bash
npm install -g stasher-cli
```

…but honestly? `npx` is faster and cleaner.

# Shell History Warning

If you're entering secrets directly into the command line (e.g. npx enstash "my secret"), be aware that most shells will store this in your command history (e.g. .bash_history, .zsh_history).

To avoid leaking secrets:

# Temporarily disable history for this session
unset HISTFILE
set +o history

# Safely run your command
npx enstash "my secret"

# Re-enable history if needed
set -o history

## Roadmap

 Add `--json` output format for programmatic use  
 Support custom TTL (time-to-live) settings  
 Add `--verbose` flag for debugging 
 Add `--stdin` flag for security 
 Web interface integration  
 Binary file support with base64 encoding  

## Architecture

Powered by **Cloudflare Edge**, built for security:

| Layer | Technology |
|-------|------------|
| Atomic logic | Durable Objects |
| Storage | KV (encrypted only) |
| Expiry logic | Reactive validation + alarms |
| Race protection | Per-secret DO isolation |

**Backend source** → [stasher-dev/stasher-api](https://github.com/stasher-dev/stasher-api)

## Related Projects

- **[Stasher API](https://github.com/stasher-dev/stasher-api)** – Cloudflare Worker backend
- **[Stasher App](https://github.com/stasher-dev/stasher-app)** – Browser interface with bookmarklet

## Built for Me. Maybe for You Too.

This started as a scratch-my-own-itch project.  
Now it's a zero-trust, burn-after-read tool with full cryptographic supply chain verification.

If that sounds like overkill — good. That's kind of the point.

