# Reminders MCP Server

A Model Context Protocol (MCP) server for controlling macOS Reminders app via AppleScript. This server enables AI assistants and automation tools to create, read, update, and delete reminders and lists programmatically.

## Features

- ✅ **Full CRUD Operations**: Create, read, update, and delete reminders
- 📋 **List Management**: Create, list, and delete reminder lists
- 🔍 **Smart Search**: Search reminders by name with filtering
- 📅 **Flexible Dates**: Support for timed and all-day due dates, plus notification reminders
- 🎯 **Priority Levels**: Set priorities from 0-9 (low/medium/high)
- 📊 **Pagination**: Handle large result sets efficiently
- 🎨 **Dual Formats**: Output in human-readable Markdown or machine-readable JSON
- 🔒 **Type-Safe**: Built with TypeScript and Zod validation

## Prerequisites

- macOS (for Reminders app and AppleScript)
- Node.js 18+ and npm
- Reminders app installed and accessible

## Installation

```bash
# Clone or download this repository
cd reminders-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### As a Standalone Server

Run with stdio transport (default):
```bash
npm start
```

Run with HTTP transport:
```bash
TRANSPORT=http PORT=3000 npm start
```

### With MCP Inspector

Test your server interactively:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "reminders": {
      "command": "node",
      "args": ["/path/to/reminders-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

### Reminder Operations

#### `reminders_create`
Create a new reminder with optional due dates, notes, and priority.

**Parameters:**
- `name` (string, required): Reminder title
- `listName` (string, required): List to add to
- `body` (string, optional): Notes/details
- `dueDate` (string, optional): Due date with time (ISO 8601)
- `allDayDueDate` (string, optional): All-day due date
- `remindMeDate` (string, optional): Notification time
- `priority` (number, optional): 0-9 (0=none, 1-4=low, 5-8=medium, 9=high)
- `responseFormat` (string, optional): "markdown" or "json"

**Example:**
```json
{
  "name": "Submit quarterly report",
  "listName": "Work",
  "body": "Include sales figures and projections",
  "dueDate": "2024-03-31T17:00:00",
  "priority": 9
}
```

#### `reminders_list`
List reminders with filtering and pagination.

**Parameters:**
- `listName` (string, optional): Filter by list
- `completed` (boolean, optional): Filter by completion status
- `limit` (number, optional): Max results (default: 50, max: 200)
- `offset` (number, optional): Pagination offset
- `responseFormat` (string, optional): "markdown" or "json"

**Example:**
```json
{
  "listName": "Work",
  "completed": false,
  "limit": 20
}
```

#### `reminders_search`
Search reminders by name.

**Parameters:**
- `query` (string, required): Search string
- `listName` (string, optional): Limit to specific list
- `completed` (boolean, optional): Filter by status
- `limit` (number, optional): Max results
- `offset` (number, optional): Pagination offset
- `responseFormat` (string, optional): "markdown" or "json"

**Example:**
```json
{
  "query": "meeting",
  "listName": "Work",
  "completed": false
}
```

#### `reminders_update`
Update an existing reminder.

**Parameters:**
- `listName` (string, required): List containing reminder
- `reminderName` (string, required): Current reminder name
- `newName` (string, optional): New name
- `body` (string, optional): New notes
- `dueDate` (string, optional): New due date
- `allDayDueDate` (string, optional): New all-day date
- `remindMeDate` (string, optional): New notification time
- `priority` (number, optional): New priority
- `completed` (boolean, optional): Mark complete/incomplete
- `responseFormat` (string, optional): "markdown" or "json"

**Example:**
```json
{
  "listName": "Work",
  "reminderName": "Old task name",
  "newName": "Updated task name",
  "completed": true
}
```

#### `reminders_delete`
Delete a reminder permanently.

**Parameters:**
- `listName` (string, required): List containing reminder
- `reminderName` (string, required): Reminder to delete

**Example:**
```json
{
  "listName": "Personal",
  "reminderName": "Completed task"
}
```

### List Operations

#### `reminders_list_lists`
Get all reminder lists.

**Parameters:**
- `responseFormat` (string, optional): "markdown" or "json"

**Example:**
```json
{
  "responseFormat": "json"
}
```

#### `reminders_create_list`
Create a new reminder list.

**Parameters:**
- `name` (string, required): List name (max 200 chars)

**Example:**
```json
{
  "name": "Project Alpha"
}
```

#### `reminders_delete_list`
Delete a list and all its reminders.

**Parameters:**
- `name` (string, required): List name

**Example:**
```json
{
  "name": "Old Project"
}
```

## Date Formats

Dates should be provided in ISO 8601 format:

- **With time**: `"2024-12-31T15:30:00"` (3:30 PM on Dec 31, 2024)
- **All-day**: `"2024-12-31"` (no specific time)
- **With timezone**: `"2024-12-31T15:30:00-08:00"` (PST)

## Priority Levels

- `0`: No priority
- `1-4`: Low priority
- `5-8`: Medium priority
- `9`: High priority

## Response Formats

### Markdown (Default)
Human-readable format with visual structure:
```markdown
## Reminders (3)

