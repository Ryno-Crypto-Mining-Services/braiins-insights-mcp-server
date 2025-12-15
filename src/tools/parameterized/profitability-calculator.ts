/**
 * MCP Tool: braiins_profitability_calculator
 *
 * Calculates Bitcoin mining profitability based on electricity cost and hardware efficiency.
 * Provides daily revenue, costs, profit margins, ROI estimates, and break-even analysis.
 *
 * @category Parameterized Tool
 * @see https://insights.braiins.com/api/v2.0/profitability-calculator
 */

import { z } from 'zod';
import type {
  BraiinsInsightsProfitability,
  ProfitabilityQueryParams,
} from '../../types/profitability.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
  ValidationError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod validation schema for profitability calculator input
 */
const ProfitabilityInputSchema = z.object({
  electricity_cost_kwh: z
    .number()
    .min(0, 'Electricity cost cannot be negative')
    .max(1, 'Electricity cost unreasonably high (>$1/kWh)')
    .describe('Electricity cost in USD per kWh'),
  hardware_efficiency_jth: z
    .number()
    .min(1, 'Hardware efficiency must be at least 1 J/TH')
    .max(200, 'Hardware efficiency unreasonably high (>200 J/TH)')
    .describe('Hardware efficiency in joules per terahash'),
  hardware_cost_usd: z
    .number()
    .min(0, 'Hardware cost cannot be negative')
    .optional()
    .describe('Optional: Hardware cost for ROI calculation'),
});

/**
 * Profitability Calculator Tool
 *
 * Parameterized tool that calculates Bitcoin mining profitability based on
 * user-provided electricity cost and hardware efficiency parameters.
 */
export class ProfitabilityCalculatorTool {
  /** MCP tool name */
  readonly name = 'braiins_profitability_calculator';

  /** Tool description shown to LLM */
  readonly description =
    'Calculate Bitcoin mining profitability based on electricity cost and hardware efficiency. ' +
    'Provides daily revenue, electricity costs, net profit, ROI estimates, and break-even analysis. ' +
    'Requires electricity cost (USD/kWh) and hardware efficiency (J/TH) as inputs.';

