# 📬 Email Support Workflow

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Automated email support pipeline with LLM-powered classification and human-in-the-loop approval.**

Stop manually answering the same support emails over and over. This tool watches your inbox, classifies incoming emails against a knowledge base of reference responses, drafts replies using an LLM, and posts them to Discord for your team to review before sending. Fully config-driven — works for any SaaS product.

---

## How It Works

The workflow runs as a simple state machine, driven by a cron job:

```
IDLE → PENDING → DRAFTED → AWAITING → (approve) → IDLE
 │         │          │          │
 │  fetch  │ classify │  notify  │  human review
 │  inbox  │  via LLM │  Discord │  approve/edit/reject
```

1. **IDLE** — Polls your IMAP inbox for new emails
2. **PENDING** — New emails found, sends them to the LLM for classification
3. **DRAFTED** — LLM returns draft replies, posts previews to Discord
4. **AWAITING** — Waits for a human to approve, edit, or reject each draft
5. On approval, the reply is sent via SMTP and the cycle resets

Each cron run advances the state by one step. Spam and automated notifications are detected and ignored automatically.

---

## ✨ Features

- **IMAP polling** — Watches any IMAP mailbox for new support emails
- **LLM classification** — Matches emails against your knowledge base and drafts context-aware replies
- **Multi-language** — Detects the sender's language and replies in kind
- **Human-in-the-loop** — Nothing gets sent without explicit approval
- **Discord notifications** — Posts draft previews with original email + proposed reply for team review
- **Knowledge base growth** — Optionally adds approved replies back to the reference library (`--add-ref`)
- **Config-driven** — Works for any product; just update your `.env` and reference responses
- **Multi-instance** — Configurable `DATA_DIR` lets you run separate instances per product/agent
- **JSON config alternative** — Pass a `config.json` instead of (or alongside) environment variables
- **File-based state** — No database required; state is persisted as simple JSON files
- **Cron-friendly** — Designed to run every few minutes via cron or systemd timer

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (uses native `fetch`)
- An IMAP/SMTP email account (e.g., Gmail, Fastmail, any provider)
- [OpenClaw](https://github.com/openclaw/openclaw) running locally (for LLM access), or adapt `src/llm.js` for direct API calls
- A Discord channel + bot (optional, for notifications)

### Setup

```bash
# Clone the repository
git clone https://github.com/boris721/email-workflow-support.git
cd email-workflow-support

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Create your knowledge base (or copy the example)
cp reference-responses.example.json data/reference-responses.json

# (Optional) Make the CLI globally available
npm link

# Run the workflow
./bin/email-workflow cron
```

The first run establishes a UID baseline for your inbox — it won't process old emails. Subsequent runs will pick up anything new.

---

## ⚙️ Configuration

Configuration is loaded from environment variables (`.env`) and/or a JSON config file. The JSON file takes precedence where both are set.

### Environment Variables (`.env`)

See [`.env.example`](.env.example) for a fully commented template. Key variables:

| Variable | Description |
|---|---|
| `SERVICE_NAME` | Your product/service name (used in logs) |
| `IMAP_HOST` / `IMAP_PORT` | IMAP server connection |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server connection |
| `EMAIL_USER` / `EMAIL_PASS` | Email account credentials (used for both IMAP & SMTP) |
| `SMTP_FROM_NAME` | Display name for outgoing emails (e.g., "Acme Support") |
| `OPENCLAW_GATEWAY_PORT` | Port for the OpenClaw gateway (default: `18789`) |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token for the gateway (or use `CLAWD_TOKEN`) |
| `REFERENCES_FILE` | Path to your reference responses JSON |
| `DISCORD_CHANNEL_ID` | Discord channel for draft notifications |
| `DATA_DIR` | Custom data directory path (default: `./data/`). Allows multiple instances with separate state. |

### JSON Config File

Pass `--config path/to/config.json` to the CLI. See [`config.example.json`](config.example.json) for the full structure.

```bash
./bin/email-workflow cron --config ./my-config.json
```

---

## 🔧 CLI Commands

| Command | Description |
|---|---|
| `cron` | Run one cycle of the state machine (fetch → classify → notify) |
| `approve [--uid N]` | Approve and send draft(s). Omit `--uid` to approve all. |
| `approve --uid N --add-ref` | Approve, send, and add the response to the knowledge base |
| `edit --uid N --body "..."` | Edit a draft's reply text (triggers re-notification on next cron) |
  > **Tip:** Use `\\n` literals for newlines in the body, e.g., `edit --uid 42 --body "Hello,\n\nThank you for reaching out.\n\nBest regards,\nSupport Team"` |
| `reject [--uid N]` | Reject draft(s) without sending. Omit `--uid` to reject all. |

All commands accept `--config <path>` to load a JSON config file.

```bash
# Run the main loop
./bin/email-workflow cron

# Approve a specific draft
./bin/email-workflow approve --uid 42

# Approve and learn from it
./bin/email-workflow approve --uid 42 --add-ref

# Edit before approving
./bin/email-workflow edit --uid 42 --body "Thanks for reaching out! ..."

# Reject a draft
./bin/email-workflow reject --uid 42
```

---

## 🏗️ Architecture

```
bin/
  email-workflow     # CLI entry point (Commander.js)
src/
  config.js             # Loads config from .env + optional JSON file
  imap.js               # IMAP service — connects, fetches new emails
  send.js               # SMTP service — sends approved replies
  classify.js           # LLM classifier — matches emails to references, drafts replies
  llm.js                # OpenClaw gateway HTTP client (llm-task tool)
  reference.js          # Reference library — load/save/add entries
  state.js              # File-based state machine (IDLE → PENDING → DRAFTED → AWAITING)
  notify.js             # Discord notification service
  index.js              # Barrel export
data/
  reference-responses.json   # Your knowledge base (gitignored)
  pending-emails.json        # Transient: emails awaiting classification
  drafts.json                # Transient: LLM-generated draft replies
  imap-state.json            # Tracks last seen IMAP UID
test/
  classify.test.js      # Classifier unit tests
  imap.test.js          # IMAP service tests
  state.test.js         # State machine tests
```

---

## 💬 Integration with Discord

The workflow posts draft previews to a Discord channel so your team can review them. Each notification includes:

- The original email (sender, subject, body excerpt)
- The LLM's classification (category, confidence, language)
- The proposed reply

Your team can then use CLI commands (`approve`, `edit`, `reject`) to take action — or you can wire up a Discord bot to handle these commands directly.

**Setup:**
1. Create a Discord bot and add it to your server
2. Set `DISCORD_CHANNEL_ID` in your `.env`
3. The notification service uses OpenClaw's `message send` CLI under the hood

---

## 🤖 Integration with OpenClaw

This project uses [OpenClaw](https://github.com/openclaw/openclaw)'s `llm-task` gateway to access LLMs. The gateway runs locally and provides a unified HTTP API for structured JSON responses with schema validation.

**How it works:**
- `src/llm.js` sends a POST request to `http://127.0.0.1:{port}/tools/invoke` with the prompt, input data, and a JSON schema
- The gateway routes the request to the configured LLM provider (OpenAI, Anthropic, etc.)
- The response is validated against the schema and returned as structured JSON

**This is optional.** If you don't want to use OpenClaw, you can replace `src/llm.js` with direct calls to the OpenAI or Anthropic API. The `callLlmTask` function has a simple interface — just swap the HTTP call for your preferred SDK.

---

## 📚 Reference Responses

The knowledge base is a JSON array of reference entries. Each entry describes a support topic with metadata and pre-written responses in one or more languages.

See [`reference-responses.example.json`](reference-responses.example.json) for the format.

```json
{
  "id": "password-reset",
  "category": "account",
  "keywords": ["password", "reset", "forgot", "login"],
  "languages": ["en", "de"],
  "question_summary": "User wants to reset their password",
  "reference_response_en": "To reset your password, go to ...",
  "reference_response_de": "Um Ihr Passwort zurückzusetzen, gehen Sie zu ..."
}
```

**Fields:**
- `id` — Unique kebab-case identifier
- `category` — Topic category (e.g., `account`, `billing`, `technical`, `general`)
- `keywords` — Search terms for matching (multi-language)
- `languages` — Which languages have reference responses
- `question_summary` — One-line description of the support topic
- `reference_response_{lang}` — The template response in each language

The LLM uses these as templates — it adapts the tone and content to each specific email rather than copy-pasting them verbatim.

When you approve a draft with `--add-ref`, the system uses the LLM to generate metadata and adds the new entry automatically.

---

## ⏰ Running as Cron

The workflow is designed to run on a schedule. Each invocation advances the state machine by one step.

```bash
# Edit your crontab
crontab -e

# Run every 5 minutes
*/5 * * * * cd /path/to/email-workflow-support && /usr/local/bin/node ./bin/email-workflow cron >> ./logs/cron.log 2>&1
```

**Tips:**
- Use full paths in cron (Node.js binary, project directory)
- Redirect output to a log file for debugging
- The state machine is idempotent — running it more frequently than needed is harmless
- If you need the OpenClaw gateway, make sure it's running before the cron fires

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npx vitest run --coverage
```

Tests are in the `test/` directory and use [Vitest](https://vitest.dev/).

---

## 🤝 Contributing

Contributions are welcome! This project is intentionally simple and modular — feel free to open issues or PRs.

Some ideas:
- Slack/Telegram notification adapters
- Web UI for draft review
- Direct OpenAI/Anthropic SDK integration (replacing the gateway dependency)
- Email threading and conversation history
- Attachment handling

---

## 📄 License

[MIT](LICENSE) © 2026 Paul Panserrieu & Boris
