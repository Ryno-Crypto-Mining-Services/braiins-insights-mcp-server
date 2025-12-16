/**
 * MCP Tool: braiins_hashrate_and_difficulty_history
 *
 * Fetches historical hashrate and difficulty data from the Braiins Insights Dashboard API.
 * Returns time-series data showing network hashrate and difficulty trends.
 *
 * @category Historical Data Tool
 * @see https://insights.braiins.com/api/v1.0/hashrate-and-difficulty-history
 */

import { BraiinsInsightsHashDiffHistory } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Hashrate and Difficulty History Tool
 *
 * Historical data tool that fetches network hashrate and difficulty trends over time.
 * Useful for analyzing network growth and mining difficulty patterns.
 */
export class HashrateAndDifficultyHistoryTool {
  /** MCP tool name */
  readonly name = 'braiins_hashrate_and_difficulty_history';

  /** Tool description shown to LLM */
  readonly description =
    'Get historical Bitcoin network hashrate and difficulty data. Returns time-series data ' +
    'showing hashrate (EH/s) and difficulty trends, useful for analyzing network growth patterns.';

  /** JSON schema for tool inputs (no required parameters) */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description:
          'Maximum number of data points to return (most recent first). Default returns all available data.',
        minimum: 1,
        maximum: 1000,
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
      const data = await this.apiClient.getHashrateAndDifficultyHistory();

      // Apply limit if specified
      const limitedData = params.limit ? data.slice(0, params.limit) : data;

      if (limitedData.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '⚠️ **No Data Available**\n\nNo hashrate and difficulty history data was returned from the API.',
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
      if (!Number.isNaN(limit) && limit >= 1 && limit <= 1000) {
        result.limit = Math.floor(limit);
      }
    }

    return result;
  }

  /**
   * Format hashrate and difficulty history as markdown for LLM consumption
   */
  private formatAsMarkdown(data: BraiinsInsightsHashDiffHistory[], totalCount: number): string {
    const sections: string[] = [];

    sections.push('# 📈 Bitcoin Network Hashrate & Difficulty History\n');

    // Summary statistics for hashrate
    const hashrates = data.map((d) => d.hashrate_ehs);
    const avgHashrate = hashrates.reduce((a, b) => a + b, 0) / hashrates.length;
    const maxHashrate = Math.max(...hashrates);
    const minHashrate = Math.min(...hashrates);

    // Summary statistics for difficulty
    const difficulties = data.map((d) => d.difficulty);
    const latestDifficulty = difficulties[0] ?? 0;
    const oldestDifficulty = difficulties[difficulties.length - 1] ?? 0;
    const difficultyChange =
      oldestDifficulty > 0 ? ((latestDifficulty - oldestDifficulty) / oldestDifficulty) * 100 : 0;

    sections.push('## Hashrate Statistics\n');
    sections.push(
      `- **Data Points:** ${data.length}${totalCount > data.length ? ` (of ${totalCount} total)` : ''}`
    );
    sections.push(`- **Current Hashrate:** ${this.formatHashrate(hashrates[0] ?? 0)} EH/s`);
    sections.push(`- **Average Hashrate:** ${this.formatHashrate(avgHashrate)} EH/s`);
    sections.push(`- **Peak Hashrate:** ${this.formatHashrate(maxHashrate)} EH/s`);
    sections.push(`- **Lowest Hashrate:** ${this.formatHashrate(minHashrate)} EH/s`);

    sections.push('\n## Difficulty Statistics\n');
    sections.push(`- **Current Difficulty:** ${this.formatDifficulty(latestDifficulty)}`);
    sections.push(`- **Period Change:** ${this.formatPercentChange(difficultyChange)}`);

    // Date range
    if (data.length > 0) {
      const latestTimestamp = data[0]?.timestamp ?? 'N/A';
      const oldestTimestamp = data[data.length - 1]?.timestamp ?? 'N/A';
      sections.push(
        `- **Time Range:** ${this.formatTimestamp(oldestTimestamp)} to ${this.formatTimestamp(latestTimestamp)}`
      );
    }

    // Recent data table (show last 15 entries)
    sections.push('\n## Recent Data Points\n');
    sections.push('| Timestamp | Hashrate (EH/s) | Difficulty |');
    sections.push('|-----------|-----------------|------------|');

    const recentData = data.slice(0, 15);
    for (const entry of recentData) {
      const timestamp = this.formatTimestamp(entry.timestamp);
      const hashrate = this.formatHashrate(entry.hashrate_ehs);
      const difficulty = this.formatDifficultyShort(entry.difficulty);
      sections.push(`| ${timestamp} | ${hashrate} | ${difficulty} |`);
    }

    if (data.length > 15) {
      sections.push(`\n*Showing 15 of ${data.length} data points*`);
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Format hashrate value with 2 decimal places
   */
  private formatHashrate(value: number): string {
    return value.toFixed(2);
  }

  /**
   * Format difficulty with scientific notation and full number
   */
  private formatDifficulty(value: number): string {
    if (value >= 1e15) {
      return `${value.toExponential(2)} (${value.toLocaleString()})`;
    }
    return value.toLocaleString();
  }

  /**
   * Format difficulty for table (shorter format)
   */
  private formatDifficultyShort(value: number): string {
    if (value >= 1e15) {
      return value.toExponential(2);
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
   * Format ISO timestamp to readable format
   */
  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toISOString().split('T')[0] ?? timestamp;
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
