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
    typeof stats['avg_fees_per_block'] === 'number' &&
    typeof stats['current_hashrate'] === 'number' &&
    typeof stats['current_hashrate_estimated'] === 'number' &&
    typeof stats['fees_percent'] === 'number' &&
    typeof stats['hash_price'] === 'number' &&
    typeof stats['hash_rate_30'] === 'number' &&
    typeof stats['hash_value'] === 'number' &&
    typeof stats['monthly_avg_hashrate_change_1_year'] === 'object' &&
    stats['monthly_avg_hashrate_change_1_year'] !== null &&
    typeof (stats['monthly_avg_hashrate_change_1_year'] as Record<string, unknown>)['relative'] ===
      'number' &&
    typeof (stats['monthly_avg_hashrate_change_1_year'] as Record<string, unknown>)['absolute'] ===
      'number' &&
    typeof stats['rev_usd'] === 'number'
  );
}

/**
 * Bitcoin network difficulty statistics from Braiins Insights Dashboard.
 *
 * Endpoint: GET /v1.0/difficulty-stats
 * Authentication: None required (public endpoint)
 * Cache TTL: 1 hour (3,600,000ms) - Updates at difficulty adjustment (~2 weeks)
 */
export interface BraiinsInsightsDifficultyStats {
  /** Current network difficulty */
  difficulty: number;

  /** Current block epoch (difficulty adjustment period, 2016 blocks each) */
  block_epoch: number;

  /** Average epoch block time in seconds */
  epoch_block_time: number;

  /** Estimated adjustment as decimal (e.g., -0.005 = -0.5%) */
  estimated_adjustment: number;

  /** Estimated next difficulty */
  estimated_next_diff: number;

  /** Estimated adjustment date (ISO 8601 format) */
  estimated_adjustment_date: string;

  /** Previous adjustment as decimal */
  previous_adjustment: number;

  /** Year-over-year difficulty change as decimal */
  year_difficulty_change: number;

  /** Total difficulty change in current halving epoch as decimal */
  current_halving_epoch_total_difficulty_change: number;

  /** Total difficulty change in previous halving epoch as decimal */
  previous_halving_epoch_total_difficulty_change: number;

  /** Average difficulty change per epoch as decimal */
  average_difficulty_change_per_epoch: number;
}

/**
 * Bitcoin block data from Braiins Insights Dashboard.
 *
 * Endpoint: GET /v1.0/blocks?limit=N
 */
export interface BraiinsInsightsBlockData {
  /** Block height */
  height: number;

  /** Mining pool name */
  pool: string;

  /** Block timestamp (ISO 8601 format) */
  timestamp: string;

  /** Block value in BTC (reward + fees) */
  block_value_btc: number;

  /** Block value in USD */
  block_value_usd: number;
}

/**
 * Query parameters for blocks endpoint
 */
export interface BlocksQueryParams {
  /** Number of blocks to return (max 100) */
  limit?: number;
}

/**
 * Bitcoin blocks by country data
 *
 * Endpoint: GET /v1.0/blocks-by-country
 */
export interface BraiinsInsightsBlocksByCountry {
  /** Country code (ISO 3166-1 alpha-2) */
  country_code: string;

  /** Country name */
  country_name: string;

  /** Number of blocks mined */
  block_count: number;

  /** Percentage of total blocks */
  percentage: number;
}

/**
 * Daily revenue history data point
 *
 * Endpoint: GET /v1.0/daily-revenue-history
 */
export interface BraiinsInsightsDailyRevenue {
  /** Date (ISO 8601 format) */
  date: string;

  /** Total revenue in USD */
  revenue_usd: number;

  /** Block rewards in BTC */
  block_rewards_btc?: number;

  /** Transaction fees in BTC */
  fees_btc?: number;
}

/**
 * Hashrate and difficulty history data point
 *
 * Endpoint: GET /v1.0/hashrate-and-difficulty-history
 */
export interface BraiinsInsightsHashDiffHistory {
  /** Timestamp (ISO 8601 format) */
  timestamp: string;

  /** Network hashrate in EH/s */
  hashrate_ehs: number;

  /** Network difficulty */
  difficulty: number;
}

/**
 * Hashrate value history data point
 *
 * Endpoint: GET /v1.0/hashrate-value-history
 */
export interface BraiinsInsightsHashrateValue {
  /** Date (ISO 8601 format) */
  date: string;

  /** Hash value in USD per TH per day */
  hash_value_usd_per_th_day: number;
}

/**
 * Mining pool statistics
 *
 * Endpoint: GET /v1.0/pool-stats
 */
