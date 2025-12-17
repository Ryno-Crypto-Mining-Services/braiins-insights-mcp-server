/**
 * MCP Tool: braiins_mining_overview
 *
 * Composite tool that aggregates multiple API endpoints to provide
 * a comprehensive Bitcoin mining ecosystem snapshot including hashrate,
 * difficulty, price, and recent blocks.
 *
 * @category Composite Tool
 * @see https://insights.braiins.com
 */

import { z } from 'zod';
import {
  BraiinsInsightsHashrateStats,
  BraiinsInsightsDifficultyStats,
  BraiinsInsightsPriceStats,
  BraiinsInsightsBlockData,
} from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod schema for mining overview tool input validation
 */
const MiningOverviewInputSchema = z.object({
  include_recent_blocks: z
    .boolean()
    .default(true)
    .describe('Include list of recent blocks in the overview'),
  block_count: z
    .number()
    .int()
    .min(1, 'Block count must be at least 1')
    .max(20, 'Block count cannot exceed 20')
    .default(5)
    .describe('Number of recent blocks to include'),
});

type MiningOverviewInput = z.infer<typeof MiningOverviewInputSchema>;

/**
 * Result type for Promise.allSettled calls
 */
interface EndpointResult<T> {
  status: 'fulfilled' | 'rejected';
  data?: T;
  error?: Error;
}

/**
 * Mining Overview Tool
 *
 * Composite tool that provides a 30-second snapshot of the Bitcoin mining
 * ecosystem by aggregating data from multiple endpoints in parallel with
 * graceful degradation if some endpoints fail.
 */
export class MiningOverviewTool {
  /** MCP tool name */
  readonly name = 'braiins_mining_overview';

  /** Tool description shown to LLM */
  readonly description =
    'Get a comprehensive Bitcoin mining ecosystem overview including network hashrate, ' +
    'difficulty status, current BTC price, and recent blocks. Provides a quick 30-second ' +
    'snapshot of mining health and market conditions.';

