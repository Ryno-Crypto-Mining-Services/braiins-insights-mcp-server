/**
 * MCP Tool: braiins_transaction_fees_history
 *
 * Fetches historical transaction fee data from the Braiins Insights Dashboard API.
 * Returns time-series data showing transaction fee trends over time.
 *
 * @category Historical Data Tool
 * @see https://insights.braiins.com/api/v1.0/transaction-fees-history
 */

import { BraiinsInsightsTransactionFees } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Transaction Fees History Tool
 *
 * Historical data tool that fetches transaction fee trends over time.
 * Useful for analyzing fee market conditions and miner revenue from fees.
 */
export class TransactionFeesHistoryTool {
  /** MCP tool name */
  readonly name = 'braiins_transaction_fees_history';

  /** Tool description shown to LLM */
  readonly description =
    'Get historical Bitcoin transaction fee data. Returns time-series data showing ' +
    'average fees in BTC and sats/vbyte, useful for analyzing fee market trends and miner fee revenue.';

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
      const data = await this.apiClient.getTransactionFeesHistory();

      // Apply limit if specified
      const limitedData = params.limit ? data.slice(0, params.limit) : data;

      if (limitedData.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ **No Data Available**\n\nNo transaction fees history data was returned from the API.',
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
   * Format transaction fees history as markdown for LLM consumption
   */
  private formatAsMarkdown(data: BraiinsInsightsTransactionFees[], totalCount: number): string {
    const sections: string[] = [];

    sections.push('# 📊 Bitcoin Transaction Fees History\n');

    // Summary statistics
    const fees = data.map((d) => d.avg_fee_btc);
    const avgFee = fees.reduce((a, b) => a + b, 0) / fees.length;
    const maxFee = Math.max(...fees);
    const minFee = Math.min(...fees);
    const currentFee = fees[0] ?? 0;
    const oldestFee = fees[fees.length - 1] ?? 0;
    const changePercent = oldestFee > 0 ? ((currentFee - oldestFee) / oldestFee) * 100 : 0;

    sections.push('## Summary Statistics\n');
    sections.push(
      `- **Data Points:** ${data.length}${totalCount > data.length ? ` (of ${totalCount} total)` : ''}`
    );
    sections.push(`- **Current Avg Fee:** ${this.formatBtc(currentFee)} BTC`);
    sections.push(`- **Average Fee:** ${this.formatBtc(avgFee)} BTC`);
    sections.push(`- **Highest Avg Fee:** ${this.formatBtc(maxFee)} BTC`);
    sections.push(`- **Lowest Avg Fee:** ${this.formatBtc(minFee)} BTC`);
    sections.push(`- **Period Change:** ${this.formatPercentChange(changePercent)}`);

    // Date range
    if (data.length > 0) {
      const latestDate = data[0]?.date ?? 'N/A';
      const oldestDate = data[data.length - 1]?.date ?? 'N/A';
      sections.push(`- **Date Range:** ${oldestDate} to ${latestDate}`);
    }

    // Fee market context
    sections.push('\n## Fee Market Context\n');
    if (currentFee > avgFee * 1.5) {
      sections.push(
        '⚡ **Fee market is elevated** - Transaction fees are significantly above average. ' +
          'This may indicate high network congestion or increased transaction demand.'
      );
    } else if (currentFee < avgFee * 0.5) {
      sections.push(
        '💨 **Fee market is low** - Transaction fees are significantly below average. ' +
          'This indicates low network congestion and favorable conditions for sending transactions.'
      );
    } else {
      sections.push('📊 **Fee market is normal** - Transaction fees are within typical range.');
    }

    // Recent data table (show last 10 entries)
    sections.push('\n## Recent Transaction Fee Data\n');
    sections.push('| Date | Avg Fee (BTC) | Avg Fee (sats) | Daily Change |');
    sections.push('|------|---------------|----------------|--------------|');

    const recentData = data.slice(0, 10);
    for (let i = 0; i < recentData.length; i++) {
      const entry = recentData[i];
      if (!entry) {
        continue;
      }

      const feeSats = Math.round(entry.avg_fee_btc * 100_000_000);
      const nextEntry = recentData[i + 1];
      let change = 'N/A';
      if (nextEntry) {
        const prevFee = nextEntry.avg_fee_btc;
        if (prevFee > 0) {
          const changePercent = ((entry.avg_fee_btc - prevFee) / prevFee) * 100;
          change = this.formatPercentChange(changePercent);
        }
      }

      sections.push(
        `| ${entry.date} | ${this.formatBtc(entry.avg_fee_btc)} | ${feeSats.toLocaleString()} | ${change} |`
      );
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
   * Format BTC value with appropriate precision
   */
  private formatBtc(value: number): string {
    if (value < 0.0001) {
      return value.toExponential(3);
    }
    return value.toFixed(6);
  }

  /**
   * Format percent change with + or - prefix
   */
  private formatPercentChange(value: number): string {
    const formatted = value.toFixed(2);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
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
