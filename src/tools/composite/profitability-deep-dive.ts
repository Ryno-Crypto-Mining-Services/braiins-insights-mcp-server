/**
 * MCP Composite Tool: braiins_profitability_deep_dive
 *
 * Comprehensive profitability analysis combining multiple API endpoints:
 * - Profitability calculator (daily/monthly/annual metrics)
 * - Cost-to-mine (break-even analysis)
 * - Price stats (market context)
 * - Hashrate value history (optional historical trends)
 *
 * @category Composite Tool
 * @see https://insights.braiins.com/api/v2.0/profitability-calculator
 * @see https://insights.braiins.com/api/v2.0/cost-to-mine
 */

import { z } from 'zod';
import type {
  BraiinsInsightsProfitability,
  ProfitabilityQueryParams,
} from '../../types/profitability.js';
import type {
  BraiinsInsightsCostToMine,
  BraiinsInsightsPriceStats,
  BraiinsInsightsHashrateValue,
  CostToMineQueryParams,
} from '../../types/insights-api.js';
import { InsightsApiClient, InsightsApiError, NetworkError } from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Zod validation schema for profitability deep dive input
 */
const ProfitabilityDeepDiveInputSchema = z.object({
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
  include_historical: z
    .boolean()
    .default(false)
    .describe('Include historical hashrate value trends'),
  historical_days: z
    .number()
    .min(7, 'Historical data minimum 7 days')
    .max(90, 'Historical data maximum 90 days')
    .default(30)
    .describe('Number of days of historical data to include'),
});

/**
 * Result structure for Promise.allSettled responses
 */
interface EndpointResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Profitability Deep Dive Composite Tool
 *
 * Aggregates multiple endpoints to provide comprehensive profitability analysis
 * with historical context and market conditions.
 */
export class ProfitabilityDeepDiveTool {
  /** MCP tool name */
  readonly name = 'braiins_profitability_deep_dive';

  /** Tool description shown to LLM */
  readonly description =
    'Comprehensive Bitcoin mining profitability analysis combining calculator, cost-to-mine, ' +
    'current market prices, and optional historical hashrate value trends. ' +
    'Provides detailed profitability metrics, break-even analysis, ROI projections, and mining viability recommendations. ' +
    'Requires electricity cost (USD/kWh) and hardware efficiency (J/TH) as inputs.';