  /** JSON schema for tool inputs */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      include_recent_blocks: {
        type: 'boolean',
        description: 'Include list of recent blocks in the overview',
        default: true,
      },
      block_count: {
        type: 'number',
        description: 'Number of recent blocks to include',
        default: 5,
        minimum: 1,
        maximum: 20,
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * Fetches data from multiple endpoints in parallel using Promise.allSettled
   * to ensure partial results are shown even if some endpoints fail.
   *
   * @param input - Tool input parameters
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate and parse input
      const validatedInput = MiningOverviewInputSchema.parse(input);

      // Fetch all data in parallel with graceful degradation
      const results = await this.fetchAllData(validatedInput);

      // Format as comprehensive markdown report
      const markdown = this.formatAsMarkdown(results, validatedInput);

      return {
        content: [
          {
            type: 'text',
            text: markdown,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Fetch data from all endpoints in parallel
   *
   * Uses Promise.allSettled to continue even if some endpoints fail,
   * enabling graceful degradation.
   */
  private async fetchAllData(params: MiningOverviewInput): Promise<{
    hashrate: EndpointResult<BraiinsInsightsHashrateStats>;
    difficulty: EndpointResult<BraiinsInsightsDifficultyStats>;
    price: EndpointResult<BraiinsInsightsPriceStats>;
    blocks: EndpointResult<BraiinsInsightsBlockData[]>;
  }> {
    // Fetch all data in parallel with Promise.allSettled for graceful degradation
    const results = await Promise.allSettled([
      this.apiClient.getHashrateStats(),
      this.apiClient.getDifficultyStats(),
      this.apiClient.getPriceStats(),
      params.include_recent_blocks
        ? this.apiClient.getBlocks({ limit: params.block_count })
        : Promise.resolve([] as BraiinsInsightsBlockData[]),
    ]);

    return {
      hashrate: this.normalizeResult<BraiinsInsightsHashrateStats>(results[0]),
      difficulty: this.normalizeResult<BraiinsInsightsDifficultyStats>(results[1]),
      price: this.normalizeResult<BraiinsInsightsPriceStats>(results[2]),
      blocks: this.normalizeResult<BraiinsInsightsBlockData[]>(results[3]),
    };
  }

  /**
   * Normalize PromiseSettledResult to EndpointResult
   */
  private normalizeResult<T>(result: PromiseSettledResult<T>): EndpointResult<T> {
    if (result.status === 'fulfilled') {
      return {
        status: 'fulfilled',
        data: result.value,
      };
    } else {
      return {
        status: 'rejected',
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
      };
    }
  }

  /**
   * Format mining overview as comprehensive markdown report
   */
  private formatAsMarkdown(
    results: {
      hashrate: EndpointResult<BraiinsInsightsHashrateStats>;
      difficulty: EndpointResult<BraiinsInsightsDifficultyStats>;
      price: EndpointResult<BraiinsInsightsPriceStats>;
      blocks: EndpointResult<BraiinsInsightsBlockData[]>;
    },
    params: MiningOverviewInput
  ): string {
    const sections: string[] = [];
    const warnings: string[] = [];

    // Header
    sections.push('# 🔍 Bitcoin Mining Ecosystem Overview\n');

    // Network Overview Section
    sections.push('## 📊 Network Overview\n');
    if (results.hashrate.status === 'fulfilled' && results.hashrate.data) {
      const stats = results.hashrate.data;
      sections.push(`- **Current Hashrate:** ${stats.current_hashrate.toFixed(2)} EH/s`);
      sections.push(`- **24h Average:** ${stats.current_hashrate_estimated.toFixed(2)} EH/s`);
      sections.push(`- **30-Day Average:** ${stats.hash_rate_30.toFixed(2)} EH/s`);
      sections.push(`- **Hash Price:** $${stats.hash_price.toFixed(3)} per TH/day\n`);
    } else {
      sections.push('⚠️ *Network hashrate data unavailable*\n');
      warnings.push('Hashrate data could not be retrieved');
    }

    // Difficulty Status Section
    sections.push('## ⛏️ Difficulty Status\n');
    if (results.difficulty.status === 'fulfilled' && results.difficulty.data) {
      const stats = results.difficulty.data;
      sections.push(`- **Current Difficulty:** ${this.formatDifficulty(stats.difficulty)}`);
      sections.push(
        `- **Estimated Next Difficulty:** ${this.formatDifficulty(stats.estimated_next_diff)}`
      );
      sections.push(
        `- **Expected Change:** ${this.formatPercentChange(stats.estimated_adjustment * 100)}`
      );
      sections.push(`- **Block Epoch:** ${stats.block_epoch.toLocaleString()}\n`);
    } else {
      sections.push('⚠️ *Difficulty data unavailable*\n');
      warnings.push('Difficulty data could not be retrieved');
    }

    // Price Snapshot Section
    sections.push('## 💰 Price Snapshot\n');
    if (results.price.status === 'fulfilled' && results.price.data) {
      const stats = results.price.data;
      const priceChangeIndicator = this.getPriceChangeIndicator(stats.percent_change_24h);
      sections.push(`- **Current Price:** ${this.formatCurrency(stats.price)}`);
      sections.push(
        `- **24h Change:** ${priceChangeIndicator} ${this.formatPercentage(stats.percent_change_24h)}\n`
      );
    } else {
      sections.push('⚠️ *Price data unavailable*\n');
      warnings.push('Price data could not be retrieved');
    }

    // Recent Blocks Section (if enabled)
    if (params.include_recent_blocks) {
      sections.push('## 🧱 Recent Blocks\n');
      if (results.blocks.status === 'fulfilled' && results.blocks.data) {
        const blocks = results.blocks.data;
        if (blocks.length > 0) {
          sections.push(
            '| Height | Pool | Time | Value (BTC) |',
            '|--------|------|------|-------------|'
          );
          blocks.forEach((block) => {
            sections.push(
              `| ${block.height.toLocaleString()} | ${block.pool} | ${this.formatRelativeTime(block.timestamp)} | ${block.block_value_btc.toFixed(4)} |`
            );
          });
          sections.push('');
        } else {
          sections.push('*No recent blocks available*\n');
        }
      } else {
        sections.push('⚠️ *Recent blocks data unavailable*\n');
        warnings.push('Recent blocks data could not be retrieved');
      }
    }

    // Data Availability Notice (if any warnings)
    if (warnings.length > 0) {
      sections.push('## ⚠️ Data Availability Notice\n');
      sections.push(
        'Some data could not be retrieved due to API issues. The overview shows available data only:\n'
      );
      warnings.forEach((warning) => {
        sections.push(`- ${warning}`);
      });
      sections.push('');
    }

    // Footer
    sections.push('---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');
    sections.push(`*Generated: ${new Date().toISOString()}*`);

    return sections.join('\n');
  }

  /**
   * Format difficulty value with scientific notation
   */
  private formatDifficulty(value: number): string {
    if (value >= 1e15) {
      return `${value.toExponential(2)} (${(value / 1e15).toFixed(2)}P)`;
    }
    return value.toLocaleString();
  }

  /**
   * Format percent change with + or - prefix
   */
  private formatPercentChange(value: number): string {
    const formatted = value.toFixed(2);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  }

  /**
   * Format currency with $ and thousands separators
   */
  private formatCurrency(value: number): string {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /**
   * Format percentage with + or - prefix
   */
  private formatPercentage(value: number): string {
    const formatted = Math.abs(value).toFixed(2);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  }

  /**
   * Get emoji indicator for price change
   */
  private getPriceChangeIndicator(change: number): string {
    if (change > 0) {
      return '📈';
    } else if (change < 0) {
      return '📉';
    } else {
      return '➡️';
    }
  }

  /**
   * Format timestamp as relative time (e.g., "2m ago", "1h ago")
   */
  private formatRelativeTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffMins < 1440) {
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffMins / 1440);
        return `${diffDays}d ago`;
      }
    } catch {
      return timestamp;
    }
  }

  /**
   * Handle errors and return MCP error response
   */
  private handleError(error: unknown): MCPToolResponse {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (err: z.ZodIssue) => `- ${err.path.join('.')}: ${err.message}`
      );
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Validation Error**: Invalid input parameters\n\n${errorMessages.join('\n')}\n\nPlease check your input and try again.`,
          },
        ],
        isError: true,
      };
    }

    // Handle API errors
    if (error instanceof InsightsApiError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **API Error**: ${error.message}\n\nStatus: ${error.statusCode}\n\nPlease try again later or check the Braiins Insights API status.`,
          },
        ],
        isError: true,
      };
    }

    // Handle network errors
    if (error instanceof NetworkError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Network Error**: Could not reach Braiins Insights API\n\nDetails: ${error.message}\n\nPlease check your internet connection.`,
          },
        ],
        isError: true,
      };
    }

    // Handle unexpected errors
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Unexpected Error**: ${error instanceof Error ? error.message : String(error)}\n\nPlease report this issue if it persists.`,
        },
      ],
      isError: true,
    };
  }
}
