/**
 * MCP Tool: braiins_pool_stats
 *
 * Fetches Bitcoin mining pool distribution statistics including hashrate percentages,
 * blocks mined over different time periods, and pool concentration metrics.
 *
 * @category Simple Stats Tool
 * @see https://insights.braiins.com/api/v1.0/pool-stats
 */

import { BraiinsInsightsPoolStats, BraiinsInsightsPoolStat } from '../../types/insights-api.js';
import {
  InsightsApiClient,
  InsightsApiError,
  NetworkError,
} from '../../api/insights-client.js';
import type { MCPToolResponse } from '../index.js';

/**
 * Pool Statistics Tool
 *
 * Simple stats tool that fetches Bitcoin mining pool distribution data
 * from the Braiins Insights Dashboard API. No parameters required.
 */
export class PoolStatsTool {
  /** MCP tool name */
  readonly name = 'braiins_pool_stats';

  /** Tool description shown to LLM */
  readonly description =
    'Get Bitcoin mining pool distribution statistics including hashrate percentages, ' +
    'blocks mined over different time periods (1d, 1w, 5d, 5w), and pool concentration metrics. ' +
    'Displays pool rankings by effective hashrate and decentralization analysis.';

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
      const pools = await this.apiClient.getPoolStats();

      // Handle empty results
      if (!pools || pools.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '# 🏊 Bitcoin Mining Pool Statistics\n\nNo pool data available at this time.',
            },
          ],
          isError: false,
        };
      }

      // Sort pools by hashrate (descending)
      const sortedPools = this.sortPoolsByHashrate(pools);

      // Format as markdown
      const markdown = this.formatAsMarkdown(sortedPools);

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
   * Sort pools by effective hashrate (descending)
   */
  private sortPoolsByHashrate(pools: BraiinsInsightsPoolStats): BraiinsInsightsPoolStats {
    return [...pools].sort((a, b) => b.hashrate_effective - a.hashrate_effective);
  }

  /**
   * Format pool stats as markdown for LLM consumption
   */
  private formatAsMarkdown(pools: BraiinsInsightsPoolStats): string {
    // Calculate total network hashrate
    const totalHashrate = pools.reduce((sum, pool) => sum + pool.hashrate_effective, 0);

    // Calculate top pool concentration
    const top3Concentration = this.calculateTopPoolConcentration(pools, 3);
    const top5Concentration = this.calculateTopPoolConcentration(pools, 5);

    // Generate pool table
    const poolTable = this.formatPoolTable(pools, totalHashrate);

    return `
# 🏊 Bitcoin Mining Pool Statistics

${poolTable}

## Decentralization Metrics

- **Total Pools Tracked:** ${pools.length}
- **Total Network Hashrate:** ${totalHashrate.toFixed(2)} EH/s
- **Top 3 Pools Control:** ${top3Concentration.toFixed(2)}% of network
- **Top 5 Pools Control:** ${top5Concentration.toFixed(2)}% of network

## Distribution Analysis

${this.formatDistributionAnalysis(pools, totalHashrate)}

---

*Data retrieved from [Braiins Insights Dashboard](https://insights.braiins.com)*
    `.trim();
  }

  /**
   * Format pools as markdown table
   */
  private formatPoolTable(
    pools: BraiinsInsightsPoolStats,
    totalHashrate: number
  ): string {
    const header = `| Rank | Pool Name | Hashrate (EH/s) | Network % | Blocks (24h) | Blocks (1w) |
|------|-----------|-----------------|-----------|--------------|-------------|`;

    const rows = pools.slice(0, 15).map((pool, index) => {
      const poolName = pool.name || 'Unknown';
      const hashratePercent = ((pool.hashrate_effective / totalHashrate) * 100).toFixed(2);
      const blocks24h = pool.blocks_mined['1d']?.absolute ?? 0;
      const blocks1w = pool.blocks_mined['1w']?.absolute ?? 0;

      return `| ${index + 1} | ${poolName} | ${pool.hashrate_effective.toFixed(2)} | ${hashratePercent}% | ${blocks24h} | ${blocks1w} |`;
    });

    const tableContent = [header, ...rows].join('\n');

    // Add note if there are more pools
    const morePoolsNote =
      pools.length > 15 ? `\n\n*Showing top 15 of ${pools.length} total pools*` : '';

    return tableContent + morePoolsNote;
  }

  /**
   * Calculate percentage of hashrate controlled by top N pools
   */
  private calculateTopPoolConcentration(pools: BraiinsInsightsPoolStats, topN: number): number {
    const totalHashrate = pools.reduce((sum, pool) => sum + pool.hashrate_effective, 0);
    const topPoolsHashrate = pools
      .slice(0, topN)
      .reduce((sum, pool) => sum + pool.hashrate_effective, 0);

    return (topPoolsHashrate / totalHashrate) * 100;
  }

  /**
   * Format distribution analysis text
   */
  private formatDistributionAnalysis(
    pools: BraiinsInsightsPoolStats,
    totalHashrate: number
  ): string {
    const largePoolCount = pools.filter((p) => (p.hashrate_effective / totalHashrate) * 100 > 10)
      .length;
    const mediumPoolCount = pools.filter(
      (p) => {
        const percent = (p.hashrate_effective / totalHashrate) * 100;
        return percent >= 5 && percent <= 10;
      }
    ).length;
    const smallPoolCount = pools.filter((p) => (p.hashrate_effective / totalHashrate) * 100 < 5)
      .length;

    return `
- **Large Pools (>10%):** ${largePoolCount}
- **Medium Pools (5-10%):** ${mediumPoolCount}
- **Small Pools (<5%):** ${smallPoolCount}
`.trim();
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
