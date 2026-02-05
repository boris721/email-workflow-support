# Email Support Workflow

A modular, reusable Node.js system for automating email support using LLMs.

## Features
- **IMAP Polling:** Checks for new emails automatically.
- **LLM Classification:** Classifies emails against a knowledge base and drafts replies.
- **Discord Integration:** Posts drafts to Discord for approval.
- **Human-in-the-loop:** Approve, edit, or reject drafts via CLI or Discord commands.
- **Reference Learning:** Automatically adds approved replies to the knowledge base.

## Installation

```bash
git clone <repo>
cd email-support-workflow
npm install
npm link # Optional, to have email-workflow in PATH
```

## Configuration

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Ensure you have `reference-responses.json` in your data directory (or configure the path).

## Usage

### Cron Loop
Run this frequently (e.g., every 5 mins):
```bash
./bin/email-workflow.js cron
```

### Manual Actions
```bash
# Approve a draft (sends email)
./bin/email-workflow.js approve --uid 123

# Approve and add to knowledge base
./bin/email-workflow.js approve --uid 123 --add-ref

# Edit a draft
./bin/email-workflow.js edit --uid 123 --body "New text..."

# Reject a draft
./bin/email-workflow.js reject --uid 123
```

## Architecture
- `src/imap.js`: IMAP handling
- `src/send.js`: SMTP handling
- `src/classify.js`: LLM classification logic
- `src/state.js`: State machine persistence
- `src/notify.js`: Discord notifications

## Testing
```bash
npm test
```