### Work (2)

**Submit report** 
  Complete quarterly analysis
  _Due: 3/31/2024, 5:00 PM • Priority: High (9) • List: Work_

**Team meeting** 
  _Due: 3/15/2024, 2:00 PM • Priority: Medium (5) • List: Work_
```

### JSON
Structured data for programmatic use:
```json
{
  "total": 3,
  "count": 3,
  "offset": 0,
  "reminders": [
    {
      "id": "x-apple-reminder://...",
      "name": "Submit report",
      "body": "Complete quarterly analysis",
      "completed": false,
      "dueDate": "2024-03-31T17:00:00.000Z",
      "priority": 9,
      "listName": "Work"
    }
  ],
  "hasMore": false
}
```

## Error Handling

All tools include comprehensive error handling:
- **Invalid dates**: "Invalid date: ..."
- **Missing lists**: "List 'xyz' not found"
- **Missing reminders**: "Reminder not found in specified list"
- **Permission issues**: "AppleScript execution failed: ..."

Errors include helpful tips for resolution.

## Development

### Project Structure
```
reminders-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Shared constants
│   ├── schemas/
│   │   └── index.ts          # Zod validation schemas
│   ├── services/
│   │   ├── applescript.ts    # AppleScript interactions
│   │   └── formatting.ts     # Output formatting
│   └── tools/
│       ├── reminders.ts      # Reminder tools
│       └── lists.ts          # List tools
├── dist/                     # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Build Commands
```bash
# Build TypeScript
npm run build

# Watch mode (auto-rebuild)
npm run dev

# Start server
npm start
```

### Testing
```bash
# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js

# Manual AppleScript test
osascript -e 'tell application "Reminders" to get name of every list'
```

## Limitations

- **macOS Only**: Requires macOS and the Reminders app
- **AppleScript Permissions**: May require granting automation permissions
- **Local Only**: Must run on the same machine as Reminders app
- **List Identification**: Identifies reminders by name within lists (not by ID)
- **Tags**: AppleScript doesn't support Reminders tags directly

## Troubleshooting

### Permission Errors
Grant automation permissions:
1. Open System Settings → Privacy & Security → Automation
2. Enable permissions for Terminal/Node/your client app to control Reminders

### "List not found"
- Verify list name is exact (case-sensitive)
- Use `reminders_list_lists` to see available lists

### Date Parsing Errors
- Ensure dates are in ISO 8601 format
- Example: `"2024-12-31T15:00:00"` not `"12/31/2024 3pm"`

### AppleScript Execution Failed
- Check Reminders app is installed and working
- Try running a simple AppleScript manually to test permissions
- Restart Terminal/Node if permissions were just granted

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- TypeScript compiles without errors (`npm run build`)
- All schemas use `.strict()` validation
- Tool descriptions include comprehensive examples
- Error messages are actionable and helpful

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
