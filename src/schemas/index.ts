/**
 * Zod validation schemas for Reminders tools
 */

import { z } from "zod";
import { ResponseFormat } from "../types.js";
import { DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

/**
 * Schema for creating a reminder
 */
export const CreateReminderSchema = z.object({
  name: z.string()
    .min(1, "Reminder name is required")
    .max(500, "Reminder name must not exceed 500 characters")
    .describe("Name/title of the reminder"),
  listName: z.string()
    .min(1, "List name is required")
    .describe("Name of the list to add the reminder to"),
  body: z.string()
    .max(5000, "Body must not exceed 5000 characters")
    .optional()
    .describe("Optional notes/body text for the reminder"),
  dueDate: z.string()
    .optional()
    .describe("Optional due date with time (ISO 8601 format, e.g., '2024-12-31T15:00:00')"),
  allDayDueDate: z.string()
    .optional()
    .describe("Optional all-day due date without time (ISO 8601 format, e.g., '2024-12-31')"),
  remindMeDate: z.string()
    .optional()
    .describe("Optional date/time for notification alert (ISO 8601 format)"),
  priority: z.number()
    .int()
    .min(0, "Priority must be between 0-9")
    .max(9, "Priority must be between 0-9")
    .optional()
    .describe("Priority level (0=none, 1-4=low, 5-8=medium, 9=high)"),
  responseFormat: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

/**
 * Schema for listing reminders
 */
export const ListRemindersSchema = z.object({
  listName: z.string()
    .optional()
    .describe("Optional: Filter by specific list name. If omitted, shows all reminders from all lists"),
  completed: z.boolean()
    .optional()
    .describe("Optional: Filter by completion status (true=completed, false=incomplete)"),
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Maximum number of reminders to return (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT})`),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of reminders to skip for pagination (default: 0)"),
  responseFormat: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

/**
 * Schema for updating a reminder
 */
export const UpdateReminderSchema = z.object({
  listName: z.string()
    .min(1, "List name is required")
    .describe("Name of the list containing the reminder"),
  reminderName: z.string()
    .min(1, "Reminder name is required")
    .describe("Current name of the reminder to update"),
  newName: z.string()
    .max(500, "New name must not exceed 500 characters")
    .optional()
    .describe("New name for the reminder"),
  body: z.string()
    .max(5000, "Body must not exceed 5000 characters")
    .optional()
    .describe("New notes/body text"),
  dueDate: z.string()
    .optional()
    .describe("New due date with time (ISO 8601 format)"),
  allDayDueDate: z.string()
    .optional()
    .describe("New all-day due date without time (ISO 8601 format)"),
  remindMeDate: z.string()
    .optional()
    .describe("New notification date/time (ISO 8601 format)"),
  priority: z.number()
    .int()
    .min(0)
    .max(9)
    .optional()
    .describe("New priority level (0-9)"),
  completed: z.boolean()
    .optional()
    .describe("Mark as completed (true) or incomplete (false)"),
  responseFormat: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

/**
 * Schema for deleting a reminder
 */
export const DeleteReminderSchema = z.object({
  listName: z.string()
    .min(1, "List name is required")
    .describe("Name of the list containing the reminder"),
  reminderName: z.string()
    .min(1, "Reminder name is required")
    .describe("Name of the reminder to delete")
}).strict();

/**
 * Schema for listing reminder lists
 */
export const ListListsSchema = z.object({
  responseFormat: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();

/**
 * Schema for creating a list
 */
export const CreateListSchema = z.object({
  name: z.string()
    .min(1, "List name is required")
    .max(200, "List name must not exceed 200 characters")
    .describe("Name for the new reminder list")
}).strict();

/**
 * Schema for deleting a list
 */
export const DeleteListSchema = z.object({
  name: z.string()
    .min(1, "List name is required")
    .describe("Name of the list to delete")
}).strict();

/**
 * Schema for searching reminders
 */
export const SearchRemindersSchema = z.object({
  query: z.string()
    .min(1, "Search query is required")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search string to match against reminder names"),
  listName: z.string()
    .optional()
    .describe("Optional: Limit search to specific list"),
  completed: z.boolean()
    .optional()
    .describe("Optional: Filter by completion status"),
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe(`Maximum results to return (default: ${DEFAULT_LIMIT})`),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of results to skip for pagination"),
  responseFormat: z.nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable")
}).strict();
