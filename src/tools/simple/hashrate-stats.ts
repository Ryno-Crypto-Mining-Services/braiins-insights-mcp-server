/**
 * MCP Tool: braiins_hashrate_stats
 *
 * Fetches current Bitcoin network hashrate statistics including current hashrate,
 * estimated hashrate, 30-day average, hash price, transaction fee metrics,
 * and network revenue.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/hashrate-stats
 * @see /docs/api-discovery/hashrate-stats.md
 */

import { BraiinsInsightsHashrateStats } from '../../types/insights-api.js';

/**
 * MCP tool response format
 */
interface MCPToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

/**
 * Mock API client interface (to be replaced with actual implementation)
 */
interface InsightsApiClient {
  getHashrateStats(): Promise<BraiinsInsightsHashrateStats>;
}

/**
 * Custom error classes (to be imported from actual error module)
 */
class InsightsApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'InsightsApiError';
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Hashrate Statistics Tool
 *
 * Simple stats tool that fetches current Bitcoin network hashrate statistics
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class HashrateStatsTool {
  /** MCP tool name */
  readonly name = 'braiins_hashrate_stats';

  /** Tool description shown to LLM */
  readonly description =
    'Get current Bitcoin network hashrate statistics including current hashrate, ' +
    'estimated hashrate, 30-day average, hash price, transaction fee metrics, ' +
    'and daily network revenue in USD';

  /** JSON schema for tool inputs (no parameters) */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param _input - No input parameters expected (empty object)
   * @returns MCP response with formatted markdown
   */
  async execute(_input: unknown): Promise<MCPToolResponse> {
    try {
      // Fetch data from API
      const stats = await this.apiClient.getHashrateStats();

      // Format as markdown
      const markdown = this.formatAsMarkdown(stats);

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
   * Format hashrate stats as markdown for LLM consumption
   */
  private formatAsMarkdown(stats: BraiinsInsightsHashrateStats): string {
    return `
# 📊 Bitcoin Network Hashrate Statistics

## Current Metrics

- **Current Hashrate:** ${this.formatHashrate(stats.current_hashrate)} EH/s
- **Estimated Hashrate:** ${this.formatHashrate(stats.current_hashrate_estimated)} EH/s
- **30-Day Average:** ${this.formatHashrate(stats.hash_rate_30)} EH/s

## Mining Economics

- **Hash Price:** $${stats.hash_price.toFixed(3)} per TH/day
- **Hash Value:** $${this.formatScientific(stats.hash_value)} per TH/day
- **Daily Network Revenue:** $${this.formatCurrency(stats.rev_usd)}

## Transaction Fees

- **Average Fees per Block:** ${stats.avg_fees_per_block.toFixed(3)} BTC
- **Fees as % of Revenue:** ${stats.fees_percent.toFixed(2)}%

## 1-Year Trend

- **Relative Change:** ${this.formatPercentChange(stats.monthly_avg_hashrate_change_1_year.relative)}
- **Absolute Change:** ${this.formatHashrate(stats.monthly_avg_hashrate_change_1_year.absolute)} EH/s

---

*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*
    `.trim();
  }

  /**
   * Format hashrate value with 2 decimal places
   */
  private formatHashrate(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Format scientific notation values
   */
  private formatScientific(value: number): string {
    // Handle scientific notation (e.g., 4E-7)
    if (value < 0.0001) {
      return value.toExponential(2);
    }
    return value.toFixed(6);
  }

  /**
   * Format currency with thousands separators
   */
  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Format percent change with + or - prefix
   */
  private formatPercentChange(value: number): string {
    const percent = (value * 100).toFixed(2);
    return value >= 0 ? `+${percent}%` : `${percent}%`;
  }

  /**
   * Handle errors and return MCP error response
   */
  private handleError(error: unknown): MCPToolResponse {
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
