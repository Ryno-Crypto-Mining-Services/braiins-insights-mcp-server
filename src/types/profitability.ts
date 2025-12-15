/**
 * TypeScript type definitions for Braiins Insights Profitability Calculator API
 *
 * @see https://insights.braiins.com/api/v2.0/profitability-calculator
 */

/**
 * Query parameters for profitability calculator endpoint
 *
 * Endpoint: GET /v2.0/profitability-calculator
 *
 * @see https://insights.braiins.com/api/v2.0/profitability-calculator
 */
export interface ProfitabilityQueryParams {
  /**
   * Electricity cost in USD per kilowatt-hour
   *
   * @example 0.08
   * @unit USD/kWh
   * @minimum 0
   * @maximum 1
   */
  electricity_cost_kwh: number;

  /**
   * Hardware efficiency in joules per terahash
   *
   * Common values:
   * - Antminer S19 Pro: ~29.5 J/TH
   * - Antminer S21: ~17.5 J/TH
   * - Whatsminer M50S: ~26 J/TH
   *
   * @example 25
   * @unit J/TH
   * @minimum 1
   * @maximum 200
   */
  hardware_efficiency_jth: number;

  /**
   * Optional hardware cost for ROI calculation
   *
   * @example 3500
   * @unit USD
   * @minimum 0
   * @optional
   */
  hardware_cost_usd?: number;
}

/**
 * Bitcoin mining profitability data from Braiins Insights Dashboard
 *
 * Endpoint: GET /v2.0/profitability-calculator
 * Authentication: None required (public endpoint)
 * Cache TTL: 5 minutes (300,000ms)
 *
 * @see https://insights.braiins.com/api/v2.0/profitability-calculator
 */
export interface BraiinsInsightsProfitability {
  /**
   * Daily revenue per terahash in USD
   *
   * @example 0.045
   * @unit USD/TH/day
   * @minimum 0
   */
  daily_revenue_per_th: number;

  /**
   * Daily electricity cost per terahash in USD
   *
   * @example 0.012
   * @unit USD/TH/day
   * @minimum 0
   */
  daily_electricity_cost_per_th: number;

  /**
   * Net daily profit per terahash in USD
   *
   * Calculated as: daily_revenue_per_th - daily_electricity_cost_per_th
   * Can be negative if electricity cost exceeds revenue.
   *
   * @example 0.033
   * @unit USD/TH/day
   */
  net_daily_profit_per_th: number;

  /**
   * Monthly profit per terahash in USD (30 days)
   *
   * @example 0.99
   * @unit USD/TH/month
   */
  monthly_profit_per_th: number;

  /**
   * Annual profit per terahash in USD (365 days)
   *
   * @example 12.045
   * @unit USD/TH/year
   */
  annual_profit_per_th: number;

  /**
   * Current Bitcoin price in USD
   *
   * @example 96500
   * @unit USD
   * @minimum 0
   */
  btc_price_usd: number;

  /**
   * Current network difficulty
   *
   * @example 109780000000000000
   * @minimum 0
   */
  network_difficulty: number;

  /**
   * Break-even Bitcoin price given current parameters
   *
   * Price at which mining revenue equals electricity cost.
   *
   * @example 45000
   * @unit USD
   * @minimum 0
   */
  breakeven_btc_price: number;

  /**
   * Estimated ROI period in days (if hardware_cost_usd provided)
   *
   * @example 450
   * @unit days
   * @minimum 0
   * @optional
   */
  roi_days?: number;

  /**
   * Break-even hashrate threshold in TH/s
   *
   * Minimum hashrate needed for profitability.
   *
   * @example 100
   * @unit TH/s
   * @minimum 0
   */
  breakeven_hashrate_ths: number;

  /**
   * Profitability threshold - maximum electricity cost for profitability
   *
   * @example 0.15
   * @unit USD/kWh
   * @minimum 0
   */
  profitability_threshold_kwh: number;

  /**
   * Timestamp of calculation in ISO 8601 format
   *
   * @example "2025-12-14T10:30:00Z"
   */
  timestamp: string;
}

/**
 * Type guard to validate if an object is a valid BraiinsInsightsProfitability
 *
 * @param obj - Object to validate
 * @returns True if object matches BraiinsInsightsProfitability structure
 *
 * @example
 * ```typescript
 * const data = await fetch('/api/v2.0/profitability-calculator');
 * if (isProfitability(data)) {
 *   console.log(data.net_daily_profit_per_th);
 * }
 * ```
 */
export function isProfitability(obj: unknown): obj is BraiinsInsightsProfitability {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const profitability = obj as Record<string, unknown>;

  return (
    typeof profitability['daily_revenue_per_th'] === 'number' &&
    typeof profitability['daily_electricity_cost_per_th'] === 'number' &&
    typeof profitability['net_daily_profit_per_th'] === 'number' &&
    typeof profitability['monthly_profit_per_th'] === 'number' &&
    typeof profitability['annual_profit_per_th'] === 'number' &&
    typeof profitability['btc_price_usd'] === 'number' &&
    typeof profitability['network_difficulty'] === 'number' &&
    typeof profitability['breakeven_btc_price'] === 'number' &&
    typeof profitability['breakeven_hashrate_ths'] === 'number' &&
    typeof profitability['profitability_threshold_kwh'] === 'number' &&
    typeof profitability['timestamp'] === 'string'
  );
}
