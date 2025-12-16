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
 * Validates pagination parameters and date range filters
 */
const BlocksInputSchema = z
  .object({
    page: z
      .number()
      .int()
      .min(1, 'Page number must be at least 1')
      .default(1)
      .describe('Page number (1-indexed)'),
    page_size: z
      .number()
      .int()
      .min(1, 'Page size must be at least 1')
      .max(100, 'Page size cannot exceed 100')
      .default(10)
      .describe('Number of blocks per page'),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
      .optional()
      .describe('Filter blocks mined after this date (ISO 8601: YYYY-MM-DD)'),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
      .optional()
      .describe('Filter blocks mined before this date (ISO 8601: YYYY-MM-DD)'),
  })
  .refine(
    (data) => {
      // Validate that start_date is before or equal to end_date if both are provided
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'start_date must be before or equal to end_date',
      path: ['start_date'],
    }
  );

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
      page: {
        type: 'number',
        description: 'Page number (1-indexed)',
        default: 1,
        minimum: 1,
      },
      page_size: {
        type: 'number',
        description: 'Number of blocks per page',
        default: 10,
        minimum: 1,
        maximum: 100,
      },
      start_date: {
        type: 'string',
        description: 'Filter blocks after this date (ISO 8601: YYYY-MM-DD)',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      end_date: {
        type: 'string',
        description: 'Filter blocks before this date (ISO 8601: YYYY-MM-DD)',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Tool input parameters (pagination and filters)
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate and parse input
      const validatedInput = BlocksInputSchema.parse(input);

      // Build query params
      const params: BlocksQueryParams = {
        page: validatedInput.page,
        page_size: validatedInput.page_size,
      };

      if (validatedInput.start_date) {
        params.start_date = validatedInput.start_date;
      }

      if (validatedInput.end_date) {
        params.end_date = validatedInput.end_date;
      }

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
  private formatAsMarkdown(blocks: BraiinsInsightsBlockData[], params: BlocksInput): string {
    const filterInfo = this.formatFilterInfo(params);
    const summaryStats = this.calculateSummaryStats(blocks);
    const tableRows = blocks
      .map(
        (block) =>
          `| ${block.height.toLocaleString()} | ${block.pool_name ?? 'Unknown'} | ${this.formatRelativeTime(block.timestamp)} | ${block.transaction_count.toLocaleString()} | ${block.size_mb.toFixed(2)} MB | \`${this.formatBlockHash(block.hash ?? '')}\` |`
      )
      .join('\n');

    return `
# 🧱 Recent Bitcoin Blocks

${filterInfo}

**Blocks:**

| Height  | Pool        | Timestamp    | Transactions | Size    | Hash (short) |
|---------|-------------|--------------|--------------|---------|--------------|
${tableRows}

**Summary:**
- Total Blocks Displayed: ${blocks.length}
- Average Block Size: ${summaryStats.avgSize.toFixed(2)} MB
- Average Transactions/Block: ${summaryStats.avgTxCount.toFixed(0)}

---
*Data retrieved from [Braiins Insights Dashboard](https://insights.braiins.com)*
*Timestamp: ${new Date().toISOString()}*
    `.trim();
  }

  /**
   * Format filter information for display
   */
  private formatFilterInfo(params: BlocksInput): string {
    const filters: string[] = [];

    filters.push(`- Page: ${params.page}`);
    filters.push(`- Page Size: ${params.page_size}`);

    if (params.start_date) {
      filters.push(`- Start Date: ${params.start_date}`);
    }

    if (params.end_date) {
      filters.push(`- End Date: ${params.end_date}`);
    }

    return `**Filters Applied:**\n${filters.join('\n')}`;
  }

  /**
   * Format empty result message
   */
  private formatEmptyResult(params: BlocksQueryParams): string {
    const dateRange =
      params.start_date && params.end_date
        ? ` between ${params.start_date} and ${params.end_date}`
        : params.start_date
          ? ` after ${params.start_date}`
          : params.end_date
            ? ` before ${params.end_date}`
            : '';

    return `
# 🧱 Recent Bitcoin Blocks

⚠️ **No blocks found** for the specified criteria.

**Filters:**
- Page: ${params.page ?? 1}
- Page Size: ${params.page_size ?? 10}${dateRange ? `\n- Date Range:${dateRange}` : ''}

Try adjusting your filters or page number.
    `.trim();
  }

  /**
   * Calculate summary statistics for blocks
   */
  private calculateSummaryStats(blocks: BraiinsInsightsBlockData[]): {
    avgSize: number;
    avgTxCount: number;
  } {
    const totalSize = blocks.reduce((sum, block) => sum + block.size_mb, 0);
    const totalTxCount = blocks.reduce((sum, block) => sum + block.transaction_count, 0);

    return {
      avgSize: blocks.length > 0 ? totalSize / blocks.length : 0,
      avgTxCount: blocks.length > 0 ? totalTxCount / blocks.length : 0,
    };
  }

  /**
   * Format block hash to show first and last 6 characters
   */
  private formatBlockHash(hash: string): string {
    if (hash.length <= 16) {
      return hash;
    }
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 6)}`;
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
