#!/usr/bin/env node

/**
 * Braiins Insights MCP Server Entry Point
 *
 * Model Context Protocol server for Braiins Insights Dashboard API.
 * Provides 17+ tools for querying Bitcoin network analytics, mining statistics,
 * and profitability metrics through MCP-compatible AI assistants.
 *
 * @see https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server
 * @see https://modelcontextprotocol.io
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createInsightsClient } from './api/insights-client.js';
import { getAllTools } from './tools/index.js';

/**
 * Server configuration
 */
const SERVER_INFO = {
  name: 'braiins-insights-mcp-server',
  version: '0.1.0',
};

/**
 * Initialize MCP server
 */
async function main(): Promise<void> {
  // Initialize API client
  const apiClient = createInsightsClient();

  // Get all registered tools
  const tools = getAllTools(apiClient);

  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  /**
   * Handle tool listing
   *
   * Returns available MCP tools to the client.
   */
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  /**
   * Handle tool execution
   *
   * Routes tool calls to appropriate handlers.
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Find the tool
    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Execute the tool
    const result = await tool.execute(args ?? {});

    // Return only the content array (MCP SDK format)
    return {
      content: result.content,
    };
  });

  /**
   * Start server with stdio transport
   */
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Braiins Insights MCP Server running on stdio');
  console.error(`Version: ${SERVER_INFO.version}`);
  console.error('Ready to accept MCP requests');
}

/**
 * Error handling for top-level async
 */
main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
