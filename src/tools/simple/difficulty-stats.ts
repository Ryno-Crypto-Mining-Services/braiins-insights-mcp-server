/**
 * MCP Tool: braiins_difficulty_stats
 *
 * Fetches current Bitcoin network difficulty statistics including current difficulty,
 * estimated next difficulty, difficulty change percentage, blocks until adjustment,
 * and estimated adjustment time.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/difficulty-stats
 */

import { BraiinsInsightsDifficultyStats } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Difficulty Statistics Tool
 *
 * Simple stats tool that fetches current Bitcoin network difficulty statistics
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class DifficultyStatsTool {
  /** MCP tool name */
  readonly name = 'braiins_difficulty_stats';

  /** Tool description shown to LLM */
  readonly description =
    'Get current Bitcoin network difficulty statistics including current difficulty, ' +
    'estimated next difficulty, difficulty change percentage, blocks until next adjustment, ' +
    'and estimated adjustment time';

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
      const stats = await this.apiClient.getDifficultyStats();

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
   * Format difficulty stats as markdown for LLM consumption
   */
  private formatAsMarkdown(stats: BraiinsInsightsDifficultyStats): string {
    const sections: string[] = [];

    sections.push('# ⛏️ Bitcoin Network Difficulty Statistics\n');

    // Current Metrics
    sections.push('## Current Metrics\n');
    sections.push(`- **Current Difficulty:** ${this.formatDifficulty(stats.current_difficulty)}`);

    if (stats.estimated_next_difficulty !== undefined) {
      sections.push(
        `- **Estimated Next Difficulty:** ${this.formatDifficulty(stats.estimated_next_difficulty)}`
      );
    }

    if (stats.estimated_change_percent !== undefined) {
      sections.push(
        `- **Estimated Change:** ${this.formatPercentChange(stats.estimated_change_percent)}`
      );
    }

    // Next Adjustment
    sections.push('\n## Next Adjustment\n');
    sections.push(
      `- **Blocks Until Adjustment:** ${stats.blocks_until_adjustment.toLocaleString()}`
    );

    if (stats.estimated_adjustment_time) {
      sections.push(
        `- **Estimated Adjustment Time:** ${this.formatDate(stats.estimated_adjustment_time)}`
      );
    }

    if (stats.last_adjustment_date) {
      sections.push(`- **Last Adjustment:** ${this.formatDate(stats.last_adjustment_date)}`);
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Format difficulty value with scientific notation and commas
   */
  private formatDifficulty(value: number): string {
    // For very large numbers like 109780000000000000, use scientific notation
    if (value >= 1e15) {
      return `${value.toExponential(2)} (${value.toLocaleString()})`;
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
   * Format ISO 8601 date string to human-readable format
   */
  private formatDate(isoDate: string): string {
    // Note: Date() returns "Invalid Date" for unparseable strings rather than throwing
    const date = new Date(isoDate);
    return date.toUTCString();
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
