/**
 * Tool implementations for reminder operations
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CreateReminderSchema,
  ListRemindersSchema,
  UpdateReminderSchema,
  DeleteReminderSchema,
  SearchRemindersSchema
} from "../schemas/index.js";
import * as remindersService from "../services/eventkit.js";
import { formatRemindersMarkdown } from "../services/formatting.js";
import { ResponseFormat } from "../types.js";
import type { z } from "zod";

export function registerReminderTools(server: McpServer): void {
  /**
   * Create a new reminder
   */
  server.registerTool(
    "reminders_create",
    {
      title: "Create Reminder",
      description: `Create a new reminder in the macOS Reminders app.

This tool adds a reminder to a specified list with optional due dates, notes, priority, and notification settings.

Args:
  - name (string): Name/title of the reminder (required, max 500 chars)
  - listName (string): Name of the list to add to (required, e.g., "Personal", "Work")
  - body (string): Optional notes/details (max 5000 chars)
  - dueDate (string): Optional due date with time in ISO 8601 format (e.g., "2024-12-31T15:00:00")
  - allDayDueDate (string): Optional all-day due date without time (e.g., "2024-12-31")
  - remindMeDate (string): Optional notification date/time in ISO 8601 format
  - priority (number): Optional priority 0-9 (0=none, 1-4=low, 5-8=medium, 9=high)
  - responseFormat ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Success message with reminder ID in either markdown or JSON format.

Examples:
  - Simple reminder: {name: "Buy milk", listName: "Personal"}
  - With due date: {name: "Submit report", listName: "Work", dueDate: "2024-03-15T17:00:00"}
  - All-day reminder: {name: "Birthday party", listName: "Personal", allDayDueDate: "2024-06-15"}
  - High priority: {name: "Urgent task", listName: "Work", priority: 9, body: "Details here"}

Error Handling:
  - Returns error if list doesn't exist: "List 'xyz' not found"
  - Returns error for invalid date format
  - Returns error if Reminders app is not accessible`,
      inputSchema: CreateReminderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        // Search is limited to local Apple Reminders data and does not access external resources.
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof CreateReminderSchema>) => {
      try {
        const id = await remindersService.createReminder({
          name: params.name,
          listName: params.listName,
          body: params.body,
          dueDate: params.dueDate,
          allDayDueDate: params.allDayDueDate,
          remindMeDate: params.remindMeDate,
          priority: params.priority
        });

        const output = {
          success: true,
          id,
          name: params.name,
          listName: params.listName
        };

        if (params.responseFormat === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output
          };
        }

        const text = `✓ Created reminder: **${params.name}** in list **${params.listName}**\n\nID: ${id}`;
        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating reminder: ${errorMsg}\n\nTip: Ensure the list exists and dates are in ISO 8601 format (e.g., "2024-12-31T15:00:00")`
          }]
        };
      }
    }
  );

  /**
   * List reminders
   */
  server.registerTool(
    "reminders_list",
    {
      title: "List Reminders",
      description: `List reminders from macOS Reminders app with optional filtering.

Retrieves reminders from one or all lists, with options to filter by completion status and paginate results.

Args:
  - listName (string): Optional list name to filter by. If omitted, shows all reminders
  - completed (boolean): Optional filter - true for completed, false for incomplete
  - limit (number): Max results to return (1-200, default: 50)
  - offset (number): Results to skip for pagination (default: 0)
  - responseFormat ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON: Structured data with array of reminders, each containing:
    - id (string): Unique reminder ID
    - name (string): Reminder title
    - body (string): Notes/details (if any)
    - completed (boolean): Completion status
    - dueDate (string): Due date/time (if set)
    - priority (number): Priority level 0-9
    - listName (string): List containing this reminder
  
  For Markdown: Formatted list grouped by list name with counts.

Examples:
  - All incomplete: {completed: false}
  - Work list only: {listName: "Work"}
  - Paginated: {limit: 20, offset: 0} for first page, {limit: 20, offset: 20} for second
  - Completed in Personal: {listName: "Personal", completed: true}

Error Handling:
  - Returns empty result if no reminders found
  - Returns error if specified list doesn't exist`,
      inputSchema: ListRemindersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        // This tool only searches local Reminders data and does not access external resources.
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof ListRemindersSchema>) => {
      try {
        const paged = await remindersService.getPaginatedReminders({
          listName: params.listName,
          completed: params.completed,
          limit: params.limit,
          offset: params.offset
        });

        const total = paged.total;
        const paginatedReminders = paged.reminders;

        const hasMore = params.offset + params.limit < total;

        const output = {
          total,
          count: paginatedReminders.length,
          offset: params.offset,
          reminders: paginatedReminders,
          hasMore,
          ...(hasMore ? { nextOffset: params.offset + params.limit } : {})
        };

        if (params.responseFormat === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output
          };
        }

        let text = `## Reminders (${paginatedReminders.length} of ${total})\n\n`;
        text += formatRemindersMarkdown(paginatedReminders);
        
        if (hasMore) {
          text += `\n\n_Use offset: ${params.offset + params.limit} to see more_`;
        }

        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error listing reminders: ${errorMsg}`
          }]
        };
      }
    }
  );

  /**
   * Update a reminder
   */
  server.registerTool(
    "reminders_update",
    {
      title: "Update Reminder",
      description: `Update an existing reminder in macOS Reminders app.

Modify one or more properties of a reminder including name, notes, dates, priority, and completion status.

Args:
  - listName (string): List containing the reminder (required)
  - reminderName (string): Current name of the reminder (required)
  - newName (string): New name for the reminder (optional)
  - body (string): New notes/details (optional)
  - dueDate (string): New due date with time in ISO 8601 format (optional)
  - allDayDueDate (string): New all-day due date (optional)
  - remindMeDate (string): New notification time (optional)
  - priority (number): New priority 0-9 (optional)
  - completed (boolean): Mark as completed/incomplete (optional)
  - responseFormat ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Success confirmation message.

Examples:
  - Mark complete: {listName: "Work", reminderName: "Submit report", completed: true}
  - Change name: {listName: "Personal", reminderName: "Buy milk", newName: "Buy milk and eggs"}
  - Update priority: {listName: "Work", reminderName: "Review doc", priority: 9}
  - Multiple changes: {listName: "Work", reminderName: "Task", newName: "New name", body: "New notes", completed: true}

Error Handling:
  - Returns error if reminder not found in specified list
  - Returns error for invalid date formats
  - Requires at least one field to update`,
      inputSchema: UpdateReminderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        // This tool only searches local Reminders data and does not access external resources.
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof UpdateReminderSchema>) => {
      try {
        await remindersService.updateReminder({
          listName: params.listName,
          reminderName: params.reminderName,
          newName: params.newName,
          body: params.body,
          dueDate: params.dueDate,
          allDayDueDate: params.allDayDueDate,
          remindMeDate: params.remindMeDate,
          priority: params.priority,
          completed: params.completed
        });

        const output = {
          success: true,
          reminderName: params.reminderName,
          listName: params.listName
        };

        if (params.responseFormat === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output
          };
        }

        const text = `✓ Updated reminder: **${params.reminderName}** in list **${params.listName}**`;
        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error updating reminder: ${errorMsg}\n\nTip: Ensure the reminder exists in the specified list`
          }]
        };
      }
    }
  );

  /**
   * Delete a reminder
   */
  server.registerTool(
    "reminders_delete",
    {
      title: "Delete Reminder",
      description: `Delete a reminder from macOS Reminders app.

Permanently removes a reminder from a specified list. This action cannot be undone.

Args:
  - listName (string): List containing the reminder (required)
  - reminderName (string): Name of the reminder to delete (required)

Returns:
  Success confirmation message.

Examples:
  - Delete: {listName: "Personal", reminderName: "Old task"}
  - Delete completed: {listName: "Work", reminderName: "Finished project"}

Error Handling:
  - Returns error if reminder not found in specified list
  - Returns error if list doesn't exist`,
      inputSchema: DeleteReminderSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof DeleteReminderSchema>) => {
      try {
        await remindersService.deleteReminder(params.listName, params.reminderName);

        const text = `✓ Deleted reminder: **${params.reminderName}** from list **${params.listName}**`;
        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting reminder: ${errorMsg}\n\nTip: Ensure the reminder exists in the specified list`
          }]
        };
      }
    }
  );

  /**
   * Search reminders
   */
  server.registerTool(
    "reminders_search",
    {
      title: "Search Reminders",
      description: `Search for reminders by name across all or specific lists.

Searches reminder names for matches to the query string (case-insensitive partial match).

Args:
  - query (string): Search string to match (required, max 200 chars)
  - listName (string): Optional list to search within
  - completed (boolean): Optional filter by completion status
  - limit (number): Max results (1-200, default: 50)
  - offset (number): Results to skip for pagination (default: 0)
  - responseFormat ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Matching reminders with same structure as list tool.

Examples:
  - Search all: {query: "meeting"}
  - Search in Work: {query: "report", listName: "Work"}
  - Find incomplete: {query: "buy", completed: false}

Error Handling:
  - Returns empty result if no matches found`,
      inputSchema: SearchRemindersSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        // This tool only searches local Reminders data and does not access external resources.
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof SearchRemindersSchema>) => {
      try {
        const allReminders = await remindersService.getReminders({
          listName: params.listName,
          completed: params.completed
        });

        // Filter by query (case-insensitive)
        const queryLower = params.query.toLowerCase();
        const matchedReminders = allReminders.filter(r => 
          r.name.toLowerCase().includes(queryLower)
        );

        const total = matchedReminders.length;
        const paginatedReminders = matchedReminders.slice(params.offset, params.offset + params.limit);
        const hasMore = params.offset + params.limit < total;

        const output = {
          total,
          count: paginatedReminders.length,
          offset: params.offset,
          query: params.query,
          reminders: paginatedReminders,
          hasMore,
          ...(hasMore ? { nextOffset: params.offset + params.limit } : {})
        };

        if (params.responseFormat === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output
          };
        }

        let text = `## Search Results for "${params.query}" (${paginatedReminders.length} of ${total})\n\n`;
        
        if (paginatedReminders.length === 0) {
          text += `No reminders found matching "${params.query}"`;
        } else {
          text += formatRemindersMarkdown(paginatedReminders);
          
          if (hasMore) {
            text += `\n\n_Use offset: ${params.offset + params.limit} to see more_`;
          }
        }

        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error searching reminders: ${errorMsg}`
          }]
        };
      }
    }
  );
}
