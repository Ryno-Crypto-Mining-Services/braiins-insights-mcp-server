/**
 * Braiins Insights Dashboard API Client
 *
 * HTTP client for interacting with the Braiins Insights public API.
 * Provides methods for fetching Bitcoin network analytics, mining statistics,
 * and profitability metrics.
 *
 * @see https://insights.braiins.com/api
 * @see /docs/api-discovery/
 */

import {
  BraiinsInsightsHashrateStats,
  BraiinsInsightsDifficultyStats,
  BraiinsInsightsBlockData,
  BraiinsInsightsBlocksByCountry,
  BraiinsInsightsDailyRevenue,
  BraiinsInsightsHashDiffHistory,
  BraiinsInsightsHashrateValue,
  BraiinsInsightsPoolStats,
  BraiinsInsightsPriceStats,
  BraiinsInsightsRSSItem,
  BraiinsInsightsTransactionFees,
  BraiinsInsightsTransactionStats,
  BraiinsInsightsCostToMine,
  BraiinsInsightsHalvingData,
  BraiinsInsightsProfitability,
  BraiinsInsightsHardwareStats,
  BlocksQueryParams,
  CostToMineQueryParams,
  ProfitabilityQueryParams,
  HardwareStatsRequest,
  isHashrateStats,
} from '../types/insights-api.js';

/**
 * Base URL for Braiins Insights API
 *
 * Note: The API redirects from insights.braiins.com to learn.braiins.com.
 * Using the final URL to avoid redirect overhead.
 */
const BASE_URL = 'https://insights.braiins.com/api';

/**
 * Default timeout for API requests (in milliseconds)
 */
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Cache TTL (Time To Live) for different endpoint types in milliseconds
 * Based on data update frequencies as documented in ARCHITECTURE.md
 */
const CACHE_TTL = {
  // Fast-changing (30 seconds - 5 minutes)
  '/v1.0/blocks': 30_000, // New blocks ~every 10 min
  '/v1.0/hashrate-stats': 300_000, // Updates every 5 min
  '/v1.0/transaction-stats': 300_000,

  // Medium-changing (5 minutes - 1 hour)
  '/v1.0/price-stats': 300_000, // Market data
  '/v1.0/pool-stats': 600_000, // Pool distribution
  '/v1.0/difficulty-stats': 3_600_000, // Updates at adjustment (~2 weeks)

  // Slow-changing (hours to static)
  '/v2.0/halvings': 86_400_000, // Static until next halving
  '/v1.0/rss-feed-data': 3_600_000,
  '/v1.0/hardware-stats': 3_600_000,

  // Historical (rarely changes)
  '/v1.0/hashrate-and-difficulty-history': 600_000, // 10 min
  '/v1.0/daily-revenue-history': 3_600_000, // 1 hour
  '/v1.0/transaction-fees-history': 3_600_000,
  '/v1.0/hashrate-value-history': 3_600_000,
  '/v1.0/blocks-by-country': 3_600_000,

  // Parameterized endpoints
  '/v2.0/cost-to-mine': 600_000, // 10 min
  '/v2.0/profitability-calculator': 300_000, // 5 min
} as const;

/**
 * Rate limiting configuration
 * Conservative limits since we don't know server-side limits for public API
 */
const MAX_REQUESTS_PER_MINUTE = 30;
const BURST_LIMIT = 5; // Max 5 requests per second

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  expires: number; // Unix timestamp in milliseconds
  endpoint: string;
}

/**
 * API client error class
 */
export class InsightsApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'InsightsApiError';
  }
}

/**
 * Network error class
 */
export class NetworkError extends Error {
  public override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly invalidData?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * API client configuration options
 */
export interface InsightsClientConfig {
  /** Base URL override */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Braiins Insights API Client
 *
 * Provides typed methods for all Braiins Insights Dashboard API endpoints.
 * Includes intelligent caching and conservative rate limiting.
 */
export class InsightsApiClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly headers: Record<string, string>;
  private readonly cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly requestTimestamps: number[] = [];

