/**
 * Shared constants for Reminders MCP Server
 */

export const CHARACTER_LIMIT = 50000;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// AppleScript property mappings
export const APPLESCRIPT_PROPS = {
  NAME: "name",
  BODY: "body",
  COMPLETED: "completed",
  COMPLETION_DATE: "completion date",
  DUE_DATE: "due date",
  ALLDAY_DUE_DATE: "allday due date",
  REMIND_ME_DATE: "remind me date",
  PRIORITY: "priority",
  CREATION_DATE: "creation date",
  MODIFICATION_DATE: "modification date",
  ID: "id"
} as const;

// Priority levels (0-9, where 0 is no priority)
export const PRIORITY = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 5,
  HIGH: 9
} as const;
