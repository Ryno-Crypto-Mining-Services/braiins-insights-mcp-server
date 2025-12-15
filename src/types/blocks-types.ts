/**
 * Bitcoin block data types for Braiins Insights Dashboard API
 *
 * @see https://insights.braiins.com/api/v1.0/blocks
 */

/**
 * Bitcoin block data from Braiins Insights Dashboard.
 *
 * Endpoint: GET /v1.0/blocks
 * Authentication: None required (public endpoint)
 * Cache TTL: 30 seconds (30,000ms) - blocks change frequently
 *
 * @see https://insights.braiins.com/api/v1.0/blocks
 */
export interface BraiinsInsightsBlockData {
  /**
   * Block height (block number in the blockchain)
   *
   * @example 872450
   * @minimum 0
   */
  height: number;

  /**
   * Name of the mining pool that found the block
   *
   * @example "Braiins Pool"
   * @example "Foundry USA"
   * @example "AntPool"
   */
  pool_name: string;

  /**
   * Block timestamp in ISO 8601 format (UTC)
   *
   * @example "2025-12-13T18:45:00Z"
   */
  timestamp: string;

  /**
   * Number of transactions in the block
   *
   * @example 3247
   * @minimum 0
   */
  transaction_count: number;

  /**
   * Block size in megabytes
   *
   * @example 1.42
   * @unit MB
   * @minimum 0
   */
  size_mb: number;

  /**
   * Block hash (full SHA-256 hash)
   *
   * @example "00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72728a054"
   */
  hash: string;

  /**
   * Block reward in BTC (subsidy + fees)
   *
   * @example 3.15
   * @unit BTC
   * @minimum 0
   * @optional
   */
  reward?: number;
}

/**
 * Query parameters for blocks endpoint
 */
export interface BlocksQueryParams {
  /**
   * Page number (1-indexed)
   *
   * @default 1
   * @minimum 1
   */
  page?: number;

  /**
   * Number of blocks per page
   *
   * @default 10
   * @minimum 1
   * @maximum 100
   */
  page_size?: number;

  /**
   * Filter blocks mined after this date (ISO 8601 format: YYYY-MM-DD)
   *
   * @example "2025-12-01"
   * @pattern ^\d{4}-\d{2}-\d{2}$
   */
  start_date?: string;

  /**
   * Filter blocks mined before this date (ISO 8601 format: YYYY-MM-DD)
   *
   * @example "2025-12-13"
   * @pattern ^\d{4}-\d{2}-\d{2}$
   */
  end_date?: string;
}

/**
 * Type guard to validate if an object is valid block data
 *
 * @param obj - Object to validate
 * @returns True if object matches BraiinsInsightsBlockData structure
 */
export function isBlockData(obj: unknown): obj is BraiinsInsightsBlockData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const block = obj as Record<string, unknown>;

  return (
    typeof block['height'] === 'number' &&
    typeof block['pool_name'] === 'string' &&
    typeof block['timestamp'] === 'string' &&
    typeof block['transaction_count'] === 'number' &&
    typeof block['size_mb'] === 'number' &&
    typeof block['hash'] === 'string'
  );
}

/**
 * Type guard to validate if an object is an array of block data
 *
 * @param obj - Object to validate
 * @returns True if object is an array of BraiinsInsightsBlockData
 */
export function isBlockDataArray(obj: unknown): obj is BraiinsInsightsBlockData[] {
  return Array.isArray(obj) && obj.every((item) => isBlockData(item));
}
