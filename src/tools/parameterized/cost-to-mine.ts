/**
 * MCP Tool: braiins_cost_to_mine
 *
 * Calculates the cost to mine one Bitcoin based on current network conditions
 * and optional electricity cost input. Provides break-even analysis and profit margins.
 *
 * @category Parameterized Tool
 * @see https://insights.braiins.com/api/v2.0/cost-to-mine
 */

import { z } from 'zod';
import type {
  BraiinsInsightsCostToMine,
  CostToMineQueryParams,
} from '../../types/insights-api.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod validation schema for cost-to-mine input
 */
const CostToMineInputSchema = z.object({
  electricity_cost_kwh: z
    .number()
    .min(0, 'Electricity cost cannot be negative')
    .max(1, 'Electricity cost unreasonably high (>$1/kWh)')
    .optional()
    .describe('Optional: Electricity cost in USD per kWh'),
});

/**
 * Cost to Mine Tool
 *
 * Parameterized tool that calculates the cost to mine one Bitcoin based on
 * current network difficulty, hashrate, and electricity costs.
 */
export class CostToMineTool {
  /** MCP tool name */
  readonly name = 'braiins_cost_to_mine';

  /** Tool description shown to LLM */
  readonly description =
    'Calculate the cost to mine one Bitcoin based on current network conditions. ' +
    'Optionally specify electricity cost (USD/kWh) for personalized calculations. ' +
    'Provides break-even price analysis and profit margin estimates.';

  /** JSON schema for tool inputs */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      electricity_cost_kwh: {
        type: 'number',
        description: 'Optional: Electricity cost in USD per kilowatt-hour',
        minimum: 0,
        maximum: 1,
      },
    },
    required: [] as string[],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Cost calculation parameters
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate input with Zod
      const validatedInput = CostToMineInputSchema.parse(input);

      // Convert to API params format
      const params: CostToMineQueryParams = {};
      if (validatedInput.electricity_cost_kwh !== undefined) {
        params.electricity_cost_kwh = validatedInput.electricity_cost_kwh;
      }

      // Fetch data from API
      const costData = await this.apiClient.getCostToMine(params);

      // Format as markdown
      const markdown = this.formatAsMarkdown(costData, params);

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
   * Format cost-to-mine data as markdown for LLM consumption
   */
  private formatAsMarkdown(
    data: BraiinsInsightsCostToMine,
    params: CostToMineQueryParams
  ): string {
    const sections: string[] = [];

    sections.push('# ⚒️ Cost to Mine 1 BTC\n');

    // Input Parameters
    if (params.electricity_cost_kwh !== undefined) {
      sections.push('## Input Parameters\n');
      sections.push(
        `- **Electricity Cost:** $${params.electricity_cost_kwh.toFixed(4)}/kWh\n`
      );
    }

    // Cost Metrics
    sections.push('## Mining Cost Analysis\n');
    sections.push(
      `- **Cost to Mine 1 BTC:** $${this.formatCurrency(data.cost_usd)} ${this.getCostIndicator(data.cost_usd)}`
    );

    if (data.electricity_cost_kwh !== undefined) {
      sections.push(
        `- **Electricity Cost Used:** $${data.electricity_cost_kwh.toFixed(4)}/kWh`
      );
    }

    // Break-even Analysis
    if (data.break_even_price_usd !== undefined) {
      sections.push('\n## Break-Even Analysis\n');
      sections.push(
        `- **Break-Even BTC Price:** $${this.formatCurrency(data.break_even_price_usd)}`
      );

      if (data.margin_percent !== undefined) {
        const marginIndicator = this.getMarginIndicator(data.margin_percent);
        const sign = data.margin_percent >= 0 ? '+' : '';
        sections.push(
          `- **Current Profit Margin:** ${sign}${data.margin_percent.toFixed(2)}% ${marginIndicator}`
        );
      }
    }

    // Interpretation
    sections.push('\n## Interpretation\n');
    sections.push(this.getInterpretation(data));

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');
    sections.push(
      '*Calculations based on current network difficulty and average hardware efficiency*'
    );

    return sections.join('\n');
  }

  /**
   * Get cost indicator emoji
   */
  private getCostIndicator(costUsd: number): string {
    if (costUsd < 20000) return '✅ (Low cost)';
    if (costUsd < 40000) return '⚠️ (Moderate cost)';
    if (costUsd < 60000) return '🔶 (High cost)';
    return '🔴 (Very high cost)';
  }

  /**
   * Get margin indicator emoji
   */
  private getMarginIndicator(marginPercent: number): string {
    if (marginPercent > 50) return '✅ (Highly profitable)';
    if (marginPercent > 20) return '✅ (Profitable)';
    if (marginPercent > 0) return '⚠️ (Marginally profitable)';
    if (marginPercent > -20) return '❌ (Unprofitable)';
    return '🔴 (Severely unprofitable)';
  }

  /**
   * Get interpretation text based on data
   */
  private getInterpretation(data: BraiinsInsightsCostToMine): string {
    const lines: string[] = [];

    lines.push(
      `Mining one Bitcoin currently costs approximately **$${this.formatCurrency(data.cost_usd)}**. `
    );

    if (data.margin_percent !== undefined) {
      if (data.margin_percent > 0) {
        lines.push(
          `\nWith current BTC prices, mining is **profitable** with a margin of ${data.margin_percent.toFixed(2)}%. `
        );
        lines.push(
          'This indicates favorable mining conditions for operations at this electricity cost.'
        );
      } else if (data.margin_percent === 0) {
        lines.push('\nMining is currently at **break-even** point. ');
        lines.push(
          'Miners are covering their costs but not generating profit. Small price changes could significantly impact profitability.'
        );
      } else {
        lines.push(
          `\nMining is currently **unprofitable** with a margin of ${data.margin_percent.toFixed(2)}%. `
        );
        lines.push(
          'Consider reducing electricity costs or waiting for more favorable network conditions.'
        );
      }
    }

    if (data.break_even_price_usd !== undefined) {
      lines.push(
        `\n\n💡 **Tip:** BTC price must be above $${this.formatCurrency(data.break_even_price_usd)} for profitable mining at current costs.`
      );
    }

    return lines.join('');
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
    // Zod validation errors
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Invalid Input Parameters**\n\n${issues}\n\n**Optional parameters:**\n- electricity_cost_kwh: number (0-1)`,
          },
        ],
        isError: true,
      };
    }

    if (error instanceof ValidationError) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Validation Error**: ${error.message}\n\nPlease check your input parameters and try again.`,
          },
        ],
        isError: true,
      };
    }

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
