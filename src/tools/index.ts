/**
 * MCP Tool Registry
 *
 * Central registration point for all MCP tools.
 * Tools are organized by category: simple, parameterized, historical, composite.
 */

import { HashrateStatsTool } from './simple/hashrate-stats.js';
import { PriceStatsTool } from './simple/price-stats.js';
import { BlocksTool } from './parameterized/blocks.js';

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
  isError?: boolean;
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
 * @param apiClient - Insights API client instance
 * @returns Array of tool instances ready for MCP registration
 *
 * @example
 * ```typescript
 * const apiClient = createInsightsClient();
 * const tools = getAllTools(apiClient);
 * tools.forEach(tool => server.registerTool(tool));
 * ```
 */
export function getAllTools(apiClient: any): MCPTool[] {
  return [
    // Simple tools (no parameters)
    new HashrateStatsTool(apiClient),
    new PriceStatsTool(apiClient),

    // Parameterized tools (require input)
    new BlocksTool(apiClient),
  ];
}

/**
 * Get tools by category
 *
 * @param apiClient - Insights API client instance
 * @param category - Tool category to filter by
 * @returns Array of tools in the specified category
 */
export function getToolsByCategory(apiClient: any, _category: ToolCategory): MCPTool[] {
  const allTools = getAllTools(apiClient);

  // Filter logic will be implemented when tools are registered
  return allTools.filter(() => {
    // Category detection based on tool name prefix or metadata
    return false; // Placeholder
  });
}

// Re-export tool implementations
export { HashrateStatsTool, PriceStatsTool, BlocksTool };
