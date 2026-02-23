# Changelog

## [1.1.0] - 2026-02-23

### Changed
- **Prefixed commands** to avoid conflicts with OpenClaw:
  - `cron` → `ew-cron`
  - `approve` → `ew-approve`
  - `edit` → `ew-edit`
  - `reject` → `ew-reject`

### Fixed
- **Edit command**: Support multiline bodies via stdin pipe
  ```bash
  # Option 1: escaped newlines
  email-workflow ew-edit --uid 148 --body "Line 1\\nLine 2\\nLine 3"
  
  # Option 2: pipe multiline text
  echo -e "Line 1\nLine 2\nLine 3" | email-workflow ew-edit --uid 148
  ```
- **Reject notification**: Now sends Discord notification when rejecting drafts
- **log.error bug**: Fixed crash on workflow errors

## [1.0.0] - 2026-02-05

### Added
- Initial release
- IMAP polling for new emails
- LLM classification via OpenClaw gateway
- Draft generation with reference responses
- Discord notifications
- Approve/Edit/Reject workflow
