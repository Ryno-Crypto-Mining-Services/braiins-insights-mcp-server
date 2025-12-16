/**
 * MCP Tool: braiins_daily_revenue_history
 *
 * Fetches historical daily mining revenue data from the Braiins Insights Dashboard API.
 * Returns time-series data showing daily revenue trends for Bitcoin mining.
 *
 * @category Historical Data Tool
 * @see https://insights.braiins.com/api/v1.0/daily-revenue-history
 */

import { BraiinsInsightsDailyRevenue } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Daily Revenue History Tool
 *
 * Historical data tool that fetches daily mining revenue data over time.
 * Returns time-series data useful for trend analysis.
 */
export class DailyRevenueHistoryTool {
  /** MCP tool name */
  readonly name = 'braiins_daily_revenue_history';

  /** Tool description shown to LLM */
  readonly description =
    'Get historical daily Bitcoin mining revenue data. Returns time-series data showing ' +
    'daily revenue in USD and BTC, useful for analyzing mining profitability trends over time.';

  /** JSON schema for tool inputs (no required parameters) */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description:
          'Maximum number of data points to return (most recent first). Default returns all available data.',
        minimum: 1,
        maximum: 365,
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Optional limit parameter
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Parse input
      const params = this.parseInput(input);

      // Fetch data from API
      const data = await this.apiClient.getDailyRevenueHistory();

      // Apply limit if specified
      const limitedData = params.limit ? data.slice(0, params.limit) : data;

      if (limitedData.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ **No Data Available**\n\nNo daily revenue history data was returned from the API.',
            },
          ],
          isError: false,
        };
      }

      // Format as markdown
      const markdown = this.formatAsMarkdown(limitedData, data.length);

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
   * Parse and validate input parameters
   */
  private parseInput(input: unknown): { limit?: number } {
    if (!input || typeof input !== 'object') {
      return {};
    }

    const params = input as Record<string, unknown>;
    const result: { limit?: number } = {};

    if (params['limit'] !== undefined) {
      const limit = Number(params['limit']);
      if (!Number.isNaN(limit) && limit >= 1 && limit <= 365) {
        result.limit = Math.floor(limit);
      }
    }

    return result;
  }

  /**
   * Format daily revenue history as markdown for LLM consumption
   */
  private formatAsMarkdown(data: BraiinsInsightsDailyRevenue[], totalCount: number): string {
    const sections: string[] = [];

    sections.push('# 💰 Bitcoin Mining Daily Revenue History\n');

    // Summary statistics
    const revenues = data.map((d) => d.revenue_usd);
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);

    sections.push('## Summary Statistics\n');
    sections.push(
      `- **Data Points:** ${data.length}${totalCount > data.length ? ` (of ${totalCount} total)` : ''}`
    );
    sections.push(`- **Average Daily Revenue:** $${this.formatCurrency(avgRevenue)}`);
    sections.push(`- **Highest Daily Revenue:** $${this.formatCurrency(maxRevenue)}`);
    sections.push(`- **Lowest Daily Revenue:** $${this.formatCurrency(minRevenue)}`);

    // Date range
    if (data.length > 0) {
      const latestDate = data[0]?.date ?? 'N/A';
      const oldestDate = data[data.length - 1]?.date ?? 'N/A';
      sections.push(`- **Date Range:** ${oldestDate} to ${latestDate}`);
    }

    // Recent data table (show last 10 entries)
    sections.push('\n## Recent Daily Revenue\n');
    sections.push('| Date | Revenue (USD) | Revenue (BTC) |');
    sections.push('|------|---------------|---------------|');

    const recentData = data.slice(0, 10);
    for (const entry of recentData) {
      const revenueUsd = `$${this.formatCurrency(entry.revenue_usd)}`;
      // Calculate total BTC from block rewards + fees if available
      const totalBtc =
        entry.block_rewards_btc !== undefined && entry.fees_btc !== undefined
          ? entry.block_rewards_btc + entry.fees_btc
          : undefined;
      const revenueBtc = totalBtc !== undefined ? `₿${totalBtc.toFixed(2)}` : 'N/A';
      sections.push(`| ${entry.date} | ${revenueUsd} | ${revenueBtc} |`);
    }

    if (data.length > 10) {
      sections.push(`\n*Showing 10 of ${data.length} data points*`);
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
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