  /** JSON schema for tool inputs (WITH required parameters) */
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      electricity_cost_kwh: {
        type: 'number',
        description: 'Electricity cost in USD per kilowatt-hour',
        minimum: 0,
        maximum: 1,
      },
      hardware_efficiency_jth: {
        type: 'number',
        description:
          'Hardware efficiency in joules per terahash (e.g., Antminer S19 Pro: ~29.5 J/TH, S21: ~17.5 J/TH)',
        minimum: 1,
        maximum: 200,
      },
      hardware_cost_usd: {
        type: 'number',
        description: 'Optional: Hardware cost in USD for ROI calculation',
        minimum: 0,
      },
    },
    required: ['electricity_cost_kwh', 'hardware_efficiency_jth'],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Profitability calculation parameters
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate input with Zod
      const validatedInput = ProfitabilityInputSchema.parse(input);

      // Convert to API params format
      const params: ProfitabilityQueryParams = {
        electricity_cost_kwh: validatedInput.electricity_cost_kwh,
        hardware_efficiency_jth: validatedInput.hardware_efficiency_jth,
        hardware_cost_usd: validatedInput.hardware_cost_usd,
      };

      // Fetch data from API
      const profitability = await this.apiClient.getProfitabilityCalculator(params);

      // Format as markdown
      const markdown = this.formatAsMarkdown(profitability, params);

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
   * Format profitability data as markdown for LLM consumption
   */
  private formatAsMarkdown(
    data: BraiinsInsightsProfitability,
    params: ProfitabilityQueryParams
  ): string {
    const isProfitable = data.net_daily_profit_per_th > 0;
    const profitIndicator = isProfitable ? '✅' : '❌';
    const profitColor = isProfitable ? '+' : '';

    return `
# ⚡ Bitcoin Mining Profitability Analysis

## Input Parameters

- **Electricity Cost:** $${params.electricity_cost_kwh.toFixed(4)}/kWh
- **Hardware Efficiency:** ${params.hardware_efficiency_jth.toFixed(1)} J/TH
${params.hardware_cost_usd ? `- **Hardware Cost:** $${this.formatCurrency(params.hardware_cost_usd)}` : ''}

## Profitability Metrics ${profitIndicator}

### Daily Metrics (per TH/s)

- **Daily Revenue:** $${data.daily_revenue_per_th.toFixed(4)}/TH
- **Daily Electricity Cost:** $${data.daily_electricity_cost_per_th.toFixed(4)}/TH
- **Net Daily Profit:** ${profitColor}$${data.net_daily_profit_per_th.toFixed(4)}/TH ${this.getProfitabilityBadge(data.net_daily_profit_per_th)}

### Extended Projections

- **Monthly Profit:** ${profitColor}$${data.monthly_profit_per_th.toFixed(2)}/TH (30 days)
- **Annual Profit:** ${profitColor}$${data.annual_profit_per_th.toFixed(2)}/TH (365 days)

${this.formatROI(data, params)}

## Break-Even Analysis

- **Break-even BTC Price:** $${this.formatCurrency(data.breakeven_btc_price)}
- **Current BTC Price:** $${this.formatCurrency(data.btc_price_usd)} ${this.getPriceComparison(data)}
- **Break-even Hashrate:** ${data.breakeven_hashrate_ths.toFixed(2)} TH/s
- **Profitability Threshold:** $${data.profitability_threshold_kwh.toFixed(4)}/kWh

## Network Context

- **Network Difficulty:** ${this.formatDifficulty(data.network_difficulty)}
- **Current Market Conditions:** ${this.getMarketCondition(data)}

---

*Data retrieved from [Braiins Insights Dashboard](https://insights.braiins.com)*
*Calculations based on current network conditions as of ${data.timestamp}*
*${this.getProfitabilityWarning(data)}*
    `.trim();
  }

  /**
   * Format ROI section if hardware cost provided
   */
  private formatROI(
    data: BraiinsInsightsProfitability,
    params: ProfitabilityQueryParams
  ): string {
    if (!params.hardware_cost_usd || !data.roi_days) {
      return '';
    }

    const roiMonths = (data.roi_days / 30).toFixed(1);
    const roiYears = (data.roi_days / 365).toFixed(2);

    return `
## Return on Investment

- **Hardware Cost:** $${this.formatCurrency(params.hardware_cost_usd)}
- **Estimated ROI Period:** ${data.roi_days} days (${roiMonths} months / ${roiYears} years)
- **Daily Progress:** ${((params.hardware_cost_usd / data.roi_days) / params.hardware_cost_usd * 100).toFixed(2)}% of investment
`;
  }

  /**
   * Get profitability badge emoji
   */
  private getProfitabilityBadge(profit: number): string {
    if (profit > 0.05) return '(Highly Profitable)';
    if (profit > 0.02) return '(Profitable)';
    if (profit > 0) return '(Marginally Profitable)';
    if (profit > -0.02) return '(Marginally Unprofitable)';
    return '(Unprofitable)';
  }

  /**
   * Get price comparison indicator
   */
  private getPriceComparison(data: BraiinsInsightsProfitability): string {
    const margin = ((data.btc_price_usd - data.breakeven_btc_price) / data.breakeven_btc_price) * 100;
    if (margin > 50) return '✅ (Well above break-even)';
    if (margin > 20) return '✅ (Above break-even)';
    if (margin > 0) return '⚠️ (Slightly above break-even)';
    if (margin > -20) return '❌ (Below break-even)';
    return '❌ (Well below break-even)';
  }

  /**
   * Get market condition assessment
   */
  private getMarketCondition(data: BraiinsInsightsProfitability): string {
    if (data.net_daily_profit_per_th > 0.05) {
      return 'Excellent - High profit margins';
    } else if (data.net_daily_profit_per_th > 0.02) {
      return 'Good - Healthy profit margins';
    } else if (data.net_daily_profit_per_th > 0) {
      return 'Fair - Slim profit margins';
    } else if (data.net_daily_profit_per_th > -0.02) {
      return 'Poor - Operating at a loss';
    } else {
      return 'Critical - Significant losses';
    }
  }

  /**
   * Get profitability warning if applicable
   */
  private getProfitabilityWarning(data: BraiinsInsightsProfitability): string {
    if (data.net_daily_profit_per_th <= 0) {
      return '⚠️ WARNING: Mining is currently unprofitable with these parameters. Consider reducing electricity costs or upgrading hardware.';
    }
    if (data.net_daily_profit_per_th < 0.01) {
      return '⚠️ CAUTION: Profit margins are very thin. Small changes in BTC price or difficulty could result in losses.';
    }
    return 'Profitability estimates assume stable network conditions and BTC price.';
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
   * Format difficulty in scientific notation
   */
  private formatDifficulty(value: number): string {
    return value.toExponential(2);
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
            text: `❌ **Invalid Input Parameters**\n\n${issues}\n\n**Required parameters:**\n- electricity_cost_kwh: number (0-1)\n- hardware_efficiency_jth: number (1-200)\n\n**Optional:**\n- hardware_cost_usd: number (≥0)`,
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
