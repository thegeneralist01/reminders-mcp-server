#!/usr/bin/env node

/**
 * Reminders MCP Server
 * 
 * An MCP server for controlling macOS Reminders app via AppleScript.
 * Provides tools for creating, reading, updating, and deleting reminders and lists.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { registerReminderTools } from "./tools/reminders.js";
import { registerListTools } from "./tools/lists.js";

/**
 * Initialize the MCP server
 */
const server = new McpServer({
  name: "reminders-mcp-server",
  version: "1.0.0"
});

/**
 * Register all tools
 */
registerReminderTools(server);
registerListTools(server);

/**
 * Run server with stdio transport (for local integration)
 */
async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error("Reminders MCP server running on stdio");
}

/**
 * Run server with HTTP transport (for remote access)
 */
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000');
  app.listen(port, () => {
    console.error(`Reminders MCP server running on http://localhost:${port}/mcp`);
  });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Choose transport based on environment variable
  const transport = process.env.TRANSPORT || 'stdio';
  
  if (transport === 'http') {
    await runHTTP();
  } else {
    await runStdio();
  }
}

// Run the server
main().catch(error => {
  console.error("Server error:", error);
  process.exit(1);
});
