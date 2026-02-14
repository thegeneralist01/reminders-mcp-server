/**
 * Tool implementations for list management
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListListsSchema,
  CreateListSchema,
  DeleteListSchema
} from "../schemas/index.js";
import * as remindersService from "../services/eventkit.js";
import { formatListsMarkdown } from "../services/formatting.js";
import { ResponseFormat } from "../types.js";
import type { z } from "zod";

export function registerListTools(server: McpServer): void {
  /**
   * List all reminder lists
   */
  server.registerTool(
    "reminders_list_lists",
    {
      title: "List Reminder Lists",
      description: `Get all reminder lists from macOS Reminders app.

Returns all available lists (e.g., "Personal", "Work", "Shared", etc.) that can be used for organizing reminders.

Args:
  - responseFormat ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON: Array of list objects with:
    - id (string): Unique list ID
    - name (string): List display name
  
  For Markdown: Formatted list of list names.

Examples:
  - Get all lists: {}
  - Get as JSON: {responseFormat: "json"}

Use this tool to:
  - Discover available lists before creating reminders
  - Verify list names for other operations
  - See list organization structure

Error Handling:
  - Returns empty array if no lists exist (unusual - Reminders typically has default lists)`,
      inputSchema: ListListsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof ListListsSchema>) => {
      try {
        const lists = await remindersService.getLists();

        const output = {
          total: lists.length,
          lists
        };

        if (params.responseFormat === ResponseFormat.JSON) {
          return {
            content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
            structuredContent: output
          };
        }

        const text = `## Reminder Lists (${lists.length})\n\n${formatListsMarkdown(lists)}`;
        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error listing lists: ${errorMsg}`
          }]
        };
      }
    }
  );

  /**
   * Create a new list
   */
  server.registerTool(
    "reminders_create_list",
    {
      title: "Create Reminder List",
      description: `Create a new list in macOS Reminders app.

Creates a new organizational list for grouping related reminders.

Args:
  - name (string): Name for the new list (required, max 200 chars)

Returns:
  Success message with the new list ID.

Examples:
  - Create list: {name: "Groceries"}
  - Project list: {name: "Project Alpha"}
  - Personal list: {name: "Home Maintenance"}

Use this tool to:
  - Organize reminders into categories
  - Set up new projects or areas
  - Create shared lists (if iCloud sharing is configured)

Error Handling:
  - Returns error if list name already exists
  - Returns error if name is empty or too long`,
      inputSchema: CreateListSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof CreateListSchema>) => {
      try {
        const id = await remindersService.createList(params.name);

        const output = {
          success: true,
          id,
          name: params.name
        };

        const text = `✓ Created list: **${params.name}**\n\nID: ${id}`;
        return {
          content: [{ type: "text", text }],
          structuredContent: output
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error creating list: ${errorMsg}\n\nTip: Ensure the list name doesn't already exist`
          }]
        };
      }
    }
  );

  /**
   * Delete a list
   */
  server.registerTool(
    "reminders_delete_list",
    {
      title: "Delete Reminder List",
      description: `Delete a list from macOS Reminders app.

Permanently removes a list and ALL reminders contained within it. This action cannot be undone.

Args:
  - name (string): Name of the list to delete (required)

Returns:
  Success confirmation message.

Examples:
  - Delete list: {name: "Old Project"}
  - Clean up: {name: "Completed Tasks"}

WARNING:
  - This deletes ALL reminders in the list
  - Action is permanent and cannot be undone
  - Default system lists may not be deletable

Error Handling:
  - Returns error if list doesn't exist
  - Returns error if list cannot be deleted (e.g., system lists)`,
      inputSchema: DeleteListSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof DeleteListSchema>) => {
      try {
        await remindersService.deleteList(params.name);

        const text = `✓ Deleted list: **${params.name}**\n\n⚠️ All reminders in this list have been permanently removed.`;
        return {
          content: [{ type: "text", text }]
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          isError: true,
          content: [{
            type: "text",
            text: `Error deleting list: ${errorMsg}\n\nTip: Ensure the list exists and is not a system list`
          }]
        };
      }
    }
  );
}
