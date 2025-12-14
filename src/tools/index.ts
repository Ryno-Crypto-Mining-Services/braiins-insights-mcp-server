/**
 * MCP Tool Registry
 *
 * Central registration point for all MCP tools.
 * Tools are organized by category: simple, parameterized, historical, composite.
 */

import { HashrateStatsTool } from './simple/hashrate-stats.js';

/**
 * Tool registry interface
 *
 * All tools must implement this interface to be registered.
 */
export interface MCPTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  execute(input: unknown): Promise<MCPToolResponse>;
}

/**
 * MCP tool response format
 */
export interface MCPToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

/**
 * Tool categories for organization
 */
export enum ToolCategory {
  Simple = 'simple', // No parameters (hashrate-stats, difficulty-stats)
  Parameterized = 'parameterized', // Requires input (profitability-calculator)
  Historical = 'historical', // Time-series data (hashrate-history)
  Composite = 'composite', // Multi-endpoint aggregators
}

/**
 * Get all registered tools
 *
 * @returns Array of tool instances ready for MCP registration
 *
 * @example
 * ```typescript
 * const tools = getAllTools();
 * tools.forEach(tool => server.registerTool(tool));
 * ```
 */
export function getAllTools(): MCPTool[] {
  // Placeholder: Only hashrate-stats available currently
  // More tools will be added in Phase 2
  return [];
}

/**
 * Get tools by category
 *
 * @param category - Tool category to filter by
 * @returns Array of tools in the specified category
 */
export function getToolsByCategory(_category: ToolCategory): MCPTool[] {
  const allTools = getAllTools();

  // Filter logic will be implemented when tools are registered
  return allTools.filter(() => {
    // Category detection based on tool name prefix or metadata
    return false; // Placeholder
  });
}

// Re-export tool implementations
export { HashrateStatsTool };
