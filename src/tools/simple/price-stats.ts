/**
 * MCP Tool: braiins_price_stats
 *
 * Fetches current Bitcoin price statistics including current BTC/USD price,
 * 24-hour price change percentage, and timestamp of the data.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/price-stats
 */

import { BraiinsInsightsPriceStats } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Price Statistics Tool
 *
 * Simple stats tool that fetches current Bitcoin price statistics
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class PriceStatsTool {
  /** MCP tool name */
  readonly name = 'braiins_price_stats';

  /** Tool description shown to LLM */
  readonly description =
    'Get current Bitcoin price statistics including BTC/USD price, ' +
    '24-hour price change percentage, and data timestamp';

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
      const stats = await this.apiClient.getPriceStats();

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
   * Format price stats as markdown for LLM consumption
   */
  private formatAsMarkdown(stats: BraiinsInsightsPriceStats): string {
    const priceChangeIndicator = this.getPriceChangeIndicator(stats.price_change_24h_percent);

    return `
# 💰 Bitcoin Price Statistics

## Current Price

**${this.formatCurrency(stats.current_price_usd)}**

## 24-Hour Change

${priceChangeIndicator} **${this.formatPercentage(stats.price_change_24h_percent)}**

## Market Data

- **Market Cap:** ${this.formatCurrency(stats.market_cap_usd)}
${stats.volume_24h_usd ? `- **24h Volume:** ${this.formatCurrency(stats.volume_24h_usd)}` : ''}

---

*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*
    `.trim();
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
      return '📈'; // Upward trend
    } else if (change < 0) {
      return '📉'; // Downward trend
    } else {
      return '➡️'; // No change
    }
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