export interface BraiinsInsightsPoolStats {
  /** Pool statistics array */
  pools: Array<{
    /** Pool name */
    name: string;

    /** Hashrate percentage of network */
    hashrate_percent: number;

    /** Effective hashrate in EH/s */
    hashrate_effective: number;

    /** Number of blocks found in various time periods */
    blocks_mined: {
      /** 1 day period */
      '1d'?: {
        absolute: number;
        relative?: number;
      };
      /** 1 week period */
      '1w'?: {
        absolute: number;
        relative?: number;
      };
      /** 5 day period */
      '5d'?: {
        absolute: number;
        relative?: number;
      };
      /** 5 week period */
      '5w'?: {
        absolute: number;
        relative?: number;
      };
    };

    /** Total blocks found (legacy field) */
    blocks_found?: number;
  }>;

  /** Timestamp of data */
  timestamp?: string;
}

/**
 * Bitcoin price statistics
 *
 * Endpoint: GET /v1.0/price-stats
 */
export interface BraiinsInsightsPriceStats {
  /** Current BTC price in USD */
  price: number;

  /** 24-hour price change percentage */
  percent_change_24h: number;

  /** Timestamp of the data (ISO 8601 format) */
  timestamp: string;
}

/**
 * RSS feed data item
 *
 * Endpoint: GET /v1.0/rss-feed-data
 */
export interface BraiinsInsightsRSSItem {
  /** Article/post title */
  title: string;

  /** Publication date (ISO 8601 format) */
  date: string;

  /** Article URL */
  link: string;

  /** Article description/excerpt */
  description?: string;
}

/**
 * Transaction fees history data point
 *
 * Endpoint: GET /v1.0/transaction-fees-history
 */
export interface BraiinsInsightsTransactionFees {
  /** Date (ISO 8601 format) */
  date: string;

  /** Average fee in BTC */
  avg_fee_btc: number;

  /** Average fee in USD */
  avg_fee_usd?: number;
}

/**
 * Transaction statistics
 *
 * Endpoint: GET /v1.0/transaction-stats
 */
export interface BraiinsInsightsTransactionStats {
  /** Mempool size (number of transactions) */
  mempool_size: number;

  /** Average transaction fee in satoshis per byte */
  avg_fee_sat_per_byte: number;

  /** Estimated confirmation time in blocks */
  confirmation_time_blocks?: number;

  /** Transaction count in last 24 hours */
  tx_count_24h?: number;
}

/**
 * Cost to mine API response
 *
 * Endpoint: GET /v2.0/cost-to-mine
 *
 * @see https://academy.braiins.com/en/mining-insights/public-api/#cost-to-mine
 */
export interface BraiinsInsightsCostToMine {
  /** Input parameters echoed back with defaults filled in */
  payload: CostToMinePayload;

  /** Calculation results */
  result: CostToMineResult;
}

/**
 * Input payload echoed back from cost-to-mine API
 */
export interface CostToMinePayload {
  /** Hashrate in TH/s */
  hashrate_ths: number;

  /** Power consumption in watts */
  consumption_watts: number;

  /** Average transaction fees in BTC (null = use current) */
  avg_tx_fees_coin: number | null;

  /** BTC price in USD (null = use current) */
  price: number | null;

  /** Network difficulty (null = use current) */
  difficulty: number | null;

  /** Block reward in BTC (null = use current) */
  block_reward: number | null;

  /** Pool fee rate (default 0.02 = 2%) */
  revenue_fees_rate: number;

  /** Profit fee rate (default 0.0) */
  profit_fees_rate: number;

  /** Income tax rate (default 0.0) */
  income_tax_rate: number;

  /** Expected yearly difficulty change rate (default 0.02 = 2%) */
  yearly_difficulty_change_rate: number;

  /** Expected yearly price change rate (default 0.0) */
  yearly_price_change_rate: number;

  /** Electricity price in USD per kWh */
  electricity_price_per_kwh: number;

  /** Capital expenditure (null = not specified) */
  capex: number | null;

  /** Monthly fixed operating expenses (default 0.0) */
  monthly_fixed_opex: number;

  /** Period resolution: '1m' (month), '2w' (2 weeks), '1w' (week), '1d' (day) */
  period_resolution: '1m' | '2w' | '1w' | '1d';

  /** Number of periods to calculate (default 24) */
  periods: number;

  /** Timestamp of calculation */
  timestamp: string;

  /** Whether to estimate future rewards accounting for halvings */
  estimate_future_rewards: boolean;

  /** Additional optional fields */
  initial_hardware_value_fiat: number;
  initial_infrastructure_value_fiat: number;
  initial_fiat_holdings_fiat: number;
  initial_coin_holdings_coin: number;
  yearly_hardware_value_change_rate: number;
  yearly_infrastructure_value_change_rate: number;
  hodl_rate: number;
  hodl_on_revenue_instead: boolean;
  discount_rate: number;
  loan_amount_fiat: number;
  loan_interest_rate: number;
  loan_payback_periods: number;
  loan_to_value_ratio: number;
  halving_difficulty_change: number;
  periods_to_halving: number | null;
}

/**
 * Cost to mine calculation results
 */
export interface CostToMineResult {
  /** BTC mined per day at given hashrate */
  coin_mined_daily: number;

