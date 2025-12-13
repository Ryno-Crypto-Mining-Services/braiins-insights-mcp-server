/**
 * TypeScript type definitions for Braiins Insights Dashboard API
 *
 * @see https://insights.braiins.com
 * @see https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server/blob/main/API.md
 */

/**
 * Bitcoin network hashrate statistics from Braiins Insights Dashboard.
 *
 * Endpoint: GET /v1.0/hashrate-stats
 * Authentication: None required (public endpoint)
 * Cache TTL: 5 minutes (300,000ms)
 *
 * @see https://insights.braiins.com/api/v1.0/hashrate-stats
 * @see /docs/api-discovery/hashrate-stats.md
 */
export interface BraiinsInsightsHashrateStats {
  /**
   * Average transaction fees per block in BTC
   *
   * @example 0.015
   * @minimum 0
   */
  avg_fees_per_block: number;

  /**
   * Current network hashrate in exahashes per second (EH/s)
   *
   * This is the reported current hashrate based on recent blocks.
   *
   * @example 1094.42
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  current_hashrate: number;

  /**
   * Estimated current hashrate in EH/s
   *
   * This may differ from `current_hashrate` as it uses statistical estimation
   * rather than direct block measurements.
   *
   * @example 1148.46
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  current_hashrate_estimated: number;

  /**
   * Transaction fees as percentage of total mining revenue
   *
   * @example 0.48 (meaning 0.48%, not 48%)
   * @unit Percentage
   * @minimum 0
   * @maximum 100
   */
  fees_percent: number;

  /**
   * Hash price in USD per terahash per day
   *
   * Represents how much revenue miners earn per TH/s per day.
   *
   * @example 0.038
   * @unit USD/TH/day
   * @minimum 0
   */
  hash_price: number;

  /**
   * 30-day average network hashrate in EH/s
   *
   * @example 1075.4
   * @unit EH/s (exahashes per second)
   * @minimum 0
   */
  hash_rate_30: number;

  /**
   * Hash value in USD per terahash per day
   *
   * May be represented in scientific notation (e.g., 4E-7).
   * Appears to be similar or identical to `hash_price`.
   *
   * @example 0.0000004
   * @unit USD/TH/day
   */
  hash_value: number;

  /**
   * Monthly average hashrate change over the past 1 year
   */
  monthly_avg_hashrate_change_1_year: {
    /**
     * Relative change as decimal
     *
     * @example 0.03 (meaning 3% increase)
     * @example -0.05 (meaning 5% decrease)
     */
    relative: number;

    /**
     * Absolute change in exahashes per second
     *
     * @example 29.47665536
     * @unit EH/s
     */
    absolute: number;
  };

  /**
   * Total daily network revenue in USD
   *
   * This is the total value of all block rewards + fees for the day.
   *
   * @example 40809781.01
   * @unit USD
   * @minimum 0
   */
  rev_usd: number;
}

/**
 * Type guard to validate if an object is a valid BraiinsInsightsHashrateStats
 *
 * @param obj - Object to validate
 * @returns True if object matches BraiinsInsightsHashrateStats structure
 *
 * @example
 * ```typescript
 * const data = await fetch('/api/v1.0/hashrate-stats');
 * if (isHashrateStats(data)) {
 *   console.log(data.current_hashrate);
 * }
 * ```
 */
export function isHashrateStats(obj: unknown): obj is BraiinsInsightsHashrateStats {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const stats = obj as Record<string, unknown>;

  return (
    typeof stats.avg_fees_per_block === 'number' &&
    typeof stats.current_hashrate === 'number' &&
    typeof stats.current_hashrate_estimated === 'number' &&
    typeof stats.fees_percent === 'number' &&
    typeof stats.hash_price === 'number' &&
    typeof stats.hash_rate_30 === 'number' &&
    typeof stats.hash_value === 'number' &&
    typeof stats.monthly_avg_hashrate_change_1_year === 'object' &&
    stats.monthly_avg_hashrate_change_1_year !== null &&
    typeof (stats.monthly_avg_hashrate_change_1_year as Record<string, unknown>).relative === 'number' &&
    typeof (stats.monthly_avg_hashrate_change_1_year as Record<string, unknown>).absolute === 'number' &&
    typeof stats.rev_usd === 'number'
  );
}
