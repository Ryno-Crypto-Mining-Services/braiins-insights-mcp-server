/**
 * MCP Tool Registry
 *
 * Central registration point for all MCP tools.
 * Tools are organized by category: simple, parameterized, historical, composite.
 */

// Simple tools (no parameters)
import { HashrateStatsTool } from './simple/hashrate-stats.js';
import { DifficultyStatsTool } from './simple/difficulty-stats.js';
import { PriceStatsTool } from './simple/price-stats.js';
import { PoolStatsTool } from './simple/pool-stats.js';
import { RSSFeedDataTool } from './simple/rss-feed-data.js';
import { HalvingsTool } from './simple/halvings.js';
import { TransactionStatsTool } from './simple/transaction-stats.js';

// Parameterized tools (require input)
import { BlocksTool } from './parameterized/blocks.js';
import { ProfitabilityCalculatorTool } from './parameterized/profitability-calculator.js';
import { CostToMineTool } from './parameterized/cost-to-mine.js';

// Historical tools (time-series data)
import { DailyRevenueHistoryTool } from './historical/daily-revenue-history.js';
import { HashrateAndDifficultyHistoryTool } from './historical/hashrate-and-difficulty-history.js';
import { HashrateValueHistoryTool } from './historical/hashrate-value-history.js';
import { TransactionFeesHistoryTool } from './historical/transaction-fees-history.js';

// API client type
import type { InsightsApiClient } from '../api/insights-client.js';

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
export function getAllTools(apiClient: InsightsApiClient): MCPTool[] {
  return [
    // Simple tools (no parameters)
    new HashrateStatsTool(apiClient),
    new DifficultyStatsTool(apiClient),
    new PriceStatsTool(apiClient),
    new PoolStatsTool(apiClient),
    new RSSFeedDataTool(apiClient),
    new HalvingsTool(apiClient),
    new TransactionStatsTool(apiClient),

    // Parameterized tools (require input)
    new BlocksTool(apiClient),
    new ProfitabilityCalculatorTool(apiClient),
    new CostToMineTool(apiClient),

    // Historical tools (time-series data)
    new DailyRevenueHistoryTool(apiClient),
    new HashrateAndDifficultyHistoryTool(apiClient),
    new HashrateValueHistoryTool(apiClient),
    new TransactionFeesHistoryTool(apiClient),
  ];
}

/**
 * Get tools by category
 *
 * @param apiClient - Insights API client instance
 * @param category - Tool category to filter by
 * @returns Array of tools in the specified category
 */
export function getToolsByCategory(
  apiClient: InsightsApiClient,
  _category: ToolCategory
): MCPTool[] {
  const allTools = getAllTools(apiClient);

  // Filter logic will be implemented when tools are registered
  return allTools.filter(() => {
    // Category detection based on tool name prefix or metadata
    return false; // Placeholder
  });
}

// Re-export tool implementations
export {
  // Simple tools
  HashrateStatsTool,
  DifficultyStatsTool,
  PriceStatsTool,
  PoolStatsTool,
  RSSFeedDataTool,
  HalvingsTool,
  TransactionStatsTool,
  // Parameterized tools
  BlocksTool,
  ProfitabilityCalculatorTool,
  CostToMineTool,
  // Historical tools
  DailyRevenueHistoryTool,
  HashrateAndDifficultyHistoryTool,
  HashrateValueHistoryTool,
  TransactionFeesHistoryTool,
};
