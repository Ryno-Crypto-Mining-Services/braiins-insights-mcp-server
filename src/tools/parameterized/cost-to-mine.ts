/**
 * MCP Tool: braiins_cost_to_mine
 *
 * Calculates the cost to mine one Bitcoin based on hardware specifications
 * and electricity costs. Provides break-even analysis and profitability metrics.
 *
 * @category Parameterized Tool
 * @see https://insights.braiins.com/api/v2.0/cost-to-mine
 * @see https://academy.braiins.com/en/mining-insights/public-api/#cost-to-mine
 */

import { z } from 'zod';
import type { BraiinsInsightsCostToMine, CostToMineQueryParams } from '../../types/insights-api.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod validation schema for cost-to-mine input
 *
 * Required: hashrate_ths, consumption_watts, electricity_price_per_kwh
 */
const CostToMineInputSchema = z.object({
  hashrate_ths: z
    .number()
    .positive('Hashrate must be positive')
    .describe('Mining hardware hashrate in terahashes per second (TH/s)'),

  consumption_watts: z
    .number()
    .positive('Power consumption must be positive')
    .describe('Mining hardware power consumption in watts'),

  electricity_price_per_kwh: z
    .number()
    .min(0, 'Electricity price cannot be negative')
    .max(1, 'Electricity price unreasonably high (>$1/kWh)')
    .describe('Electricity cost in USD per kilowatt-hour'),

  // Optional advanced parameters
  revenue_fees_rate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Pool fee rate as decimal (e.g., 0.02 = 2%)'),

  yearly_difficulty_change_rate: z
    .number()
    .optional()
    .describe('Expected yearly difficulty change rate (e.g., 0.02 = 2% increase)'),

  period_resolution: z
    .enum(['1m', '2w', '1w', '1d'])
    .optional()
    .describe('Time resolution for projections: 1m (month), 2w, 1w, 1d'),

  periods: z.number().int().min(1).max(60).optional().describe('Number of periods to project'),
});

type CostToMineInput = z.infer<typeof CostToMineInputSchema>;

/**
 * Cost to Mine Tool
 *
 * Parameterized tool that calculates the cost to mine one Bitcoin based on
 * hardware specifications, electricity costs, and network conditions.
 */
export class CostToMineTool {
  /** MCP tool name */
  readonly name = 'braiins_cost_to_mine';

  /** Tool description shown to LLM */
  readonly description =
    'Calculate the cost to mine one Bitcoin based on your mining hardware specifications. ' +
    'Requires hashrate (TH/s), power consumption (watts), and electricity cost (USD/kWh). ' +
    'Returns comprehensive profitability analysis including break-even price, daily profit, ' +
    'and cost projections. Use this for mining profitability analysis.';

