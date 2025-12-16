/**
 * MCP Tool: braiins_hashrate_value_history
 *
 * Fetches historical hashrate value data from the Braiins Insights Dashboard API.
 * Returns time-series data showing the USD value per terahash per day over time.
 *
 * @category Historical Data Tool
 * @see https://insights.braiins.com/api/v1.0/hashrate-value-history
 */

import { BraiinsInsightsHashrateValue } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Hashrate Value History Tool
 *
 * Historical data tool that fetches hashrate value (USD per TH/day) trends over time.
 * Useful for analyzing mining profitability trends and hash price history.
 */
export class HashrateValueHistoryTool {
  /** MCP tool name */
  readonly name = 'braiins_hashrate_value_history';

  /** Tool description shown to LLM */
  readonly description =
    'Get historical Bitcoin hashrate value data. Returns time-series data showing ' +
    'the USD value per terahash per day (hash price), useful for analyzing mining economics trends.';

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
      const data = await this.apiClient.getHashrateValueHistory();

      // Apply limit if specified
      const limitedData = params.limit ? data.slice(0, params.limit) : data;

      if (limitedData.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ **No Data Available**\n\nNo hashrate value history data was returned from the API.',
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
   * Format hashrate value history as markdown for LLM consumption
   */
  private formatAsMarkdown(data: BraiinsInsightsHashrateValue[], totalCount: number): string {
    const sections: string[] = [];

    sections.push('# 💵 Bitcoin Hashrate Value History\n');

    // Summary statistics
    const values = data.map((d) => d.hash_value_usd_per_th_day);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const currentValue = values[0] ?? 0;
    const oldestValue = values[values.length - 1] ?? 0;
    const changePercent = oldestValue > 0 ? ((currentValue - oldestValue) / oldestValue) * 100 : 0;

    sections.push('## Summary Statistics\n');
    sections.push(
      `- **Data Points:** ${data.length}${totalCount > data.length ? ` (of ${totalCount} total)` : ''}`
    );
    sections.push(`- **Current Hash Value:** $${this.formatHashValue(currentValue)} /TH/day`);
    sections.push(`- **Average Hash Value:** $${this.formatHashValue(avgValue)} /TH/day`);
    sections.push(`- **Peak Hash Value:** $${this.formatHashValue(maxValue)} /TH/day`);
    sections.push(`- **Lowest Hash Value:** $${this.formatHashValue(minValue)} /TH/day`);
    sections.push(`- **Period Change:** ${this.formatPercentChange(changePercent)}`);

    // Date range
    if (data.length > 0) {
      const latestDate = data[0]?.date ?? 'N/A';
      const oldestDate = data[data.length - 1]?.date ?? 'N/A';
      sections.push(`- **Date Range:** ${oldestDate} to ${latestDate}`);
    }

    // Economic interpretation
    sections.push('\n## Mining Economics Context\n');
    sections.push(
      `The hash value represents how much revenue a miner earns per terahash of computing power per day. ` +
        `A higher hash value means better mining profitability.`
    );
    if (currentValue > avgValue) {
      sections.push(
        `\n📈 **Current hash value is above average**, indicating favorable mining conditions.`
      );
    } else {
      sections.push(
        `\n📉 **Current hash value is below average**, indicating less favorable mining conditions.`
      );
    }

    // Recent data table (show last 10 entries)
    sections.push('\n## Recent Hash Value Data\n');
    sections.push('| Date | Hash Value (USD/TH/day) | Daily Change |');
    sections.push('|------|-------------------------|--------------|');

    const recentData = data.slice(0, 10);
    for (let i = 0; i < recentData.length; i++) {
      const entry = recentData[i];
      if (!entry) {
        continue;
      }

      const nextEntry = recentData[i + 1];
      let change = 'N/A';
      if (nextEntry) {
        const prevValue = nextEntry.hash_value_usd_per_th_day;
        const currValue = entry.hash_value_usd_per_th_day;
        if (prevValue > 0) {
          const changePercent = ((currValue - prevValue) / prevValue) * 100;
          change = this.formatPercentChange(changePercent);
        }
      }

      sections.push(
        `| ${entry.date} | $${this.formatHashValue(entry.hash_value_usd_per_th_day)} | ${change} |`
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
   * Format hash value with appropriate precision
   */
  private formatHashValue(value: number): string {
    // Hash values are typically very small numbers
    if (value < 0.001) {
      return value.toExponential(3);
    }
    return value.toFixed(4);
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
