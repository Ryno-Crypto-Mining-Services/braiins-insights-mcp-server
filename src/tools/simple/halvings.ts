/**
 * MCP Tool: braiins_halvings
 *
 * Fetches Bitcoin halving schedule and countdown including next halving date,
 * estimated block height, blocks remaining, reward changes, and historical halving events.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v2.0/halvings
 */

import { BraiinsInsightsHalvingData } from '../../types/insights-api.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Halvings Tool
 *
 * Simple stats tool that fetches Bitcoin halving schedule and countdown
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class HalvingsTool {
  /** MCP tool name */
  readonly name = 'braiins_halvings';

  /** Tool description shown to LLM */
  readonly description =
    'Get Bitcoin halving schedule and countdown including next halving date, ' +
    'estimated block height, blocks remaining, current and next block rewards, ' +
    'and historical halving events';

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
      const data = await this.apiClient.getHalvings();

      // Format as markdown
      const markdown = this.formatAsMarkdown(data);

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
   * Format halving data as markdown for LLM consumption
   */
  private formatAsMarkdown(data: BraiinsInsightsHalvingData): string {
    const sections: string[] = [];

    // Header
    sections.push('# ⏳ Bitcoin Halving Schedule\n');

    // Next Halving Section
    sections.push('## Next Halving\n');
    sections.push(`- **Estimated Date:** ${this.formatDate(data.next_halving_date)}`);
    sections.push(`- **Countdown:** ${this.calculateCountdown(data.next_halving_date)}`);
    sections.push(
      `- **Block Height:** ${this.formatBlockHeight(data.next_halving_block_height)}`
    );
    sections.push(`- **Current Block Height:** ${this.formatBlockHeight(data.current_block_height)}`);
    sections.push(`- **Blocks Remaining:** ${this.formatBlockHeight(data.blocks_remaining)}`);
    sections.push(`- **Current Block Reward:** ${data.current_reward_btc} BTC`);
    sections.push(`- **Next Block Reward:** ${data.next_reward_btc} BTC\n`);

    // Historical Halvings Section (if available)
    if (data.historical_halvings && data.historical_halvings.length > 0) {
      sections.push('## Historical Halvings\n');
      sections.push(this.formatHistoricalTable(data.historical_halvings));
    }

    // Footer
    sections.push('\n---');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Format date from ISO 8601 to human-readable format
   */
  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      }) + ' UTC';
    } catch {
      return isoDate;
    }
  }

  /**
   * Calculate countdown from current date to target date
   */
  private calculateCountdown(targetDate: string): string {
    try {
      const now = new Date();
      const target = new Date(targetDate);
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) {
        return 'Halving has already occurred';
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 365) {
        const years = Math.floor(days / 365);
        const remainingDays = days % 365;
        return `~${years} year${years > 1 ? 's' : ''}, ${remainingDays} days`;
      }

      return `${days} days, ${hours} hours`;
    } catch {
      return 'Unable to calculate';
    }
  }

  /**
   * Format block height with thousands separators
   */
  private formatBlockHeight(height: number): string {
    return height.toLocaleString('en-US');
  }

  /**
   * Format historical halvings as markdown table
   */
  private formatHistoricalTable(
    events: Array<{ date: string; block_height: number; reward_btc: number; halving_number?: number }>
  ): string {
    const rows: string[] = [];

    // Table header
    rows.push('| Halving | Date | Block Height | Block Reward |');
    rows.push('|---------|------|--------------|--------------|');

    // Sort by block height ascending
    const sortedEvents = [...events].sort((a, b) => a.block_height - b.block_height);

    // Table rows
    sortedEvents.forEach((event, index) => {
      const halvingNumber = event.halving_number ?? index + 1;
      const ordinal = this.getOrdinal(halvingNumber);
      const date = this.formatDate(event.date).split(',')[0]; // Just the date part
      const blockHeight = this.formatBlockHeight(event.block_height);
      const reward = `${event.reward_btc} BTC`;

      rows.push(`| ${ordinal} | ${date} | ${blockHeight} | ${reward} |`);
    });

    return rows.join('\n');
  }

  /**
   * Get ordinal suffix for number (1st, 2nd, 3rd, etc.)
   */
  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
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