  /** JSON schema for tool inputs */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      hashrate_ths: {
        type: 'number',
        description: 'Mining hardware hashrate in TH/s (e.g., 100 for Antminer S19)',
        minimum: 0.001,
      },
      consumption_watts: {
        type: 'number',
        description: 'Mining hardware power consumption in watts (e.g., 3000)',
        minimum: 1,
      },
      electricity_price_per_kwh: {
        type: 'number',
        description: 'Electricity cost in USD per kWh (e.g., 0.08)',
        minimum: 0,
        maximum: 1,
      },
      revenue_fees_rate: {
        type: 'number',
        description: 'Pool fee rate as decimal (default: 0.02 = 2%)',
        minimum: 0,
        maximum: 1,
      },
      yearly_difficulty_change_rate: {
        type: 'number',
        description: 'Expected yearly difficulty change rate (default: 0.02)',
      },
      period_resolution: {
        type: 'string',
        enum: ['1m', '2w', '1w', '1d'],
        description: 'Projection time resolution (default: 1m = monthly)',
      },
      periods: {
        type: 'number',
        description: 'Number of periods to project (default: 24)',
        minimum: 1,
        maximum: 60,
      },
    },
    required: ['hashrate_ths', 'consumption_watts', 'electricity_price_per_kwh'] as string[],
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
      const params: CostToMineQueryParams = {
        hashrate_ths: validatedInput.hashrate_ths,
        consumption_watts: validatedInput.consumption_watts,
        electricity_price_per_kwh: validatedInput.electricity_price_per_kwh,
      };

      // Add optional parameters if provided
      if (validatedInput.revenue_fees_rate !== undefined) {
        params.revenue_fees_rate = validatedInput.revenue_fees_rate;
      }
      if (validatedInput.yearly_difficulty_change_rate !== undefined) {
        params.yearly_difficulty_change_rate = validatedInput.yearly_difficulty_change_rate;
      }
      if (validatedInput.period_resolution !== undefined) {
        params.period_resolution = validatedInput.period_resolution;
      }
      if (validatedInput.periods !== undefined) {
        params.periods = validatedInput.periods;
      }

      // Fetch data from API
      const costData = await this.apiClient.getCostToMine(params);

      // Format as markdown
      const markdown = this.formatAsMarkdown(costData, validatedInput);

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
  private formatAsMarkdown(data: BraiinsInsightsCostToMine, input: CostToMineInput): string {
    const { result, payload } = data;
    const sections: string[] = [];

    sections.push('# ⚒️ Cost to Mine 1 BTC\n');

    // Input Summary
    sections.push('## Hardware Configuration\n');
    sections.push(`| Parameter | Value |`);
    sections.push(`|-----------|-------|`);
    sections.push(`| Hashrate | ${input.hashrate_ths.toLocaleString()} TH/s |`);
    sections.push(`| Power Consumption | ${input.consumption_watts.toLocaleString()} W |`);
    sections.push(`| Efficiency | ${result.hardware_efficiency_j_th.toFixed(1)} J/TH |`);
    sections.push(`| Electricity Cost | $${input.electricity_price_per_kwh.toFixed(4)}/kWh |\n`);

    // Key Results
    sections.push('## Mining Cost Analysis\n');
    const isProfitable = result.fiat_margin > 0;
    const profitIcon = isProfitable ? '✅' : '❌';

    sections.push(`| Metric | Value |`);
    sections.push(`|--------|-------|`);
    sections.push(
      `| **Cost to Mine 1 BTC** | $${this.formatCurrency(result.fiat_cost)} ${this.getCostIndicator(result.fiat_cost)} |`
    );
    sections.push(`| **Current BTC Price** | $${this.formatCurrency(result.price[0] ?? 0)} |`);
    sections.push(
      `| **Profit Margin** | ${result.fiat_margin >= 0 ? '+' : ''}$${this.formatCurrency(result.fiat_margin)} ${profitIcon} |`
    );
    sections.push(
      `| **Daily Profit/Loss** | ${result.fiat_profit_daily >= 0 ? '+' : ''}$${result.fiat_profit_daily.toFixed(2)}/day |`
    );
    sections.push(`| **BTC Mined Daily** | ${result.coin_mined_daily.toFixed(8)} BTC |\n`);

    // Break-even Analysis
    sections.push('## Break-Even Analysis\n');
    sections.push(
      `- **Break-Even Electricity Price:** $${result.fiat_break_even_electricity_price.toFixed(4)}/kWh`
    );

    const currentPrice = input.electricity_price_per_kwh;
    const breakEvenPrice = result.fiat_break_even_electricity_price;
    if (currentPrice <= breakEvenPrice) {
      sections.push(
        `  ✅ Your electricity cost ($${currentPrice.toFixed(4)}) is **below** break-even`
      );
    } else {
      sections.push(
        `  ❌ Your electricity cost ($${currentPrice.toFixed(4)}) is **above** break-even`
      );
    }

    // Network Context
    sections.push('\n## Network Context\n');
    sections.push(`- **Network Difficulty:** ${this.formatDifficulty(result.difficulty)}`);
    sections.push(
      `- **Pool Fee Rate:** ${((payload.revenue_fees_rate ?? 0.02) * 100).toFixed(1)}%`
    );
    sections.push(
      `- **Projected Difficulty Change:** ${((payload.yearly_difficulty_change_rate ?? 0.02) * 100).toFixed(1)}%/year`
    );

    // Profitability Interpretation
    sections.push('\n## Interpretation\n');
    sections.push(this.getInterpretation(result, input));

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');
    sections.push(`*Timestamp: ${payload.timestamp}*`);

    return sections.join('\n');
  }

  /**
   * Get cost indicator emoji based on current profitability
   */
  private getCostIndicator(costUsd: number): string {
    if (costUsd < 40000) {
      return '🟢';
    }
    if (costUsd < 80000) {
      return '🟡';
    }
    if (costUsd < 120000) {
      return '🟠';
    }
    return '🔴';
  }

  /**
   * Format difficulty with appropriate notation
   */
  private formatDifficulty(difficulty: number): string {
    if (difficulty >= 1e15) {
      return `${(difficulty / 1e15).toFixed(2)} P (${difficulty.toExponential(2)})`;
    }
    if (difficulty >= 1e12) {
      return `${(difficulty / 1e12).toFixed(2)} T`;
    }
    return difficulty.toLocaleString();
  }

  /**
   * Get interpretation text based on results
   */
  private getInterpretation(
    result: BraiinsInsightsCostToMine['result'],
    input: CostToMineInput
  ): string {
    const lines: string[] = [];

    lines.push(
      `With your hardware configuration (${input.hashrate_ths} TH/s at ${input.consumption_watts}W), ` +
        `mining one Bitcoin costs approximately **$${this.formatCurrency(result.fiat_cost)}**.\n`
    );

    if (result.fiat_margin > 0) {
      const marginPercent = (result.fiat_margin / result.fiat_cost) * 100;
      lines.push(
        `Mining is currently **profitable** with a margin of $${this.formatCurrency(result.fiat_margin)} ` +
          `(${marginPercent.toFixed(1)}% above cost). Your estimated daily profit is **$${result.fiat_profit_daily.toFixed(2)}**.`
      );
    } else if (result.fiat_margin === 0) {
      lines.push(
        `Mining is at **break-even**. Any small changes in difficulty, BTC price, or electricity cost ` +
          `will tip the balance between profit and loss.`
      );
    } else {
      const lossPercent = (Math.abs(result.fiat_margin) / result.fiat_cost) * 100;
      lines.push(
        `Mining is currently **unprofitable** with a loss of $${this.formatCurrency(Math.abs(result.fiat_margin))} ` +
          `(${lossPercent.toFixed(1)}% below BTC price). Your estimated daily loss is **$${Math.abs(result.fiat_profit_daily).toFixed(2)}**.`
      );
    }

    // Break-even advice
    lines.push('\n');
    const breakEvenElec = result.fiat_break_even_electricity_price;
    if (input.electricity_price_per_kwh > breakEvenElec) {
      lines.push(
        `💡 **Tip:** To break even, you need electricity below $${breakEvenElec.toFixed(4)}/kWh, ` +
          `or BTC price needs to rise to ~$${this.formatCurrency(result.fiat_cost)}.`
      );
    } else {
      const cushion = breakEvenElec - input.electricity_price_per_kwh;
      lines.push(
        `💡 **Tip:** You have a buffer of $${cushion.toFixed(4)}/kWh before reaching break-even. ` +
          `Mining remains profitable unless electricity rises above $${breakEvenElec.toFixed(4)}/kWh.`
      );
    }

    return lines.join('\n');
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
      const issues = error.issues
        .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');
      return {
        content: [
          {
            type: 'text',
            text:
              `❌ **Invalid Input Parameters**\n\n${issues}\n\n` +
              `**Required parameters:**\n` +
              `- hashrate_ths: number (mining hashrate in TH/s)\n` +
              `- consumption_watts: number (power consumption in watts)\n` +
              `- electricity_price_per_kwh: number (0-1, electricity cost in USD/kWh)\n\n` +
              `**Example:** { "hashrate_ths": 100, "consumption_watts": 3000, "electricity_price_per_kwh": 0.08 }`,
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
