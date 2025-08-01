# Stasher CLI

[![npm version](https://badge.fury.io/js/stasher-cli.svg)](https://www.npmjs.com/package/stasher-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Share secrets from your terminal. Burn them after reading. No signups. No BS.

Why?

I just wanted to share a password.
Not spin up a server. Not register for some "secure" web app. Not trust a Slack thread. Just. Send. A. Secret.

So I built Stasher — a command-line tool for burn-after-read secret sharing, built for people who are busy, paranoid, or both.

- Works instantly with npx
- Encrypts everything before it ever leaves your machine
- Secrets self-destruct after one read or 10 minutes
- No account, no login, no metadata, no snooping

Basically, it’s like a Mission Impossible tape, but for API keys.np

Why You Might Actually Like This

- Zero-knowledge encryption – only you have the key
- Burns after read – one read and it's toast
- CLI-first – pipe stuff, script it, automate it, whatever
- No accounts, no setup – literally just run it

Share however you like – Slack, email, QR code, carrier pigeon...(Just tell the pigeon to fly fast — they only have 10 minutes)

Try It Right Now

```bash
npx enstash "the launch code is 🍌-42"
# → Outputs: uuid:key

npx destash "uuid:key"
# → Outputs: the launch code is 🍌-42
# → And deletes it forever
```

Powered by Cloudflare

Thanks to Cloudflare Workers + KV, this runs globally with zero servers. No backend to maintain. No database to scale. Just pure edge magic.

Full source of the backend is open and yours to explore: 🔍 [stasher-dev/stasher-worker](https://github.com/stasher-dev/stasher-worker)

Install (If You Must)

```bash
npm install -g stasher-cli
```

But honestly? npx works great. Why clutter your global install?

Usage

Enstash a Secret

```bash
# From a string
enstash "don't forget to feed the AI"

# From a file
cat .env | enstash

# From stdin with npx
echo "my passphrase is secret123" | npx enstash
```

Destash a Secret

```bash
# Retrieve using the token
destash "uuid:base64key"
# Or with npx
npx destash "uuid:base64key"
```

Unstash (Manual Delete)

```bash
unstash "uuid"
unstash "uuid:base64key"
npx unstash "uuid"
npx unstash "uuid:base64key"
```

Examples

```bash
# Share your Wi-Fi password with a guest
npx enstash "yesits1234dontjudge"

# Send a one-time OTP over Slack
npx enstash "OTP: 842991"

# Share a deployment key, then delete it before panic sets in
echo "DEPLOY_KEY=super-secret" | npx enstash
npx unstash "uuid"

# Send a secret using... a pigeon
npx enstash "vault code: 1234#"
# (Tell the pigeon they've got 10 minutes)
```

But in all seriousness — if you’ve ever needed to share a sensitive message quickly and privately without deploying a server or signing up for anything, Stasher is for you.

Zero setup. Zero trust. One-time secrets. That’s it.

Features You May Actually Care About

- AES-256-GCM encryption (done client-side)
- Burn-after-read (one-time use, then poof)
- 10-minute expiration (for slow pigeons)
- Buffers cleared from memory after use (where Node.js allows)
- No logs, no tracking, no metadata

Share It However You Like

Once you get your uuid:key token, you're free to share it by whatever channel suits you:

- DM it on Slack
- Paste it in a Zoom chat
- Email it to yourself
- Encode it into a QR code
- Whisper it across the room
- Tie it to a carrier pigeon (remind them: 10-minute expiry)

The point is: you choose the channel. Stasher never stores the key, so only whoever gets the complete token can read the message.

How It Works

1. Stasher encrypts locally using AES-256-GCM
2. It uploads only the ciphertext, IV, and tag - this is the stash
3. In return you get a shareable token: uuid:base64key
4. You can share this token however you want
5. Recipent uses destash to retreive the stash which auto-deletes the stash
5. The stash is decrypted client-side and the secret revealed

Limits

- Max size: 4KB
- TTL: 10 minutes
- One-time access only

Roadmap

- [ ] Add `--json` output format for programmatic use
- [ ] Support custom TTL (time-to-live) settings
- [ ] Add `--verbose` flag for debugging
- [ ] Web interface integration
- [ ] Binary file support with base64 encoding

Built for Me. Maybe for You Too.

I'll keep building as more use cases come up. Issues, ideas, weird edge cases — all welcome.