  /** Current network difficulty */
  difficulty: number;

  /** Break-even electricity price in USD/kWh */
  fiat_break_even_electricity_price: number;

  /** Cost to mine 1 BTC in USD */
  fiat_cost: number;

  /** Profit margin (current BTC price - cost to mine) in USD */
  fiat_margin: number;

  /** Daily profit/loss in USD */
  fiat_profit_daily: number;

  /** Hardware efficiency in J/TH */
  hardware_efficiency_j_th: number;

  /** Cost line for chart (array of costs at different electricity prices) */
  fiat_cost_line: number[];

  /** Electricity prices for chart x-axis */
  fiat_electricity_prices: number[];

  /** Profit area for chart (array of profits at different electricity prices) */
  fiat_profit_area: number[];

  /** BTC price projections over periods */
  price: number[];

  /** Marginal cost to mine over periods */
  marginal_cost_to_mine_fiat: number[];

  /** Marginal electricity break-even over periods */
  marginal_electricity_breakeven_fiat: number[];

  /** Total cost to mine over periods */
  total_cost_to_mine_fiat: number[];

  /** Total electricity break-even over periods */
  total_electricity_breakeven_fiat: number[];
}

/**
 * Query parameters for cost-to-mine endpoint
 *
 * Required: hashrate_ths, consumption_watts, electricity_price_per_kwh
 *
 * @see https://academy.braiins.com/en/mining-insights/public-api/#request-parameters
 */
export interface CostToMineQueryParams {
  /** Hashrate in TH/s (required) */
  hashrate_ths: number;

  /** Power consumption in watts (required) */
  consumption_watts: number;

  /** Electricity price in USD per kWh (required) */
  electricity_price_per_kwh: number;

  /** Average transaction fees in BTC (optional, uses current if not specified) */
  avg_tx_fees_coin?: number;

  /** BTC price in USD (optional, uses current if not specified) */
  price?: number;

  /** Network difficulty (optional, uses current if not specified) */
  difficulty?: number;

  /** Block reward in BTC (optional, uses current if not specified) */
  block_reward?: number;

  /** Pool fee rate (optional, default 0.02 = 2%) */
  revenue_fees_rate?: number;

  /** Expected yearly difficulty change rate (optional, default 0.02) */
  yearly_difficulty_change_rate?: number;

  /** Period resolution: '1m', '2w', '1w', '1d' (optional, default '1m') */
  period_resolution?: '1m' | '2w' | '1w' | '1d';

  /** Number of periods (optional, default 24) */
  periods?: number;
}

/**
 * Bitcoin halving data
 *
 * Endpoint: GET /v2.0/halvings
 */
export interface BraiinsInsightsHalvingData {
  /** Next halving block height */
  next_halving_block: number;

  /** Estimated next halving date (ISO 8601 format) */
  next_halving_date: string;

  /** Blocks remaining until halving */
  blocks_until_halving: number;

  /** Current block reward in BTC */
  current_reward_btc: number;

  /** Next block reward in BTC (after halving) */
  next_reward_btc: number;
}

/**
 * Profitability calculator result
 *
 * Endpoint: GET /v2.0/profitability-calculator
 */
export interface BraiinsInsightsProfitability {
  /** Daily revenue in USD */
  daily_revenue_usd: number;

  /** Daily electricity cost in USD */
  daily_electricity_cost_usd: number;

  /** Daily net profit in USD */
  daily_profit_usd: number;

  /** Monthly net profit in USD */
  monthly_profit_usd?: number;

  /** Estimated ROI in days */
  roi_days?: number;

  /** Break-even analysis */
  break_even?: {
    /** Break-even price per BTC in USD */
    price_usd: number;

    /** Break-even hashrate in TH/s */
    hashrate_ths?: number;
  };
}

/**
 * Query parameters for profitability calculator
 */
export interface ProfitabilityQueryParams {
  /** Electricity cost in USD per kWh */
  electricity_cost_kwh: number;

  /** Hardware efficiency in joules per terahash (J/TH) */
  hardware_efficiency_jth: number;

  /** Hardware cost in USD (for ROI calculation) */
  hardware_cost_usd?: number;

  /** Hardware hashrate in TH/s */
  hashrate_ths?: number;
}

/**
 * Hardware stats request body
 *
 * Endpoint: POST /v1.0/hardware-stats
 */
export interface HardwareStatsRequest {
  /** Array of hardware model names to fetch stats for */
  models?: string[];
}

/**
 * Hardware statistics response
 */
export interface BraiinsInsightsHardwareStats {
  /** Hardware model name */
  model: string;

  /** Hashrate in TH/s */
  hashrate_ths: number;

  /** Power consumption in watts */
  power_watts: number;

  /** Efficiency in J/TH */
  efficiency_jth: number;

  /** Manufacturer */
  manufacturer?: string;

  /** Release date */
  release_date?: string;
}