  /** JSON schema for tool inputs */
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
      include_historical: {
        type: 'boolean',
        description: 'Include historical hashrate value trends for context',
        default: false,
      },
      historical_days: {
        type: 'number',
        description: 'Number of days of historical data to include (7-90)',
        default: 30,
        minimum: 7,
        maximum: 90,
      },
    },
    required: ['electricity_cost_kwh', 'hardware_efficiency_jth'],
  };

  constructor(private readonly apiClient: InsightsApiClient) {}

  /**
   * Execute the tool
   *
   * @param input - Profitability analysis parameters
   * @returns MCP response with formatted markdown
   */
  async execute(input: unknown): Promise<MCPToolResponse> {
    try {
      // Validate input with Zod
      const validatedInput = ProfitabilityDeepDiveInputSchema.parse(input);

      // Fetch data from multiple endpoints in parallel with graceful degradation
      const results = await this.fetchAllData(validatedInput);

      // Check if we have minimum required data (profitability calculator)
      if (!results.profitability.success) {
        throw new Error(
          `Failed to fetch profitability data: ${results.profitability.error ?? 'Unknown error'}`
        );
      }

      // Format as comprehensive markdown report
      const markdown = this.formatAsMarkdown(validatedInput, results);

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
   * Fetch data from all endpoints in parallel using Promise.allSettled
   * for graceful degradation on partial failures
   */
  private async fetchAllData(input: z.infer<typeof ProfitabilityDeepDiveInputSchema>): Promise<{
    profitability: EndpointResult<BraiinsInsightsProfitability>;
    costToMine: EndpointResult<BraiinsInsightsCostToMine>;
    priceStats: EndpointResult<BraiinsInsightsPriceStats>;
    historicalHashrateValue: EndpointResult<BraiinsInsightsHashrateValue[]>;
  }> {
    // Build API parameters
    const profitabilityParams: ProfitabilityQueryParams = {
      electricity_cost_kwh: input.electricity_cost_kwh,
      hardware_efficiency_jth: input.hardware_efficiency_jth,
    };

    const costToMineParams: CostToMineQueryParams = {
      electricity_cost_kwh: input.electricity_cost_kwh,
    };

    // Fetch all endpoints in parallel
    const promises = [
      this.apiClient.getProfitabilityCalculator(profitabilityParams),
      this.apiClient.getCostToMine(costToMineParams),
      this.apiClient.getPriceStats(),
      input.include_historical ? this.apiClient.getHashrateValueHistory() : Promise.resolve([]),
    ];

    const results = await Promise.allSettled(promises);

    // Process results with graceful degradation
    return {
      profitability: this.processResult<BraiinsInsightsProfitability>(
        results[0] as PromiseSettledResult<BraiinsInsightsProfitability>
      ),
      costToMine: this.processResult<BraiinsInsightsCostToMine>(
        results[1] as PromiseSettledResult<BraiinsInsightsCostToMine>
      ),
      priceStats: this.processResult<BraiinsInsightsPriceStats>(
        results[2] as PromiseSettledResult<BraiinsInsightsPriceStats>
      ),
      historicalHashrateValue: this.processResult<BraiinsInsightsHashrateValue[]>(
        results[3] as PromiseSettledResult<BraiinsInsightsHashrateValue[]>
      ),
    };
  }

  /**
   * Process Promise.allSettled result into typed EndpointResult
   */
  private processResult<T>(result: PromiseSettledResult<T>): EndpointResult<T> {
    if (result.status === 'fulfilled') {
      return {
        success: true,
        data: result.value,
      };
    } else {
      return {
        success: false,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    }
  }

  /**
   * Format comprehensive profitability report as markdown
   */
  private formatAsMarkdown(
    input: z.infer<typeof ProfitabilityDeepDiveInputSchema>,
    results: {
      profitability: EndpointResult<BraiinsInsightsProfitability>;
      costToMine: EndpointResult<BraiinsInsightsCostToMine>;
      priceStats: EndpointResult<BraiinsInsightsPriceStats>;
      historicalHashrateValue: EndpointResult<BraiinsInsightsHashrateValue[]>;
    }
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('# 💎 Deep Dive Profitability Analysis\n');

    // Input Parameters
    sections.push('## ⚙️ Input Parameters\n');
    sections.push(`- **Electricity Cost:** $${input.electricity_cost_kwh.toFixed(4)}/kWh`);
    sections.push(`- **Hardware Efficiency:** ${input.hardware_efficiency_jth.toFixed(1)} J/TH\n`);

    // Main profitability data is guaranteed to exist
    const profitability = results.profitability.data!;

    // Profitability Summary
    sections.push(this.formatProfitabilitySummary(profitability));

    // Break-Even Analysis (with cost-to-mine data if available)
    sections.push(this.formatBreakEvenAnalysis(profitability, results.costToMine));

    // Market Context (with price stats if available)
    sections.push(this.formatMarketContext(profitability, results.priceStats));

    // Historical Trends (if requested and available)
    if (input.include_historical && results.historicalHashrateValue.success) {
      sections.push(
        this.formatHistoricalTrends(results.historicalHashrateValue.data!, input.historical_days)
      );
    }

    // Recommendations
    sections.push(this.formatRecommendations(profitability, results.costToMine));

    // Warnings about partial failures
    const warnings = this.generateWarnings(results);
    if (warnings.length > 0) {
      sections.push('\n## ⚠️ Data Availability Warnings\n');
      sections.push(...warnings);
    }

    // Footer
    sections.push('\n---\n');
    sections.push('*Data from [Braiins Insights Dashboard](https://insights.braiins.com)*');
    sections.push(`*Analysis generated at: ${new Date().toISOString()}*`);
    sections.push(`*Profitability data as of: ${profitability.timestamp}*`);

    return sections.join('\n');
  }

  /**
   * Format profitability summary section
   */
  private formatProfitabilitySummary(data: BraiinsInsightsProfitability): string {
    const isProfitable = data.net_daily_profit_per_th > 0;
    const profitIndicator = isProfitable ? '✅' : '❌';
    const sign = data.net_daily_profit_per_th >= 0 ? '+' : '';

    // Calculate BTC equivalents
    const dailyRevenueBtc = data.daily_revenue_per_th / data.btc_price_usd;
    const dailyProfitBtc = data.net_daily_profit_per_th / data.btc_price_usd;

    return `
## ⚡ Profitability Summary ${profitIndicator}

### Daily Metrics (per TH/s)

- **Daily Revenue:** $${data.daily_revenue_per_th.toFixed(4)}/TH (≈${this.formatBtc(dailyRevenueBtc)} BTC)
- **Electricity Cost:** $${data.daily_electricity_cost_per_th.toFixed(4)}/TH
- **Net Daily Profit:** ${sign}$${data.net_daily_profit_per_th.toFixed(4)}/TH (≈${sign}${this.formatBtc(dailyProfitBtc)} BTC) ${this.getProfitabilityBadge(data.net_daily_profit_per_th)}

### Extended Projections

- **Monthly Profit:** ${sign}$${data.monthly_profit_per_th.toFixed(2)}/TH (30 days)
- **Annual Profit:** ${sign}$${data.annual_profit_per_th.toFixed(2)}/TH (365 days)
`;
  }

  /**
   * Format break-even analysis section
   */
  private formatBreakEvenAnalysis(
    profitability: BraiinsInsightsProfitability,
    costToMine: EndpointResult<BraiinsInsightsCostToMine>
  ): string {
    const sections: string[] = [];
    sections.push('## 💵 Break-Even Analysis\n');

    sections.push(
      `- **Break-Even BTC Price:** $${this.formatCurrency(profitability.breakeven_btc_price)}`
    );
    sections.push(
      `- **Current BTC Price:** $${this.formatCurrency(profitability.btc_price_usd)} ${this.getPriceComparison(profitability)}`
    );

    // Calculate current margin
    const margin =
      ((profitability.btc_price_usd - profitability.breakeven_btc_price) /
        profitability.breakeven_btc_price) *
      100;
    const marginSign = margin >= 0 ? '+' : '';
    sections.push(
      `- **Current Margin:** ${marginSign}${margin.toFixed(2)}% ${this.getMarginIndicator(margin)}`
    );

    sections.push(
      `- **Profitability Threshold:** $${profitability.profitability_threshold_kwh.toFixed(4)}/kWh (max electricity cost)`
    );
    sections.push(
      `- **Break-Even Hashrate:** ${profitability.breakeven_hashrate_ths.toFixed(2)} TH/s`
    );

    // Add cost-to-mine data if available
    if (costToMine.success && costToMine.data) {
      sections.push(`\n### Cost to Mine 1 BTC: $${this.formatCurrency(costToMine.data.cost_usd)}`);
      sections.push(
        `- **Status:** ${profitability.btc_price_usd > costToMine.data.cost_usd ? '✅ Profitable to mine' : '❌ Cheaper to buy BTC directly'}`
      );
    }

    return sections.join('\n') + '\n';
  }

  /**
   * Format market context section
   */
  private formatMarketContext(
    profitability: BraiinsInsightsProfitability,
    priceStats: EndpointResult<BraiinsInsightsPriceStats>
  ): string {
    const sections: string[] = [];
    sections.push('## 📈 Market Context\n');

    sections.push(`- **Current BTC Price:** $${this.formatCurrency(profitability.btc_price_usd)}`);
    sections.push(
      `- **Network Difficulty:** ${this.formatDifficulty(profitability.network_difficulty)}`
    );

    if (priceStats.success && priceStats.data) {
      const priceChange = priceStats.data.price_change_24h_percent;
      const changeIndicator = priceChange >= 0 ? '📈' : '📉';
      const sign = priceChange >= 0 ? '+' : '';
      sections.push(`- **24h Price Change:** ${sign}${priceChange.toFixed(2)}% ${changeIndicator}`);

      if (priceStats.data.market_cap_usd) {
        sections.push(
          `- **Market Cap:** $${this.formatLargeNumber(priceStats.data.market_cap_usd)}`
        );
      }

      if (priceStats.data.volume_24h_usd) {
        sections.push(
          `- **24h Volume:** $${this.formatLargeNumber(priceStats.data.volume_24h_usd)}`
        );
      }
    }

    sections.push(`\n**Market Condition:** ${this.getMarketCondition(profitability)}`);

    return sections.join('\n') + '\n';
  }

  /**
   * Format historical trends section
   */
  private formatHistoricalTrends(history: BraiinsInsightsHashrateValue[], days: number): string {
    if (history.length === 0) {
      return '## 📊 Historical Trends\n\n*No historical data available*\n';
    }

    const sections: string[] = [];
    sections.push('## 📊 Historical Trends\n');

    // Calculate statistics from historical data
    const recentData = history.slice(-days);
    const hashValues = recentData.map((d) => d.hash_value_usd_per_th_day);
    const currentValue = hashValues[hashValues.length - 1] ?? 0;
    const avgValue = hashValues.reduce((a, b) => a + b, 0) / hashValues.length;
    const minValue = Math.min(...hashValues);
    const maxValue = Math.max(...hashValues);

    sections.push(`### Hashrate Value Trends (Last ${recentData.length} days)\n`);
    sections.push(`- **Current Value:** $${currentValue.toFixed(6)}/TH/day`);
    sections.push(`- **${days}-Day Average:** $${avgValue.toFixed(6)}/TH/day`);
    sections.push(`- **Min:** $${minValue.toFixed(6)}/TH/day`);
    sections.push(`- **Max:** $${maxValue.toFixed(6)}/TH/day`);

    // Trend analysis
    const trend = currentValue > avgValue ? 'above' : 'below';
    const trendPercent = Math.abs(((currentValue - avgValue) / avgValue) * 100);
    sections.push(
      `\n**Trend Analysis:** Current hashrate value is ${trendPercent.toFixed(1)}% ${trend} the ${days}-day average.`
    );

    return sections.join('\n') + '\n';
  }

  /**
   * Format recommendations section
   */
  private formatRecommendations(
    profitability: BraiinsInsightsProfitability,
    costToMine: EndpointResult<BraiinsInsightsCostToMine>
  ): string {
    const sections: string[] = [];
    sections.push('## 💡 Recommendations\n');

    const isProfitable = profitability.net_daily_profit_per_th > 0;

    if (isProfitable) {
      if (profitability.net_daily_profit_per_th > 0.05) {
        sections.push(
          '✅ **Mining Viability:** Excellent - High profit margins make mining highly attractive.'
        );
        sections.push('- Consider expanding operations or upgrading to more efficient hardware.');
      } else if (profitability.net_daily_profit_per_th > 0.02) {
        sections.push(
          '✅ **Mining Viability:** Good - Healthy profit margins support sustainable mining operations.'
        );
        sections.push('- Monitor difficulty adjustments and price movements.');
      } else {
        sections.push(
          '⚠️ **Mining Viability:** Fair - Slim profit margins require careful cost management.'
        );
        sections.push('- Consider negotiating better electricity rates or upgrading hardware.');
        sections.push('- Small price drops or difficulty increases could eliminate profits.');
      }
    } else {
      sections.push(
        '❌ **Mining Viability:** Not Recommended - Current parameters result in losses.'
      );
      sections.push(
        `- Break-even requires BTC price above $${this.formatCurrency(profitability.breakeven_btc_price)} or electricity below $${profitability.profitability_threshold_kwh.toFixed(4)}/kWh`
      );

      if (costToMine.success && costToMine.data) {
        sections.push(
          `- Consider buying BTC directly - cheaper than mining at current cost of $${this.formatCurrency(costToMine.data.cost_usd)} per BTC.`
        );
      }
    }

    return sections.join('\n') + '\n';
  }

  /**
   * Generate warnings for partial failures
   */
  private generateWarnings(results: {
    profitability: EndpointResult<BraiinsInsightsProfitability>;
    costToMine: EndpointResult<BraiinsInsightsCostToMine>;
    priceStats: EndpointResult<BraiinsInsightsPriceStats>;
    historicalHashrateValue: EndpointResult<BraiinsInsightsHashrateValue[]>;
  }): string[] {
    const warnings: string[] = [];

    if (!results.costToMine.success) {
      warnings.push(
        `- Cost-to-mine data unavailable: ${results.costToMine.error ?? 'Unknown error'}`
      );
    }

    if (!results.priceStats.success) {
      warnings.push(
        `- Market price data unavailable: ${results.priceStats.error ?? 'Unknown error'}`
      );
    }

    if (!results.historicalHashrateValue.success && results.historicalHashrateValue.error) {
      warnings.push(`- Historical data unavailable: ${results.historicalHashrateValue.error}`);
    }

    return warnings;
  }

  // ========== Helper Methods ==========

  private getProfitabilityBadge(profit: number): string {
    if (profit > 0.05) {
      return '(Highly Profitable)';
    }
    if (profit > 0.02) {
      return '(Profitable)';
    }
    if (profit > 0) {
      return '(Marginally Profitable)';
    }
    if (profit > -0.02) {
      return '(Marginally Unprofitable)';
    }
    return '(Unprofitable)';
  }

  private getPriceComparison(data: BraiinsInsightsProfitability): string {
    const margin =
      ((data.btc_price_usd - data.breakeven_btc_price) / data.breakeven_btc_price) * 100;
    if (margin > 50) {
      return '✅ (Well above break-even)';
    }
    if (margin > 20) {
      return '✅ (Above break-even)';
    }
    if (margin > 0) {
      return '⚠️ (Slightly above break-even)';
    }
    if (margin > -20) {
      return '❌ (Below break-even)';
    }
    return '❌ (Well below break-even)';
  }

  private getMarginIndicator(marginPercent: number): string {
    if (marginPercent > 50) {
      return '✅ (Excellent margin)';
    }
    if (marginPercent > 20) {
      return '✅ (Good margin)';
    }
    if (marginPercent > 0) {
      return '⚠️ (Thin margin)';
    }
    if (marginPercent > -20) {
      return '❌ (Loss)';
    }
    return '🔴 (Severe loss)';
  }

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

  private formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatBtc(value: number): string {
    return value.toFixed(8);
  }

  private formatDifficulty(value: number): string {
    return value.toExponential(2);
  }

  private formatLargeNumber(value: number): string {
    if (value >= 1e12) {
      return `${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`;
    }
    return this.formatCurrency(value);
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
            text: `❌ **Invalid Input Parameters**\n\n${issues}\n\n**Required parameters:**\n- electricity_cost_kwh: number (0-1)\n- hardware_efficiency_jth: number (1-200)\n\n**Optional:**\n- include_historical: boolean\n- historical_days: number (7-90)`,
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
