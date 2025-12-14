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
  const server = new Server(SERVER_INFO, {
    capabilities: {
      tools: {},
    },
  });

  /**
   * Handle tool listing
   *
   * Returns available MCP tools to the client.
   * Initially empty - tools will be registered in subsequent implementation phases.
   */
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Tools will be registered here in Phase 2
        // Example: braiins_hashrate_stats, braiins_difficulty_stats, etc.
      ],
    };
  });

  /**
   * Handle tool execution
   *
   * Routes tool calls to appropriate handlers.
   * Currently returns error - will be implemented in Phase 2.
   */
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    // Tool routing will be implemented in Phase 2
    throw new Error(
      `Tool "${name}" not implemented yet. This is a placeholder server for TypeScript compilation verification.`
    );
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