  constructor(config: InsightsClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? BASE_URL;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'braiins-insights-mcp-server/0.1.0',
      ...config.headers,
    };
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Check cache for existing valid data
   */
  private checkCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache with appropriate TTL
   */
  private setCache<T>(key: string, value: T, endpoint: string): void {
    const ttl = CACHE_TTL[endpoint as keyof typeof CACHE_TTL] || 300_000; // Default 5 min
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl,
      endpoint,
    });
  }

  /**
   * Check rate limit before making request
   * Implements sliding window rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneSecondAgo = now - 1_000;

    // Remove timestamps older than 1 minute
    while (this.requestTimestamps.length > 0 && this.requestTimestamps[0]! < oneMinuteAgo) {
      this.requestTimestamps.shift();
    }

    // Check minute-level limit
    if (this.requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldestInWindow = this.requestTimestamps[0]!;
      const retryAfterMs = 60_000 - (now - oldestInWindow) + 100;

      throw new NetworkError(
        `Client-side rate limit exceeded: ${MAX_REQUESTS_PER_MINUTE} req/min. Retry after ${retryAfterMs}ms`
      );
    }

    // Check burst limit (5 req/sec)
    const recentRequests = this.requestTimestamps.filter((ts) => ts > oneSecondAgo);
    if (recentRequests.length >= BURST_LIMIT) {
      // Wait 1 second to avoid burst limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.requestTimestamps.push(now);
  }

  /**
   * Get current Bitcoin network hashrate statistics
   *
   * Endpoint: GET /v1.0/hashrate-stats
   * Cache TTL: 5 minutes (recommended)
   *
   * @returns Hashrate statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   * @throws {ValidationError} If response validation fails
   *
   * @see /docs/api-discovery/hashrate-stats.md
   */
  async getHashrateStats(): Promise<BraiinsInsightsHashrateStats> {
    const endpoint = '/v1.0/hashrate-stats';
    const data = await this.get<BraiinsInsightsHashrateStats>(endpoint);

    // Validate response structure
    if (!isHashrateStats(data)) {
      throw new ValidationError('Invalid hashrate stats response format', data);
    }

    return data;
  }

  /**
   * Generic GET request handler with caching and rate limiting
   *
   * @param endpoint - API endpoint path (e.g., '/v1.0/hashrate-stats')
   * @param params - Optional query parameters
   * @returns Parsed JSON response
   */
  private async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    // Build cache key from endpoint + params
    const cacheKey = params
      ? `${endpoint}?${Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')}`
      : endpoint;

    // Check cache first (bypasses rate limiting)
    const cached = this.checkCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check rate limit before making request
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint, params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers,
        signal: controller.signal,
        redirect: 'follow', // Follow redirects (insights.braiins.com → learn.braiins.com)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new InsightsApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();

      // Cache the result
      this.setCache(cacheKey, data, endpoint);

      return data as T;
    } catch (error) {
      if (error instanceof InsightsApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError(`Request timeout after ${this.timeout}ms`, error);
        }

        throw new NetworkError(`Network request failed: ${error.message}`, error);
      }

      throw new NetworkError('Unknown network error', error as Error);
    }
  }

  /**
   * Generic POST request handler with caching and rate limiting
   *
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @returns Parsed JSON response
   */
  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    // Build cache key from endpoint + body hash (simple JSON stringify for now)
    const cacheKey = `${endpoint}:POST:${JSON.stringify(body)}`;

    // Check cache first
    const cached = this.checkCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Check rate limit
    await this.checkRateLimit();

    const url = this.buildUrl(endpoint);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new InsightsApiError(
          `API request failed: ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();

      // Cache the result
      this.setCache(cacheKey, data, endpoint);

      return data as T;
    } catch (error) {
      if (error instanceof InsightsApiError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError(`Request timeout after ${this.timeout}ms`, error);
        }

        throw new NetworkError(`Network request failed: ${error.message}`, error);
      }

      throw new NetworkError('Unknown network error', error as Error);
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  // ============================================================================
  // v1.0 API Endpoints
  // ============================================================================

  /**
   * Get Bitcoin network difficulty statistics
   *
   * Endpoint: GET /v1.0/difficulty-stats
   * Cache TTL: 1 hour (recommended)
   *
   * @returns Difficulty statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getDifficultyStats(): Promise<BraiinsInsightsDifficultyStats> {
    return this.get<BraiinsInsightsDifficultyStats>('/v1.0/difficulty-stats');
  }

  /**
   * Get recent Bitcoin blocks mined
   *
   * Endpoint: GET /v1.0/blocks
   * Cache TTL: 30 seconds (recommended)
   *
   * @param params - Optional pagination and filtering parameters
   * @returns Array of block data
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getBlocks(params?: BlocksQueryParams): Promise<BraiinsInsightsBlockData[]> {
    return this.get<BraiinsInsightsBlockData[]>('/v1.0/blocks', params as Record<string, string | number>);
  }

  /**
   * Get blocks mined aggregated by country
   *
   * Endpoint: GET /v1.0/blocks-by-country
   * Cache TTL: 1 hour (recommended)
   *
   * @param params - Optional pagination parameters
   * @returns Array of blocks by country data
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getBlocksByCountry(params?: Omit<BlocksQueryParams, 'start_date' | 'end_date'>): Promise<BraiinsInsightsBlocksByCountry[]> {
    return this.get<BraiinsInsightsBlocksByCountry[]>('/v1.0/blocks-by-country', params as Record<string, string | number>);
  }

  /**
   * Get daily revenue history
   *
   * Endpoint: GET /v1.0/daily-revenue-history
   * Cache TTL: 1 hour (recommended)
   *
   * @returns Array of daily revenue data points
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getDailyRevenueHistory(): Promise<BraiinsInsightsDailyRevenue[]> {
    return this.get<BraiinsInsightsDailyRevenue[]>('/v1.0/daily-revenue-history');
  }

  /**
   * Get hashrate and difficulty history
   *
   * Endpoint: GET /v1.0/hashrate-and-difficulty-history
   * Cache TTL: 10 minutes (recommended)
   *
   * @returns Array of hashrate and difficulty historical data points
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getHashrateAndDifficultyHistory(): Promise<BraiinsInsightsHashDiffHistory[]> {
    return this.get<BraiinsInsightsHashDiffHistory[]>('/v1.0/hashrate-and-difficulty-history');
  }

  /**
   * Get hashrate value history
   *
   * Endpoint: GET /v1.0/hashrate-value-history
   * Cache TTL: 1 hour (recommended)
   *
   * @returns Array of hashrate value data points
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getHashrateValueHistory(): Promise<BraiinsInsightsHashrateValue[]> {
    return this.get<BraiinsInsightsHashrateValue[]>('/v1.0/hashrate-value-history');
  }

  /**
   * Get mining pool statistics
   *
   * Endpoint: GET /v1.0/pool-stats
   * Cache TTL: 10 minutes (recommended)
   *
   * @returns Pool statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getPoolStats(): Promise<BraiinsInsightsPoolStats> {
    return this.get<BraiinsInsightsPoolStats>('/v1.0/pool-stats');
  }

  /**
   * Get Bitcoin price statistics
   *
   * Endpoint: GET /v1.0/price-stats
   * Cache TTL: 5 minutes (recommended)
   *
   * @returns Price statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getPriceStats(): Promise<BraiinsInsightsPriceStats> {
    return this.get<BraiinsInsightsPriceStats>('/v1.0/price-stats');
  }

  /**
   * Get RSS feed data
   *
   * Endpoint: GET /v1.0/rss-feed-data
   * Cache TTL: 1 hour (recommended)
   *
   * @returns Array of RSS feed items
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getRSSFeedData(): Promise<BraiinsInsightsRSSItem[]> {
    return this.get<BraiinsInsightsRSSItem[]>('/v1.0/rss-feed-data');
  }

  /**
   * Get transaction fees history
   *
   * Endpoint: GET /v1.0/transaction-fees-history
   * Cache TTL: 1 hour (recommended)
   *
   * @returns Array of transaction fee data points
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getTransactionFeesHistory(): Promise<BraiinsInsightsTransactionFees[]> {
    return this.get<BraiinsInsightsTransactionFees[]>('/v1.0/transaction-fees-history');
  }

  /**
   * Get current transaction statistics
   *
   * Endpoint: GET /v1.0/transaction-stats
   * Cache TTL: 5 minutes (recommended)
   *
   * @returns Transaction statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getTransactionStats(): Promise<BraiinsInsightsTransactionStats> {
    return this.get<BraiinsInsightsTransactionStats>('/v1.0/transaction-stats');
  }

  /**
   * Get hardware statistics
   *
   * Endpoint: POST /v1.0/hardware-stats
   * Cache TTL: 1 hour (recommended)
   *
   * @param request - Hardware stats request body
   * @returns Array of hardware statistics
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getHardwareStats(request: HardwareStatsRequest = {}): Promise<BraiinsInsightsHardwareStats[]> {
    return this.post<BraiinsInsightsHardwareStats[]>('/v1.0/hardware-stats', request);
  }

  // ============================================================================
  // v2.0 API Endpoints
  // ============================================================================

  /**
   * Get cost to mine one Bitcoin
   *
   * Endpoint: GET /v2.0/cost-to-mine
   * Cache TTL: 10 minutes (recommended)
   *
   * @param params - Optional electricity cost parameter
   * @returns Cost to mine data
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getCostToMine(params?: CostToMineQueryParams): Promise<BraiinsInsightsCostToMine> {
    return this.get<BraiinsInsightsCostToMine>('/v2.0/cost-to-mine', params as Record<string, string | number>);
  }

  /**
   * Get Bitcoin halving data
   *
   * Endpoint: GET /v2.0/halvings
   * Cache TTL: 24 hours (recommended) - static until next halving
   *
   * @returns Halving data
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getHalvings(): Promise<BraiinsInsightsHalvingData> {
    return this.get<BraiinsInsightsHalvingData>('/v2.0/halvings');
  }

  /**
   * Get profitability calculator result
   *
   * Endpoint: GET /v2.0/profitability-calculator
   * Cache TTL: 5 minutes (recommended)
   *
   * @param params - Profitability calculation parameters
   * @returns Profitability data
   * @throws {NetworkError} If network request fails
   * @throws {InsightsApiError} If API returns error status
   */
  async getProfitabilityCalculator(params: ProfitabilityQueryParams): Promise<BraiinsInsightsProfitability> {
    return this.get<BraiinsInsightsProfitability>('/v2.0/profitability-calculator', params as unknown as Record<string, string | number>);
  }
}

/**
 * Create a default Insights API client instance
 *
 * @returns Configured API client
 */
export function createInsightsClient(config?: InsightsClientConfig): InsightsApiClient {
  return new InsightsApiClient(config);
}
