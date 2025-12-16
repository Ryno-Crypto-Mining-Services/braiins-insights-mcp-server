/**
 * MCP Tool: braiins_transaction_stats
 *
 * Fetches current Bitcoin network transaction statistics including mempool size,
 * average transaction fees, confirmation times, and 24h transaction volume.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/transaction-stats
 */

import { BraiinsInsightsTransactionStats } from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Transaction Statistics Tool
 *
 * Simple stats tool that fetches current Bitcoin network transaction statistics
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class TransactionStatsTool {
  /** MCP tool name */
  readonly name = 'braiins_transaction_stats';

  /** Tool description shown to LLM */
  readonly description =
    'Get current Bitcoin network transaction statistics including mempool size, ' +
    'average transaction fees, estimated confirmation time, and 24h transaction volume';

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
      const stats = await this.apiClient.getTransactionStats();

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
   * Format transaction stats as markdown for LLM consumption
   */
  private formatAsMarkdown(stats: BraiinsInsightsTransactionStats): string {
    const sections: string[] = [];

    sections.push('# 💳 Bitcoin Transaction Statistics\n');

    // Mempool Metrics
    sections.push('## Mempool Metrics\n');
    sections.push(
      `- **Mempool Size:** ${stats.mempool_size.toLocaleString()} transactions ${this.getMempoolIndicator(stats.mempool_size)}`
    );
    sections.push(
      `- **Average Fee:** ${stats.avg_fee_sat_per_byte.toFixed(2)} sat/vB ${this.getFeeIndicator(stats.avg_fee_sat_per_byte)}`
    );

    if (stats.confirmation_time_blocks !== undefined) {
      sections.push(
        `- **Estimated Confirmation Time:** ~${stats.confirmation_time_blocks} blocks (${this.formatConfirmationTime(stats.confirmation_time_blocks)})`
      );
    }

    // 24h Activity
    if (stats.tx_count_24h !== undefined) {
      sections.push('\n## Network Activity (24h)\n');
      sections.push(`- **Total Transactions:** ${stats.tx_count_24h.toLocaleString()}`);
      sections.push(
        `- **Average Tx/Block:** ${(stats.tx_count_24h / 144).toFixed(0)} (assuming ~144 blocks/day)`
      );
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');

    return sections.join('\n');
  }

  /**
   * Get mempool congestion indicator
   */
  private getMempoolIndicator(mempoolSize: number): string {
    if (mempoolSize < 5000) {
      return '✅ (Low congestion)';
    }
    if (mempoolSize < 50000) {
      return '⚠️ (Moderate congestion)';
    }
    if (mempoolSize < 100000) {
      return '🔶 (High congestion)';
    }
    return '🔴 (Very high congestion)';
  }

  /**
   * Get fee level indicator
   */
  private getFeeIndicator(feeSatPerVByte: number): string {
    if (feeSatPerVByte < 5) {
      return '✅ (Low fees)';
    }
    if (feeSatPerVByte < 20) {
      return '⚠️ (Moderate fees)';
    }
    if (feeSatPerVByte < 50) {
      return '🔶 (High fees)';
    }
    return '🔴 (Very high fees)';
  }

  /**
   * Format confirmation time from blocks to approximate minutes
   */
  private formatConfirmationTime(blocks: number): string {
    const minutes = blocks * 10; // Average 10 min per block
    if (minutes < 60) {
      return `~${minutes} minutes`;
    }
    const hours = (minutes / 60).toFixed(1);
    return `~${hours} hours`;
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
