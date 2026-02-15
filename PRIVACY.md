# Privacy Policy

_Last updated: 2026-02-14_

This privacy policy applies to `reminders-mcp-server`.

## What this MCP server does

`reminders-mcp-server` reads and writes reminder data in the local macOS Reminders database through Apple's EventKit framework, only in response to explicit MCP tool calls.

## Data collection and use

- **Primary data processed:** reminder list names, reminder titles, reminder notes, due dates, reminder completion status, and reminder priority.
- **Source of data:** the local macOS Reminders account(s) accessible to the current macOS user session.
- **Purpose limitation:** data is used only to fulfill the user-invoked tool request (create/list/search/update/delete reminders/lists).
- **No extraneous conversation logging:** this project does not implement persistent logging of conversation transcripts or arbitrary surrounding context.

## Data retention

- This server does not create its own persistent datastore.
- Reminder and list changes are retained only in Apple Reminders (managed by the user’s Apple ecosystem and settings).
- Runtime stderr/stdout output is limited to operational messages and errors.

## Data sharing

- This server does not transmit reminder data to third-party APIs by design.
- No outbound network calls are required for core functionality.

## User controls

- Users can revoke Reminders/Calendars permissions in macOS Privacy & Security settings at any time.
- Users can remove or edit reminders directly in Apple Reminders.
- Users can uninstall the MCP server to stop all processing.

## Security considerations

- Access control for reminder data is enforced by macOS permission prompts and OS-level privacy controls.
- The server is intended for local use via MCP stdio transport.

## Contact

For privacy questions or requests:
- GitHub Issues: https://github.com/thegeneralist01/reminders-mcp-server/issues
- Email: thegeneralist01@gmail.com
