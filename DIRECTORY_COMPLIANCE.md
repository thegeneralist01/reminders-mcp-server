# Anthropic Directory Compliance Notes

_Last reviewed: 2026-02-14_

This document maps `reminders-mcp-server` to the Anthropic Software Directory Policy requirements.

## Scope and product classification

- Software type: MCP server.
- Default mode: local (stdio) use on macOS.
- Service scope: Apple Reminders only.
- External service orchestration: not supported.

## Safety and Security

- The server only exposes task/list management for Apple Reminders and is not designed to bypass model safety policies.
- Tooling is human-readable and static; no hidden/encoded instruction channels are used.
- The implementation does not query Claude memory/chat-history or uploaded files.
- Data minimization: only tool-requested reminder fields are handled.
- Privacy policy: see [`PRIVACY.md`](./PRIVACY.md).

## Compatibility

- Tool descriptions and schemas are scoped to explicit reminder/list operations.
- Each tool defines `title`, `readOnlyHint`, and `destructiveHint` annotations.
- Tool names are within 64-character maximum.
- Tool behavior is implemented to match tool descriptions.

## MCP-specific functionality

- Error handling returns actionable text for common user issues (missing lists, invalid dates, permissions).
- Responses support `markdown` and `json` formats to balance readability and token frugality.
- Streamable HTTP transport is supported for optional HTTP mode.
- Dependencies are pinned to reasonably current versions in `package.json`.

## Developer requirements

- Contact/support channels are provided in README and privacy policy.
- Product purpose, setup, and troubleshooting are documented in README.
- Test account requirement: not applicable to this local-only server because no remote account/authentication is required; validation can be performed against a local macOS user profile with sample reminders.
- Prompt examples: see README section “Directory Prompt Examples (Core Use Cases)”.
- Endpoint ownership: server does not connect to third-party API endpoints.

## Unsupported use cases attestation

This server does **not**:
- transfer funds or execute financial transactions;
- generate AI image/video/audio content;
- run cross-service automations;
- serve ads/sponsored placements.
