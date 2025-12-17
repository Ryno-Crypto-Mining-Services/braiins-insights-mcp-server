/**
 * MCP Tool: braiins_blocks
 *
 * Fetches recent Bitcoin blocks with optional pagination and date filtering.
 * Displays block information including height, pool, timestamp, transactions, and size.
 *
 * @category Parameterized Tool
 * @see https://insights.braiins.com/api/v1.0/blocks
 */

import { z } from 'zod';
import { BraiinsInsightsBlockData, BlocksQueryParams } from '../../types/insights-api.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod schema for blocks tool input validation
 *
 * Validates limit parameter
 */
const BlocksInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10)
    .describe('Number of blocks to return'),
});

type BlocksInput = z.infer<typeof BlocksInputSchema>;

/**
 * Blocks Tool
 *
 * Parameterized tool that fetches recent Bitcoin blocks with pagination
 * and optional date range filtering from the Braiins Insights Dashboard API.
 */
export class BlocksTool {
  /** MCP tool name */
  readonly name = 'braiins_blocks';

  /** Tool description shown to LLM */
  readonly description =
    'Get recent Bitcoin blocks mined with optional pagination and date filtering. ' +
    'Returns block information including height, mining pool, timestamp, ' +
    'transaction count, size, and block hash.';

  /** JSON schema for tool inputs */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Number of blocks to return',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Tool input parameters (limit)
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate and parse input
      const validatedInput = BlocksInputSchema.parse(input);

      // Build query params
      const params: BlocksQueryParams = {
        limit: validatedInput.limit,
      };

      // Fetch blocks from API
      const blocks = await this.apiClient.getBlocks(params);

      // Handle empty results
      if (blocks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: this.formatEmptyResult(params),
            },
          ],
          isError: false,
        };
      }

      // Format as markdown
      const markdown = this.formatAsMarkdown(blocks, validatedInput);

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
   * Format blocks as markdown table
   */
  private formatAsMarkdown(blocks: BraiinsInsightsBlockData[], _params: BlocksInput): string {
    const summaryStats = this.calculateSummaryStats(blocks);
    const tableRows = blocks
      .map(
        (block) =>
          `| ${block.height.toLocaleString()} | ${block.pool} | ${this.formatRelativeTime(block.timestamp)} | ${block.block_value_btc.toFixed(8)} BTC | $${block.block_value_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |`
      )
      .join('\n');

    return `
# 🧱 Recent Bitcoin Blocks

**Showing ${blocks.length} most recent blocks**

| Height  | Pool        | Timestamp    | Block Value (BTC) | Block Value (USD) |
|---------|-------------|--------------|-------------------|-------------------|
${tableRows}

**Summary:**
- Total Blocks Displayed: ${blocks.length}
- Average Block Value: ${summaryStats.avgValueBtc.toFixed(8)} BTC ($${summaryStats.avgValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})

---
*Data retrieved from [Braiins Insights Dashboard](https://insights.braiins.com)*
*Timestamp: ${new Date().toISOString()}*
    `.trim();
  }

  /**
   * Format empty result message
   */
  private formatEmptyResult(params: BlocksQueryParams): string {
    return `
# 🧱 Recent Bitcoin Blocks

⚠️ **No blocks found** for the specified criteria.

**Limit:** ${params.limit ?? 10}

Try again later or check the Braiins Insights API status.
    `.trim();
  }

  /**
   * Calculate summary statistics for blocks
   */
  private calculateSummaryStats(blocks: BraiinsInsightsBlockData[]): {
    avgValueBtc: number;
    avgValueUsd: number;
  } {
    const totalValueBtc = blocks.reduce((sum, block) => sum + block.block_value_btc, 0);
    const totalValueUsd = blocks.reduce((sum, block) => sum + block.block_value_usd, 0);

    return {
      avgValueBtc: blocks.length > 0 ? totalValueBtc / blocks.length : 0,
      avgValueUsd: blocks.length > 0 ? totalValueUsd / blocks.length : 0,
    };
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
        // Less than 24 hours
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours}h ago`;
      } else {
        const diffDays = Math.floor(diffMins / 1440);
        return `${diffDays}d ago`;
      }
    } catch {
      // Fallback to raw timestamp if parsing fails
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

    // Handle validation errors from API client
    if (error instanceof ValidationError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Response Validation Error**: ${error.message}\n\nThe API returned unexpected data format. Please report this issue.`,
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
